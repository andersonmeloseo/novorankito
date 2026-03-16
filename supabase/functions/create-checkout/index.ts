import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Gateway router started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { planSlug, billingInterval, trialDays, couponCode } = body;

    // Resolve plan to determine gateway
    let planData: any = null;
    if (planSlug) {
      const { data } = await supabaseAdmin
        .from("plans")
        .select("*")
        .eq("slug", planSlug)
        .single();
      planData = data;
    }

    if (!planData && body.priceId) {
      const { data } = await supabaseAdmin
        .from("plans")
        .select("*")
        .or(`stripe_price_id.eq.${body.priceId},stripe_annual_price_id.eq.${body.priceId}`)
        .limit(1)
        .maybeSingle();
      planData = data;
    }

    if (!planData) throw new Error("Plano não encontrado");

    const gateway = body.gateway || planData.payment_gateway || "asaas";
    logStep("Routing to gateway", { gateway, plan: planData.slug });

    // Route to the appropriate gateway function
    const functionUrl = `${supabaseUrl}/functions/v1`;
    let targetFunction: string;

    switch (gateway) {
      case "asaas":
        targetFunction = "asaas-checkout";
        break;
      case "abacatepay":
        targetFunction = "abacatepay-create-billing";
        break;
      case "stripe":
        // For Stripe, use direct checkout URL if available
        const isAnnual = billingInterval === "annual";
        const stripeUrl = isAnnual
          ? planData.stripe_annual_checkout_url
          : planData.stripe_checkout_url;
        if (stripeUrl) {
          return new Response(JSON.stringify({ url: stripeUrl, gateway: "stripe" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Fallback to sync-plan-stripe flow
        throw new Error("Stripe checkout URL not configured for this plan. Configure it in the admin panel.");
      default:
        throw new Error(`Unknown gateway: ${gateway}`);
    }

    // Forward the request to the target function
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization") || "",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
    };

    const targetRes = await fetch(`${functionUrl}/${targetFunction}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const targetData = await targetRes.json();
    logStep("Gateway response", { gateway, status: targetRes.status });

    // Add gateway info to response
    if (targetData && !targetData.error) {
      targetData.gateway = gateway;
    }

    return new Response(JSON.stringify(targetData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: targetRes.status,
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
