import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, jsonResponse, errorResponse } from "../_shared/utils.ts";
import { createLogger } from "../_shared/logger.ts";

/**
 * Cleanup old data to prevent unbounded table growth.
 * - tracking_events > 90 days
 * - session_recordings > 60 days
 * - app_errors > 30 days
 * - audit_logs > 180 days
 * Designed to be called by pg_cron daily.
 */
serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const log = createLogger("cleanup-old-data", req);
  const timer = log.time("cleanup");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Record<string, number> = {};

    // 1a. heatmap_click events > 30 days
    const { count: heatmapCount, error: e0 } = await supabase
      .from("tracking_events")
      .delete({ count: "exact" })
      .eq("event_type", "heatmap_click")
      .lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
    if (e0) log.error("heatmap cleanup failed", { error: e0.message });
    results.heatmap_events = heatmapCount || 0;

    // 1b. tracking_events > 90 days
    const { count: eventsCount, error: e1 } = await supabase
      .from("tracking_events")
      .delete({ count: "exact" })
      .lt("created_at", new Date(Date.now() - 90 * 86400000).toISOString());
    if (e1) log.error("tracking_events cleanup failed", { error: e1.message });
    results.tracking_events = eventsCount || 0;

    // 2. session_recordings > 60 days
    const { count: sessionsCount, error: e2 } = await supabase
      .from("session_recordings")
      .delete({ count: "exact" })
      .lt("created_at", new Date(Date.now() - 60 * 86400000).toISOString());
    if (e2) log.error("session_recordings cleanup failed", { error: e2.message });
    results.session_recordings = sessionsCount || 0;

    // 3. app_errors > 30 days
    const { count: errorsCount, error: e3 } = await supabase
      .from("app_errors")
      .delete({ count: "exact" })
      .lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
    if (e3) log.error("app_errors cleanup failed", { error: e3.message });
    results.app_errors = errorsCount || 0;

    // 4. audit_logs > 180 days
    const { count: logsCount, error: e4 } = await supabase
      .from("audit_logs")
      .delete({ count: "exact" })
      .lt("created_at", new Date(Date.now() - 180 * 86400000).toISOString());
    if (e4) log.error("audit_logs cleanup failed", { error: e4.message });
    results.audit_logs = logsCount || 0;

    log.info("Cleanup completed", results);
    timer();
    return jsonResponse({ success: true, deleted: results }, cors);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("Cleanup crashed", { error: msg });
    timer();
    return errorResponse(msg, cors, 500);
  }
});
