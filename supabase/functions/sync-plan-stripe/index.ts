import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[SYNC-PLAN-STRIPE] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // Auth — only admins
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "owner"])
      .limit(1)
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden — admin only");

    logStep("Authenticated admin", { userId: userData.user.id });

    const body = await req.json();
    const { plan_id } = body;
    if (!plan_id) throw new Error("plan_id is required");

    // Fetch plan from DB
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();
    if (planErr || !plan) throw new Error("Plan not found");

    logStep("Plan loaded", { slug: plan.slug, price: plan.price, stripe_price_id: plan.stripe_price_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    let stripeProductId: string | null = null;
    let stripePriceId: string | null = plan.stripe_price_id;

    // If plan already has a stripe_price_id, fetch the product from it
    if (stripePriceId) {
      try {
        const existingPrice = await stripe.prices.retrieve(stripePriceId);
        stripeProductId = existingPrice.product as string;
        logStep("Existing Stripe price found", { priceId: stripePriceId, productId: stripeProductId });

        // Check if price amount matches — if not, create a new price
        const currentAmount = Math.round(plan.price * 100);
        if (existingPrice.unit_amount !== currentAmount || !existingPrice.active) {
          logStep("Price mismatch or inactive, creating new price", {
            existing: existingPrice.unit_amount,
            expected: currentAmount,
          });

          // Deactivate old price
          await stripe.prices.update(stripePriceId, { active: false });

          // Create new price on same product
          const newPrice = await stripe.prices.create({
            product: stripeProductId,
            unit_amount: currentAmount,
            currency: "brl",
            recurring: { interval: plan.billing_interval === "yearly" ? "year" : "month" },
          });
          stripePriceId = newPrice.id;
          logStep("New price created", { priceId: stripePriceId });
        }

        // Update product name if changed
        await stripe.products.update(stripeProductId, {
          name: plan.name,
          description: plan.description || undefined,
        });
        logStep("Product updated");
      } catch (e) {
        logStep("Stripe price retrieval failed, will create new", { error: e.message });
        stripePriceId = null;
      }
    }

    // If no existing price, create product + price from scratch
    if (!stripePriceId) {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description || `Plano ${plan.name}`,
        metadata: { plan_id: plan.id, slug: plan.slug },
      });
      stripeProductId = product.id;
      logStep("Stripe product created", { productId: stripeProductId });

      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: Math.round(plan.price * 100),
        currency: "brl",
        recurring: { interval: plan.billing_interval === "yearly" ? "year" : "month" },
      });
      stripePriceId = price.id;
      logStep("Stripe price created", { priceId: stripePriceId });
    }

    // Save stripe_price_id back to DB
    const { error: updateErr } = await supabase
      .from("plans")
      .update({ stripe_price_id: stripePriceId })
      .eq("id", plan_id);
    if (updateErr) throw new Error("Failed to save stripe_price_id: " + updateErr.message);

    logStep("Plan updated in DB", { stripe_price_id: stripePriceId });

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
