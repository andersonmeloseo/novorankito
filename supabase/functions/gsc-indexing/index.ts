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

async function getAccessToken(credentials: { client_email: string; private_key: string }, scope: string): Promise<string> {
  const jwt = await createGoogleJWT(credentials, scope);
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
    const { project_id, action, urls, request_type, request_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get GSC connection
    const { data: conn, error: connErr } = await supabase.from("gsc_connections").select("*").eq("project_id", project_id).single();
    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "No GSC connection found. Connect Google Search Console first." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: "inventory" — site_urls + index_coverage + last indexing request ───
    if (action === "inventory") {
      // Recursive fetch helper to bypass 1000-row limit
      async function fetchAll(table: string, select: string, filters: Record<string, string>, orderCol = "url") {
        const PAGE = 1000;
        let allData: any[] = [];
        let from = 0;
        while (true) {
          let q = supabase.from(table).select(select).order(orderCol, { ascending: true }).range(from, from + PAGE - 1);
          for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
          const { data, error } = await q;
          if (error) throw error;
          if (!data || data.length === 0) break;
          allData = allData.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return allData;
      }

      // Get all site_urls (recursive)
      const siteUrls = await fetchAll("site_urls", "id, url, meta_title, status, url_type, url_group, priority, discovered_at, last_crawl", { project_id });

      // Get index_coverage for this project (recursive)
      const coverage = await fetchAll("index_coverage", "url, verdict, coverage_state, indexing_state, last_crawl_time, crawled_as, page_fetch_state, robotstxt_state, inspected_at", { project_id });

      // Get latest indexing request per URL (recursive)
      const indexingReqs = await fetchAll("indexing_requests", "url, status, submitted_at, request_type", { project_id }, "submitted_at");

      // Get last 28 days of SEO metrics per URL (clicks + impressions)
      const date28dAgo = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
      let seoMetrics: any[] = [];
      {
        const PAGE = 1000;
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("seo_metrics")
            .select("url, clicks, impressions")
            .eq("project_id", project_id)
            .eq("dimension_type", "page")
            .gte("metric_date", date28dAgo)
            .order("url", { ascending: true })
            .range(from, from + PAGE - 1);
          if (error) break;
          if (!data || data.length === 0) break;
          seoMetrics = seoMetrics.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
      }
      // Aggregate clicks + impressions per URL
      const metricsMap = new Map<string, { clicks: number; impressions: number }>();
      for (const m of seoMetrics) {
        if (!m.url) continue;
        const existing = metricsMap.get(m.url) || { clicks: 0, impressions: 0 };
        existing.clicks += m.clicks || 0;
        existing.impressions += m.impressions || 0;
        metricsMap.set(m.url, existing);
      }

      // Build maps
      const coverageMap = new Map((coverage || []).map((c: any) => [c.url, c]));
      // Keep only latest request per URL
      const reqMap = new Map<string, any>();
      for (const r of (indexingReqs || [])) {
        if (!reqMap.has(r.url)) reqMap.set(r.url, r);
      }

      const inventory = (siteUrls || []).map((u: any) => {
        const cov = coverageMap.get(u.url);
        const lastReq = reqMap.get(u.url);
        const metrics = metricsMap.get(u.url);
        return {
          ...u,
          // Coverage data
          verdict: cov?.verdict || null,
          coverage_state: cov?.coverage_state || null,
          indexing_state: cov?.indexing_state || null,
          last_crawl_time: cov?.last_crawl_time || null,
          crawled_as: cov?.crawled_as || null,
          page_fetch_state: cov?.page_fetch_state || null,
          robotstxt_state: cov?.robotstxt_state || null,
          inspected_at: cov?.inspected_at || null,
          // Last indexing request
          last_request_status: lastReq?.status || null,
          last_request_at: lastReq?.submitted_at || null,
          last_request_type: lastReq?.request_type || null,
          // GSC metrics (28d)
          clicks_28d: metrics?.clicks || 0,
          impressions_28d: metrics?.impressions || 0,
        };
      });

      // Summary stats
      const totalUrls = inventory.length;
      const indexed = inventory.filter((u: any) => u.verdict === "PASS").length;
      const notIndexed = inventory.filter((u: any) => u.verdict && u.verdict !== "PASS").length;
      const unknown = inventory.filter((u: any) => !u.verdict).length;
      const sentToday = (indexingReqs || []).filter((r: any) => r.submitted_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

      return new Response(JSON.stringify({
        inventory,
        stats: { totalUrls, indexed, notIndexed, unknown, sentToday, dailyLimit: 200 },
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: "list" — return stored indexing requests ───
    if (action === "list") {
      const { data, error } = await supabase
        .from("indexing_requests")
        .select("*")
        .eq("project_id", project_id)
        .order("submitted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return new Response(JSON.stringify({ rows: data || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: "submit" — submit URLs to Google Indexing API ───
    if (action === "submit") {
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return new Response(JSON.stringify({ error: "urls array is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const type = request_type || "URL_UPDATED";
      const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key }, "https://www.googleapis.com/auth/indexing");
      const ownerId = conn.owner_id;

      const results: { url: string; status: string; response_code?: number; response_message?: string; fail_reason?: string }[] = [];
      const batch = urls.slice(0, 50);

      for (const url of batch) {
        try {
          const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, type }),
          });

          const body = await res.json();

          if (res.ok) {
            results.push({ url, status: "success", response_code: res.status, response_message: body.urlNotificationMetadata?.latestUpdate?.type || type });
          } else if (res.status === 429) {
            results.push({ url, status: "quota_exceeded", response_code: 429, fail_reason: "Quota exceeded. Try again later." });
          } else {
            results.push({ url, status: "failed", response_code: res.status, fail_reason: body.error?.message || `HTTP ${res.status}` });
          }

          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          results.push({ url, status: "failed", fail_reason: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      // Save results
      const rows = results.map(r => ({
        project_id,
        owner_id: ownerId,
        url: r.url,
        request_type: type,
        status: r.status,
        response_code: r.response_code || null,
        response_message: r.response_message || null,
        fail_reason: r.fail_reason || null,
        completed_at: r.status !== "pending" ? new Date().toISOString() : null,
        submitted_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await supabase.from("indexing_requests").insert(rows);
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({
        submitted: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "failed").length,
        quota_exceeded: results.filter(r => r.status === "quota_exceeded").length,
        total: results.length,
        results,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: "retry" — retry a specific failed request ───
    if (action === "retry") {
      if (!request_id) {
        return new Response(JSON.stringify({ error: "request_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: req_data, error: reqErr } = await supabase
        .from("indexing_requests")
        .select("*")
        .eq("id", request_id)
        .single();
      if (reqErr || !req_data) {
        return new Response(JSON.stringify({ error: "Request not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key }, "https://www.googleapis.com/auth/indexing");

      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: req_data.url, type: req_data.request_type }),
      });

      const body = await res.json();
      const newStatus = res.ok ? "success" : res.status === 429 ? "quota_exceeded" : "failed";

      await supabase
        .from("indexing_requests")
        .update({
          status: newStatus,
          response_code: res.status,
          response_message: res.ok ? (body.urlNotificationMetadata?.latestUpdate?.type || "") : null,
          fail_reason: !res.ok ? (body.error?.message || `HTTP ${res.status}`) : null,
          retries: (req_data.retries || 0) + 1,
          completed_at: new Date().toISOString(),
        })
        .eq("id", request_id);

      return new Response(JSON.stringify({ status: newStatus, response_code: res.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: "inspect" — batch URL inspection via URL Inspection API ───
    if (action === "inspect") {
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return new Response(JSON.stringify({ error: "urls array is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getAccessToken(
        { client_email: conn.client_email, private_key: conn.private_key },
        "https://www.googleapis.com/auth/webmasters.readonly"
      );

      const results: any[] = [];
      let errors = 0;
      const batch = urls.slice(0, 20);

      for (const url of batch) {
        try {
          const inspectRes = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inspectionUrl: url, siteUrl: conn.site_url }),
          });

          if (!inspectRes.ok) { errors++; continue; }

          const result = await inspectRes.json();
          const inspection = result.inspectionResult?.indexStatusResult || {};

          results.push({
            project_id,
            owner_id: conn.owner_id,
            url,
            verdict: inspection.verdict || "VERDICT_UNSPECIFIED",
            coverage_state: inspection.coverageState || null,
            robotstxt_state: inspection.robotsTxtState || null,
            indexing_state: inspection.indexingState || null,
            page_fetch_state: inspection.pageFetchState || null,
            crawled_as: inspection.crawledAs || null,
            last_crawl_time: inspection.lastCrawlTime || null,
            referring_urls: inspection.referringUrls || [],
            sitemap: inspection.sitemap?.[0] || null,
            inspected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          await new Promise(r => setTimeout(r, 200));
        } catch { errors++; }
      }

      if (results.length > 0) {
        const { error: upsertErr } = await supabase
          .from("index_coverage")
          .upsert(results, { onConflict: "project_id,url" });
        if (upsertErr) throw upsertErr;
      }

      return new Response(JSON.stringify({
        inspected: results.length,
        errors,
        remaining: urls.length - batch.length,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: inventory, list, submit, retry, inspect" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("gsc-indexing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
