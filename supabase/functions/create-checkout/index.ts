import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ABACATEPAY_API = "https://api.abacatepay.com/v1";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const abacateKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacateKey) throw new Error("ABACATEPAY_API_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get user from auth
    let email: string | null = null;
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader !== "Bearer ") {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${authHeader.replace("Bearer ", "")}` } },
      });
      const { data } = await anonClient.auth.getUser();
      email = data.user?.email ?? null;
      userId = data.user?.id ?? null;
    }

    const body = await req.json();
    const { planSlug, billingInterval, trialDays, couponCode } = body;

    if (!email && body.email) email = body.email;
    if (!email) throw new Error("Email is required — authenticate or pass in body");
    logStep("User identified", { email, userId, planSlug, billingInterval });

    // Resolve plan from DB
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
      // Fallback: find plan by stripe_price_id for backward compat
      const { data } = await supabaseAdmin
        .from("plans")
        .select("*")
        .or(`stripe_price_id.eq.${body.priceId},stripe_annual_price_id.eq.${body.priceId}`)
        .limit(1)
        .maybeSingle();
      planData = data;
    }

    if (!planData) throw new Error("Plano não encontrado");
    logStep("Plan resolved", { name: planData.name, slug: planData.slug });

    // Calculate amount in cents
    const isAnnual = billingInterval === "annual";
    let amountCents: number;

    if (isAnnual) {
      const annualTotal = planData.annual_price != null && planData.annual_price > 0
        ? planData.annual_price
        : planData.price * 10;
      amountCents = Math.round(annualTotal * 100);
    } else {
      // Check promo
      const hasPromo = planData.promo_price != null &&
        (!planData.promo_ends_at || new Date(planData.promo_ends_at) > new Date());
      const price = hasPromo ? planData.promo_price : planData.price;
      amountCents = Math.round(price * 100);
    }

    // Apply coupon discount
    let couponDiscount = 0;
    if (couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (coupon) {
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
          throw new Error("Cupom expirado");
        }
        if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
          throw new Error("Cupom esgotado");
        }
        if (coupon.discount_percent) {
          couponDiscount = Math.round(amountCents * (coupon.discount_percent / 100));
        } else if (coupon.discount_amount) {
          couponDiscount = Math.round(coupon.discount_amount * 100);
        }
        // Increment uses
        await supabaseAdmin
          .from("coupons")
          .update({ uses_count: coupon.uses_count + 1 })
          .eq("id", coupon.id);
        logStep("Coupon applied", { code: coupon.code, discount: couponDiscount });
      }
    }

    amountCents = Math.max(amountCents - couponDiscount, 100); // min 1 BRL

    logStep("Creating AbacatePay billing", { amountCents, isAnnual });

    // Determine payment methods from plan
    const methods = (planData.payment_methods && planData.payment_methods.length > 0)
      ? planData.payment_methods.map((m: string) => m.toUpperCase())
      : ["PIX"];

    const origin = req.headers.get("origin") || "https://novorankito.lovable.app";

    // Step 1: Create or find customer
    let customerId: string | null = null;
    const customerRes = await fetch(`${ABACATEPAY_API}/customer/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${abacateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: email,
        email: email,
      }),
    });
    const customerData = await customerRes.json();
    if (customerData?.data?.id) {
      customerId = customerData.data.id;
      logStep("Customer created/found", { customerId });
    }

    // Step 2: Create billing
    const billingPayload: Record<string, unknown> = {
      frequency: isAnnual ? "ONE_TIME" : "ONE_TIME", // AbacatePay handles frequency
      methods,
      products: [
        {
          externalId: `rankito_${planData.slug}_${isAnnual ? "annual" : "monthly"}_${userId || "anon"}`,
          name: `${planData.name} — ${isAnnual ? "Anual" : "Mensal"}`,
          quantity: 1,
          price: amountCents,
        },
      ],
      returnUrl: `${origin}/checkout-success?plan=${planData.slug}&interval=${billingInterval || "monthly"}`,
      completionUrl: `${origin}/checkout-success?plan=${planData.slug}&interval=${billingInterval || "monthly"}&paid=true`,
      metadata: {
        source: "rankito",
        plan_slug: planData.slug,
        billing_interval: billingInterval || "monthly",
        user_id: userId,
        user_email: email,
        trial_days: trialDays || 0,
      },
    };

    if (customerId) {
      billingPayload.customer = { id: customerId };
    }

    const billingRes = await fetch(`${ABACATEPAY_API}/billing/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${abacateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(billingPayload),
    });

    const billingData = await billingRes.json();
    logStep("AbacatePay response", { status: billingRes.status, data: billingData });

    if (!billingRes.ok) {
      throw new Error(`AbacatePay error: ${JSON.stringify(billingData)}`);
    }

    const checkoutUrl = billingData?.data?.url;
    if (!checkoutUrl) throw new Error("AbacatePay did not return a checkout URL");

    // Log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "abacatepay_checkout_created",
      entity_type: "billing",
      entity_id: billingData?.data?.id,
      detail: JSON.stringify({
        plan: planData.slug,
        amount: amountCents,
        interval: billingInterval,
        billing_id: billingData?.data?.id,
      }),
      status: "success",
    });

    return new Response(JSON.stringify({ url: checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
