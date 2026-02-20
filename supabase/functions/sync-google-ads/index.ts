import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
    const GOOGLE_ADS_CUSTOMER_ID = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID");
    const GOOGLE_ADS_REFRESH_TOKEN = Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN");
    const GOOGLE_ADS_CLIENT_ID = Deno.env.get("GOOGLE_ADS_CLIENT_ID");
    const GOOGLE_ADS_CLIENT_SECRET = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET");
    const GOOGLE_ADS_CONVERSION_ACTION_ID = Deno.env.get("GOOGLE_ADS_CONVERSION_ACTION_ID");

    if (!GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CUSTOMER_ID || !GOOGLE_ADS_REFRESH_TOKEN || !GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({
          error: "missing_credentials",
          message: "Credenciais do Google Ads não configuradas. Configure: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET",
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

    // Step 1: Get OAuth2 access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_ADS_CLIENT_ID,
        client_secret: GOOGLE_ADS_CLIENT_SECRET,
        refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      throw new Error(`Falha ao obter token OAuth2 do Google: ${tokenErr}`);
    }

    const { access_token } = await tokenRes.json();
    const customerId = GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, "");
    const conversionAction = GOOGLE_ADS_CONVERSION_ACTION_ID
      ? `customers/${customerId}/conversionActions/${GOOGLE_ADS_CONVERSION_ACTION_ID}`
      : `customers/${customerId}/conversionActions/DEFAULT`;

    // Step 2: Format conversions for Google Ads Offline Conversion Import
    // Google requires gclid OR wbraid/gbraid for click attribution
    const formattedConversions = conversions
      .filter((c: any) => c.gclid || c.wbraid || c.gbraid)
      .map((c: any) => {
        const conv: Record<string, any> = {
          conversionAction,
          conversionDateTime: new Date(c.converted_at).toISOString().replace("T", " ").slice(0, 19) + "+00:00",
          conversionValue: c.value || 0,
          currencyCode: c.currency || "BRL",
        };

        // Click attribution - use gclid, wbraid, or gbraid
        if (c.gclid) conv.gclid = c.gclid;
        else if (c.wbraid) conv.wbraid = c.wbraid;
        else if (c.gbraid) conv.gbraid = c.gbraid;

        // User identifiers for enhanced conversions
        const userIdentifiers: any[] = [];
        if (c.contact_email) {
          userIdentifiers.push({ hashedEmail: c.contact_email.trim().toLowerCase() });
        }
        if (c.contact_phone) {
          const phone = c.contact_phone.replace(/\D/g, "");
          userIdentifiers.push({ hashedPhoneNumber: `+${phone}` });
        }
        if (c.contact_name) {
          const names = c.contact_name.trim().split(" ");
          if (names[0]) {
            userIdentifiers.push({
              addressInfo: {
                hashedFirstName: names[0].toLowerCase(),
                ...(c.contact_lastname ? { hashedLastName: c.contact_lastname.toLowerCase() } : {}),
                ...(c.city ? { city: c.city } : {}),
                ...(c.state ? { state: c.state } : {}),
                ...(c.zip_code ? { postalCode: c.zip_code.replace("-", "") } : {}),
                countryCode: "BR",
              },
            });
          }
        }

        if (userIdentifiers.length > 0) {
          conv.userIdentifiers = userIdentifiers;
        }

        return conv;
      });

    if (formattedConversions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma conversão com gclid/wbraid/gbraid para enviar",
          sent: 0,
          skipped: conversions.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Send to Google Ads API v18
    const googleAdsRes = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}:uploadClickConversions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversions: formattedConversions,
          partialFailure: true,
        }),
      }
    );

    const googleAdsData = await googleAdsRes.json();

    if (!googleAdsRes.ok) {
      throw new Error(`Google Ads API error [${googleAdsRes.status}]: ${JSON.stringify(googleAdsData)}`);
    }

    console.log("Google Ads sync result:", JSON.stringify(googleAdsData));

    return new Response(
      JSON.stringify({
        success: true,
        sent: formattedConversions.length,
        skipped: conversions.length - formattedConversions.length,
        result: googleAdsData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error syncing to Google Ads:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
