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
      // Get Rankito plan price IDs from DB
      const { data: plans } = await supabase
        .from("plans")
        .select("stripe_price_id")
        .not("stripe_price_id", "is", null);
      
      const rankitoPriceIds = new Set(
        (plans || []).map((p: any) => p.stripe_price_id).filter(Boolean)
      );

      console.log("[STRIPE-TX] Rankito price IDs from DB:", [...rankitoPriceIds]);

      // Get all subscriptions and check their price items
      const subscriptions = await stripe.subscriptions.list({
        limit: 100,
        status: "all",
        expand: ["data.items"],
      });

      // Find subscriptions that use Rankito prices
      const rankitoSubIds = new Set<string>();
      for (const sub of subscriptions.data) {
        const hasRankitoItem = sub.items?.data?.some(
          (item) => item.price && rankitoPriceIds.has(item.price.id)
        );
        if (hasRankitoItem) {
          rankitoSubIds.add(sub.id);
        }
      }
      console.log("[STRIPE-TX] Rankito subscription IDs:", [...rankitoSubIds]);

      // Get invoices for these subscriptions
      const allRankitoInvoices: any[] = [];
      for (const subId of rankitoSubIds) {
        const invoices = await stripe.invoices.list({
          subscription: subId,
          limit: 100,
          expand: ["data.customer"],
        });
        allRankitoInvoices.push(...invoices.data);
      }

      console.log("[STRIPE-TX] Total Rankito invoices:", allRankitoInvoices.length);

      const transactions = allRankitoInvoices
        .filter((inv) => inv.status === "paid" || inv.status === "open")
        .slice(0, limit)
        .map((inv) => {
          const cust = inv.customer as Stripe.Customer | null;
          return {
            id: inv.id,
            amount: (inv.amount_paid || inv.total || 0) / 100,
            currency: inv.currency,
            status: inv.status === "paid" ? "succeeded" : inv.status,
            paid: inv.status === "paid",
            created: new Date(inv.created * 1000).toISOString(),
            customer_email: cust?.email || null,
            customer_name: cust?.name || null,
            customer_id: cust?.id || null,
            description: inv.lines?.data?.[0]?.description || null,
            invoice_id: inv.id,
            payment_method: null,
            receipt_url: inv.hosted_invoice_url,
          };
        });

      // Summary from invoices
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayRevenue = 0;
      let weekRevenue = 0;
      let monthRevenue = 0;
      let totalTransactions = 0;

      for (const inv of allRankitoInvoices) {
        if (inv.status !== "paid") continue;
        const invDate = new Date(inv.created * 1000);
        const amount = (inv.amount_paid || 0) / 100;
        totalTransactions++;
        if (invDate >= startOfMonth) monthRevenue += amount;
        if (invDate >= startOfWeek) weekRevenue += amount;
        if (invDate >= startOfDay) todayRevenue += amount;
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
