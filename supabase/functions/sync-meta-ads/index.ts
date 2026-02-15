import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256Hash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID");
    const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");

    if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({
          error: "missing_credentials",
          message: "Credenciais do Meta Ads não configuradas. Configure: META_PIXEL_ID e META_ACCESS_TOKEN",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { conversions } = await req.json();

    if (!conversions || !Array.isArray(conversions) || conversions.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_conversions", message: "Nenhuma conversão para enviar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format events for Meta Conversions API (CAPI)
    // Meta CAPI expects SHA-256 hashed PII data
    const events = await Promise.all(
      conversions.map(async (c: any) => {
        const userData: Record<string, any> = {};

        // PII - hashed with SHA-256 (Meta requirement)
        if (c.contact_email) {
          userData.em = [await sha256Hash(c.contact_email)];
        }
        if (c.contact_phone) {
          const phone = c.contact_phone.replace(/\D/g, "");
          userData.ph = [await sha256Hash(phone)];
        }
        if (c.contact_name) {
          const names = c.contact_name.trim().split(" ");
          if (names[0]) userData.fn = [await sha256Hash(names[0])];
          if (c.contact_lastname) {
            userData.ln = [await sha256Hash(c.contact_lastname)];
          } else if (names.length > 1) {
            userData.ln = [await sha256Hash(names[names.length - 1])];
          }
        }

        // Location data - hashed
        if (c.city) userData.ct = [await sha256Hash(c.city)];
        if (c.state) userData.st = [await sha256Hash(c.state)];
        if (c.zip_code) userData.zp = [await sha256Hash(c.zip_code.replace("-", ""))];
        userData.country = [await sha256Hash("br")];

        // Click IDs (not hashed)
        if (c.fbc) userData.fbc = c.fbc;
        else if (c.fbclid) userData.fbc = `fb.1.${Date.now()}.${c.fbclid}`;
        if (c.fbp) userData.fbp = c.fbp;

        // Context signals
        if (c.ip_address) userData.client_ip_address = c.ip_address;
        if (c.user_agent) userData.client_user_agent = c.user_agent;

        // Determine event name based on conversion type
        let eventName = "Lead";
        if (c.conversion_type === "Visita Presencial" || c.conversion_type === "Evento/Feira") {
          eventName = "CompleteRegistration";
        } else if (c.value > 200) {
          eventName = "Purchase";
        }

        return {
          event_name: eventName,
          event_time: Math.floor(new Date(c.converted_at).getTime() / 1000),
          event_id: c.event_id || c.id, // Deduplication key - same as pixel event
          action_source: "system_generated",
          user_data: userData,
          custom_data: {
            value: c.value || 0,
            currency: c.currency || "BRL",
            content_name: c.conversion_type,
          },
        };
      })
    );

    // Send to Meta Conversions API v21
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: events }),
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      throw new Error(`Meta Conversions API error [${metaRes.status}]: ${JSON.stringify(metaData)}`);
    }

    console.log("Meta Ads CAPI sync result:", JSON.stringify(metaData));

    return new Response(
      JSON.stringify({
        success: true,
        sent: events.length,
        events_received: metaData.events_received,
        result: metaData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error syncing to Meta Ads CAPI:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
