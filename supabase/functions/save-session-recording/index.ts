import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: any;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      try { body = JSON.parse(text); } catch {
        return new Response(JSON.stringify({ error: "invalid JSON" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { project_id, session_id, visitor_id, page_url, device, browser, os, screen_width, screen_height, duration_ms, events_count, recording_data } = body;

    if (!project_id || !session_id) {
      return new Response(JSON.stringify({ error: "project_id and session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recording_data || !Array.isArray(recording_data)) {
      return new Response(JSON.stringify({ error: "recording_data array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit recording size (max 500 events per chunk, ~2MB)
    if (recording_data.length > 500) {
      return new Response(JSON.stringify({ error: "max 500 events per recording chunk" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify project exists
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .maybeSingle();

    if (!project) {
      return new Response(JSON.stringify({ error: "project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if recording for this session already exists (append)
    const { data: existing } = await supabase
      .from("session_recordings")
      .select("id, recording_data, events_count, duration_ms")
      .eq("project_id", project_id)
      .eq("session_id", session_id)
      .maybeSingle();

    if (existing) {
      // Append events to existing recording
      const existingData = (existing.recording_data as any[]) || [];
      const merged = [...existingData, ...recording_data].slice(-500); // keep last 500
      const { error } = await supabase
        .from("session_recordings")
        .update({
          recording_data: merged,
          events_count: merged.length,
          duration_ms: duration_ms || existing.duration_ms,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Update error:", error);
        return new Response(JSON.stringify({ error: "failed to update recording" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true, action: "updated", id: existing.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new recording
    const { data: inserted, error: insertErr } = await supabase
      .from("session_recordings")
      .insert({
        project_id,
        session_id,
        visitor_id: visitor_id || null,
        page_url: page_url || null,
        device: device || null,
        browser: browser || null,
        os: os || null,
        screen_width: screen_width || null,
        screen_height: screen_height || null,
        duration_ms: duration_ms || 0,
        events_count: recording_data.length,
        recording_data,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "failed to save recording" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, action: "created", id: inserted.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("save-session-recording error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
