import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSeoMetrics, useAnalyticsSessions, useConversions } from "@/hooks/use-data-modules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3, TrendingUp, Sparkles, Lightbulb, MousePointerClick,
  Eye, Users, Target, Globe, ArrowUp, ArrowDown, Activity,
  Search, Monitor, Smartphone, Tablet, ExternalLink, MapPin, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString("pt-BR");
}

interface OverviewKpiProps {
  label: string;
  value: string;
  change?: number;
  previousValue?: string;
  explanation?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sparkData?: number[];
  sparkColor?: string;
  subtitle?: string;
}

function OverviewKpi({ label, value, change, previousValue, explanation, icon: Icon, color, bgColor, sparkData, sparkColor, subtitle }: OverviewKpiProps) {
  const isPositive = (change ?? 0) >= 0;
  const chartData = sparkData?.map((v) => ({ v })) || [];

  return (
    <Card className="p-4 card-hover group relative overflow-visible">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {explanation && (
        <div className="absolute top-3 right-3 z-20">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs bg-card border-border shadow-xl">
                {explanation}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2 rounded-xl", bgColor)}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          {change !== undefined && change !== 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full",
              isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            )}>
              {isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
        
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground font-display tracking-tight">{value}</p>
        
        {previousValue && (
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="opacity-70">vs anterior:</span>
            <span className="font-medium opacity-90">{previousValue}</span>
          </p>
        )}

        {chartData.length > 2 ? (
          <div className="h-10 mt-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`kpi-grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparkColor || "hsl(var(--primary))"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={sparkColor || "hsl(var(--primary))"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="v" 
                  stroke={sparkColor || "hsl(var(--primary))"} 
                  strokeWidth={1.5} 
                  fill={`url(#kpi-grad-${label.replace(/\s/g, '')})`} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-10 mt-3" /> 
        )}
      </div>
    </Card>
  );
}

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))",
];

export default function Overview() {
  const { user } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState(localStorage.getItem("rankito_current_project"));

  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects", currentProjectId],
    queryFn: async () => {
      if (currentProjectId) {
        const { data } = await supabase.from("projects").select("id, name, domain").eq("id", currentProjectId).maybeSingle();
        if (data) return [data];
      }
      
      const { data } = await supabase.from("projects").select("id, name, domain").eq("owner_id", user!.id).order("created_at", { ascending: false }).limit(1);
      
      if (data && data[0] && !currentProjectId) {
         localStorage.setItem("rankito_current_project", data[0].id);
         setCurrentProjectId(data[0].id);
      }
      
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;

  // === All DB data ===
  const { data: seoMetrics = [], isLoading: seoLoading } = useSeoMetrics(projectId);
  const { data: sessions = [], isLoading: sessionsLoading } = useAnalyticsSessions(projectId);
  const { data: conversions = [], isLoading: conversionsLoading } = useConversions(projectId);

  // Date dimension data for trend chart
  const { data: dateTrend = [] } = useQuery({
    queryKey: ["seo-date-trend", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_metrics")
        .select("metric_date, clicks, impressions, ctr, position")
        .eq("project_id", projectId!)
        .eq("dimension_type", "date")
        .order("metric_date", { ascending: true });
      return data || [];
    },
    enabled: !!projectId,
  });

  // Device data
  const { data: deviceData = [] } = useQuery({
    queryKey: ["seo-device-overview", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_metrics")
        .select("device, clicks, impressions")
        .eq("project_id", projectId!)
        .eq("dimension_type", "device")
        .order("clicks", { ascending: false });
      return data || [];
    },
    enabled: !!projectId,
  });

  // Previous period data from DB for comparison
  const { data: previousSeoMetrics = [] } = useQuery({
    queryKey: ["seo-previous-period", projectId],
    queryFn: async () => {
       const { data } = await supabase
         .from("seo_metrics")
         .select("dimension_type, clicks, impressions, ctr, position")
         .eq("project_id", projectId!)
         .gte("metric_date", previousStart)
         .lte("metric_date", previousEnd);
       return data || [];
    },
    enabled: !!projectId,
  });

  // Country data
  const { data: countryData = [] } = useQuery({
    queryKey: ["seo-country-overview", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_metrics")
        .select("country, clicks, impressions")
        .eq("project_id", projectId!)
        .eq("dimension_type", "country")
        .order("clicks", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!projectId,
  });

  // GSC live with correct params
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const currentEnd = fmt(new Date(today.getTime() - 86400000)); // yesterday
  const currentStart = fmt(new Date(today.getTime() - 28 * 86400000));
  const previousEnd = fmt(new Date(today.getTime() - 29 * 86400000));
  const previousStart = fmt(new Date(today.getTime() - 56 * 86400000));

  const { data: gscLive } = useQuery({
    queryKey: ["gsc-live-overview", projectId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("query-gsc-live", {
          body: { project_id: projectId, current_start: currentStart, current_end: currentEnd, previous_start: previousStart, previous_end: previousEnd },
        });
        if (error || data?.error) return null;
        return data;
      } catch { return null; }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // GA4 safe
  const { data: ga4Overview } = useQuery({
    queryKey: ["ga4-overview-safe", projectId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-ga4-data", {
          body: { project_id: projectId, report_type: "overview", start_date: "28daysAgo", end_date: "yesterday" },
        });
        if (error || data?.error) return null;
        return data?.data || null;
      } catch { return null; }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoading = seoLoading || sessionsLoading || conversionsLoading;

  // === KPIs from DB page dimension (most complete) ===
  const pageMetrics = seoMetrics.filter((m: any) => m.dimension_type === "page");
  const queryMetrics = seoMetrics.filter((m: any) => m.dimension_type === "query");

  const totalClicks = pageMetrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const totalImpressions = pageMetrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const posCount = pageMetrics.filter((m: any) => m.position > 0).length;
  const avgPosition = posCount > 0 ? pageMetrics.reduce((s: number, m: any) => s + (m.position || 0), 0) / posCount : 0;
  const avgCtr = pageMetrics.length > 0 ? pageMetrics.reduce((s: number, m: any) => s + (Number(m.ctr) || 0), 0) / pageMetrics.length * 100 : 0;

  // Previous period calculations
  const prevPageMetrics = previousSeoMetrics.filter((m: any) => m.dimension_type === "page");
  const prevQueryMetrics = previousSeoMetrics.filter((m: any) => m.dimension_type === "query");
  
  const prevClicks = prevPageMetrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const prevImpressions = prevPageMetrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const prevPosCount = prevPageMetrics.filter((m: any) => m.position > 0).length;
  const prevAvgPosition = prevPosCount > 0 ? prevPageMetrics.reduce((s: number, m: any) => s + (m.position || 0), 0) / prevPosCount : 0;
  const prevAvgCtr = prevPageMetrics.length > 0 ? prevPageMetrics.reduce((s: number, m: any) => s + (Number(m.ctr) || 0), 0) / prevPageMetrics.length * 100 : 0;
  const prevTotalPages = prevPageMetrics.length;
  const prevTotalQueries = prevQueryMetrics.length;

  // GSC live comparison for change %
  const gscCurrent = gscLive?.query?.current || [];
  const gscPrevious = gscLive?.query?.previous || [];
  const liveCurrentClicks = gscCurrent.reduce((s: number, r: any) => s + (r.clicks || 0), 0);
  const livePreviousClicks = gscPrevious.reduce((s: number, r: any) => s + (r.clicks || 0), 0);
  const clicksChange = livePreviousClicks > 0 ? ((liveCurrentClicks - livePreviousClicks) / livePreviousClicks) * 100 : undefined;

  const liveCurrentImpressions = gscCurrent.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
  const livePreviousImpressions = gscPrevious.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
  const impressionsChange = livePreviousImpressions > 0 ? ((liveCurrentImpressions - livePreviousImpressions) / livePreviousImpressions) * 100 : undefined;

  // GA4 KPIs
  const ga4Users = ga4Overview?.totalUsers || sessions.reduce((s: number, a: any) => s + (a.users_count || 0), 0);
  const ga4Sessions = ga4Overview?.sessions || sessions.reduce((s: number, a: any) => s + (a.sessions_count || 0), 0);

  const totalConversions = conversions.length;
  const totalPages = pageMetrics.length;
  const totalQueries = queryMetrics.length;

  const hasGscData = seoMetrics.length > 0;
  const hasRealData = hasGscData || sessions.length > 0;

  // Trend from date dimension
  const trendData = dateTrend.map((d: any) => ({
    date: new Date(d.metric_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    clicks: d.clicks || 0,
    impressions: d.impressions || 0,
    position: d.position ? parseFloat(Number(d.position).toFixed(1)) : 0,
  }));

  const clicksSpark = trendData.map((d: any) => d.clicks);

  // Top pages
  const topPages = [...pageMetrics]
    .sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 8)
    .map((m: any) => ({
      url: m.url || "",
      clicks: m.clicks || 0,
      impressions: m.impressions || 0,
      ctr: (Number(m.ctr || 0) * 100).toFixed(1),
      position: Number(m.position || 0).toFixed(1),
    }));

  // Top queries
  const topQueries = [...queryMetrics]
    .sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 8)
    .map((m: any) => ({
      query: m.query || "",
      clicks: m.clicks || 0,
      impressions: m.impressions || 0,
      position: Number(m.position || 0).toFixed(1),
    }));

  // Devices for pie chart
  const deviceChartData = deviceData.map((d: any, i: number) => ({
    name: d.device === "MOBILE" ? "Mobile" : d.device === "TABLET" ? "Tablet" : "Desktop",
    value: d.clicks || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Countries bar chart
  const countryChartData = countryData.slice(0, 8).map((d: any) => ({
    country: d.country || "??",
    clicks: d.clicks || 0,
    impressions: d.impressions || 0,
  }));

  return (
    <>
      <TopBar title="Visão Geral" subtitle="Resumo de performance do seu projeto" />
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-auto">
        {/* Welcome banner */}
        <AnimatedContainer>
          <div className="gradient-primary rounded-2xl p-5 sm:p-7 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Dashboard</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight">
                  {(() => {
                    const hour = new Date().getHours();
                    const greet = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
                    const name = user?.user_metadata?.display_name || user?.user_metadata?.name || "";
                    return name ? `${greet}, ${name}! 👋` : `${greet}!`;
                  })()}
                </h2>
                <p className="text-sm opacity-80 mt-1.5 max-w-lg">
                  {projects[0]
                    ? `Projeto: ${projects[0].name} — Dados dos últimos 28 dias`
                    : "Crie um projeto para começar."}
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1.5">
                {seoMetrics.length > 0 && <Badge className="bg-white/15 text-white border-white/20 text-[10px]"><Search className="h-3 w-3 mr-1" /> {formatCompact(seoMetrics.length)} registros GSC</Badge>}
                {ga4Overview && <Badge className="bg-white/15 text-white border-white/20 text-[10px]"><Activity className="h-3 w-3 mr-1" /> GA4 Ativo</Badge>}
                {!!gscLive && <Badge className="bg-white/15 text-white border-white/20 text-[10px]"><TrendingUp className="h-3 w-3 mr-1" /> Dados ao vivo</Badge>}
              </div>
            </div>
          </div>
        </AnimatedContainer>

        {/* KPIs */}
        {isLoading ? (
          <KpiSkeleton />
        ) : (
          <StaggeredGrid className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <OverviewKpi
              label="Cliques"
              value={formatCompact(totalClicks)}
              previousValue={formatCompact(prevClicks)}
              change={clicksChange}
              explanation="Total de vezes que usuários clicaram no seu site nos resultados de pesquisa do Google."
              icon={MousePointerClick}
              color="text-primary"
              bgColor="bg-primary/10"
              sparkData={clicksSpark}
              sparkColor="hsl(var(--primary))"
            />
            <OverviewKpi
              label="Impressões"
              value={formatCompact(totalImpressions)}
              previousValue={formatCompact(prevImpressions)}
              change={impressionsChange}
              explanation="Quantas vezes seu site apareceu nos resultados de pesquisa, mesmo sem cliques."
              icon={Eye}
              color="text-info"
              bgColor="bg-info/10"
              sparkData={trendData.map((d: any) => d.impressions)}
              sparkColor="hsl(var(--info))"
            />
            <OverviewKpi
              label="CTR Médio"
              value={`${avgCtr.toFixed(2)}%`}
              previousValue={`${prevAvgCtr.toFixed(2)}%`}
              change={prevAvgCtr > 0 ? ((avgCtr - prevAvgCtr) / prevAvgCtr) * 100 : 0}
              explanation="Taxa de cliques: porcentagem de impressões que resultaram em um clique."
              icon={Target}
              color="text-success"
              bgColor="bg-success/10"
              sparkData={trendData.map((d: any) => (d.clicks / (d.impressions || 1)) * 100)}
              sparkColor="hsl(var(--success))"
            />
            <OverviewKpi
              label="Posição Média"
              value={avgPosition > 0 ? avgPosition.toFixed(1) : "—"}
              previousValue={prevAvgPosition > 0 ? prevAvgPosition.toFixed(1) : "—"}
              change={prevAvgPosition > 0 ? ((prevAvgPosition - avgPosition) / prevAvgPosition) * 100 : 0} // Lower is better
              explanation="Posição média do seu site nos resultados de busca. Quanto menor, melhor."
              icon={TrendingUp}
              color="text-warning"
              bgColor="bg-warning/10"
              sparkData={trendData.map((d: any) => d.position > 0 ? d.position : null).filter(Boolean)}
              sparkColor="hsl(var(--warning))"
            />
            <OverviewKpi
              label="Páginas"
              value={formatCompact(totalPages)}
              previousValue={formatCompact(prevTotalPages)}
              change={prevTotalPages > 0 ? ((totalPages - prevTotalPages) / prevTotalPages) * 100 : 0}
              explanation="Número de páginas únicas do seu site que receberam impressões no Google."
              icon={Globe}
              color="text-chart-5"
              bgColor="bg-chart-5/10"
              sparkColor="hsl(var(--chart-5))"
            />
            <OverviewKpi
              label="Consultas"
              value={formatCompact(totalQueries)}
              previousValue={formatCompact(prevTotalQueries)}
              change={prevTotalQueries > 0 ? ((totalQueries - prevTotalQueries) / prevTotalQueries) * 100 : 0}
              explanation="Número de termos de pesquisa únicos (keywords) que exibiram seu site."
              icon={Search}
              color="text-chart-6"
              bgColor="bg-chart-6/10"
              sparkColor="hsl(var(--chart-6))"
            />
          </StaggeredGrid>
        )}

        {/* GA4 quick row */}
        {(ga4Overview || ga4Users > 0) && (
          <AnimatedContainer delay={0.08}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3.5 text-center card-hover">
                <Users className="h-4 w-4 mx-auto mb-1.5 text-chart-5" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Usuários</p>
                <p className="text-lg font-bold font-display text-foreground">{formatCompact(ga4Users)}</p>
              </Card>
              <Card className="p-3.5 text-center card-hover">
                <Activity className="h-4 w-4 mx-auto mb-1.5 text-primary" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Sessões</p>
                <p className="text-lg font-bold font-display text-foreground">{formatCompact(ga4Sessions)}</p>
              </Card>
              {ga4Overview?.bounceRate != null && (
                <Card className="p-3.5 text-center card-hover">
                  <ArrowDown className="h-4 w-4 mx-auto mb-1.5 text-destructive" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Bounce Rate</p>
                  <p className="text-lg font-bold font-display text-foreground">{(ga4Overview.bounceRate * 100).toFixed(1)}%</p>
                </Card>
              )}
              {ga4Overview?.avgSessionDuration != null && (
                <Card className="p-3.5 text-center card-hover">
                  <Target className="h-4 w-4 mx-auto mb-1.5 text-success" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Duração Média</p>
                  <p className="text-lg font-bold font-display text-foreground">{Math.round(ga4Overview.avgSessionDuration)}s</p>
                </Card>
              )}
              {totalConversions > 0 && (
                <Card className="p-3.5 text-center card-hover">
                  <Target className="h-4 w-4 mx-auto mb-1.5 text-chart-6" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Conversões</p>
                  <p className="text-lg font-bold font-display text-foreground">{formatCompact(totalConversions)}</p>
                </Card>
              )}
            </div>
          </AnimatedContainer>
        )}

        {/* Trend Chart */}
        {isLoading ? (
          <ChartSkeleton />
        ) : trendData.length === 0 ? (
          <EmptyState icon={BarChart3} title="Sem dados de tendência" description="Sincronize o GSC para ver tendências diárias." />
        ) : (
          <AnimatedContainer delay={0.12}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold tracking-tight font-display">Cliques & Impressões — Tendência Diária</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Dados do Google Search Console ({trendData.length} dias)</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">GSC</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card) / 0.95)", backdropFilter: "blur(12px)", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", fontFamily: "Inter", boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)" }} />
                      <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#clicksGrad)" dot={false} name="Cliques" />
                      <Area yAxisId="right" type="monotone" dataKey="impressions" stroke="hsl(var(--info))" strokeWidth={1.5} fill="url(#impressionsGrad)" dot={false} name="Impressões" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>
        )}

        {/* Devices + Countries row */}
        {(deviceChartData.length > 0 || countryChartData.length > 0) && (
          <div className="grid md:grid-cols-2 gap-5">
            {deviceChartData.length > 0 && (
              <AnimatedContainer delay={0.18}>
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight font-display">Dispositivos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="h-[160px] w-[160px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={deviceChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                              {deviceChartData.map((entry: any, i: number) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 flex-1">
                        {deviceChartData.map((d: any, i: number) => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ background: d.fill }} />
                              <span className="text-xs font-medium text-foreground">{d.name}</span>
                            </div>
                            <span className="text-xs font-bold tabular-nums">{formatCompact(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedContainer>
            )}
            {countryChartData.length > 0 && (
              <AnimatedContainer delay={0.22}>
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-bold tracking-tight font-display">Top Países</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={countryChartData} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={40} />
                          <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                          <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Cliques" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedContainer>
            )}
          </div>
        )}

        {/* Top Pages + Top Queries */}
        <div className="grid lg:grid-cols-2 gap-5">
          {isLoading ? (
            <TableSkeleton />
          ) : topPages.length === 0 ? (
            <EmptyState icon={Globe} title="Sem dados de páginas" description="Conecte o Search Console para ver suas melhores páginas." />
          ) : (
            <AnimatedContainer delay={0.25}>
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold tracking-tight font-display">Top Páginas</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{topPages.length} páginas</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold">URL</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Cliques</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">CTR</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Pos.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.map((page) => (
                        <TableRow key={page.url} className="cursor-pointer table-row-hover group/row">
                          <TableCell className="text-xs font-medium text-primary truncate max-w-[220px]">
                            <div className="flex items-center gap-1.5">
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                              <span className="truncate">{page.url.replace(/https?:\/\/[^/]+/, "")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-bold">{page.clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{page.ctr}%</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            <span className={cn("font-semibold", Number(page.position) <= 3 ? "text-success" : Number(page.position) <= 10 ? "text-foreground" : "text-muted-foreground")}>{page.position}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </AnimatedContainer>
          )}

          {isLoading ? (
            <TableSkeleton />
          ) : topQueries.length === 0 ? (
            <AnimatedContainer delay={0.28}>
              <EmptyState icon={Lightbulb} title="Sem consultas" description="Sincronize o GSC para ver suas principais keywords." />
            </AnimatedContainer>
          ) : (
            <AnimatedContainer delay={0.28}>
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold tracking-tight font-display">Top Consultas (Keywords)</CardTitle>
                    <Badge variant="outline" className="text-[10px]"><Search className="h-3 w-3 mr-1" /> {topQueries.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Consulta</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Cliques</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Impr.</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Pos.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topQueries.map((q) => (
                        <TableRow key={q.query} className="table-row-hover">
                          <TableCell className="text-xs font-medium text-foreground truncate max-w-[200px]">{q.query}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-bold">{q.clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCompact(q.impressions)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            <span className={cn("font-semibold", Number(q.position) <= 3 ? "text-success" : Number(q.position) <= 10 ? "text-foreground" : "text-muted-foreground")}>{q.position}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </AnimatedContainer>
          )}
        </div>
      </div>
    </>
  );
}
