import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, jsonResponse, errorResponse } from "../_shared/utils.ts";
import { createLogger } from "../_shared/logger.ts";

/**
 * Background Job Processor
 * Picks up pending jobs from sync_jobs, processes them, and updates status.
 * Supports job types: gsc_sync, ga4_sync, indexing_batch, url_discovery.
 * Designed to be called by pg_cron or manually.
 */
serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const log = createLogger("process-jobs", req);
  const timer = log.time("job-processor");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const BATCH_SIZE = 10;
    const LOCK_TIMEOUT_MINUTES = 15;
    const lockCutoff = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

    // Pick up pending jobs (or stale locked jobs)
    const { data: jobs, error: fetchErr } = await supabase
      .from("sync_jobs")
      .select("*")
      .or(`status.eq.pending,and(status.eq.processing,locked_at.lt.${lockCutoff})`)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) {
      log.error("Failed to fetch jobs", { error: fetchErr.message });
      return errorResponse("Failed to fetch jobs", cors, 500);
    }

    if (!jobs || jobs.length === 0) {
      timer();
      return jsonResponse({ processed: 0, message: "No pending jobs" }, cors);
    }

    log.info(`Processing ${jobs.length} jobs`);

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const job of jobs) {
      const jobTimer = log.time(`job-${job.id}`);

      // Lock the job
      const { error: lockErr } = await supabase
        .from("sync_jobs")
        .update({
          status: "processing",
          locked_at: new Date().toISOString(),
          attempts: (job.attempts || 0) + 1,
        })
        .eq("id", job.id)
        .eq("status", job.status); // Optimistic lock

      if (lockErr) {
        log.warn(`Failed to lock job ${job.id}`, { error: lockErr.message });
        results.push({ id: job.id, status: "skip", error: "Lock failed" });
        continue;
      }

      try {
        const result = await processJob(supabase, job, log);

        await supabase
          .from("sync_jobs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            result,
            locked_at: null,
          })
          .eq("id", job.id);

        results.push({ id: job.id, status: "completed" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        const maxAttempts = job.max_attempts || 3;
        const attempts = (job.attempts || 0) + 1;
        const newStatus = attempts >= maxAttempts ? "failed" : "pending";

        await supabase
          .from("sync_jobs")
          .update({
            status: newStatus,
            error_message: msg,
            locked_at: null,
          })
          .eq("id", job.id);

        // Log to app_errors
        await supabase.from("app_errors").insert({
          source: "process-jobs",
          error_message: msg,
          function_name: `job:${job.job_type}`,
          project_id: job.project_id,
          user_id: job.owner_id,
          metadata: { job_id: job.id, attempt: attempts },
        });

        results.push({ id: job.id, status: newStatus, error: msg });
        log.error(`Job ${job.id} failed`, { error: msg, attempt: attempts });
      }

      jobTimer();
    }

    timer();
    return jsonResponse({ processed: results.length, results }, cors);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("Job processor crashed", { error: msg });
    timer();
    return errorResponse(msg, cors, 500);
  }
});

/**
 * Route job to the appropriate handler based on job_type.
 */
async function processJob(
  supabase: ReturnType<typeof createClient>,
  job: Record<string, any>,
  log: ReturnType<typeof createLogger>
): Promise<Record<string, unknown>> {
  const payload = job.payload || {};

  switch (job.job_type) {
    case "gsc_sync": {
      log.info("Processing GSC sync", { project_id: job.project_id });
      const { data, error } = await supabase.functions.invoke("fetch-gsc-data", {
        body: { project_id: job.project_id, ...payload },
      });
      if (error) throw new Error(`GSC sync failed: ${error.message}`);
      return { type: "gsc_sync", data };
    }

    case "ga4_sync": {
      log.info("Processing GA4 sync", { project_id: job.project_id });
      const { data, error } = await supabase.functions.invoke("fetch-ga4-data", {
        body: { project_id: job.project_id, ...payload },
      });
      if (error) throw new Error(`GA4 sync failed: ${error.message}`);
      return { type: "ga4_sync", data };
    }

    case "indexing_batch": {
      log.info("Processing indexing batch", { project_id: job.project_id });
      const { data, error } = await supabase.functions.invoke("gsc-indexing", {
        body: {
          project_id: job.project_id,
          action: payload.action || "submit_auto",
          max_urls: payload.max_urls || 200,
        },
      });
      if (error) throw new Error(`Indexing batch failed: ${error.message}`);
      return { type: "indexing_batch", data };
    }

    case "url_discovery": {
      log.info("Processing URL discovery", { project_id: job.project_id });
      const { data, error } = await supabase.functions.invoke("fetch-sitemap", {
        body: { project_id: job.project_id, ...payload },
      });
      if (error) throw new Error(`URL discovery failed: ${error.message}`);
      return { type: "url_discovery", data };
    }

    default:
      throw new Error(`Unknown job type: ${job.job_type}`);
  }
}
