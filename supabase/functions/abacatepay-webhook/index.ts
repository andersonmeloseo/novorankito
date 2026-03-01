import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ABACATEPAY_API = "https://api.abacatepay.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("AbacatePay webhook received:", JSON.stringify(body));

    // AbacatePay sends different event structures
    const event = body?.event || body?.type;
    const billingData = body?.data || body?.billing || body;
    const billingId = billingData?.id || billingData?.billing?.id;
    const status = billingData?.status;
    const amount = billingData?.amount || billingData?.products?.[0]?.price;
    const metadata = billingData?.metadata || {};
    const customerEmail = billingData?.customer?.email || metadata?.user_email;
    const userId = metadata?.user_id;
    const planSlug = metadata?.plan_slug;
    const billingInterval = metadata?.billing_interval || "monthly";

    // Log webhook event
    await supabase.from("audit_logs").insert({
      user_id: userId || null,
      action: "abacatepay_webhook",
      entity_type: "billing",
      entity_id: billingId || null,
      detail: JSON.stringify({
        event,
        status,
        amount,
        customer_email: customerEmail,
        plan_slug: planSlug,
        billing_interval: billingInterval,
      }),
      status: "success",
    });

    // Handle payment confirmed
    if (status === "PAID" || event === "billing.paid" || event === "BILLING_PAID") {
      console.log(`Payment confirmed for billing ${billingId}, plan: ${planSlug}, user: ${userId}`);

      let resolvedUserId = userId;

      // If no user_id in metadata, try to find by email
      if (!resolvedUserId && customerEmail) {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const matchedUser = authUsers?.users?.find((u: any) => u.email === customerEmail);
        resolvedUserId = matchedUser?.id;
      }

      if (resolvedUserId) {
        // Calculate expiration
        const now = new Date();
        const expiresAt = billingInterval === "annual"
          ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        // Get plan limits
        const { data: planInfo } = await supabase
          .from("plans")
          .select("*")
          .eq("slug", planSlug || "start")
          .maybeSingle();

        // Update or create billing subscription
        const { data: existingSub } = await supabase
          .from("billing_subscriptions")
          .select("id")
          .eq("user_id", resolvedUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const subData = {
          plan: planSlug || "start",
          status: "active" as const,
          mrr: amount ? Math.round(amount / 100) : (planInfo?.price || 0),
          events_limit: planInfo?.events_limit || 5000,
          projects_limit: planInfo?.projects_limit || 1,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (existingSub) {
          await supabase
            .from("billing_subscriptions")
            .update(subData)
            .eq("id", existingSub.id);
        } else {
          await supabase.from("billing_subscriptions").insert({
            user_id: resolvedUserId,
            ...subData,
          });
        }

        // Send notification
        await supabase.from("notifications").insert({
          user_id: resolvedUserId,
          title: "🎉 Pagamento confirmado!",
          message: `Seu plano ${planInfo?.name || planSlug} foi ativado com sucesso via Pix. Válido até ${expiresAt.toLocaleDateString("pt-BR")}.`,
          type: "billing",
        });

        console.log(`Subscription activated: user=${resolvedUserId}, plan=${planSlug}, expires=${expiresAt.toISOString()}`);
      } else {
        console.warn("Could not resolve user for payment", { customerEmail, billingId });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Erro no webhook", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
