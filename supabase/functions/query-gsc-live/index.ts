import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateBody, validateUUID, jsonResponse, errorResponse, getGoogleAccessToken } from "../_shared/utils.ts";
import { createLogger, getRequestId } from "../_shared/logger.ts";

async function fetchDimension(
  apiUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions: string[],
): Promise<any[]> {
  let allRows: any[] = [];
  let startRow = 0;
  const rowLimit = 25000;

  while (true) {
    const body: any = { startDate, endDate, rowLimit, startRow };
    if (dimensions.length > 0) body.dimensions = dimensions;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return allRows;

    const data = await res.json();
    const rows = data.rows || [];
    allRows.push(...rows);
    if (rows.length < rowLimit) break;
    startRow += rowLimit;
    if (startRow >= 75000) break;
  }
  return allRows;
}

async function fetchTotals(
  apiUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{ clicks: number; impressions: number; ctr: number; position: number }> {
  const body = { startDate, endDate };
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const data = await res.json();
  const rows = data.rows || [];
  if (rows.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const r = rows[0];
  return {
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
    position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
  };
}

// Detect the most recent date with available data by querying date dimension for last 7 days
async function detectLastAvailableDate(apiUrl: string, accessToken: string): Promise<string> {
  const today = new Date();
  const endDate = today.toISOString().split("T")[0];
  const startDate = new Date(today.getTime() - 7 * 86400000).toISOString().split("T")[0];

  const rows = await fetchDimension(apiUrl, accessToken, startDate, endDate, ["date"]);
  if (rows.length === 0) {
    // Fallback: assume 3 days ago
    return new Date(today.getTime() - 3 * 86400000).toISOString().split("T")[0];
  }

  // Find the max date returned
  const dates = rows.map((r: any) => r.keys[0]).sort();
  return dates[dates.length - 1];
}

function mapRows(rows: any[]): any[] {
  return rows.map((r: any) => ({
    name: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
    position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
  }));
}

// Calculate date N days before a YYYY-MM-DD string
function subDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const requestId = getRequestId(req);
  const log = createLogger("query-gsc-live", requestId);

  try {
    const body = await req.json();

    const validationErr = validateBody(body, ["project_id", "days"], cors);
    if (validationErr) return validationErr;

    const uuidErr = validateUUID(body, ["project_id"], cors);
    if (uuidErr) return uuidErr;

    const { project_id, days, compare_mode, custom_start, custom_end } = body;
    const numDays = parseInt(days) || 28;
    const compareMode = compare_mode || "previous";
    log.info("Request received", { project_id, days: numDays, compareMode });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: conn, error: connErr } = await supabase
      .from("gsc_connections").select("*").eq("project_id", project_id).order("created_at", { ascending: true }).limit(1).maybeSingle();

    if (connErr || !conn) {
      log.warn("No GSC connection found", { project_id });
      return errorResponse("No GSC connection found", cors, 404);
    }
    if (!conn.site_url) return errorResponse("No site URL configured", cors, 400);

    const accessToken = await log.time("get-access-token", () =>
      getGoogleAccessToken(
        { client_email: conn.client_email, private_key: conn.private_key },
        "https://www.googleapis.com/auth/webmasters.readonly"
      ), { project_id }
    );

    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(conn.site_url)}/searchAnalytics/query`;

    // Auto-detect last available date from GSC
    let currentEnd: string;
    let currentStart: string;

    if (custom_start && custom_end) {
      currentStart = custom_start;
      currentEnd = custom_end;
    } else {
      const lastDate = await log.time("detect-last-date", () =>
        detectLastAvailableDate(apiUrl, accessToken), { project_id }
      );
      log.info("Last available date detected", { lastDate });
      currentEnd = lastDate;
      currentStart = subDaysStr(lastDate, numDays - 1);
    }

    // Calculate previous period
    const periodLength = Math.ceil(
      (new Date(currentEnd + "T00:00:00Z").getTime() - new Date(currentStart + "T00:00:00Z").getTime()) / 86400000
    ) + 1;

    let previousStart: string;
    let previousEnd: string;

    if (compareMode === "year") {
      previousStart = subDaysStr(currentStart, 365);
      previousEnd = subDaysStr(currentEnd, 365);
    } else if (compareMode === "previous") {
      previousEnd = subDaysStr(currentStart, 1);
      previousStart = subDaysStr(previousEnd, periodLength - 1);
    } else {
      previousStart = currentStart;
      previousEnd = currentEnd;
    }

    log.info("Date ranges", { currentStart, currentEnd, previousStart, previousEnd });

    // Fetch totals + all dimensions in parallel
    const totalsTask = Promise.all([
      fetchTotals(apiUrl, accessToken, currentStart, currentEnd),
      fetchTotals(apiUrl, accessToken, previousStart, previousEnd),
    ]);

    const dims = ["query", "page", "country", "device", "date"];
    const tasks = dims.flatMap(dim => [
      fetchDimension(apiUrl, accessToken, currentStart, currentEnd, [dim]).then(rows => ({
        dim, period: "current" as const,
        rows: dim === "date" ? rows.map((r: any) => ({
          name: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0,
          ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
          position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
        })) : mapRows(rows),
      })),
      fetchDimension(apiUrl, accessToken, previousStart, previousEnd, [dim]).then(rows => ({
        dim, period: "previous" as const,
        rows: dim === "date" ? rows.map((r: any) => ({
          name: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0,
          ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
          position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
        })) : mapRows(rows),
      })),
    ]);

    const [resolved, [currentTotals, previousTotals]] = await log.time("fetch-all-dimensions", () =>
      Promise.all([Promise.all(tasks), totalsTask]), { project_id }
    );

    const output: Record<string, any> = {};
    for (const dim of dims) output[dim] = { current: [], previous: [] };
    for (const { dim, period, rows } of resolved) output[dim][period] = rows;

    output.totals = { current: currentTotals, previous: previousTotals };
    // Return the actual date ranges used so the frontend knows exactly what was queried
    output.dateRanges = {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd },
    };

    const totalRows = resolved.reduce((s, r) => s + r.rows.length, 0);
    log.info("Request completed", { project_id, total_rows: totalRows, currentTotals, currentStart, currentEnd });

    const responseHeaders = { ...cors, "Content-Type": "application/json", "X-Request-ID": requestId };
    return new Response(JSON.stringify(output), { status: 200, headers: responseHeaders });
  } catch (error: unknown) {
    log.error("Request failed", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error", cors);
  }
});
