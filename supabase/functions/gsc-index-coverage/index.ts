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
    const { project_id, action } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get GSC connection
    const { data: conn, error: connErr } = await supabase.from("gsc_connections").select("*").eq("project_id", project_id).limit(1).maybeSingle();
    if (connErr || !conn || !conn.site_url) {
      return new Response(JSON.stringify({ error: "No GSC connection found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: "list" - return stored coverage data
    if (action === "list") {
      const { data: coverage, error: covErr } = await supabase
        .from("index_coverage")
        .select("*")
        .eq("project_id", project_id)
        .order("inspected_at", { ascending: false });

      if (covErr) throw covErr;
      return new Response(JSON.stringify({ rows: coverage || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: "scan" - inspect URLs from site_urls table in batch
    if (action === "scan") {
      const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key });

      // Get URLs to inspect from site_urls
      const { data: siteUrls, error: urlErr } = await supabase
        .from("site_urls")
        .select("url, owner_id")
        .eq("project_id", project_id)
        .limit(50); // Batch of 50 to stay within edge function timeout

      if (urlErr) throw urlErr;
      if (!siteUrls || siteUrls.length === 0) {
        return new Response(JSON.stringify({ error: "No URLs found in site_urls. Import URLs first via Sitemaps or URL management." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check which URLs were already inspected recently (< 24h)
      const { data: recentCoverage } = await supabase
        .from("index_coverage")
        .select("url, inspected_at")
        .eq("project_id", project_id);

      const recentMap = new Map((recentCoverage || []).map((r: any) => [r.url, new Date(r.inspected_at).getTime()]));
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      // Filter URLs that need inspection (not inspected or older than 24h)
      const urlsToInspect = siteUrls.filter((u: any) => {
        const lastInspected = recentMap.get(u.url);
        return !lastInspected || lastInspected < oneDayAgo;
      });

      if (urlsToInspect.length === 0) {
        return new Response(JSON.stringify({ message: "All URLs were inspected recently. Try again in 24h.", inspected: 0 }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Limit to 20 per call to avoid API quota issues
      const batch = urlsToInspect.slice(0, 20);
      const results: any[] = [];
      let errors = 0;

      for (const urlObj of batch) {
        try {
          const inspectRes = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inspectionUrl: urlObj.url, siteUrl: conn.site_url }),
          });

          if (!inspectRes.ok) {
            errors++;
            continue;
          }

          const result = await inspectRes.json();
          const inspection = result.inspectionResult?.indexStatusResult || {};

          const row = {
            project_id,
            owner_id: urlObj.owner_id,
            url: urlObj.url,
            verdict: inspection.verdict || "VERDICT_UNSPECIFIED",
            coverage_state: inspection.coverageState || null,
            robotstxt_state: inspection.robotsTxtState || null,
            indexing_state: inspection.indexingState || null,
            page_fetch_state: inspection.pageFetchState || null,
            crawled_as: inspection.crawledAs || null,
            last_crawl_time: inspection.lastCrawlTime || null,
            referring_urls: inspection.referringUrls?.map((u: any) => u) || [],
            sitemap: inspection.sitemap?.[0] || null,
            inspected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          results.push(row);

          // Small delay to respect rate limits
          await new Promise(r => setTimeout(r, 200));
        } catch {
          errors++;
        }
      }

      // Upsert results
      if (results.length > 0) {
        const { error: upsertErr } = await supabase
          .from("index_coverage")
          .upsert(results, { onConflict: "project_id,url" });
        if (upsertErr) throw upsertErr;
      }

      return new Response(JSON.stringify({
        inspected: results.length,
        errors,
        remaining: urlsToInspect.length - batch.length,
        total: siteUrls.length,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: list, scan" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("gsc-index-coverage error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
