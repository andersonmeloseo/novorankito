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

    // Step 1: Get OAuth2 access token from refresh token
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

    // Step 2: Format conversions for Google Ads Offline Conversion Import API
    const customerId = GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, "");

    const operations = conversions
      .filter((c: any) => c.gclid)
      .map((c: any) => ({
        create: {
          gclid: c.gclid,
          conversionAction: `customers/${customerId}/conversionActions/DEFAULT`, // User should configure actual conversion action ID
          conversionDateTime: new Date(c.converted_at).toISOString().replace("T", " ").slice(0, 19) + "+00:00",
          conversionValue: c.value || 0,
          currencyCode: "BRL",
        },
      }));

    if (operations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma conversão com gclid válido para enviar",
          sent: 0,
          skipped: conversions.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Send to Google Ads API
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
          conversions: operations.map((op: any) => op.create),
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
        sent: operations.length,
        skipped: conversions.length - operations.length,
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
