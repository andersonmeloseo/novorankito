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
  const jwt = await createGoogleJWT(credentials, "https://www.googleapis.com/auth/webmasters");
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
    const body = await req.json();
    const { project_id, action, sitemap_url, sitemaps } = body;
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: conns, error: connErr } = await supabase.from("gsc_connections").select("*").eq("project_id", project_id).order("created_at", { ascending: true }).limit(1);
    const conn = conns?.[0];
    if (connErr || !conn || !conn.site_url) {
      return new Response(JSON.stringify({ error: "No GSC connection found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key });
    const baseUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(conn.site_url)}/sitemaps`;

    if (action === "list" || !action) {
      const res = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Sitemaps list error [${res.status}]: ${await res.text()}`);
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit") {
      // Support batch: sitemaps[] array or single sitemap_url
      const targets: string[] = sitemaps && Array.isArray(sitemaps) && sitemaps.length > 0
        ? sitemaps
        : sitemap_url ? [sitemap_url] : [];

      if (targets.length === 0) {
        return new Response(JSON.stringify({ error: "No sitemaps provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: { url: string; success: boolean; error?: string }[] = [];
      for (const url of targets) {
        try {
          const res = await fetch(`${baseUrl}/${encodeURIComponent(url)}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) {
            const errText = await res.text();
            results.push({ url, success: false, error: `[${res.status}] ${errText}` });
          } else {
            results.push({ url, success: true });
          }
        } catch (e: any) {
          results.push({ url, success: false, error: e.message });
        }
      }

      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      return new Response(JSON.stringify({ success: failed === 0, submitted: succeeded, failed, results }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete" && sitemap_url) {
      const res = await fetch(`${baseUrl}/${encodeURIComponent(sitemap_url)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Sitemap delete error [${res.status}]: ${await res.text()}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("gsc-sitemaps error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
