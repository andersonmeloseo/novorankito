import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ASAAS-WEBHOOK] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Webhook received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const event = body.event;
    const payment = body.payment;

    log("Event received", { event, paymentId: payment?.id });

    // Only process confirmed payments
    const paidEvents = [
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
      "PAYMENT_CREDIT_CARD_CAPTURE_CONFIRMED",
    ];

    if (!paidEvents.includes(event)) {
      log("Ignoring event", { event });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payment) {
      log("No payment data in webhook");
      return new Response(JSON.stringify({ error: "No payment data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Parse externalReference: "rankito|slug|interval|userId"
    const extRef = payment.externalReference || "";
    const parts = extRef.split("|");
    const planSlug = parts[1] || "start";
    const billingInterval = parts[2] || "monthly";
    const userId = parts[3] && parts[3] !== "anon" ? parts[3] : null;

    log("Parsed payment", { planSlug, billingInterval, userId, amount: payment.value });

    if (!userId) {
      // Try to find user by customer email
      const asaasKey = Deno.env.get("ASAAS_API_KEY");
      if (asaasKey && payment.customer) {
        const ASAAS_API = asaasKey.startsWith("$aact_")
          ? "https://api.asaas.com/v3"
          : "https://sandbox.asaas.com/api/v3";

        const custRes = await fetch(`${ASAAS_API}/customers/${payment.customer}`, {
          headers: { access_token: asaasKey },
        });
        const custData = await custRes.json();

        if (custData?.email) {
          // Find user by email in profiles
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("display_name", custData.email)
            .maybeSingle();

          if (profile?.user_id) {
            log("Found user by email", { email: custData.email, userId: profile.user_id });
            await activateSubscription(supabaseAdmin, profile.user_id, planSlug, billingInterval, payment);
          } else {
            log("User not found by email", { email: custData.email });
          }
        }
      } else {
        log("No userId in externalReference and no way to look up");
      }
    } else {
      await activateSubscription(supabaseAdmin, userId, planSlug, billingInterval, payment);
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "asaas_webhook_payment_confirmed",
      entity_type: "payment",
      entity_id: payment.id,
      detail: JSON.stringify({
        event,
        plan: planSlug,
        amount: payment.value,
        interval: billingInterval,
      }),
      status: "success",
    });

    return new Response(JSON.stringify({ received: true, activated: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    log("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function activateSubscription(
  supabaseAdmin: any,
  userId: string,
  planSlug: string,
  billingInterval: string,
  payment: any
) {
  const expiresAt = new Date();
  if (billingInterval === "annual") {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }

  // Get plan limits
  const { data: planData } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("slug", planSlug)
    .single();

  const { error: subErr } = await supabaseAdmin
    .from("billing_subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: planSlug,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        mrr: payment.value || 0,
        projects_limit: planData?.projects_limit || 1,
        events_limit: planData?.events_limit || 5000,
      },
      { onConflict: "user_id" }
    );

  if (subErr) {
    log("Error upserting subscription", { error: subErr.message });
  } else {
    log("Subscription activated via webhook", { userId, planSlug });
  }
}
