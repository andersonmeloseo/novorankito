import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { Download, Loader2, RefreshCw, ExternalLink, Receipt } from "lucide-react";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader,
} from "@/components/analytics/ChartPrimitives";
import { useMemo } from "react";
import { exportCSV } from "@/lib/export-utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
  created: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_id: string | null;
  description: string | null;
  invoice_id: string | null;
  payment_method: string | null;
  receipt_url: string | null;
}

interface TransactionSummary {
  today: number;
  week: number;
  month: number;
  total_transactions: number;
}

interface AdminBillingTabProps {
  billing: any[];
  profiles: any[];
}

export function AdminBillingTab({ billing, profiles }: AdminBillingTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({ today: 0, week: 0, month: 0, total_transactions: 0 });
  const [loadingTx, setLoadingTx] = useState(true);

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-transactions", {
        body: { mode: "admin", limit: 100 },
      });
      if (error) throw error;
      if (data?.transactions) setTransactions(data.transactions);
      if (data?.summary) setSummary(data.summary);
    } catch (err: any) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  // Internal billing stats
  const totalMrr = billing.reduce((s, b) => s + Number(b.mrr), 0);
  const activeSubs = billing.filter(b => b.status === "active").length;
  const cancelledSubs = billing.filter(b => b.status === "cancelled").length;
  const arpu = activeSubs > 0 ? Math.round(totalMrr / activeSubs) : 0;

  const byPlan = useMemo(() => {
    const map: Record<string, { count: number; mrr: number }> = {};
    billing.forEach(b => {
      if (!map[b.plan]) map[b.plan] = { count: 0, mrr: 0 };
      map[b.plan].count++;
      map[b.plan].mrr += Number(b.mrr);
    });
    return Object.entries(map).map(([plan, data]) => ({ plan, ...data }));
  }, [billing]);

  const getProfileName = (userId: string) => profiles.find(p => p.user_id === userId)?.display_name || userId.slice(0, 8) + "...";

  const handleExportTx = () => {
    exportCSV(transactions.map(tx => ({
      ID: tx.id,
      Valor: `R$ ${tx.amount.toFixed(2)}`,
      Status: tx.status,
      Pago: tx.paid ? "Sim" : "Não",
      Email: tx.customer_email || "—",
      Nome: tx.customer_name || "—",
      Data: format(new Date(tx.created), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      Método: tx.payment_method || "—",
    })), "transacoes-stripe");
    toast({ title: "Exportado" });
  };

  const statusColor = (status: string) => {
    if (status === "succeeded") return "bg-success/10 text-success border-success/20";
    if (status === "pending") return "bg-warning/10 text-warning border-warning/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  return (
    <div className="space-y-4">
      {/* Revenue KPIs from Stripe */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Receita Hoje" value={summary.today} change={0} prefix="R$" sparklineColor="hsl(var(--success))" />
        <KpiCard label="Receita Semana" value={summary.week} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
        <KpiCard label="Receita Mês" value={summary.month} change={0} prefix="R$" sparklineColor="hsl(var(--chart-7))" />
        <KpiCard label="MRR (interno)" value={totalMrr} change={0} prefix="R$" sparklineColor="hsl(var(--chart-5))" />
        <KpiCard label="Assinaturas Ativas" value={activeSubs} change={0} sparklineColor="hsl(var(--primary))" />
        <KpiCard label="ARPU" value={arpu} change={0} prefix="R$" sparklineColor="hsl(var(--warning))" />
      </StaggeredGrid>

      {/* Chart */}
      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Assinantes por Plano" subtitle="Quantidade e MRR por tier" />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPlan}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="plan" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Bar dataKey="count" name="Assinantes" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="mrr" name="MRR (R$)" fill="hsl(var(--chart-9))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Stripe Transactions */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Transações Stripe (Produção)</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={fetchTransactions} disabled={loadingTx}>
              <RefreshCw className={`h-3 w-3 ${loadingTx ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={handleExportTx}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingTx ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Data", "Cliente", "E-mail", "Valor", "Status", "Método", "Recibo"].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma transação encontrada</td></tr>
                ) : transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                      {format(new Date(tx.created), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{tx.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{tx.customer_email || "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">
                      R$ {tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${statusColor(tx.status)}`}>
                        {tx.status === "succeeded" ? "Pago" : tx.status === "pending" ? "Pendente" : tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{tx.payment_method || "—"}</td>
                    <td className="px-4 py-3">
                      {tx.receipt_url ? (
                        <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Internal Subscriptions */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Assinaturas Internas (DB)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Usuário", "Plano", "MRR", "Eventos", "Projetos", "Status"].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {billing.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma assinatura</td></tr>
              ) : billing.map(b => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-foreground">{getProfileName(b.user_id)}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{b.plan}</Badge></td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground">R$ {Number(b.mrr).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.events_used.toLocaleString()}/{b.events_limit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.projects_limit}</td>
                  <td className="px-4 py-3"><Badge variant={getStatusVariant(b.status)} className="text-[10px]">{translateStatus(b.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
