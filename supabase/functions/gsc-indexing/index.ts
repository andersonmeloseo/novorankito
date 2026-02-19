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
    const { project_id, action, urls, request_type, request_id, max_urls } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get all GSC connections for this project (limits accumulate: 200 per account)
    const { data: allConns, error: connErr } = await supabase.from("gsc_connections").select("*").eq("project_id", project_id).order("created_at", { ascending: true });
    const conn = allConns?.[0];
    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "No GSC connection found. Connect Google Search Console first." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const totalConnections = allConns?.length || 1;

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
      // Keep only latest request per URL (overwrite so last = most recent)
      const reqMap = new Map<string, any>();
      for (const r of (indexingReqs || [])) {
        reqMap.set(r.url, r);
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

      // sentToday: count unique URLs whose LATEST request today was successful (deduped by URL)
      const todayStr = new Date().toISOString().slice(0, 10);
      // reqMap already holds the latest request per URL (most recent wins due to ascending sort + overwrite)
      // Count URLs where the latest request was submitted today AND succeeded (not quota_exceeded or failed)
      const sentToday = Array.from(reqMap.values()).filter(
        (r: any) => r.submitted_at?.slice(0, 10) === todayStr && r.status === "success"
      ).length;

      return new Response(JSON.stringify({
        inventory,
        stats: { totalUrls, indexed, notIndexed, unknown, sentToday, dailyLimit: 200 * totalConnections },
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

    // ─── Action: "submit" — submit URLs to Google Indexing API (round-robin across all connections) ───
    if (action === "submit") {
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return new Response(JSON.stringify({ error: "urls array is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const type = request_type || "URL_UPDATED";
      const ownerId = conn.owner_id;

      // Get access tokens for all connections
      const connTokens: { conn: any; token: string; quotaExceeded: boolean; usedToday: number }[] = [];
      for (const c of allConns!) {
        try {
          const token = await getAccessToken({ client_email: c.client_email, private_key: c.private_key }, "https://www.googleapis.com/auth/indexing");
          connTokens.push({ conn: c, token, quotaExceeded: false, usedToday: 0 });
        } catch (e) {
          console.error(`Failed to get token for ${c.client_email}:`, e);
        }
      }

      if (connTokens.length === 0) {
        return new Response(JSON.stringify({ error: "Failed to authenticate with any GSC connection" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cap batch by active connections × 200 per connection
      const maxPerBatch = 200 * connTokens.length;
      const batch = urls.slice(0, Math.min(urls.length, maxPerBatch));

      const results: { url: string; status: string; response_code?: number; response_message?: string; fail_reason?: string; account?: string }[] = [];

      for (let i = 0; i < batch.length; i++) {
        const url = batch[i];

        // Pick an active (non-quota-exceeded) connection via round-robin
        // Filter to connections that haven't hit their 200/day limit
        const activeConns = connTokens.filter(ct => !ct.quotaExceeded && ct.usedToday < 200);
        if (activeConns.length === 0) {
          // All connections exhausted — mark remaining URLs as quota_exceeded
          results.push({ url, status: "quota_exceeded", response_code: 429, fail_reason: "All connections quota exceeded", account: "all" });
          continue;
        }

        // Round-robin across active connections only
        const ct = activeConns[i % activeConns.length];

        try {
          const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
            method: "POST",
            headers: { Authorization: `Bearer ${ct.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, type }),
          });

          const body = await res.json();

          if (res.ok) {
            ct.usedToday++;
            results.push({ url, status: "success", response_code: res.status, response_message: body.urlNotificationMetadata?.latestUpdate?.type || type, account: ct.conn.client_email });
          } else if (res.status === 429) {
            // Mark this connection as quota exhausted so it gets excluded from next picks
            ct.quotaExceeded = true;
            console.warn(`Quota exceeded for ${ct.conn.client_email}, removing from pool. Pool now has ${connTokens.filter(c => !c.quotaExceeded).length} active connections.`);
            // Retry this same URL with another connection (decrement i to re-process)
            const retryConns = connTokens.filter(c => !c.quotaExceeded && c.usedToday < 200);
            if (retryConns.length > 0) {
              const retryCt = retryConns[0];
              const retryRes = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
                method: "POST",
                headers: { Authorization: `Bearer ${retryCt.token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ url, type }),
              });
              const retryBody = await retryRes.json();
              if (retryRes.ok) {
                retryCt.usedToday++;
                results.push({ url, status: "success", response_code: retryRes.status, response_message: retryBody.urlNotificationMetadata?.latestUpdate?.type || type, account: retryCt.conn.client_email });
              } else if (retryRes.status === 429) {
                retryCt.quotaExceeded = true;
                results.push({ url, status: "quota_exceeded", response_code: 429, fail_reason: `Quota exceeded for all connections tried`, account: ct.conn.client_email });
              } else {
                results.push({ url, status: "failed", response_code: retryRes.status, fail_reason: retryBody.error?.message || `HTTP ${retryRes.status}`, account: retryCt.conn.client_email });
              }
            } else {
              results.push({ url, status: "quota_exceeded", response_code: 429, fail_reason: "All connections quota exceeded", account: ct.conn.client_email });
            }
          } else {
            results.push({ url, status: "failed", response_code: res.status, fail_reason: body.error?.message || `HTTP ${res.status}`, account: ct.conn.client_email });
          }

          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          results.push({ url, status: "failed", fail_reason: e instanceof Error ? e.message : "Unknown error", account: ct.conn.client_email });
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

      const activeAtEnd = connTokens.filter(ct => !ct.quotaExceeded).length;
      return new Response(JSON.stringify({
        submitted: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "failed").length,
        quota_exceeded: results.filter(r => r.status === "quota_exceeded").length,
        total: results.length,
        connections_used: connTokens.length,
        connections_active: activeAtEnd,
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

    // ─── Action: "inspect" — batch URL inspection via URL Inspection API (round-robin across connections) ───
    if (action === "inspect") {
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return new Response(JSON.stringify({ error: "urls array is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get tokens for all connections (inspection uses webmasters.readonly scope)
      const inspectTokens: { conn: any; token: string }[] = [];
      for (const c of allConns!) {
        try {
          const token = await getAccessToken({ client_email: c.client_email, private_key: c.private_key }, "https://www.googleapis.com/auth/webmasters.readonly");
          inspectTokens.push({ conn: c, token });
        } catch (e) {
          console.error(`Failed to get inspect token for ${c.client_email}:`, e);
        }
      }

      if (inspectTokens.length === 0) {
        return new Response(JSON.stringify({ error: "Failed to authenticate with any GSC connection" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];
      let errors = 0;
      const maxInspect = 2000 * inspectTokens.length; // 2000 per account/day
      const batch = urls.slice(0, Math.min(urls.length, maxInspect));

      for (let i = 0; i < batch.length; i++) {
        const url = batch[i];
        const ct = inspectTokens[i % inspectTokens.length];
        try {
          const inspectRes = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
            method: "POST",
            headers: { Authorization: `Bearer ${ct.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inspectionUrl: url, siteUrl: ct.conn.site_url }),
          });

          if (!inspectRes.ok) { errors++; continue; }

          const result = await inspectRes.json();
          const inspection = result.inspectionResult?.indexStatusResult || {};

          results.push({
            project_id,
            owner_id: ct.conn.owner_id,
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
        connections_used: inspectTokens.length,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: "submit_auto" — auto-select non-indexed URLs and submit them (used by cron) ───
    if (action === "submit_auto") {
      const maxUrls = max_urls || 200;

      // Get URLs that are not indexed (verdict != PASS or no verdict) and haven't been sent today
      const today = new Date().toISOString().slice(0, 10);

      // Get all site_urls
      const { data: siteUrls } = await supabase
        .from("site_urls")
        .select("url")
        .eq("project_id", project_id)
        .order("priority", { ascending: false })
        .limit(1000);

      if (!siteUrls || siteUrls.length === 0) {
        return new Response(JSON.stringify({ submitted: 0, message: "No URLs found" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get already-sent-today URLs
      const { data: sentToday } = await supabase
        .from("indexing_requests")
        .select("url")
        .eq("project_id", project_id)
        .gte("submitted_at", today + "T00:00:00Z");

      const sentSet = new Set((sentToday || []).map((r: any) => r.url));

      // Get indexed URLs (PASS verdict)
      const { data: indexedUrls } = await supabase
        .from("index_coverage")
        .select("url")
        .eq("project_id", project_id)
        .eq("verdict", "PASS");

      const indexedSet = new Set((indexedUrls || []).map((r: any) => r.url));

      // Select URLs: not indexed AND not sent today
      const candidates = siteUrls
        .map((u: any) => u.url)
        .filter((url: string) => !indexedSet.has(url) && !sentSet.has(url))
        .slice(0, maxUrls);

      if (candidates.length === 0) {
        return new Response(JSON.stringify({ submitted: 0, message: "No eligible URLs to submit" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Submit using the same logic as "submit"
      const type = "URL_UPDATED";
      const ownerId = conn.owner_id;

      const connTokens: { conn: any; token: string }[] = [];
      for (const c of allConns!) {
        try {
          const token = await getAccessToken({ client_email: c.client_email, private_key: c.private_key }, "https://www.googleapis.com/auth/indexing");
          connTokens.push({ conn: c, token });
        } catch (e) {
          console.error(`Failed to get token for ${c.client_email}:`, e);
        }
      }

      if (connTokens.length === 0) {
        return new Response(JSON.stringify({ error: "Failed to authenticate" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];
      for (let i = 0; i < candidates.length; i++) {
        const url = candidates[i];
        const ct = connTokens[i % connTokens.length];
        try {
          const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
            method: "POST",
            headers: { Authorization: `Bearer ${ct.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, type }),
          });
          const body = await res.json();
          results.push({
            url, status: res.ok ? "success" : res.status === 429 ? "quota_exceeded" : "failed",
            response_code: res.status,
            response_message: res.ok ? (body.urlNotificationMetadata?.latestUpdate?.type || type) : null,
            fail_reason: !res.ok ? (body.error?.message || `HTTP ${res.status}`) : null,
          });
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          results.push({ url, status: "failed", fail_reason: e instanceof Error ? e.message : "Unknown" });
        }
      }

      // Save results
      const rows = results.map(r => ({
        project_id, owner_id: ownerId, url: r.url, request_type: type,
        status: r.status, response_code: r.response_code || null,
        response_message: r.response_message || null, fail_reason: r.fail_reason || null,
        completed_at: r.status !== "pending" ? new Date().toISOString() : null,
        submitted_at: new Date().toISOString(),
      }));
      if (rows.length > 0) await supabase.from("indexing_requests").insert(rows);

      return new Response(JSON.stringify({
        submitted: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "failed").length,
        quota_exceeded: results.filter(r => r.status === "quota_exceeded").length,
        total: results.length,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: "inspect_auto" — auto-inspect URLs without coverage data (used by cron) ───
    if (action === "inspect_auto") {
      const maxUrls = Math.min(max_urls || 200, 500);

      // Get site URLs without inspection
      const { data: siteUrls } = await supabase
        .from("site_urls")
        .select("url")
        .eq("project_id", project_id)
        .limit(1000);

      const { data: inspected } = await supabase
        .from("index_coverage")
        .select("url")
        .eq("project_id", project_id);

      const inspectedSet = new Set((inspected || []).map((r: any) => r.url));
      const candidates = (siteUrls || [])
        .map((u: any) => u.url)
        .filter((url: string) => !inspectedSet.has(url))
        .slice(0, maxUrls);

      if (candidates.length === 0) {
        return new Response(JSON.stringify({ inspected: 0, message: "All URLs already inspected" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Inspect using same logic
      const inspectTokens: { conn: any; token: string }[] = [];
      for (const c of allConns!) {
        try {
          const token = await getAccessToken({ client_email: c.client_email, private_key: c.private_key }, "https://www.googleapis.com/auth/webmasters.readonly");
          inspectTokens.push({ conn: c, token });
        } catch (e) {
          console.error(`Failed to get inspect token for ${c.client_email}:`, e);
        }
      }

      if (inspectTokens.length === 0) {
        return new Response(JSON.stringify({ error: "Failed to authenticate" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];
      let errors = 0;
      for (let i = 0; i < candidates.length; i++) {
        const url = candidates[i];
        const ct = inspectTokens[i % inspectTokens.length];
        try {
          const inspectRes = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
            method: "POST",
            headers: { Authorization: `Bearer ${ct.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inspectionUrl: url, siteUrl: ct.conn.site_url }),
          });
          if (!inspectRes.ok) { errors++; continue; }
          const result = await inspectRes.json();
          const inspection = result.inspectionResult?.indexStatusResult || {};
          results.push({
            project_id, owner_id: ct.conn.owner_id, url,
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
        await supabase.from("index_coverage").upsert(results, { onConflict: "project_id,url" });
      }

      return new Response(JSON.stringify({ inspected: results.length, errors }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: "rebalance" — retry all quota_exceeded URLs redistributing across active connections ───
    if (action === "rebalance") {
      // Get all URLs with quota_exceeded status (their LATEST request is quota_exceeded)
      const { data: quotaRows, error: qErr } = await supabase
        .from("indexing_requests")
        .select("url, request_type, submitted_at")
        .eq("project_id", project_id)
        .eq("status", "quota_exceeded")
        .order("submitted_at", { ascending: false });

      if (qErr) throw qErr;
      if (!quotaRows || quotaRows.length === 0) {
        return new Response(JSON.stringify({ rebalanced: 0, message: "Nenhuma URL com quota excedida encontrada" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduplicate: keep only URLs whose LATEST request is still quota_exceeded
      // (Some might have been re-submitted successfully since)
      const { data: latestReqs } = await supabase
        .from("indexing_requests")
        .select("url, status, submitted_at")
        .eq("project_id", project_id)
        .order("submitted_at", { ascending: false });

      const latestMap = new Map<string, string>();
      for (const r of (latestReqs || [])) {
        if (!latestMap.has(r.url)) latestMap.set(r.url, r.status);
      }

      // Only URLs still quota_exceeded in their latest request
      const urlsToRetry = [...new Set(quotaRows.map((r: any) => r.url))].filter(
        u => latestMap.get(u) === "quota_exceeded"
      );

      if (urlsToRetry.length === 0) {
        return new Response(JSON.stringify({ rebalanced: 0, message: "Todas as URLs já foram reprocessadas com sucesso" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get access tokens for all connections
      const rebalTokens: { conn: any; token: string; quotaExceeded: boolean; usedToday: number }[] = [];
      for (const c of allConns!) {
        try {
          const token = await getAccessToken({ client_email: c.client_email, private_key: c.private_key }, "https://www.googleapis.com/auth/indexing");
          rebalTokens.push({ conn: c, token, quotaExceeded: false, usedToday: 0 });
        } catch (e) {
          console.error(`Rebalance: failed to get token for ${c.client_email}:`, e);
        }
      }

      if (rebalTokens.length === 0) {
        return new Response(JSON.stringify({ error: "Failed to authenticate with any GSC connection" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rebalResults: { url: string; status: string; account?: string; fail_reason?: string }[] = [];
      const type = "URL_UPDATED";

      for (let i = 0; i < urlsToRetry.length; i++) {
        const url = urlsToRetry[i];

        const activeConns = rebalTokens.filter(ct => !ct.quotaExceeded && ct.usedToday < 200);
        if (activeConns.length === 0) {
          rebalResults.push({ url, status: "quota_exceeded", fail_reason: "All connections quota exceeded" });
          continue;
        }

        const ct = activeConns[i % activeConns.length];

        try {
          const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
            method: "POST",
            headers: { Authorization: `Bearer ${ct.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, type }),
          });

          const body = await res.json();

          if (res.ok) {
            ct.usedToday++;
            rebalResults.push({ url, status: "success", account: ct.conn.client_email });
            // Update the DB record to success
            await supabase
              .from("indexing_requests")
              .update({
                status: "success",
                response_code: res.status,
                response_message: body.urlNotificationMetadata?.latestUpdate?.type || type,
                fail_reason: null,
                completed_at: new Date().toISOString(),
                submitted_at: new Date().toISOString(),
              })
              .eq("project_id", project_id)
              .eq("url", url)
              .eq("status", "quota_exceeded");
          } else if (res.status === 429) {
            ct.quotaExceeded = true;
            // Try next available connection immediately
            const retryConns = rebalTokens.filter(c => !c.quotaExceeded && c.usedToday < 200);
            if (retryConns.length > 0) {
              const retryCt = retryConns[0];
              const retryRes = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
                method: "POST",
                headers: { Authorization: `Bearer ${retryCt.token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ url, type }),
              });
              const retryBody = await retryRes.json();
              if (retryRes.ok) {
                retryCt.usedToday++;
                rebalResults.push({ url, status: "success", account: retryCt.conn.client_email });
                await supabase
                  .from("indexing_requests")
                  .update({
                    status: "success",
                    response_code: retryRes.status,
                    response_message: retryBody.urlNotificationMetadata?.latestUpdate?.type || type,
                    fail_reason: null,
                    completed_at: new Date().toISOString(),
                    submitted_at: new Date().toISOString(),
                  })
                  .eq("project_id", project_id)
                  .eq("url", url)
                  .eq("status", "quota_exceeded");
              } else {
                if (retryRes.status === 429) retryCt.quotaExceeded = true;
                rebalResults.push({ url, status: retryRes.status === 429 ? "quota_exceeded" : "failed", account: retryCt.conn.client_email });
              }
            } else {
              rebalResults.push({ url, status: "quota_exceeded", fail_reason: "All connections quota exceeded" });
            }
          } else {
            rebalResults.push({ url, status: "failed", fail_reason: body.error?.message || `HTTP ${res.status}`, account: ct.conn.client_email });
          }

          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          rebalResults.push({ url, status: "failed", fail_reason: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      const succeeded = rebalResults.filter(r => r.status === "success").length;
      const stillQuota = rebalResults.filter(r => r.status === "quota_exceeded").length;
      const failed = rebalResults.filter(r => r.status === "failed").length;

      return new Response(JSON.stringify({
        rebalanced: succeeded,
        still_quota_exceeded: stillQuota,
        failed,
        total_attempted: urlsToRetry.length,
        connections_used: rebalTokens.length,
        results: rebalResults,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: inventory, list, submit, submit_auto, retry, inspect, inspect_auto, rebalance" }), {
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
