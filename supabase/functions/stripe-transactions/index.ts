import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const user = userData.user;
    let mode = "user";
    let limit = 50;
    try {
      const body = await req.json();
      mode = body.mode || "user";
      limit = Math.min(Number(body.limit || 50), 100);
    } catch { /* GET with no body */ }

    // Check admin role if admin mode
    if (mode === "admin") {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "owner"])
        .limit(1)
        .maybeSingle();
      if (!roleRow) throw new Error("Forbidden — admin only");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    if (mode === "admin") {
      // Admin: get all recent charges with customer info
      const charges = await stripe.charges.list({
        limit,
        expand: ["data.customer"],
      });

      const transactions = charges.data.map((ch) => {
        const cust = ch.customer as Stripe.Customer | null;
        return {
          id: ch.id,
          amount: ch.amount / 100,
          currency: ch.currency,
          status: ch.status,
          paid: ch.paid,
          created: new Date(ch.created * 1000).toISOString(),
          customer_email: cust?.email || ch.billing_details?.email || null,
          customer_name: cust?.name || ch.billing_details?.name || null,
          customer_id: cust?.id || null,
          description: ch.description,
          invoice_id: ch.invoice,
          payment_method: ch.payment_method_details?.type || null,
          receipt_url: ch.receipt_url,
        };
      });

      // Also get summary stats
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayRevenue = 0;
      let weekRevenue = 0;
      let monthRevenue = 0;
      let totalTransactions = 0;

      for (const ch of charges.data) {
        if (!ch.paid || ch.status !== "succeeded") continue;
        const chDate = new Date(ch.created * 1000);
        const amount = ch.amount / 100;
        totalTransactions++;
        if (chDate >= startOfMonth) monthRevenue += amount;
        if (chDate >= startOfWeek) weekRevenue += amount;
        if (chDate >= startOfDay) todayRevenue += amount;
      }

      return new Response(
        JSON.stringify({
          transactions,
          summary: {
            today: todayRevenue,
            week: weekRevenue,
            month: monthRevenue,
            total_transactions: totalTransactions,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // User mode: get invoices for this specific customer
      if (!user.email) throw new Error("User email not available");

      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        return new Response(
          JSON.stringify({ invoices: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const customerId = customers.data[0].id;
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        expand: ["data.subscription"],
      });

      const result = invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount: (inv.amount_paid || 0) / 100,
        currency: inv.currency,
        status: inv.status,
        created: new Date(inv.created * 1000).toISOString(),
        period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
        period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        invoice_pdf: inv.invoice_pdf,
        hosted_invoice_url: inv.hosted_invoice_url,
        plan_name: inv.lines?.data?.[0]?.description || null,
      }));

      return new Response(
        JSON.stringify({ invoices: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
