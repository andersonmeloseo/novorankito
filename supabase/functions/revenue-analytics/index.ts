import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    // Check admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "owner"])
      .limit(1)
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden — admin only");

    // Fetch all paid transactions from stripe_transactions table
    const { data: allTx } = await supabase
      .from("stripe_transactions")
      .select("*")
      .order("stripe_created_at", { ascending: true });

    const txList = allTx || [];

    // Fetch billing subscriptions for churn analysis
    const { data: subs } = await supabase
      .from("billing_subscriptions")
      .select("*");

    const subscriptions = subs || [];

    // ── MRR Trend (last 12 months) ──
    const now = new Date();
    const mrrTrend: { month: string; mrr: number; newMrr: number; churnedMrr: number; netNew: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

      // Revenue in this month from paid transactions
      const monthRevenue = txList
        .filter((tx: any) => {
          if (!tx.paid) return false;
          const txDate = new Date(tx.stripe_created_at);
          return txDate >= monthDate && txDate <= monthEnd;
        })
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      // Previous month revenue for comparison
      const prevMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
      const prevMonthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0, 23, 59, 59);
      const prevRevenue = txList
        .filter((tx: any) => {
          if (!tx.paid) return false;
          const txDate = new Date(tx.stripe_created_at);
          return txDate >= prevMonthDate && txDate <= prevMonthEnd;
        })
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      // Identify new vs churned customers in this month
      const monthCustomers = new Set(
        txList
          .filter((tx: any) => {
            if (!tx.paid) return false;
            const txDate = new Date(tx.stripe_created_at);
            return txDate >= monthDate && txDate <= monthEnd;
          })
          .map((tx: any) => tx.stripe_customer_id)
          .filter(Boolean)
      );

      const prevCustomers = new Set(
        txList
          .filter((tx: any) => {
            if (!tx.paid) return false;
            const txDate = new Date(tx.stripe_created_at);
            return txDate >= prevMonthDate && txDate <= prevMonthEnd;
          })
          .map((tx: any) => tx.stripe_customer_id)
          .filter(Boolean)
      );

      let newMrr = 0;
      let churnedMrr = 0;

      // New customers = in this month but not previous
      for (const cid of monthCustomers) {
        if (!prevCustomers.has(cid)) {
          const custRevenue = txList
            .filter((tx: any) => tx.paid && tx.stripe_customer_id === cid && new Date(tx.stripe_created_at) >= monthDate && new Date(tx.stripe_created_at) <= monthEnd)
            .reduce((s: number, tx: any) => s + Number(tx.amount), 0);
          newMrr += custRevenue;
        }
      }

      // Churned customers = in previous but not this month
      for (const cid of prevCustomers) {
        if (!monthCustomers.has(cid)) {
          const custRevenue = txList
            .filter((tx: any) => tx.paid && tx.stripe_customer_id === cid && new Date(tx.stripe_created_at) >= prevMonthDate && new Date(tx.stripe_created_at) <= prevMonthEnd)
            .reduce((s: number, tx: any) => s + Number(tx.amount), 0);
          churnedMrr += custRevenue;
        }
      }

      mrrTrend.push({
        month: monthKey,
        mrr: Math.round(monthRevenue * 100) / 100,
        newMrr: Math.round(newMrr * 100) / 100,
        churnedMrr: Math.round(churnedMrr * 100) / 100,
        netNew: Math.round((newMrr - churnedMrr) * 100) / 100,
      });
    }

    // ── Revenue Forecast (next 3 months - linear regression) ──
    const recentMonths = mrrTrend.slice(-6);
    const revenues = recentMonths.map(m => m.mrr);
    const n = revenues.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += revenues[i];
      sumXY += i * revenues[i];
      sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast: { month: string; projected: number; optimistic: number; conservative: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;
      const projected = Math.max(0, Math.round((slope * (n + i - 1) + intercept) * 100) / 100);
      forecast.push({
        month: monthKey,
        projected,
        optimistic: Math.round(projected * 1.2 * 100) / 100,
        conservative: Math.round(projected * 0.8 * 100) / 100,
      });
    }

    // ── Churn Risk Analysis ──
    const activeSubscribers = subscriptions.filter((s: any) => s.status === "active");

    // Build customer payment history for risk scoring
    const customerMap: Record<string, { email: string; name: string; plan: string; lastPayment: string; totalPaid: number; paymentCount: number; failedCount: number; daysSinceLastPayment: number }> = {};

    for (const tx of txList) {
      const cid = tx.stripe_customer_id;
      if (!cid) continue;

      if (!customerMap[cid]) {
        customerMap[cid] = {
          email: tx.customer_email || "—",
          name: tx.customer_name || "—",
          plan: tx.plan_name || "—",
          lastPayment: tx.stripe_created_at,
          totalPaid: 0,
          paymentCount: 0,
          failedCount: 0,
          daysSinceLastPayment: 0,
        };
      }

      const entry = customerMap[cid];
      if (new Date(tx.stripe_created_at) > new Date(entry.lastPayment)) {
        entry.lastPayment = tx.stripe_created_at;
        entry.plan = tx.plan_name || entry.plan;
      }

      if (tx.paid) {
        entry.totalPaid += Number(tx.amount);
        entry.paymentCount++;
      } else if (tx.status !== "open" && tx.status !== "draft") {
        entry.failedCount++;
      }
    }

    // Calculate risk scores
    const churnRisks: { customerId: string; email: string; name: string; plan: string; riskScore: number; riskLevel: string; reasons: string[]; lastPayment: string; totalPaid: number; ltv: number }[] = [];

    for (const [cid, data] of Object.entries(customerMap)) {
      const daysSince = Math.floor((now.getTime() - new Date(data.lastPayment).getTime()) / (1000 * 60 * 60 * 24));
      data.daysSinceLastPayment = daysSince;

      let riskScore = 0;
      const reasons: string[] = [];

      // Days since last payment (0-40 points)
      if (daysSince > 60) { riskScore += 40; reasons.push("Sem pagamento há 60+ dias"); }
      else if (daysSince > 45) { riskScore += 30; reasons.push("Sem pagamento há 45+ dias"); }
      else if (daysSince > 35) { riskScore += 20; reasons.push("Ciclo de cobrança possivelmente atrasado"); }

      // Failed payment ratio (0-30 points)
      const total = data.paymentCount + data.failedCount;
      if (total > 0) {
        const failRatio = data.failedCount / total;
        if (failRatio > 0.3) { riskScore += 30; reasons.push(`${Math.round(failRatio * 100)}% das cobranças falharam`); }
        else if (failRatio > 0.15) { riskScore += 15; reasons.push("Taxa de falha moderada"); }
      }

      // Low engagement / single payment (0-20 points)
      if (data.paymentCount <= 1) { riskScore += 20; reasons.push("Apenas 1 pagamento realizado"); }
      else if (data.paymentCount <= 2) { riskScore += 10; reasons.push("Poucos pagamentos no histórico"); }

      // Low LTV (0-10 points)
      if (data.totalPaid < 100) { riskScore += 10; reasons.push("LTV abaixo de R$100"); }

      const riskLevel = riskScore >= 60 ? "critical" : riskScore >= 35 ? "high" : riskScore >= 15 ? "medium" : "low";

      churnRisks.push({
        customerId: cid,
        email: data.email,
        name: data.name,
        plan: data.plan,
        riskScore: Math.min(100, riskScore),
        riskLevel,
        reasons,
        lastPayment: data.lastPayment,
        totalPaid: Math.round(data.totalPaid * 100) / 100,
        ltv: Math.round(data.totalPaid * 100) / 100,
      });
    }

    // Sort by risk score descending
    churnRisks.sort((a, b) => b.riskScore - a.riskScore);

    // ── Summary metrics ──
    const currentMonthMrr = mrrTrend[mrrTrend.length - 1]?.mrr || 0;
    const prevMonthMrr = mrrTrend[mrrTrend.length - 2]?.mrr || 0;
    const mrrGrowthPct = prevMonthMrr > 0 ? Math.round(((currentMonthMrr - prevMonthMrr) / prevMonthMrr) * 100) : 0;

    const totalCustomers = Object.keys(customerMap).length;
    const atRisk = churnRisks.filter(c => c.riskLevel === "critical" || c.riskLevel === "high").length;
    const avgLtv = totalCustomers > 0
      ? Math.round(churnRisks.reduce((s, c) => s + c.ltv, 0) / totalCustomers * 100) / 100
      : 0;

    const revenueAtRisk = churnRisks
      .filter(c => c.riskLevel === "critical" || c.riskLevel === "high")
      .reduce((s, c) => {
        // Estimate monthly revenue from this customer
        const months = Math.max(1, Math.ceil(c.ltv / (currentMonthMrr / totalCustomers || 1)));
        return s + (c.ltv / months);
      }, 0);

    return new Response(
      JSON.stringify({
        mrrTrend,
        forecast,
        churnRisks: churnRisks.slice(0, 50),
        summary: {
          currentMrr: currentMonthMrr,
          mrrGrowth: mrrGrowthPct,
          totalCustomers,
          atRiskCustomers: atRisk,
          avgLtv,
          revenueAtRisk: Math.round(revenueAtRisk * 100) / 100,
          projectedNextMonth: forecast[0]?.projected || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[REVENUE-ANALYTICS] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
