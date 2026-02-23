import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { priceId, email: directEmail, trialDays, couponCode, billingInterval, planSlug } = body;

    // If planSlug provided, resolve priceId from DB
    let resolvedPriceId = priceId;
    if (planSlug && !priceId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const { data: planData } = await supabaseAdmin
        .from("plans")
        .select("stripe_price_id, stripe_annual_price_id")
        .eq("slug", planSlug)
        .single();
      if (planData) {
        resolvedPriceId = billingInterval === "annual" && planData.stripe_annual_price_id
          ? planData.stripe_annual_price_id
          : planData.stripe_price_id;
      }
    }
    if (!resolvedPriceId) throw new Error("priceId is required");

    let email: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader !== "Bearer ") {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      email = data.user?.email ?? null;
    }

    if (!email && directEmail) {
      email = directEmail;
    }

    if (!email) throw new Error("Email is required — pass it in body or authenticate");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Handle coupon validation and Stripe coupon
    let stripeCouponId: string | undefined;
    if (couponCode) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (coupon) {
        // Validate expiry and usage
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
          throw new Error("Cupom expirado");
        }
        if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
          throw new Error("Cupom esgotado");
        }

        // Create or reuse Stripe coupon
        if (coupon.stripe_coupon_id) {
          stripeCouponId = coupon.stripe_coupon_id;
        } else {
          const couponDuration = coupon.duration || "once";
          const stripeCoupon = await stripe.coupons.create({
            ...(coupon.discount_percent
              ? { percent_off: Number(coupon.discount_percent) }
              : { amount_off: Math.round(Number(coupon.discount_amount) * 100), currency: "brl" }),
            duration: couponDuration as any,
            ...(couponDuration === "repeating" && coupon.duration_in_months
              ? { duration_in_months: coupon.duration_in_months }
              : {}),
            name: coupon.code,
          });
          stripeCouponId = stripeCoupon.id;
          // Save stripe_coupon_id back
          await supabaseAdmin
            .from("coupons")
            .update({ stripe_coupon_id: stripeCoupon.id })
            .eq("id", coupon.id);
        }

        // Increment uses_count
        await supabaseAdmin
          .from("coupons")
          .update({ uses_count: coupon.uses_count + 1 })
          .eq("id", coupon.id);
      }
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/checkout-success`,
      cancel_url: `${req.headers.get("origin")}/landing?checkout=canceled`,
      metadata: { source: "rankito" },
      subscription_data: {
        metadata: { source: "rankito" },
        ...(trialDays && trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
