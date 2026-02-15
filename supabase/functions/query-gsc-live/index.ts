import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateBody, validateUUID, jsonResponse, errorResponse, getGoogleAccessToken } from "../_shared/utils.ts";

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
    const body = { startDate, endDate, dimensions, rowLimit, startRow };
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`GSC API error [${res.status}]:`, await res.text());
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

  try {
    const body = await req.json();
    
    // Validate required fields
    const validationErr = validateBody(body, ["project_id", "current_start", "current_end", "previous_start", "previous_end"], cors);
    if (validationErr) return validationErr;

    const uuidErr = validateUUID(body, ["project_id"], cors);
    if (uuidErr) return uuidErr;

    const { project_id, current_start, current_end, previous_start, previous_end } = body;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (![current_start, current_end, previous_start, previous_end].every((d: string) => dateRegex.test(d))) {
      return errorResponse("Date fields must be in YYYY-MM-DD format", cors, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: conn, error: connErr } = await supabase
      .from("gsc_connections").select("*").eq("project_id", project_id).single();

    if (connErr || !conn) return errorResponse("No GSC connection found", cors, 404);
    if (!conn.site_url) return errorResponse("No site URL configured", cors, 400);

    const accessToken = await getGoogleAccessToken(
      { client_email: conn.client_email, private_key: conn.private_key },
      "https://www.googleapis.com/auth/webmasters.readonly"
    );

    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(conn.site_url)}/searchAnalytics/query`;

    const dims = ["query", "page", "country", "device"];
    const tasks = dims.flatMap(dim => [
      fetchDimension(apiUrl, accessToken, current_start, current_end, [dim]).then(rows => ({ dim, period: "current" as const, rows: mapRows(rows) })),
      fetchDimension(apiUrl, accessToken, previous_start, previous_end, [dim]).then(rows => ({ dim, period: "previous" as const, rows: mapRows(rows) })),
    ]);

    const resolved = await Promise.all(tasks);

    const output: Record<string, { current: any[]; previous: any[] }> = {};
    for (const dim of dims) output[dim] = { current: [], previous: [] };
    for (const { dim, period, rows } of resolved) output[dim][period] = rows;

    return jsonResponse(output, cors);
  } catch (error: unknown) {
    console.error("query-gsc-live error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error", cors);
  }
});
