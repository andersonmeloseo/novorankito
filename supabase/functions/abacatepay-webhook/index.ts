import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const event = body?.event || body?.type;
    const billingData = body?.data || body?.billing || body;

    const billingId = billingData?.id || billingData?.billing?.id;
    const status = billingData?.status;
    const amount = billingData?.amount || billingData?.products?.[0]?.price;
    const customerEmail = billingData?.customer?.email;

    // Log webhook event
    await supabase.from("audit_logs").insert({
      action: "abacatepay_webhook",
      entity_type: "billing",
      entity_id: billingId || null,
      detail: JSON.stringify({
        event,
        status,
        amount,
        customer_email: customerEmail,
        raw: body,
      }),
      status: "success",
    });

    // Handle payment confirmed
    if (status === "PAID" || event === "billing.paid" || event === "BILLING_PAID") {
      console.log(`Payment confirmed for billing ${billingId}`);

      // Try to find user by email and activate subscription
      if (customerEmail) {
        // Look up user by email in profiles or auth
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .ilike("display_name", `%${customerEmail}%`)
          .limit(1);

        const userId = profiles?.[0]?.user_id;

        if (userId) {
          // Update or create billing subscription
          const { data: existingSub } = await supabase
            .from("billing_subscriptions")
            .select("id")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSub) {
            await supabase
              .from("billing_subscriptions")
              .update({
                status: "active",
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingSub.id);
          } else {
            await supabase.from("billing_subscriptions").insert({
              user_id: userId,
              plan: "starter",
              status: "active",
              mrr: amount ? Math.round(amount / 100) : 0,
              events_limit: 5000,
              projects_limit: 3,
            });
          }

          // Send notification
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Pagamento confirmado!",
            message: `Seu pagamento via Pix foi confirmado. Sua assinatura está ativa.`,
            type: "billing",
          });

          console.log(`Subscription activated for user ${userId}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Erro no webhook", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
