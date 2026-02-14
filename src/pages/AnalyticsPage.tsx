import { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGA4Report } from "@/hooks/use-ga4-reports";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AcquisitionTab } from "@/components/analytics/AcquisitionTab";
import { EngagementTab } from "@/components/analytics/EngagementTab";
import { DemographicsTab } from "@/components/analytics/DemographicsTab";
import { TechnologyTab } from "@/components/analytics/TechnologyTab";
import { RealtimeTab } from "@/components/analytics/RealtimeTab";
import { RetentionTab } from "@/components/analytics/RetentionTab";
import { EcommerceTab } from "@/components/analytics/EcommerceTab";
import { HealthScore } from "@/components/analytics/HealthScore";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Activity, Calendar, RefreshCw, Loader2, TrendingUp, Users, MousePointerClick,
  Eye, Timer, BarChart3, Globe, Monitor, Zap, ShoppingCart, UserCheck, ArrowLeftRight,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { format, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks, startOfQuarter, startOfYear, subYears, endOfYear, endOfQuarter } from "date-fns";
import { ptBR } from "date-fns/locale";

type DatePreset =
  | "today" | "yesterday" | "last7" | "lastWeek" | "last14"
  | "last28" | "last30" | "thisMonth" | "lastMonth"
  | "last90" | "thisQuarter" | "thisYear" | "lastYear" | "custom";

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last7: "Últimos 7 dias",
  lastWeek: "Semana passada",
  last14: "Últimas 2 semanas",
  last28: "Últimos 28 dias",
  last30: "Últimos 30 dias",
  thisMonth: "Este mês",
  lastMonth: "Mês passado",
  last90: "Últimos 90 dias",
  thisQuarter: "Acumulado no trimestre",
  thisYear: "Este ano",
  lastYear: "Ano passado",
  custom: "Personalizado",
};

function getDateRange(preset: DatePreset): { start: string; end: string } {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "today": return { start: fmt(today), end: fmt(today) };
    case "yesterday": return { start: fmt(yesterday), end: fmt(yesterday) };
    case "last7": return { start: "7daysAgo", end: "yesterday" };
    case "lastWeek": {
      const s = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
      const e = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
      return { start: fmt(s), end: fmt(e) };
    }
    case "last14": return { start: "14daysAgo", end: "yesterday" };
    case "last28": return { start: "28daysAgo", end: "yesterday" };
    case "last30": return { start: "30daysAgo", end: "yesterday" };
    case "thisMonth": return { start: fmt(startOfMonth(today)), end: fmt(today) };
    case "lastMonth": {
      const lm = subMonths(today, 1);
      return { start: fmt(startOfMonth(lm)), end: fmt(endOfMonth(lm)) };
    }
    case "last90": return { start: "90daysAgo", end: "yesterday" };
    case "thisQuarter": return { start: fmt(startOfQuarter(today)), end: fmt(today) };
    case "thisYear": return { start: fmt(startOfYear(today)), end: fmt(today) };
    case "lastYear": {
      const ly = subYears(today, 1);
      return { start: fmt(startOfYear(ly)), end: fmt(endOfYear(ly)) };
    }
    default: return { start: "28daysAgo", end: "yesterday" };
  }
}

function getComparisonRange(start: string, end: string): { start: string; end: string } {
  const parseGA4Date = (d: string): Date => {
    if (d === "yesterday") return subDays(new Date(), 1);
    if (d === "today") return new Date();
    const match = d.match(/^(\d+)daysAgo$/);
    if (match) return subDays(new Date(), parseInt(match[1]));
    return parseISO(d);
  };
  const startDate = parseGA4Date(start);
  const endDate = parseGA4Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const prevEnd = subDays(startDate, 1);
  const prevStart = subDays(prevEnd, diffDays);
  return { start: format(prevStart, "yyyy-MM-dd"), end: format(prevEnd, "yyyy-MM-dd") };
}

/* ─── Collapsible Section ─── */
function DashboardSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <AnimatedContainer delay={0.05}>
      <div className="space-y-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full group hover:opacity-80 transition-opacity"
        >
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h2>
          <div className="flex-1 h-px bg-border ml-2" />
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        {open && <div className="space-y-4">{children}</div>}
      </div>
    </AnimatedContainer>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id").limit(1);
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;

  const { data: ga4Connection } = useQuery({
    queryKey: ["ga4-connection", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("ga4_connections").select("id, connection_name, property_name, property_id, last_sync_at").eq("project_id", projectId!).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const [datePreset, setDatePreset] = useState<DatePreset>("last28");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [compareEnabled, setCompareEnabled] = useState(false);

  const { start: startDate, end: endDate } = useMemo(() => {
    if (datePreset === "custom" && customFrom && customTo) return { start: customFrom, end: customTo };
    return getDateRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const { start: compStart, end: compEnd } = useMemo(
    () => getComparisonRange(startDate, endDate), [startDate, endDate]
  );

  // Load realtime + overview first
  const { data: realtimeData, isLoading: loadingRealtime } = useGA4Report(projectId, "realtime");
  const { data: overviewData, isLoading: loadingOverview, refetch: refetchOverview } = useGA4Report(projectId, "overview", startDate, endDate);
  const overviewReady = !!overviewData && !loadingOverview;
  const { data: compOverviewData } = useGA4Report(compareEnabled ? projectId : undefined, "overview", compStart, compEnd);
  // Secondary reports staggered to avoid GA4 429 quota errors
  const { data: acquisitionData, isLoading: loadingAcquisition } = useGA4Report(overviewReady ? projectId : undefined, "acquisition", startDate, endDate);
  const { data: engagementData, isLoading: loadingEngagement } = useGA4Report(overviewReady ? projectId : undefined, "engagement", startDate, endDate);
  const { data: demographicsData, isLoading: loadingDemographics } = useGA4Report(overviewReady ? projectId : undefined, "demographics", startDate, endDate);
  const acqReady = overviewReady && !!acquisitionData;
  const { data: technologyData, isLoading: loadingTechnology } = useGA4Report(acqReady ? projectId : undefined, "technology", startDate, endDate);
  const { data: retentionData, isLoading: loadingRetention } = useGA4Report(acqReady ? projectId : undefined, "retention", startDate, endDate);
  const { data: ecommerceData, isLoading: loadingEcommerce } = useGA4Report(acqReady ? projectId : undefined, "ecommerce", startDate, endDate);

  const [syncing, setSyncing] = useState(false);
  const handleRefresh = async () => { setSyncing(true); await refetchOverview(); setSyncing(false); };

  const totals = overviewData?.totals || {};
  const trend = overviewData?.trend || [];
  const compTotals = compOverviewData?.totals || {};
  const compTrend = compOverviewData?.trend || [];

  const buildSparkline = (trendArr: any[], key: string) => trendArr.map((t: any) => t[key] || 0);
  const sparkUsers = buildSparkline(trend, "totalUsers");
  const sparkSessions = buildSparkline(trend, "sessions");
  const sparkPageViews = buildSparkline(trend, "screenPageViews");
  const sparkEngagement = buildSparkline(trend, "engagementRate").map((v: number) => v * 100);
  const sparkBounce = buildSparkline(trend, "bounceRate").map((v: number) => v * 100);
  const sparkEvents = buildSparkline(trend, "eventCount");
  const sparkConversions = buildSparkline(trend, "conversions");
  const sparkRevenue = buildSparkline(trend, "totalRevenue");
  const sparkDuration = buildSparkline(trend, "averageSessionDuration");
  const sparkNewUsers = buildSparkline(trend, "totalUsers");

  const compSparkUsers = buildSparkline(compTrend, "totalUsers");
  const compSparkSessions = buildSparkline(compTrend, "sessions");
  const compSparkPageViews = buildSparkline(compTrend, "screenPageViews");
  const compSparkEngagement = buildSparkline(compTrend, "engagementRate").map((v: number) => v * 100);
  const compSparkBounce = buildSparkline(compTrend, "bounceRate").map((v: number) => v * 100);
  const compSparkEvents = buildSparkline(compTrend, "eventCount");
  const compSparkConversions = buildSparkline(compTrend, "conversions");
  const compSparkRevenue = buildSparkline(compTrend, "totalRevenue");
  const compSparkDuration = buildSparkline(compTrend, "averageSessionDuration");

  const calcChange = (curr: number, prev: number) => {
    if (!compareEnabled || !prev) return 0;
    return parseFloat(((curr - prev) / prev * 100).toFixed(1));
  };

  const totalUsers = totals.totalUsers || 0;
  const newUsers = totals.newUsers || 0;
  const sessions = totals.sessions || 0;
  const pageViews = totals.screenPageViews || 0;
  const engagementRate = ((totals.engagementRate || 0) * 100);
  const avgDuration = totals.averageSessionDuration || 0;
  const bounceRate = ((totals.bounceRate || 0) * 100);
  const events = totals.eventCount || 0;
  const conversions = totals.conversions || 0;
  const revenue = totals.totalRevenue || 0;

  const trendData = trend.map((t: any, i: number) => ({
    date: (t.date || "").substring(4, 6) + "/" + (t.date || "").substring(6, 8),
    users: t.totalUsers || 0,
    sessions: t.sessions || 0,
    pageViews: t.screenPageViews || 0,
    events: t.eventCount || 0,
    revenue: t.totalRevenue || 0,
    ...(compareEnabled && compTrend[i] ? {
      prevUsers: compTrend[i].totalUsers || 0,
      prevSessions: compTrend[i].sessions || 0,
      prevPageViews: compTrend[i].screenPageViews || 0,
    } : {}),
  }));

  const hasConnection = !!ga4Connection?.property_id;

  const kpis = [
    { label: "Usuários", description: "Total de visitantes únicos no período selecionado", value: totalUsers, change: calcChange(totalUsers, compTotals.totalUsers || 0), prevValue: compTotals.totalUsers || 0, sparklineData: sparkUsers, sparklinePrevData: compSparkUsers, sparklineColor: "hsl(var(--chart-1))" },
    { label: "Novos Usuários", description: "Visitantes que acessaram pela primeira vez", value: newUsers, change: calcChange(newUsers, compTotals.newUsers || 0), prevValue: compTotals.newUsers || 0, sparklineData: sparkNewUsers, sparklinePrevData: compSparkUsers, sparklineColor: "hsl(var(--chart-2))" },
    { label: "Sessões", description: "Número total de visitas ao site", value: sessions, change: calcChange(sessions, compTotals.sessions || 0), prevValue: compTotals.sessions || 0, sparklineData: sparkSessions, sparklinePrevData: compSparkSessions, sparklineColor: "hsl(var(--chart-3))" },
    { label: "Sess. Engajadas", description: "Sessões com interação significativa (>10s, >2 páginas ou conversão)", value: Math.round(sessions * (totals.engagementRate || 0)), change: 0, prevValue: 0, sparklineData: sparkEngagement, sparklinePrevData: compSparkEngagement, sparklineColor: "hsl(var(--chart-4))" },
    { label: "Tx. Engajamento", description: "Porcentagem de sessões com engajamento ativo", value: engagementRate, suffix: "%", change: calcChange(engagementRate, (compTotals.engagementRate || 0) * 100), prevValue: (compTotals.engagementRate || 0) * 100, sparklineData: sparkEngagement, sparklinePrevData: compSparkEngagement, sparklineColor: "hsl(var(--chart-5))" },
    { label: "Duração Média", description: "Tempo médio que cada sessão permanece ativa", value: Math.round(avgDuration), suffix: "s", change: calcChange(avgDuration, compTotals.averageSessionDuration || 0), prevValue: Math.round(compTotals.averageSessionDuration || 0), sparklineData: sparkDuration, sparklinePrevData: compSparkDuration, sparklineColor: "hsl(var(--chart-1))" },
    { label: "Tx. Rejeição", description: "Sessões sem interação (saiu rapidamente)", value: bounceRate, suffix: "%", change: calcChange(bounceRate, (compTotals.bounceRate || 0) * 100), prevValue: (compTotals.bounceRate || 0) * 100, sparklineData: sparkBounce, sparklinePrevData: compSparkBounce, sparklineColor: "hsl(var(--chart-2))" },
    { label: "Conversões", description: "Eventos de conversão (compra, lead, cadastro, etc.)", value: conversions, change: calcChange(conversions, compTotals.conversions || 0), prevValue: compTotals.conversions || 0, sparklineData: sparkConversions, sparklinePrevData: compSparkConversions, sparklineColor: "hsl(var(--chart-3))" },
    { label: "Eventos", description: "Total de interações rastreadas (cliques, scrolls, etc.)", value: events, change: calcChange(events, compTotals.eventCount || 0), prevValue: compTotals.eventCount || 0, sparklineData: sparkEvents, sparklinePrevData: compSparkEvents, sparklineColor: "hsl(var(--chart-4))" },
    { label: "Receita", description: "Receita total gerada por e-commerce ou eventos monetários", value: revenue, prefix: "R$", change: calcChange(revenue, compTotals.totalRevenue || 0), prevValue: compTotals.totalRevenue || 0, sparklineData: sparkRevenue, sparklinePrevData: compSparkRevenue, sparklineColor: "hsl(var(--chart-5))" },
    { label: "ARPU", description: "Receita média por usuário (Revenue Per User)", value: totalUsers > 0 ? revenue / totalUsers : 0, prefix: "R$", change: 0, prevValue: 0, sparklineData: [], sparklinePrevData: [], sparklineColor: "hsl(var(--chart-1))" },
    { label: "Pageviews", description: "Total de páginas visualizadas por todos os visitantes", value: pageViews, change: calcChange(pageViews, compTotals.screenPageViews || 0), prevValue: compTotals.screenPageViews || 0, sparklineData: sparkPageViews, sparklinePrevData: compSparkPageViews, sparklineColor: "hsl(var(--chart-2))" },
  ];

  return (
    <>
      <TopBar title="Analytics" subtitle="Dashboard GA4 — Análise Avançada" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Connection bar */}
        {ga4Connection && (
          <AnimatedContainer>
            <Card className="p-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-muted-foreground">GA4:</span>
                <span className="font-medium text-foreground">{ga4Connection.property_name || ga4Connection.property_id}</span>
                {ga4Connection.last_sync_at && (
                  <span className="text-muted-foreground">· {format(parseISO(ga4Connection.last_sync_at), "dd/MM HH:mm")}</span>
                )}
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" onClick={handleRefresh} disabled={syncing}>
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Atualizar
              </Button>
            </Card>
          </AnimatedContainer>
        )}

        {/* Date filter */}
        <AnimatedContainer>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-[200px] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DATE_PRESET_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {datePreset === "custom" && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-9 text-xs w-[140px]" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-9 text-xs w-[140px]" />
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="compare-toggle" className="text-xs text-muted-foreground cursor-pointer">Comparar</Label>
                <Switch id="compare-toggle" checked={compareEnabled} onCheckedChange={setCompareEnabled} className="scale-75" />
                {compareEnabled && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">vs período anterior</span>
                )}
              </div>
            </div>
          </Card>
        </AnimatedContainer>

        {!hasConnection && (
          <EmptyState icon={Activity} title="GA4 não conectado" description="Conecte o Google Analytics 4 nas configurações do projeto para ver os dados completos." />
        )}

        {hasConnection && (
          <div className="space-y-8">

            {/* ═══ TEMPO REAL (primeiro!) ═══ */}
            <DashboardSection title="Tempo Real" icon={Zap}>
              <RealtimeTab data={realtimeData} isLoading={loadingRealtime} />
            </DashboardSection>

            {/* ═══ LINHA 1 — KPIs Executivos ═══ */}
            <DashboardSection title="Visão Geral" icon={TrendingUp}>
              {loadingOverview ? <KpiSkeleton count={6} /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {kpis.slice(0, 6).map(kpi => (
                    <KpiCard key={kpi.label} label={kpi.label} description={kpi.description} value={kpi.value} change={kpi.change} prefix={kpi.prefix} suffix={kpi.suffix} prevValue={kpi.prevValue} showComparison={compareEnabled} sparklineData={kpi.sparklineData} sparklinePrevData={compareEnabled ? kpi.sparklinePrevData : undefined} sparklineColor={kpi.sparklineColor} />
                  ))}
                </div>
              )}
              {loadingOverview ? <KpiSkeleton count={6} /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {kpis.slice(6).map(kpi => (
                    <KpiCard key={kpi.label} label={kpi.label} description={kpi.description} value={kpi.value} change={kpi.change} prefix={kpi.prefix} suffix={kpi.suffix} prevValue={kpi.prevValue} showComparison={compareEnabled} sparklineData={kpi.sparklineData} sparklinePrevData={compareEnabled ? kpi.sparklinePrevData : undefined} sparklineColor={kpi.sparklineColor} />
                  ))}
                </div>
              )}
            </DashboardSection>

            {/* ═══ LINHA 2 — Tendência + Score ═══ */}
            <DashboardSection title="Tendência" icon={BarChart3}>
              <div className="grid lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  {!loadingOverview && trendData.length > 1 ? (
                    <Card className="p-5">
                      <h3 className="text-sm font-medium text-foreground mb-1">Tendência Diária</h3>
                      <p className="text-[10px] text-muted-foreground mb-4">Evolução de usuários, sessões e pageviews ao longo do período</p>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="sessionsGradA" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={45} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px -4px rgba(0,0,0,0.12)" }} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                            <Area type="monotone" dataKey="users" name="Usuários" stroke="hsl(var(--chart-1))" fill="url(#usersGrad)" strokeWidth={2} dot={false} />
                            <Area type="monotone" dataKey="sessions" name="Sessões" stroke="hsl(var(--chart-2))" fill="url(#sessionsGradA)" strokeWidth={2} dot={false} />
                            <Area type="monotone" dataKey="pageViews" name="Pageviews" stroke="hsl(var(--chart-3))" fill="url(#pvGrad)" strokeWidth={2} dot={false} />
                            {compareEnabled && (
                              <>
                                <Area type="monotone" dataKey="prevUsers" name="Usuários (ant.)" stroke="hsl(var(--chart-1))" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.4} fill="none" dot={false} />
                                <Area type="monotone" dataKey="prevSessions" name="Sessões (ant.)" stroke="hsl(var(--chart-2))" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.4} fill="none" dot={false} />
                              </>
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  ) : loadingOverview ? <ChartSkeleton /> : null}
                </div>
                <div className="lg:col-span-1">
                  {!loadingOverview ? (
                    <HealthScore
                      engagementRate={totals.engagementRate || 0}
                      bounceRate={totals.bounceRate || 0}
                      conversions={conversions}
                      totalUsers={totalUsers}
                      newUsers={newUsers}
                      sessions={sessions}
                      showComparison={compareEnabled}
                    />
                  ) : <ChartSkeleton />}
                </div>
              </div>
            </DashboardSection>

            {/* ═══ LINHA 3 — Aquisição ═══ */}
            <DashboardSection title="Aquisição de Tráfego" icon={MousePointerClick}>
              {loadingAcquisition ? <><ChartSkeleton /><TableSkeleton /></> : <AcquisitionTab data={acquisitionData} />}
            </DashboardSection>

            {/* ═══ LINHA 4 — Performance ═══ */}
            <DashboardSection title="Performance — Páginas + Eventos" icon={Eye}>
              {loadingEngagement ? <><ChartSkeleton /><TableSkeleton /></> : <EngagementTab data={engagementData} />}
            </DashboardSection>

            {/* ═══ LINHA 5 — Público ═══ */}
            <DashboardSection title="Público — Geo + Demografia + Dispositivos" icon={Globe}>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Demografia & Geolocalização</h3>
                  {loadingDemographics ? <><ChartSkeleton /><TableSkeleton /></> : <DemographicsTab data={demographicsData} />}
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tecnologia & Dispositivos</h3>
                  {loadingTechnology ? <><ChartSkeleton /><TableSkeleton /></> : <TechnologyTab data={technologyData} />}
                </div>
              </div>
            </DashboardSection>

            {/* ═══ LINHA 6 — Retenção + E-commerce ═══ */}
            <DashboardSection title="Engajamento + Retenção + E-commerce" icon={UserCheck}>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Retenção</h3>
                  {loadingRetention ? <><ChartSkeleton /><TableSkeleton /></> : <RetentionTab data={retentionData} />}
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-commerce</h3>
                  {loadingEcommerce ? <><ChartSkeleton /><TableSkeleton /></> : <EcommerceTab data={ecommerceData} />}
                </div>
              </div>
            </DashboardSection>

          </div>
        )}
      </div>
    </>
  );
}
