import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ASAAS-CHECKOUT] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) throw new Error("ASAAS_API_KEY is not set");

    // Detect environment: sandbox vs production
    const isSandbox = asaasKey.startsWith("$aact_") === false;
    const ASAAS_API = asaasKey.startsWith("$aact_")
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

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
    log("User identified", { email, userId, planSlug, billingInterval });

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
    if (!planData) throw new Error("Plano não encontrado");
    log("Plan resolved", { name: planData.name, slug: planData.slug });

    // Calculate amount
    const isAnnual = billingInterval === "annual";
    let amountCents: number;

    if (isAnnual) {
      const annualTotal = planData.annual_price != null && planData.annual_price > 0
        ? planData.annual_price
        : planData.price * 10;
      amountCents = Math.round(annualTotal * 100);
    } else {
      const hasPromo = planData.promo_price != null &&
        (!planData.promo_ends_at || new Date(planData.promo_ends_at) > new Date());
      const price = hasPromo ? planData.promo_price : planData.price;
      amountCents = Math.round(price * 100);
    }

    // Apply coupon discount
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
        let discount = 0;
        if (coupon.discount_percent) {
          discount = Math.round(amountCents * (coupon.discount_percent / 100));
        } else if (coupon.discount_amount) {
          discount = Math.round(coupon.discount_amount * 100);
        }
        amountCents = Math.max(amountCents - discount, 100);
        await supabaseAdmin
          .from("coupons")
          .update({ uses_count: coupon.uses_count + 1 })
          .eq("id", coupon.id);
        log("Coupon applied", { code: coupon.code, discount });
      }
    }

    // Convert to BRL (Asaas uses float, e.g. 97.00)
    const amountBRL = amountCents / 100;

    // Step 1: Find or create customer in Asaas
    log("Finding/creating Asaas customer", { email });
    const custSearchRes = await fetch(`${ASAAS_API}/customers?email=${encodeURIComponent(email)}`, {
      headers: { access_token: asaasKey },
    });
    const custSearchData = await custSearchRes.json();

    let customerId: string;
    if (custSearchData?.data?.length > 0) {
      customerId = custSearchData.data[0].id;
      log("Existing customer found", { customerId });
    } else {
    const custRes = await fetch(`${ASAAS_API}/customers`, {
        method: "POST",
        headers: { access_token: asaasKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: body.name || email.split("@")[0],
          email,
          cpfCnpj: body.cpfCnpj || body.taxId || "00000000000",
          phone: body.phone || undefined,
        }),
      });
      const custData = await custRes.json();
      if (!custRes.ok) throw new Error(`Asaas customer error: ${JSON.stringify(custData)}`);
      customerId = custData.id;
      log("Customer created", { customerId });
    }

    // Step 2: Create payment (PIX by default, supports boleto and credit card)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow
    const dueDateStr = dueDate.toISOString().split("T")[0];

    const billingType = body.billingType || "UNDEFINED"; // UNDEFINED lets customer choose

    const paymentPayload: Record<string, unknown> = {
      customer: customerId,
      billingType,
      value: amountBRL,
      dueDate: dueDateStr,
      description: `${planData.name} — ${isAnnual ? "Anual" : "Mensal"}`,
      externalReference: JSON.stringify({
        source: "rankito",
        plan_slug: planData.slug,
        billing_interval: billingInterval || "monthly",
        user_id: userId,
        user_email: email,
        trial_days: trialDays || 0,
      }),
    };

    // If trial, set as 0 value and note
    if (trialDays && trialDays > 0) {
      paymentPayload.value = 0;
      paymentPayload.description = `Trial ${trialDays} dias — ${planData.name}`;
    }

    log("Creating Asaas payment", { amountBRL, billingType });
    const payRes = await fetch(`${ASAAS_API}/payments`, {
      method: "POST",
      headers: { access_token: asaasKey, "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload),
    });
    const payData = await payRes.json();
    log("Asaas payment response", { status: payRes.status, id: payData?.id });

    if (!payRes.ok) throw new Error(`Asaas payment error: ${JSON.stringify(payData)}`);

    // Step 3: Get payment link / invoice URL
    const paymentId = payData.id;
    const invoiceUrl = payData.invoiceUrl || payData.bankSlipUrl || `https://www.asaas.com/i/${paymentId}`;

    // Log audit
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "asaas_checkout_created",
      entity_type: "payment",
      entity_id: paymentId,
      detail: JSON.stringify({
        plan: planData.slug,
        amount: amountBRL,
        interval: billingInterval,
        payment_id: paymentId,
        customer_id: customerId,
      }),
      status: "success",
    });

    return new Response(JSON.stringify({
      url: invoiceUrl,
      paymentId,
      gateway: "asaas",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    log("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
