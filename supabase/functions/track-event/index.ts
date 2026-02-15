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
    const body = await req.json();
    const { project_id, events } = body;

    if (!project_id || typeof project_id !== "string") {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: "events array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit batch size
    if (events.length > 50) {
      return new Response(JSON.stringify({ error: "max 50 events per batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify project exists
    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .single();

    if (projectErr || !project) {
      return new Response(JSON.stringify({ error: "project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ALLOWED_EVENT_TYPES = [
      "page_view", "page_exit", "click", "button_click", "link_click",
      "whatsapp_click", "phone_click", "email_click", "form_submit",
      "scroll", "product_view", "add_to_cart", "remove_from_cart",
      "begin_checkout", "purchase", "search", "video_play", "file_download",
      "custom",
    ];

    const sanitize = (val: unknown, maxLen = 500): string | null => {
      if (val == null || val === "") return null;
      return String(val).slice(0, maxLen);
    };

    const sanitizeNum = (val: unknown): number | null => {
      if (val == null) return null;
      const n = Number(val);
      return isFinite(n) ? n : null;
    };

    const rows = events.map((e: any) => ({
      project_id,
      event_type: ALLOWED_EVENT_TYPES.includes(e.event_type) ? e.event_type : "custom",
      page_url: sanitize(e.page_url, 2000),
      page_title: sanitize(e.page_title, 500),
      referrer: sanitize(e.referrer, 2000),
      device: sanitize(e.device, 20),
      browser: sanitize(e.browser, 50),
      os: sanitize(e.os, 50),
      screen_width: sanitizeNum(e.screen_width),
      screen_height: sanitizeNum(e.screen_height),
      language: sanitize(e.language, 10),
      country: sanitize(e.country, 100),
      city: sanitize(e.city, 100),
      state: sanitize(e.state, 100),
      platform: sanitize(e.platform, 50),
      cta_text: sanitize(e.cta_text, 200),
      cta_selector: sanitize(e.cta_selector, 300),
      session_id: sanitize(e.session_id, 64),
      visitor_id: sanitize(e.visitor_id, 64),
      utm_source: sanitize(e.utm_source, 200),
      utm_medium: sanitize(e.utm_medium, 200),
      utm_campaign: sanitize(e.utm_campaign, 200),
      utm_term: sanitize(e.utm_term, 200),
      utm_content: sanitize(e.utm_content, 200),
      gclid: sanitize(e.gclid, 200),
      fbclid: sanitize(e.fbclid, 200),
      scroll_depth: sanitizeNum(e.scroll_depth),
      time_on_page: sanitizeNum(e.time_on_page),
      form_id: sanitize(e.form_id, 200),
      product_id: sanitize(e.product_id, 200),
      product_name: sanitize(e.product_name, 300),
      product_price: sanitizeNum(e.product_price),
      cart_value: sanitizeNum(e.cart_value),
      metadata: e.metadata && typeof e.metadata === "object" ? e.metadata : null,
    }));

    const { error: insertErr } = await supabase.from("tracking_events").insert(rows);

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "failed to store events" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("track-event error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
