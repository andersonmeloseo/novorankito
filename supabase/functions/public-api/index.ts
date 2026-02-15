import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, jsonResponse, errorResponse } from "../_shared/utils.ts";
import { createLogger } from "../_shared/logger.ts";

/**
 * Public API Gateway - authenticates via API key (X-API-Key header)
 * and routes to the appropriate handler.
 * 
 * Endpoints:
 *   GET /public-api?action=metrics&project_id=...
 *   GET /public-api?action=urls&project_id=...
 *   GET /public-api?action=overview&project_id=...
 */
serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const log = createLogger("public-api", req);
  const timer = log.time("api-request");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate via API key
    const apiKey = req.headers.get("X-API-Key") || new URL(req.url).searchParams.get("api_key");
    if (!apiKey) {
      timer();
      return errorResponse("Missing API key. Provide X-API-Key header.", cors, 401);
    }

    // Hash the key for lookup
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const { data: apiKeyRecord, error: keyErr } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .maybeSingle();

    if (keyErr || !apiKeyRecord) {
      log.warn("Invalid API key attempt", { prefix: apiKey.substring(0, 8) });
      timer();
      return errorResponse("Invalid or inactive API key.", cors, 401);
    }

    // Check expiration
    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      timer();
      return errorResponse("API key expired.", cors, 401);
    }

    // Rate limiting
    const rateLimitKey = `api:${apiKeyRecord.id}`;
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_key: rateLimitKey,
      p_max_requests: apiKeyRecord.rate_limit_per_minute || 60,
      p_window_seconds: 60,
    });

    if (!allowed) {
      timer();
      return errorResponse("Rate limit exceeded. Try again later.", cors, 429);
    }

    // Update last_used_at
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyRecord.id);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "overview";
    const projectId = apiKeyRecord.project_id;
    const scopes = apiKeyRecord.scopes || ["read"];

    if (!scopes.includes("read")) {
      timer();
      return errorResponse("Insufficient scopes.", cors, 403);
    }

    log.info("API request", { action, project_id: projectId });

    let result: unknown;

    switch (action) {
      case "overview": {
        const { data, error } = await supabase.rpc("get_project_overview_v2", { p_project_id: projectId });
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "metrics": {
        const days = parseInt(url.searchParams.get("days") || "28");
        const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("seo_metrics")
          .select("metric_date, clicks, impressions, ctr, position, query, url, dimension_type")
          .eq("project_id", projectId)
          .gte("metric_date", startDate)
          .order("metric_date", { ascending: false })
          .limit(1000);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "urls": {
        const { data, error } = await supabase
          .from("site_urls")
          .select("url, status, url_type, url_group, priority, meta_title, meta_description, last_crawl")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "indexing": {
        const { data, error } = await supabase
          .from("indexing_requests")
          .select("url, status, request_type, submitted_at, completed_at, response_code")
          .eq("project_id", projectId)
          .order("submitted_at", { ascending: false })
          .limit(200);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      default:
        timer();
        return errorResponse(`Unknown action: ${action}. Available: overview, metrics, urls, indexing`, cors, 400);
    }

    timer();
    return jsonResponse({ data: result, action, project_id: projectId }, cors);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("API error", { error: msg });
    timer();
    return errorResponse(msg, cors, 500);
  }
});
