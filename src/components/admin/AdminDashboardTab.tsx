import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  Users, FolderOpen, CreditCard, Activity, TrendingUp,
  TrendingDown, Database, Shield, AlertTriangle, CheckCircle2,
  XCircle, Clock, Zap, BarChart3, ArrowRight, DollarSign, Receipt,
  Loader2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, LineGlowGradient,
} from "@/components/analytics/ChartPrimitives";
import { Progress } from "@/components/ui/progress";
import { useMemo, useState, useEffect } from "react";
import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";
import { supabase } from "@/integrations/supabase/client";

interface AdminDashboardTabProps {
  stats: any;
  profiles: any[];
  projects: any[];
  billing: any[];
  logs: any[];
}

/* ─── Insight Card ─── */
function InsightItem({ icon: Icon, color, title, description, value, variant = "neutral" }: {
  icon: any; color: string; title: string; description: string; value?: string | number;
  variant?: "success" | "warning" | "danger" | "neutral";
}) {
  const bgMap = { success: "bg-success/10", warning: "bg-warning/10", danger: "bg-destructive/10", neutral: "bg-primary/10" };
  const textMap = { success: "text-success", warning: "text-warning", danger: "text-destructive", neutral: "text-primary" };
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
      <div className={`h-9 w-9 rounded-lg ${bgMap[variant]} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4.5 w-4.5 ${textMap[variant]}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-foreground">{title}</h4>
          {value !== undefined && (
            <span className={`text-xs font-bold ${textMap[variant]}`}>{value}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function AdminDashboardTab({ stats, profiles, projects, billing, logs }: AdminDashboardTabProps) {
  // ── Stripe Sales Data ──
  const [salesData, setSalesData] = useState<{ today: number; week: number; month: number; total_transactions: number; transactions: any[] }>({
    today: 0, week: 0, month: 0, total_transactions: 0, transactions: [],
  });
  const [loadingSales, setLoadingSales] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("stripe-transactions", {
          body: { mode: "admin", limit: 10 },
        });
        if (data) {
          setSalesData({
            today: data.summary?.today || 0,
            week: data.summary?.week || 0,
            month: data.summary?.month || 0,
            total_transactions: data.summary?.total_transactions || 0,
            transactions: data.transactions || [],
          });
        }
      } catch (e) {
        console.error("Failed to load sales", e);
      } finally {
        setLoadingSales(false);
      }
    })();
  }, []);

  // ── Computed data ──
  const userGrowth = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      days[format(subDays(new Date(), i), "dd/MM")] = 0;
    }
    profiles.forEach(p => {
      try {
        const d = format(parseISO(p.created_at), "dd/MM");
        if (days[d] !== undefined) days[d]++;
      } catch {}
    });
    let acc = 0;
    return Object.entries(days).map(([date, count]) => {
      acc += count;
      return { date, novos: count, acumulado: acc };
    });
  }, [profiles]);

  const mrrByPlan = useMemo(() => {
    const map: Record<string, number> = {};
    billing.forEach(b => { map[b.plan] = (map[b.plan] || 0) + Number(b.mrr); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [billing]);

  const projectsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(p => { map[p.status] = (map[p.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: translateStatus(name), value }));
  }, [projects]);

  const billingByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    billing.forEach(b => { map[b.status] = (map[b.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: translateStatus(name), value }));
  }, [billing]);

  // ── Risk & Wins analysis ──
  const failedLogs = logs.filter(l => l.status === "failed");
  const recentFailures = failedLogs.filter(l => {
    try { return differenceInDays(new Date(), new Date(l.created_at)) <= 7; } catch { return false; }
  });
  const activeSubs = billing.filter(b => b.status === "active").length;
  const cancelledSubs = billing.filter(b => b.status === "cancelled").length;
  const churnRate = activeSubs + cancelledSubs > 0 ? ((cancelledSubs / (activeSubs + cancelledSubs)) * 100) : 0;
  const totalMrr = billing.reduce((s, b) => s + Number(b.mrr), 0);
  const suspendedProjects = projects.filter(p => p.status === "suspended").length;
  const activeProjects = projects.filter(p => p.status === "active").length;
  const totalEvents = billing.reduce((s, b) => s + b.events_used, 0);
  const totalEventsLimit = billing.reduce((s, b) => s + b.events_limit, 0);
  const eventsUsagePct = totalEventsLimit > 0 ? Math.round((totalEvents / totalEventsLimit) * 100) : 0;

  // Users created last 7 days
  const newUsersLast7 = profiles.filter(p => {
    try { return differenceInDays(new Date(), parseISO(p.created_at)) <= 7; } catch { return false; }
  }).length;

  // Health score (0-100)
  const healthScore = useMemo(() => {
    let score = 100;
    if (churnRate > 10) score -= 20;
    else if (churnRate > 5) score -= 10;
    if (recentFailures.length > 10) score -= 15;
    else if (recentFailures.length > 3) score -= 8;
    if (suspendedProjects > 0) score -= suspendedProjects * 5;
    if (eventsUsagePct > 80) score -= 10;
    return Math.max(0, Math.min(100, score));
  }, [churnRate, recentFailures, suspendedProjects, eventsUsagePct]);

  const healthColor = healthScore >= 80 ? "hsl(var(--success))" : healthScore >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  const recentLogs = logs.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Usuários" value={stats?.totalUsers || 0} change={0} sparklineColor="hsl(var(--chart-1))" description="Total de contas registradas na plataforma" />
        <KpiCard label="Projetos" value={stats?.totalProjects || 0} change={0} sparklineColor="hsl(var(--chart-2))" description="Workspaces criados por todos os usuários" />
        <KpiCard label="MRR" value={stats?.totalMrr || 0} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" description="Receita recorrente mensal de todas as assinaturas" />
        <KpiCard label="ARPU" value={stats?.arpu || 0} change={0} prefix="R$" sparklineColor="hsl(var(--chart-7))" description="Receita média por usuário pagante" />
        <KpiCard label="Churn" value={Number(stats?.churnRate) || 0} change={0} suffix="%" sparklineColor="hsl(var(--warning))" description="Percentual de assinaturas canceladas vs ativas" />
        <KpiCard label="URLs Monitoradas" value={stats?.totalUrls || 0} change={0} sparklineColor="hsl(var(--chart-5))" description="Total de URLs sendo monitoradas pelo SEO" />
      </StaggeredGrid>

      {/* ── Vendas Stripe (Real-time) ── */}
      <AnimatedContainer>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <ChartHeader title="💰 Vendas — Stripe (Produção)" subtitle="Receita real processada pelo Stripe — atualizado em tempo real" />
            {loadingSales && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-success/10 border border-success/20">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Hoje</div>
              <div className="text-xl font-bold text-success font-display">R$ {salesData.today.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Semana</div>
              <div className="text-xl font-bold text-primary font-display">R$ {salesData.week.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-chart-9/10 border border-chart-9/20" style={{ backgroundColor: "hsl(var(--chart-9) / 0.1)", borderColor: "hsl(var(--chart-9) / 0.2)" }}>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Mês</div>
              <div className="text-xl font-bold font-display" style={{ color: "hsl(var(--chart-9))" }}>R$ {salesData.month.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Transações</div>
              <div className="text-xl font-bold text-foreground font-display">{salesData.total_transactions}</div>
            </div>
          </div>

          {/* Recent transactions mini-table */}
          {salesData.transactions.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Data/Hora", "Cliente", "E-mail", "Valor", "Status"].map(col => (
                      <th key={col} className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salesData.transactions.slice(0, 5).map((tx: any) => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap font-mono">
                        {(() => { try { return format(new Date(tx.created), "dd/MM/yy HH:mm", { locale: ptBR }); } catch { return "—"; } })()}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">{tx.customer_name || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{tx.customer_email || "—"}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-foreground">R$ {Number(tx.amount).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] ${tx.status === "succeeded" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                          {tx.status === "succeeded" ? "Pago" : tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loadingSales && salesData.transactions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma transação encontrada no Stripe</p>
          )}
        </Card>
      </AnimatedContainer>

      {/* ── Health Score + Risks & Wins ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score Gauge */}
        <AnimatedContainer>
          <Card className="p-5 h-full">
            <ChartHeader title="Saúde do Sistema" subtitle="Score calculado com base em churn, erros, projetos suspensos e uso de recursos" />
            <div className="flex items-center justify-center h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={[{ value: healthScore, fill: healthColor }]}>
                  <RadialBar background dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold font-display" style={{ color: healthColor }}>{healthScore}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {[
                { label: "Ativo", value: activeProjects, color: "text-success" },
                { label: "Suspenso", value: suspendedProjects, color: suspendedProjects > 0 ? "text-destructive" : "text-muted-foreground" },
                { label: "Erros 7d", value: recentFailures.length, color: recentFailures.length > 3 ? "text-warning" : "text-muted-foreground" },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-[9px] text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </AnimatedContainer>

        {/* Risks */}
        <AnimatedContainer delay={0.05}>
          <Card className="p-5 h-full">
            <ChartHeader title="⚠️ Riscos Detectados" subtitle="Problemas que precisam de atenção imediata para manter a plataforma saudável" />
            <div className="space-y-2">
              {churnRate > 5 && (
                <InsightItem
                  icon={TrendingDown} color="destructive" variant="danger"
                  title="Churn elevado" value={`${churnRate.toFixed(1)}%`}
                  description="Taxa de cancelamento acima do limite saudável de 5%. Analise os motivos e considere ações de retenção."
                />
              )}
              {suspendedProjects > 0 && (
                <InsightItem
                  icon={AlertTriangle} color="warning" variant="warning"
                  title="Projetos suspensos" value={suspendedProjects}
                  description="Projetos suspensos podem indicar problemas de billing ou violação de termos."
                />
              )}
              {recentFailures.length > 0 && (
                <InsightItem
                  icon={XCircle} color="destructive" variant={recentFailures.length > 5 ? "danger" : "warning"}
                  title="Falhas recentes" value={recentFailures.length}
                  description="Erros de autenticação ou ações falhadas nos últimos 7 dias. Verifique os logs."
                />
              )}
              {eventsUsagePct > 70 && (
                <InsightItem
                  icon={Zap} color="warning" variant="warning"
                  title="Eventos próximos do limite" value={`${eventsUsagePct}%`}
                  description="O consumo de eventos está alto. Considere notificar usuários sobre upgrades."
                />
              )}
              {churnRate <= 5 && suspendedProjects === 0 && recentFailures.length === 0 && eventsUsagePct <= 70 && (
                <InsightItem
                  icon={CheckCircle2} color="success" variant="success"
                  title="Tudo limpo!" value="0"
                  description="Nenhum risco detectado no momento. A plataforma está operando normalmente."
                />
              )}
            </div>
          </Card>
        </AnimatedContainer>

        {/* Wins */}
        <AnimatedContainer delay={0.1}>
          <Card className="p-5 h-full">
            <ChartHeader title="🏆 Vitórias & Destaques" subtitle="Métricas positivas e conquistas recentes que merecem atenção" />
            <div className="space-y-2">
              <InsightItem
                icon={Users} color="success" variant="success"
                title="Novos usuários (7d)" value={newUsersLast7}
                description={`${newUsersLast7} novos registros nos últimos 7 dias. ${newUsersLast7 > 5 ? "Crescimento acelerado!" : "Ritmo estável."}`}
              />
              <InsightItem
                icon={CreditCard} color="success" variant="success"
                title="Receita Recorrente" value={`R$ ${totalMrr.toLocaleString("pt-BR")}`}
                description={`${activeSubs} assinaturas ativas gerando receita. ARPU de R$ ${stats?.arpu || 0}.`}
              />
              <InsightItem
                icon={FolderOpen} color="neutral" variant="neutral"
                title="Projetos ativos" value={activeProjects}
                description={`${activeProjects} de ${projects.length} projetos estão ativos e gerando dados.`}
              />
              {stats?.totalMetrics > 0 && (
                <InsightItem
                  icon={Database} color="neutral" variant="neutral"
                  title="Volume de dados" value={(stats.totalMetrics || 0).toLocaleString("pt-BR")}
                  description="Métricas SEO coletadas. Maior volume = mais valor para os clientes."
                />
              )}
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ── Growth + Revenue Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <ChartHeader title="Crescimento de Usuários" subtitle="Novos cadastros e base acumulada nos últimos 30 dias — identifique tendências de aquisição" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <defs>
                    <LineGlowGradient id="userGrowthGlow" color="hsl(var(--chart-1))" />
                    <LineGlowGradient id="userAccGlow" color="hsl(var(--chart-5))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="date" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                  <Area type="monotone" dataKey="novos" name="Novos" stroke="hsl(var(--chart-1))" fill="url(#userGrowthGlow)" strokeWidth={2} />
                  <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="hsl(var(--chart-5))" fill="url(#userAccGlow)" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.2}>
          <Card className="p-5">
            <ChartHeader title="MRR por Plano" subtitle="Distribuição de receita recorrente por tier — identifique qual plano gera mais valor" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mrrByPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {mrrByPlan.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "MRR"]} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ── Distribution + Usage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedContainer delay={0.25}>
          <Card className="p-5">
            <ChartHeader title="Projetos por Status" subtitle="Distribuição dos estados dos projetos — monitore inativos e suspensos" />
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByStatus} layout="vertical">
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={70} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Projetos" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.3}>
          <Card className="p-5">
            <ChartHeader title="Assinaturas por Status" subtitle="Saúde do billing — ativas vs canceladas vs pendentes" />
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={billingByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                    {billingByStatus.map((entry, i) => {
                      const colors: Record<string, string> = { "Ativo": "hsl(var(--success))", "Cancelado": "hsl(var(--destructive))", "Pendente": "hsl(var(--warning))" };
                      return <Cell key={i} fill={colors[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.35}>
          <Card className="p-5">
            <ChartHeader title="Uso de Recursos" subtitle="Capacidade utilizada — fique atento quando passar de 80%" />
            <div className="space-y-4 mt-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground">Eventos</span>
                  <span className="text-xs text-muted-foreground">{totalEvents.toLocaleString("pt-BR")}/{totalEventsLimit.toLocaleString("pt-BR")}</span>
                </div>
                <Progress value={eventsUsagePct} className="h-2" />
                <p className="text-[9px] text-muted-foreground mt-1">{eventsUsagePct > 80 ? "⚠️ Uso alto — notifique usuários" : "✅ Dentro do limite saudável"}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground">Papéis Atribuídos</span>
                  <span className="text-xs text-muted-foreground">{stats?.totalRoles || 0}</span>
                </div>
                <Progress value={Math.min(((stats?.totalRoles || 0) / Math.max(profiles.length, 1)) * 100, 100)} className="h-2" />
                <p className="text-[9px] text-muted-foreground mt-1">{stats?.totalRoles || 0} de {profiles.length} usuários têm papéis atribuídos</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground">Métricas SEO</span>
                  <span className="text-xs text-muted-foreground">{(stats?.totalMetrics || 0).toLocaleString("pt-BR")}</span>
                </div>
                <Progress value={Math.min(((stats?.totalMetrics || 0) / 100000) * 100, 100)} className="h-2" />
                <p className="text-[9px] text-muted-foreground mt-1">Volume de dados coletados pelo monitoramento SEO</p>
              </div>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ── Activity Log ── */}
      <AnimatedContainer delay={0.4}>
        <Card className="p-5">
          <ChartHeader title="Atividade Recente" subtitle="Últimas ações registradas no sistema — identifique padrões e anomalias rapidamente" />
          <div className="space-y-1.5">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade registrada</p>
            ) : recentLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors border border-border/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  {log.status === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs text-foreground block truncate">{log.action}</span>
                    {log.detail && <span className="text-[9px] text-muted-foreground block truncate">{log.detail}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={getStatusVariant(log.status)} className="text-[9px]">
                    {translateStatus(log.status)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {format(new Date(log.created_at), "dd/MM HH:mm")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
