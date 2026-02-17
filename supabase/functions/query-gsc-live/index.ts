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

    if (!res.ok) {
      return allRows;
    }

    const data = await res.json();
    const rows = data.rows || [];
    allRows.push(...rows);
    if (rows.length < rowLimit) break;
    startRow += rowLimit;
    if (startRow >= 75000) break;
  }
  return allRows;
}

// Fetch aggregate totals (no dimensions) — returns a single row with exact GSC totals
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

  if (!res.ok) {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }

  const data = await res.json();
  const rows = data.rows || [];
  if (rows.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  // When no dimensions, GSC returns a single aggregated row
  const r = rows[0];
  return {
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
    position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
  };
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

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const requestId = getRequestId(req);
  const log = createLogger("query-gsc-live", requestId);

  try {
    const body = await req.json();
    
    const validationErr = validateBody(body, ["project_id", "current_start", "current_end", "previous_start", "previous_end"], cors);
    if (validationErr) return validationErr;

    const uuidErr = validateUUID(body, ["project_id"], cors);
    if (uuidErr) return uuidErr;

    const { project_id, current_start, current_end, previous_start, previous_end } = body;
    log.info("Request received", { project_id, current_start, current_end });

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (![current_start, current_end, previous_start, previous_end].every((d: string) => dateRegex.test(d))) {
      return errorResponse("Date fields must be in YYYY-MM-DD format", cors, 400);
    }

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

    // Fetch aggregate totals (no dimension) for exact KPI numbers
    const totalsTask = Promise.all([
      fetchTotals(apiUrl, accessToken, current_start, current_end),
      fetchTotals(apiUrl, accessToken, previous_start, previous_end),
    ]);

    const dims = ["query", "page", "country", "device", "date"];
    const tasks = dims.flatMap(dim => [
      fetchDimension(apiUrl, accessToken, current_start, current_end, [dim]).then(rows => ({ dim, period: "current" as const, rows: dim === "date" ? rows.map((r: any) => ({
        name: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
        position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
      })) : mapRows(rows) })),
      fetchDimension(apiUrl, accessToken, previous_start, previous_end, [dim]).then(rows => ({ dim, period: "previous" as const, rows: dim === "date" ? rows.map((r: any) => ({
        name: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
        position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
      })) : mapRows(rows) })),
    ]);

    const [resolved, [currentTotals, previousTotals]] = await log.time("fetch-all-dimensions", () => 
      Promise.all([Promise.all(tasks), totalsTask]), { project_id }
    );

    const output: Record<string, any> = {};
    for (const dim of dims) output[dim] = { current: [], previous: [] };
    for (const { dim, period, rows } of resolved) output[dim][period] = rows;

    // Add aggregate totals — these are the exact numbers GSC shows in its UI
    output.totals = {
      current: currentTotals,
      previous: previousTotals,
    };

    const totalRows = resolved.reduce((s, r) => s + r.rows.length, 0);
    log.info("Request completed", { project_id, total_rows: totalRows, currentTotals });

    const responseHeaders = { ...cors, "Content-Type": "application/json", "X-Request-ID": requestId };
    return new Response(JSON.stringify(output), { status: 200, headers: responseHeaders });
  } catch (error: unknown) {
    log.error("Request failed", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error", cors);
  }
});
