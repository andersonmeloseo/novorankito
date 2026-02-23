import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  TrendingUp, TrendingDown, AlertTriangle, Users, DollarSign,
  Target, ShieldAlert, Loader2, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, LineGlowGradient,
} from "@/components/analytics/ChartPrimitives";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MrrTrendItem {
  month: string;
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  netNew: number;
}

interface ForecastItem {
  month: string;
  projected: number;
  optimistic: number;
  conservative: number;
}

interface ChurnRisk {
  customerId: string;
  email: string;
  name: string;
  plan: string;
  riskScore: number;
  riskLevel: string;
  reasons: string[];
  lastPayment: string;
  totalPaid: number;
  ltv: number;
}

interface AnalyticsSummary {
  currentMrr: number;
  mrrGrowth: number;
  totalCustomers: number;
  atRiskCustomers: number;
  avgLtv: number;
  revenueAtRisk: number;
  projectedNextMonth: number;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function formatMonth(monthKey: string) {
  const [, m] = monthKey.split("-");
  return MONTH_LABELS[m] || m;
}

const riskColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-warning/10 text-warning border-warning/20",
  medium: "bg-chart-9/10 text-chart-9 border-chart-9/20",
  low: "bg-success/10 text-success border-success/20",
};

const riskLabels: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export function RevenueAnalytics() {
  const [loading, setLoading] = useState(true);
  const [mrrTrend, setMrrTrend] = useState<MrrTrendItem[]>([]);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    currentMrr: 0, mrrGrowth: 0, totalCustomers: 0,
    atRiskCustomers: 0, avgLtv: 0, revenueAtRisk: 0, projectedNextMonth: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("revenue-analytics");
        if (error) throw error;
        if (data) {
          setMrrTrend(data.mrrTrend || []);
          setForecast(data.forecast || []);
          setChurnRisks(data.churnRisks || []);
          setSummary(data.summary || {});
        }
      } catch (err: any) {
        console.error("Revenue analytics error", err);
        toast({ title: "Erro ao carregar analytics de receita", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Combine MRR trend + forecast for the chart
  const combinedChart = [
    ...mrrTrend.map(m => ({ month: formatMonth(m.month), mrr: m.mrr, projected: null as number | null, optimistic: null as number | null, conservative: null as number | null })),
    ...forecast.map(f => ({ month: formatMonth(f.month), mrr: null as number | null, projected: f.projected, optimistic: f.optimistic, conservative: f.conservative })),
  ];

  // Net new MRR chart data
  const netNewData = mrrTrend.map(m => ({
    month: formatMonth(m.month),
    new: m.newMrr,
    churned: -m.churnedMrr,
    net: m.netNew,
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Calculando analytics de receita…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="MRR Atual" value={summary.currentMrr} change={summary.mrrGrowth} prefix="R$" sparklineColor="hsl(var(--primary))" />
        <KpiCard label="Previsão Próx. Mês" value={summary.projectedNextMonth} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
        <KpiCard label="Clientes" value={summary.totalCustomers} change={0} sparklineColor="hsl(var(--chart-1))" />
        <KpiCard label="Em Risco" value={summary.atRiskCustomers} change={0} sparklineColor="hsl(var(--destructive))" />
        <KpiCard label="Receita em Risco" value={summary.revenueAtRisk} change={0} prefix="R$" sparklineColor="hsl(var(--warning))" />
        <KpiCard label="LTV Médio" value={summary.avgLtv} change={0} prefix="R$" sparklineColor="hsl(var(--success))" />
        <KpiCard label="Crescimento MRR" value={summary.mrrGrowth} change={0} suffix="%" sparklineColor={summary.mrrGrowth >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
      </StaggeredGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MRR Trend + Forecast */}
        <AnimatedContainer>
          <Card className="p-5 h-full">
            <ChartHeader title="📈 MRR — Tendência & Previsão" subtitle="Receita mensal recorrente com projeção de 3 meses (regressão linear)" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedChart}>
                  <defs>
                    <LineGlowGradient id="mrrGrad" color="hsl(var(--primary))" />
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-9))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--chart-9))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="month" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number | null) => v !== null ? `R$ ${v.toFixed(2)}` : "—"} />
                  <Legend {...LEGEND_STYLE} />
                  <ReferenceLine x={formatMonth(mrrTrend[mrrTrend.length - 1]?.month || "")} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label="" />
                  <Area type="monotone" dataKey="mrr" name="MRR Real" stroke="hsl(var(--primary))" fill="url(#mrrGrad)" strokeWidth={2} connectNulls={false} />
                  <Area type="monotone" dataKey="projected" name="Projeção" stroke="hsl(var(--chart-9))" fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="6 3" connectNulls={false} />
                  <Area type="monotone" dataKey="optimistic" name="Otimista" stroke="hsl(var(--success))" fill="none" strokeWidth={1} strokeDasharray="3 3" connectNulls={false} />
                  <Area type="monotone" dataKey="conservative" name="Conservador" stroke="hsl(var(--warning))" fill="none" strokeWidth={1} strokeDasharray="3 3" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        {/* Net New MRR */}
        <AnimatedContainer delay={0.05}>
          <Card className="p-5 h-full">
            <ChartHeader title="💸 MRR Novo vs Churned" subtitle="Análise de entradas e saídas de receita por mês" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={netNewData}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="month" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => `R$ ${Math.abs(v).toFixed(2)}`} />
                  <Legend {...LEGEND_STYLE} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="new" name="Novo MRR" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="churned" name="MRR Churned" fill="hsl(var(--destructive))" radius={[0, 0, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Churn Risk Table */}
      <AnimatedContainer delay={0.1}>
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">🔍 Análise de Risco de Churn</h3>
              <Badge variant="outline" className="text-[10px] ml-1">{churnRisks.length} clientes</Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {["critical", "high", "medium", "low"].map(level => {
                const count = churnRisks.filter(c => c.riskLevel === level).length;
                return count > 0 ? (
                  <Badge key={level} className={`${riskColors[level]} text-[10px]`}>
                    {riskLabels[level]}: {count}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Risco", "Cliente", "Plano", "LTV", "Último Pgto", "Motivos"].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {churnRisks.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/40" />
                      <span>Sem dados suficientes para análise de churn</span>
                    </div>
                  </td></tr>
                ) : churnRisks.map(risk => (
                  <tr key={risk.customerId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{
                          background: risk.riskLevel === "critical" ? "hsl(var(--destructive) / 0.15)" :
                            risk.riskLevel === "high" ? "hsl(var(--warning) / 0.15)" :
                            risk.riskLevel === "medium" ? "hsl(var(--chart-9) / 0.15)" : "hsl(var(--success) / 0.15)",
                          color: risk.riskLevel === "critical" ? "hsl(var(--destructive))" :
                            risk.riskLevel === "high" ? "hsl(var(--warning))" :
                            risk.riskLevel === "medium" ? "hsl(var(--chart-9))" : "hsl(var(--success))",
                        }}>
                          {risk.riskScore}
                        </div>
                        <Badge className={`text-[10px] ${riskColors[risk.riskLevel]}`}>
                          {riskLabels[risk.riskLevel]}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{risk.name}</span>
                        <span className="text-[10px] text-muted-foreground">{risk.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">{risk.plan}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">
                      R$ {risk.ltv.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {(() => {
                        try {
                          const d = new Date(risk.lastPayment);
                          return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
                        } catch { return "—"; }
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {risk.reasons.map((reason, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
