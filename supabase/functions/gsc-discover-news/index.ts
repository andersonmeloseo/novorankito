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
    const { project_id, search_type, days = 90 } = await req.json();
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

    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const fmtDate = (d: Date) => d.toISOString().split("T")[0];

    // Fetch by date and by page for the given search type (discover or googleNews)
    const type = search_type === "news" ? "googleNews" : "discover";

    const [dateRes, pageRes] = await Promise.all([
      fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: fmtDate(startDate),
          endDate: fmtDate(endDate),
          dimensions: ["date"],
          type,
          rowLimit: 25000,
        }),
      }),
      fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: fmtDate(startDate),
          endDate: fmtDate(endDate),
          dimensions: ["page"],
          type,
          rowLimit: 1000,
        }),
      }),
    ]);

    let dateData: any[] = [];
    let pageData: any[] = [];

    if (dateRes.ok) {
      const d = await dateRes.json();
      dateData = (d.rows || []).map((r: any) => ({
        date: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
      }));
    } else {
      const errText = await dateRes.text();
      console.error(`Discover/News date error [${dateRes.status}]:`, errText);
      // If 400, it means this search type isn't available for this property
      if (dateRes.status === 400) {
        return new Response(JSON.stringify({ 
          dateData: [], 
          pageData: [], 
          unavailable: true,
          message: `${type === "discover" ? "Google Discover" : "Google News"} não está disponível para esta propriedade.` 
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (pageRes.ok) {
      const d = await pageRes.json();
      pageData = (d.rows || []).map((r: any) => ({
        page: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
      }));
    }

    return new Response(JSON.stringify({ dateData, pageData, unavailable: false }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("gsc-discover-news error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
