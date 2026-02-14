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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id } = await req.json();
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

    // GSC Links API - external and internal links
    const baseUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(conn.site_url)}`;

    // Fetch external links (backlinks) and internal links in parallel
    const [externalRes, internalRes] = await Promise.all([
      fetch(`${baseUrl}/searchAnalytics/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          dimensions: ["page"],
          rowLimit: 100,
          dimensionFilterGroups: [],
        }),
      }),
      // Use searchAppearance to get rich results data
      fetch(`${baseUrl}/searchAnalytics/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          dimensions: ["page", "query"],
          rowLimit: 500,
          dimensionFilterGroups: [],
        }),
      }),
    ]);

    let topPages: any[] = [];
    let internalLinks: any[] = [];

    if (externalRes.ok) {
      const data = await externalRes.json();
      topPages = (data.rows || []).map((r: any) => ({
        page: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
      }));
    }

    if (internalRes.ok) {
      const data = await internalRes.json();
      // Aggregate: count how many unique queries link to each page
      const pageQueryCount = new Map<string, { queries: Set<string>; clicks: number; impressions: number }>();
      for (const row of data.rows || []) {
        const page = row.keys[0];
        const query = row.keys[1];
        if (!pageQueryCount.has(page)) {
          pageQueryCount.set(page, { queries: new Set(), clicks: 0, impressions: 0 });
        }
        const entry = pageQueryCount.get(page)!;
        entry.queries.add(query);
        entry.clicks += row.clicks || 0;
        entry.impressions += row.impressions || 0;
      }
      internalLinks = Array.from(pageQueryCount.entries())
        .map(([page, data]) => ({
          page,
          queryCount: data.queries.size,
          clicks: data.clicks,
          impressions: data.impressions,
        }))
        .sort((a, b) => b.queryCount - a.queryCount)
        .slice(0, 100);
    }

    return new Response(JSON.stringify({ topPages, internalLinks }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("gsc-links error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
