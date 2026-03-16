import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-PAYMENT] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get user
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader !== "Bearer ") {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${authHeader.replace("Bearer ", "")}` } },
      });
      const { data } = await anonClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const body = await req.json();
    const { paymentId, gateway } = body;

    if (!paymentId) throw new Error("paymentId is required");

    let status = "PENDING";
    let paid = false;

    if (gateway === "asaas") {
      const asaasKey = Deno.env.get("ASAAS_API_KEY");
      if (!asaasKey) throw new Error("ASAAS_API_KEY not set");

      const ASAAS_API = asaasKey.startsWith("$aact_")
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/api/v3";

      const res = await fetch(`${ASAAS_API}/payments/${paymentId}`, {
        headers: { access_token: asaasKey },
      });
      const data = await res.json();
      log("Asaas payment status", { id: paymentId, status: data.status });

      status = data.status || "PENDING";
      // Asaas statuses: CONFIRMED, RECEIVED, RECEIVED_IN_CASH = paid
      paid = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(status);

      if (paid && userId) {
        // Parse externalReference: "rankito|slug|interval|userId"
        let planSlug = "start";
        let billingInterval = "monthly";
        try {
          const parts = (data.externalReference || "").split("|");
          planSlug = parts[1] || "start";
          billingInterval = parts[2] || "monthly";
        } catch {}

        // Activate subscription
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

        // Upsert subscription
        const { error: subErr } = await supabaseAdmin
          .from("billing_subscriptions")
          .upsert({
            user_id: userId,
            plan: planSlug,
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            mrr: data.value || 0,
            projects_limit: planData?.projects_limit || 1,
            events_limit: planData?.events_limit || 5000,
          }, { onConflict: "user_id" });

        if (subErr) {
          log("Error upserting subscription", { error: subErr.message });
        } else {
          log("Subscription activated", { userId, planSlug });
        }

        // Audit log
        await supabaseAdmin.from("audit_logs").insert({
          user_id: userId,
          action: "asaas_payment_confirmed",
          entity_type: "payment",
          entity_id: paymentId,
          detail: JSON.stringify({ plan: planSlug, amount: data.value, status }),
          status: "success",
        });
      }
    } else if (gateway === "abacatepay") {
      // For AbacatePay, payment status is handled by webhook
      // This is a fallback polling check
      status = "PENDING";
      paid = false;
    }

    return new Response(JSON.stringify({ status, paid, gateway }), {
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
