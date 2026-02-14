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
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

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

    // Get GSC connection for this project
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

    // Fetch last 90 days of data from GSC Search Analytics API
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // We'll fetch data with all dimensions: query, page, country, device, date
    const dimensions = ["query", "page", "country", "device", "date"];

    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    let allRows: any[] = [];
    let startRow = 0;
    const rowLimit = 5000;

    // Paginate through GSC API results
    while (true) {
      const body = {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions,
        rowLimit,
        startRow,
      };

      console.log(`Fetching GSC data: startRow=${startRow}`);

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

      // Safety limit: max 50k rows
      if (startRow >= 50000) break;
    }

    if (allRows.length === 0) {
      // Update last_sync_at even with no data
      await supabase.from("gsc_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);
      return new Response(JSON.stringify({ success: true, inserted: 0, message: "Nenhum dado disponível no período." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete existing metrics for this project to avoid duplicates
    await supabase.from("seo_metrics").delete().eq("project_id", project_id).eq("owner_id", conn.owner_id);

    // Transform and insert
    const metricsToInsert = allRows.map((row: any) => ({
      project_id,
      owner_id: conn.owner_id,
      query: row.keys[0] || null,
      url: row.keys[1] || null,
      country: row.keys[2] || null,
      device: row.keys[3] || null,
      metric_date: row.keys[4] || formatDate(new Date()),
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr ? parseFloat((row.ctr * 100).toFixed(2)) : 0,
      position: row.position ? parseFloat(row.position.toFixed(1)) : 0,
    }));

    // Insert in batches of 500
    let inserted = 0;
    for (let i = 0; i < metricsToInsert.length; i += 500) {
      const batch = metricsToInsert.slice(i, i + 500);
      const { error: insertErr } = await supabase.from("seo_metrics").insert(batch);
      if (insertErr) {
        console.error(`Insert error at batch ${i}:`, insertErr);
        continue;
      }
      inserted += batch.length;
    }

    // Update last_sync_at
    await supabase.from("gsc_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);

    console.log(`GSC sync complete: ${inserted} rows inserted`);

    return new Response(JSON.stringify({ success: true, inserted }), {
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
