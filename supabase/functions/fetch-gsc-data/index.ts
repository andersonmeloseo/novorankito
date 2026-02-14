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

// Fetch all paginated rows from GSC for given dimensions
async function fetchGscDimension(
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
    console.log(`Fetching GSC [${dimensions.join(",")}]: startRow=${startRow}`);

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
      throw new Error(`GSC API error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const rows = data.rows || [];
    allRows.push(...rows);

    console.log(`Got ${rows.length} rows (total: ${allRows.length})`);

    if (rows.length < rowLimit) break;
    startRow += rowLimit;
    if (startRow >= 75000) break;
  }

  return allRows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
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
      return new Response(JSON.stringify({ error: "Nenhuma conexão GSC encontrada para este projeto." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken({
      client_email: conn.client_email,
      private_key: conn.private_key,
    });

    const siteUrl = conn.site_url;
    if (!siteUrl) {
      return new Response(JSON.stringify({ error: "Nenhuma propriedade selecionada na conexão GSC." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 480);
    const fmtDate = (d: Date) => d.toISOString().split("T")[0];
    const startStr = fmtDate(startDate);
    const endStr = fmtDate(endDate);

    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    // Fetch data with separate dimension groups for accuracy
    // 1. "date" only → accurate daily totals for KPIs and trend chart
    // 2. "query" only → query rankings (aggregated across dates)
    // 3. "page" only → page rankings
    // 4. "country" only → country breakdown
    // 5. "device" only → device breakdown
    const dimensionGroups = [
      { type: "date", dims: ["date"] },
      { type: "query", dims: ["query"] },
      { type: "page", dims: ["page"] },
      { type: "country", dims: ["country"] },
      { type: "device", dims: ["device"] },
    ];

    // Delete existing metrics for this project
    await supabase.from("seo_metrics").delete().eq("project_id", project_id).eq("owner_id", conn.owner_id);

    let totalInserted = 0;

    for (const group of dimensionGroups) {
      console.log(`\n--- Fetching dimension: ${group.type} ---`);
      const rows = await fetchGscDimension(apiUrl, accessToken, startStr, endStr, group.dims);

      if (rows.length === 0) continue;

      const metricsToInsert = rows.map((row: any) => {
        const key = row.keys[0] || null;
        const base = {
          project_id,
          owner_id: conn.owner_id,
          dimension_type: group.type,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr ? parseFloat((row.ctr * 100).toFixed(2)) : 0,
          position: row.position ? parseFloat(row.position.toFixed(1)) : 0,
          query: null as string | null,
          url: null as string | null,
          country: null as string | null,
          device: null as string | null,
          metric_date: fmtDate(new Date()),
        };

        if (group.type === "date") {
          base.metric_date = key || base.metric_date;
        } else if (group.type === "query") {
          base.query = key;
        } else if (group.type === "page") {
          base.url = key;
        } else if (group.type === "country") {
          base.country = key;
        } else if (group.type === "device") {
          base.device = key;
        }

        return base;
      });

      // Insert in batches
      for (let i = 0; i < metricsToInsert.length; i += 500) {
        const batch = metricsToInsert.slice(i, i + 500);
        const { error: insertErr } = await supabase.from("seo_metrics").insert(batch);
        if (insertErr) {
          console.error(`Insert error [${group.type}] batch ${i}:`, insertErr);
          continue;
        }
        totalInserted += batch.length;
      }

      console.log(`Inserted ${metricsToInsert.length} rows for ${group.type}`);
    }

    // Update last_sync_at
    await supabase.from("gsc_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);

    console.log(`GSC sync complete: ${totalInserted} total rows inserted`);

    return new Response(JSON.stringify({ success: true, inserted: totalInserted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("fetch-gsc-data error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
