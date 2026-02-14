import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function createGoogleJWT(credentials: { client_email: string; private_key: string }, scope: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8", binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createGoogleJWT(credentials, "https://www.googleapis.com/auth/webmasters.readonly");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to get access token: ${err}`);
  }
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

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
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`GSC API error [${res.status}]:`, errText);
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, current_start, current_end, previous_start, previous_end } = await req.json();

    if (!project_id || !current_start || !current_end || !previous_start || !previous_end) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: conn, error: connErr } = await supabase
      .from("gsc_connections")
      .select("*")
      .eq("project_id", project_id)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "No GSC connection found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken({
      client_email: conn.client_email,
      private_key: conn.private_key,
    });

    const siteUrl = conn.site_url;
    if (!siteUrl) {
      return new Response(JSON.stringify({ error: "No site URL configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    console.log(`Live query: ${current_start} → ${current_end} vs ${previous_start} → ${previous_end}`);

    // Fetch all dimensions for both periods in parallel
    const dims = ["query", "page", "country", "device"];
    const tasks: Promise<{ dim: string; period: string; rows: any[] }>[] = [];

    for (const dim of dims) {
      tasks.push(
        fetchDimension(apiUrl, accessToken, current_start, current_end, [dim])
          .then(rows => ({ dim, period: "current", rows: mapRows(rows) }))
      );
      tasks.push(
        fetchDimension(apiUrl, accessToken, previous_start, previous_end, [dim])
          .then(rows => ({ dim, period: "previous", rows: mapRows(rows) }))
      );
    }

    const resolved = await Promise.all(tasks);

    const output: Record<string, { current: any[]; previous: any[] }> = {};
    for (const dim of dims) {
      output[dim] = { current: [], previous: [] };
    }
    for (const { dim, period, rows } of resolved) {
      output[dim][period as "current" | "previous"] = rows;
    }

    console.log(`Live query complete: ${dims.map(d => `${d}(c:${output[d].current.length},p:${output[d].previous.length})`).join(", ")}`);

    return new Response(JSON.stringify(output), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("query-gsc-live error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
