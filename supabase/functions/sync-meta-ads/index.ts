import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sha256Hash(value: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.trim().toLowerCase());
  const hashBuffer = new Uint8Array(
    // @ts-ignore - Deno's crypto.subtle
    crypto.subtle.digestSync("SHA-256", data)
  );
  return Array.from(hashBuffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256HashAsync(value: string): Promise<string> {
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
    const events = await Promise.all(
      conversions.map(async (c: any) => {
        const userData: Record<string, string> = {};

        if (c.contact_email) {
          userData.em = [await sha256HashAsync(c.contact_email)];
        }
        if (c.contact_phone) {
          const phone = c.contact_phone.replace(/\D/g, "");
          userData.ph = [await sha256HashAsync(phone)];
        }
        if (c.contact_name) {
          const names = c.contact_name.trim().split(" ");
          if (names[0]) userData.fn = [await sha256HashAsync(names[0])];
          if (names.length > 1) userData.ln = [await sha256HashAsync(names[names.length - 1])];
        }
        if (c.fbclid) {
          userData.fbc = `fb.1.${Date.now()}.${c.fbclid}`;
        }

        return {
          event_name: c.conversion_type === "Ligação Telefônica" ? "Lead" : "Purchase",
          event_time: Math.floor(new Date(c.converted_at).getTime() / 1000),
          action_source: "system_generated",
          user_data: userData,
          custom_data: {
            value: c.value || 0,
            currency: "BRL",
            content_name: c.conversion_type,
          },
          event_id: c.id,
        };
      })
    );

    // Send to Meta Conversions API
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: events,
        }),
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      throw new Error(`Meta Conversions API error [${metaRes.status}]: ${JSON.stringify(metaData)}`);
    }

    console.log("Meta Ads sync result:", JSON.stringify(metaData));

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
    console.error("Error syncing to Meta Ads:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
