import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Fetch geolocation from IP using ipgeolocation.io
async function getGeoFromIP(ip: string): Promise<{ country: string | null; city: string | null; state: string | null } | null> {
  const apiKey = Deno.env.get("IPGEOLOCATION_API_KEY");
  if (!apiKey || !ip || ip === "127.0.0.1" || ip === "::1") return null;

  try {
    const res = await fetch(
      `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}&fields=country_name,city,state_prov`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) {
      console.warn("ipgeolocation API error:", res.status);
      return null;
    }
    const data = await res.json();
    return {
      country: data.country_name || null,
      city: data.city || null,
      state: data.state_prov || null,
    };
  } catch (err) {
    console.warn("ipgeolocation fetch failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both application/json and text/plain (sendBeacon)
    let body: any;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // sendBeacon sends as text/plain
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        return new Response(JSON.stringify({ error: "invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
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

    // --- Geolocation: prioritize client-sent > Cloudflare headers > IP API ---
    const firstEvent = events[0];
    const needsGeo = !firstEvent?.country && !firstEvent?.city;
    let geo: { country: string | null; city: string | null; state: string | null } | null = null;

    if (needsGeo) {
      // Try Cloudflare headers first (most reliable in edge environments)
      const cfCountry = req.headers.get("cf-ipcountry");
      const cfCity = req.headers.get("cf-ipcity");
      const cfRegion = req.headers.get("cf-region");

      if (cfCountry && cfCountry !== "XX") {
        geo = { country: cfCountry, city: cfCity || null, state: cfRegion || null };
      } else {
        // Fallback to IP geolocation API
        const clientIP =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("cf-connecting-ip") ||
          req.headers.get("x-real-ip") ||
          null;
        if (clientIP) {
          geo = await getGeoFromIP(clientIP);
        }
      }
    }

    const ALLOWED_EVENT_TYPES = [
      "page_view", "page_exit", "click", "button_click", "link_click",
      "whatsapp_click", "phone_click", "email_click", "form_submit",
      "scroll", "product_view", "add_to_cart", "remove_from_cart",
      "begin_checkout", "purchase", "search", "video_play", "file_download",
      "heatmap_click", "rage_click", "dead_click", "js_error", "text_copy",
      "web_vitals",
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
      // Use client-provided location OR fallback to IP geolocation
      country: sanitize(e.country, 100) || geo?.country || null,
      city: sanitize(e.city, 100) || geo?.city || null,
      state: sanitize(e.state, 100) || geo?.state || null,
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

    // ── Auto-create offline conversions for conversion-type events ──
    const CONVERSION_EVENT_TYPES = ["whatsapp_click", "phone_click", "email_click", "form_submit", "purchase"];
    const conversionRows = rows
      .filter((r: any) => CONVERSION_EVENT_TYPES.includes(r.event_type))
      .map((r: any) => {
        // Get project owner for owner_id
        const eventType = r.event_type === "purchase" ? "sale"
          : r.event_type === "form_submit" ? "lead"
          : r.event_type === "email_click" ? "email"
          : r.event_type === "phone_click" ? "call"
          : "whatsapp";

        return {
          project_id,
          owner_id: "00000000-0000-0000-0000-000000000000", // placeholder, will be set below
          event_type: eventType,
          source: r.utm_source || null,
          medium: r.utm_medium || null,
          campaign: r.utm_campaign || null,
          device: r.device || null,
          location: [r.city, r.state, r.country].filter(Boolean).join(", ") || null,
          page: r.page_url || null,
          lead_name: r.cta_text || null,
          lead_phone: r.event_type === "phone_click" ? (r.cta_text || null) : null,
          lead_email: r.event_type === "email_click" ? (r.cta_text || null) : null,
          value: r.event_type === "purchase" ? (r.cart_value || r.product_price || null) : null,
        };
      });

    if (conversionRows.length > 0) {
      // Get project owner_id
      const { data: proj } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", project_id)
        .single();

      if (proj?.owner_id) {
        const withOwner = conversionRows.map((c: any) => ({ ...c, owner_id: proj.owner_id }));
        const { error: convErr } = await supabase.from("conversions").insert(withOwner);
        if (convErr) {
          console.warn("Auto-conversion insert error:", convErr.message);
        } else {
          console.log(`Auto-created ${withOwner.length} conversion(s) from pixel events`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length, conversions: conversionRows.length, geo: geo ? true : false }), {
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
