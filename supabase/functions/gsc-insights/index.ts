import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function createGoogleJWT(credentials: { client_email: string; private_key: string }, scope: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: credentials.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const pemContents = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createGoogleJWT(credentials, "https://www.googleapis.com/auth/webmasters.readonly");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!tokenRes.ok) throw new Error(`Failed to get access token: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}

async function fetchAllRows(apiUrl: string, accessToken: string, startDate: string, endDate: string, dimensions: string[]): Promise<any[]> {
  let allRows: any[] = [];
  let startRow = 0;
  const rowLimit = 25000;

  while (true) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit, startRow }),
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, analysis_type } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: conn, error: connErr } = await supabase.from("gsc_connections").select("*").eq("project_id", project_id).single();
    if (connErr || !conn || !conn.site_url) {
      return new Response(JSON.stringify({ error: "No GSC connection found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key });
    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(conn.site_url)}/searchAnalytics/query`;

    const now = new Date();
    const currentEnd = new Date(now);
    currentEnd.setDate(currentEnd.getDate() - 3); // GSC data has ~3 day delay
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - 27); // 28 days
    const prevEnd = new Date(currentStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 27);

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    if (analysis_type === "opportunities") {
      // Keywords with high impressions but low CTR
      const rows = await fetchAllRows(apiUrl, accessToken, fmt(currentStart), fmt(currentEnd), ["query"]);
      const opportunities = rows
        .map((r: any) => ({
          query: r.keys[0],
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
          ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
          position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
        }))
        .filter((r: any) => r.impressions >= 50 && r.ctr < 3 && r.position <= 20)
        .sort((a: any, b: any) => b.impressions - a.impressions)
        .slice(0, 200);

      return new Response(JSON.stringify({ rows: opportunities }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (analysis_type === "decay") {
      // Pages losing traffic: compare current vs previous period
      const [currentRows, prevRows] = await Promise.all([
        fetchAllRows(apiUrl, accessToken, fmt(currentStart), fmt(currentEnd), ["page"]),
        fetchAllRows(apiUrl, accessToken, fmt(prevStart), fmt(prevEnd), ["page"]),
      ]);

      const currentMap = new Map(currentRows.map((r: any) => [r.keys[0], r]));
      const prevMap = new Map(prevRows.map((r: any) => [r.keys[0], r]));

      const decayPages: any[] = [];
      for (const [page, prev] of prevMap) {
        const curr = currentMap.get(page);
        const prevClicks = prev.clicks || 0;
        const currClicks = curr?.clicks || 0;
        const diff = currClicks - prevClicks;
        const pctChange = prevClicks > 0 ? parseFloat(((diff / prevClicks) * 100).toFixed(1)) : 0;

        if (prevClicks >= 5 && pctChange < -20) {
          decayPages.push({
            page,
            currentClicks: currClicks,
            previousClicks: prevClicks,
            diffClicks: diff,
            pctChange,
            currentImpressions: curr?.impressions || 0,
            previousImpressions: prev.impressions || 0,
            currentPosition: curr?.position ? parseFloat(curr.position.toFixed(1)) : 0,
            previousPosition: prev.position ? parseFloat(prev.position.toFixed(1)) : 0,
          });
        }
      }

      decayPages.sort((a, b) => a.diffClicks - b.diffClicks);

      return new Response(JSON.stringify({ rows: decayPages.slice(0, 200) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (analysis_type === "cannibalization") {
      // Multiple pages ranking for same query
      const rows = await fetchAllRows(apiUrl, accessToken, fmt(currentStart), fmt(currentEnd), ["query", "page"]);

      const queryPages = new Map<string, any[]>();
      for (const r of rows) {
        const query = r.keys[0];
        const page = r.keys[1];
        if (!queryPages.has(query)) queryPages.set(query, []);
        queryPages.get(query)!.push({
          page,
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
          ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
          position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
        });
      }

      const cannibalized: any[] = [];
      for (const [query, pages] of queryPages) {
        if (pages.length >= 2) {
          const totalClicks = pages.reduce((s, p) => s + p.clicks, 0);
          const totalImpressions = pages.reduce((s, p) => s + p.impressions, 0);
          if (totalImpressions >= 20) {
            cannibalized.push({
              query,
              pageCount: pages.length,
              totalClicks,
              totalImpressions,
              pages: pages.sort((a, b) => b.clicks - a.clicks).slice(0, 5),
            });
          }
        }
      }

      cannibalized.sort((a, b) => b.totalImpressions - a.totalImpressions);

      return new Response(JSON.stringify({ rows: cannibalized.slice(0, 150) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid analysis_type. Use: opportunities, decay, cannibalization" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("gsc-insights error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
