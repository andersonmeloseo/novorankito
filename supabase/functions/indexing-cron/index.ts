import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const currentHHMM = `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}`;

    // 1. Process daily cron schedules
    const { data: cronSchedules } = await supabase
      .from("indexing_schedules")
      .select("*")
      .eq("schedule_type", "cron")
      .eq("enabled", true)
      .eq("status", "active");

    // 2. Process pending manual schedules
    const { data: manualSchedules } = await supabase
      .from("indexing_schedules")
      .select("*")
      .eq("schedule_type", "manual")
      .eq("status", "pending")
      .lte("scheduled_at", now.toISOString());

    const allSchedules = [...(cronSchedules || []), ...(manualSchedules || [])];
    const results: any[] = [];

    for (const schedule of allSchedules) {
      // For cron: only run if current time matches (within 5 min window)
      if (schedule.schedule_type === "cron" && schedule.cron_time) {
        const [schedH, schedM] = schedule.cron_time.split(":").map(Number);
        const [curH, curM] = currentHHMM.split(":").map(Number);
        const diffMin = Math.abs((schedH * 60 + schedM) - (curH * 60 + curM));
        if (diffMin > 5) continue;

        // Skip if already ran today
        if (schedule.last_run_at) {
          const lastRun = new Date(schedule.last_run_at);
          if (lastRun.toDateString() === now.toDateString()) continue;
        }
      }

      const actions = schedule.actions || [];
      const maxUrls = schedule.max_urls || 200;
      const runResult: any = { actions: [], errors: [] };

      try {
        for (const action of actions) {
          if (action === "indexing") {
            const { data, error } = await supabase.functions.invoke("gsc-indexing", {
              body: {
                project_id: schedule.project_id,
                action: "submit_auto",
                max_urls: maxUrls,
              },
            });
            if (error) runResult.errors.push(`indexing: ${error.message}`);
            else runResult.actions.push({ type: "indexing", result: data });
          }

          if (action === "inspection") {
            const { data, error } = await supabase.functions.invoke("gsc-indexing", {
              body: {
                project_id: schedule.project_id,
                action: "inspect_auto",
                max_urls: maxUrls,
              },
            });
            if (error) runResult.errors.push(`inspection: ${error.message}`);
            else runResult.actions.push({ type: "inspection", result: data });
          }
        }

        // Update schedule
        const updatePayload: any = {
          last_run_at: now.toISOString(),
          last_run_result: runResult,
        };
        if (schedule.schedule_type === "manual") {
          updatePayload.status = runResult.errors.length > 0 ? "failed" : "completed";
        }
        await supabase.from("indexing_schedules").update(updatePayload).eq("id", schedule.id);

        results.push({ schedule_id: schedule.id, status: "ok", result: runResult });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({ schedule_id: schedule.id, status: "error", error: msg });
        await supabase.from("indexing_schedules").update({
          last_run_at: now.toISOString(),
          last_run_result: { error: msg },
          ...(schedule.schedule_type === "manual" ? { status: "failed" } : {}),
        }).eq("id", schedule.id);
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("indexing-cron error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
