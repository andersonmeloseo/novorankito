import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { Download, Loader2, RefreshCw, ExternalLink, Receipt, FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader,
} from "@/components/analytics/ChartPrimitives";
import { exportCSV } from "@/lib/export-utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  plan_name: string | null;
  invoice_id: string | null;
  receipt_url: string | null;
  invoice_pdf: string | null;
  error_message: string | null;
  period_start: string | null;
  period_end: string | null;
}

interface TransactionSummary {
  today: number;
  week: number;
  month: number;
  last_month: number;
  total_paid: number;
  total_failed: number;
  total_pending: number;
  total_transactions: number;
}

interface AdminBillingTabProps {
  billing: any[];
  profiles: any[];
}

const PIE_COLORS = [
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

export function AdminBillingTab({ billing, profiles }: AdminBillingTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({
    today: 0, week: 0, month: 0, last_month: 0,
    total_paid: 0, total_failed: 0, total_pending: 0, total_transactions: 0,
  });
  const [loadingTx, setLoadingTx] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-transactions", {
        body: { mode: "admin", limit: 500 },
      });
      if (error) throw error;
      if (data?.transactions) setTransactions(data.transactions);
      if (data?.summary) setSummary(data.summary);
    } catch (err: any) {
      console.error("Failed to fetch transactions", err);
      toast({ title: "Erro ao buscar transações", description: err.message, variant: "destructive" });
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  // Internal billing stats
  const totalMrr = billing.reduce((s, b) => s + Number(b.mrr), 0);
  const activeSubs = billing.filter(b => b.status === "active").length;
  const mrrGrowth = summary.last_month > 0
    ? Math.round(((summary.month - summary.last_month) / summary.last_month) * 100)
    : 0;

  const byPlan = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    transactions.filter(tx => tx.paid).forEach(tx => {
      const plan = tx.plan_name || "Outro";
      if (!map[plan]) map[plan] = { count: 0, revenue: 0 };
      map[plan].count++;
      map[plan].revenue += tx.amount;
    });
    return Object.entries(map).map(([plan, data]) => ({ plan: plan.length > 20 ? plan.slice(0, 20) + "…" : plan, ...data }));
  }, [transactions]);

  const statusDistribution = useMemo(() => [
    { name: "Pago", value: summary.total_paid },
    { name: "Pendente", value: summary.total_pending },
    { name: "Falhou", value: summary.total_failed },
  ].filter(s => s.value > 0), [summary]);

  const filteredTx = useMemo(() => {
    if (statusFilter === "all") return transactions;
    if (statusFilter === "paid") return transactions.filter(tx => tx.paid);
    if (statusFilter === "pending") return transactions.filter(tx => ["open", "pending", "draft"].includes(tx.status));
    if (statusFilter === "failed") return transactions.filter(tx => !tx.paid && !["open", "pending", "draft", "succeeded"].includes(tx.status));
    return transactions;
  }, [transactions, statusFilter]);

  const getProfileName = (userId: string) => profiles.find(p => p.user_id === userId)?.display_name || userId.slice(0, 8) + "...";

  const handleExportTx = () => {
    exportCSV(transactions.map(tx => ({
      ID: tx.id,
      Valor: `R$ ${tx.amount.toFixed(2)}`,
      Status: statusLabel(tx.status),
      Pago: tx.paid ? "Sim" : "Não",
      Email: tx.customer_email || "—",
      Nome: tx.customer_name || "—",
      Plano: tx.plan_name || "—",
      Data: format(new Date(tx.created), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      Erro: tx.error_message || "",
    })), "transacoes-rankito");
    toast({ title: "CSV exportado com sucesso" });
  };

  const statusColor = (status: string) => {
    if (status === "succeeded") return "bg-success/10 text-success border-success/20";
    if (status === "open" || status === "pending") return "bg-warning/10 text-warning border-warning/20";
    if (status === "void" || status === "uncollectible") return "bg-muted/20 text-muted-foreground border-muted/20";
    if (status === "draft") return "bg-muted/10 text-muted-foreground border-muted/10";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      succeeded: "Pago", open: "Aberta", pending: "Pendente",
      draft: "Rascunho", void: "Cancelada", uncollectible: "Não cobrada",
    };
    return map[status] || status;
  };

  const statusIcon = (status: string) => {
    if (status === "succeeded") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (status === "open" || status === "pending") return <Clock className="h-3.5 w-3.5 text-warning" />;
    return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  };

  return (
    <div className="space-y-5">
      {/* Revenue KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Receita Hoje" value={summary.today} change={0} prefix="R$" sparklineColor="hsl(var(--success))" />
        <KpiCard label="Receita Semana" value={summary.week} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
        <KpiCard label="Receita Mês" value={summary.month} change={mrrGrowth} prefix="R$" sparklineColor="hsl(var(--chart-7))" />
        <KpiCard label="MRR (Assinaturas)" value={totalMrr} change={0} prefix="R$" sparklineColor="hsl(var(--primary))" />
      </StaggeredGrid>

      {/* Status counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3 border-success/20">
          <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{summary.total_paid}</p>
            <p className="text-xs text-muted-foreground">Pagamentos aprovados</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 border-warning/20">
          <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{summary.total_pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 border-destructive/20">
          <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{summary.total_failed}</p>
            <p className="text-xs text-muted-foreground">Falhas / Canceladas</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{activeSubs}</p>
            <p className="text-xs text-muted-foreground">Assinantes ativos</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedContainer className="lg:col-span-2">
          <Card className="p-5 h-full">
            <ChartHeader title="Receita por Plano" subtitle="Volume e receita total acumulada" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPlan}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="plan" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Legend {...LEGEND_STYLE} />
                  <Bar dataKey="count" name="Vendas" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="revenue" name="Receita (R$)" fill="hsl(var(--chart-9))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
        <AnimatedContainer>
          <Card className="p-5 h-full">
            <ChartHeader title="Status das Transações" subtitle="Distribuição geral" />
            <div className="h-[220px] flex items-center justify-center">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {statusDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend {...LEGEND_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground">Sem dados</p>
              )}
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Transaction Log */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Log de Transações — Plataforma</h3>
            <Badge variant="outline" className="text-[10px] ml-1">{filteredTx.length} registros</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-muted rounded-md p-0.5">
              {[
                { key: "all", label: "Todas" },
                { key: "paid", label: "Pagas" },
                { key: "pending", label: "Pendentes" },
                { key: "failed", label: "Falhas" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    statusFilter === f.key
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={fetchTransactions} disabled={loadingTx}>
              <RefreshCw className={`h-3 w-3 ${loadingTx ? "animate-spin" : ""}`} /> Sincronizar
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={handleExportTx}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingTx ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Sincronizando com Stripe…</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Status", "Data", "Cliente", "Plano", "Valor", "Período", "Erro", "Ações"].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTx.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-8 w-8 text-muted-foreground/40" />
                      <span>Nenhuma transação da plataforma encontrada</span>
                    </div>
                  </td></tr>
                ) : filteredTx.map(tx => (
                  <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(tx.status)}
                        <Badge className={`text-[10px] ${statusColor(tx.status)}`}>
                          {statusLabel(tx.status)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                      {format(new Date(tx.created), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{tx.customer_name || "—"}</span>
                        <span className="text-[10px] text-muted-foreground">{tx.customer_email || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px] max-w-[160px] truncate">
                        {tx.plan_name || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">
                      R$ {tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                      {tx.period_start && tx.period_end
                        ? `${format(new Date(tx.period_start), "dd/MM", { locale: ptBR })} – ${format(new Date(tx.period_end), "dd/MM", { locale: ptBR })}`
                        : "—"
                      }
                    </td>
                    <td className="px-4 py-3">
                      {tx.error_message ? (
                        <span className="text-[10px] text-destructive flex items-center gap-1 max-w-[140px]" title={tx.error_message}>
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{tx.error_message}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {tx.receipt_url && (
                          <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-muted transition-colors" title="Ver fatura">
                            <ExternalLink className="h-3.5 w-3.5 text-primary" />
                          </a>
                        )}
                        {tx.invoice_pdf && (
                          <a href={tx.invoice_pdf} target="_blank" rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-muted transition-colors" title="Baixar PDF">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          </a>
                        )}
                      </div>
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
          <h3 className="text-sm font-semibold text-foreground">Assinaturas Ativas (Base Interna)</h3>
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
