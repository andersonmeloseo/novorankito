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
    let syncOnly = false;
    try {
      const body = await req.json();
      mode = body.mode || "user";
      limit = Math.min(Number(body.limit || 50), 100);
      syncOnly = body.syncOnly === true;
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
      // ---- SYNC: Fetch ALL invoices from Stripe and persist to DB ----
      console.log("[STRIPE-TX] Starting full invoice sync...");

      const allInvoices: any[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const params: any = {
          limit: 100,
          expand: ["data.customer", "data.subscription"],
        };
        if (startingAfter) params.starting_after = startingAfter;

        const batch = await stripe.invoices.list(params);
        allInvoices.push(...batch.data);
        hasMore = batch.has_more;
        if (batch.data.length > 0) {
          startingAfter = batch.data[batch.data.length - 1].id;
        }
      }

      console.log(`[STRIPE-TX] Fetched ${allInvoices.length} total invoices from Stripe`);

      // Upsert all invoices into stripe_transactions table
      const upsertRows = allInvoices.map((inv) => {
        const cust = typeof inv.customer === "object" ? inv.customer as Stripe.Customer : null;
        const subId = typeof inv.subscription === "string"
          ? inv.subscription
          : (inv.subscription as any)?.id || null;

        return {
          stripe_invoice_id: inv.id,
          stripe_subscription_id: subId,
          stripe_customer_id: cust?.id || (typeof inv.customer === "string" ? inv.customer : null),
          customer_email: cust?.email || null,
          customer_name: cust?.name || null,
          amount: (inv.amount_paid || inv.total || 0) / 100,
          currency: inv.currency || "brl",
          status: inv.status === "paid" ? "succeeded" : inv.status || "unknown",
          paid: inv.status === "paid",
          description: inv.lines?.data?.[0]?.description || null,
          plan_name: inv.lines?.data?.[0]?.description || null,
          invoice_pdf: inv.invoice_pdf || null,
          hosted_invoice_url: inv.hosted_invoice_url || null,
          error_message: inv.last_finalization_error?.message || null,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          stripe_created_at: new Date(inv.created * 1000).toISOString(),
          synced_at: new Date().toISOString(),
        };
      });

      if (upsertRows.length > 0) {
        // Upsert in batches of 50
        for (let i = 0; i < upsertRows.length; i += 50) {
          const batch = upsertRows.slice(i, i + 50);
          const { error: upsertErr } = await supabase
            .from("stripe_transactions")
            .upsert(batch, { onConflict: "stripe_invoice_id" });
          if (upsertErr) {
            console.error("[STRIPE-TX] Upsert error:", upsertErr.message);
          }
        }
        console.log(`[STRIPE-TX] Synced ${upsertRows.length} transactions to DB`);
      }

      if (syncOnly) {
        return new Response(
          JSON.stringify({ synced: upsertRows.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ---- READ from DB (always fresh after sync) ----
      const { data: dbTransactions } = await supabase
        .from("stripe_transactions")
        .select("*")
        .order("stripe_created_at", { ascending: false })
        .limit(limit);

      const transactions = (dbTransactions || []).map((tx: any) => ({
        id: tx.stripe_invoice_id,
        amount: Number(tx.amount),
        currency: tx.currency,
        status: tx.status,
        paid: tx.paid,
        created: tx.stripe_created_at,
        customer_email: tx.customer_email,
        customer_name: tx.customer_name,
        customer_id: tx.stripe_customer_id,
        description: tx.description,
        plan_name: tx.plan_name,
        invoice_id: tx.stripe_invoice_id,
        payment_method: null,
        receipt_url: tx.hosted_invoice_url,
        error_message: tx.error_message,
      }));

      // Summary from DB
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0, totalTransactions = 0;

      for (const tx of dbTransactions || []) {
        if (!tx.paid) continue;
        const txDate = new Date(tx.stripe_created_at);
        const amount = Number(tx.amount);
        totalTransactions++;
        if (txDate >= startOfMonth) monthRevenue += amount;
        if (txDate >= startOfWeek) weekRevenue += amount;
        if (txDate >= startOfDay) todayRevenue += amount;
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
    console.error("[STRIPE-TX] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
