import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSeoMetrics, useAnalyticsSessions, useConversions } from "@/hooks/use-data-modules";
import { useGA4Report } from "@/hooks/use-ga4-reports";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3, TrendingUp, Sparkles, Lightbulb, MousePointerClick,
  Eye, Users, Target, Globe, ArrowUp, ArrowDown, Activity,
  Search, Monitor, Smartphone, Tablet, ExternalLink
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
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sparkData?: number[];
  sparkColor?: string;
}

function OverviewKpi({ label, value, change, icon: Icon, color, bgColor, sparkData, sparkColor }: OverviewKpiProps) {
  const isPositive = (change ?? 0) >= 0;
  const chartData = sparkData?.map((v) => ({ v })) || [];

  return (
    <Card className="p-4 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
        {chartData.length > 2 && (
          <div className="h-10 mt-2 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`kpi-grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparkColor || "hsl(var(--primary))"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={sparkColor || "hsl(var(--primary))"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={sparkColor || "hsl(var(--primary))"} strokeWidth={1.5} fill={`url(#kpi-grad-${label})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

// Device icon mapping
function DeviceIcon({ device }: { device: string }) {
  if (device === "MOBILE") return <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />;
  if (device === "TABLET") return <Tablet className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Monitor className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function Overview() {
  const { user } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, domain").order("created_at", { ascending: false }).limit(1);
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;

  // DB data (fallback & enrichment)
  const { data: seoMetrics = [], isLoading: seoLoading } = useSeoMetrics(projectId);
  const { data: sessions = [], isLoading: sessionsLoading } = useAnalyticsSessions(projectId);
  const { data: conversions = [], isLoading: conversionsLoading } = useConversions(projectId);

  // Live GSC data via edge function
  const { data: gscLiveData, isLoading: gscLiveLoading } = useQuery({
    queryKey: ["gsc-live-overview", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("query-gsc-live", {
        body: { project_id: projectId, start_date: "28daysAgo", end_date: "today", dimensions: ["date"], row_limit: 60 },
      });
      if (error) return null;
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Live GA4 overview data
  const { data: ga4Overview, isLoading: ga4Loading } = useGA4Report(projectId, "overview", "28daysAgo", "yesterday");

  const isLoading = seoLoading || sessionsLoading || conversionsLoading;

  // === Compute KPIs from live GSC data first, fallback to DB ===
  const gscRows = gscLiveData?.rows || [];
  const hasLiveGSC = gscRows.length > 0;

  let totalClicks = 0, totalImpressions = 0, avgPosition = 0, avgCtr = 0;
  let clicksSpark: number[] = [];
  let impressionsSpark: number[] = [];

  if (hasLiveGSC) {
    const sorted = [...gscRows].sort((a: any, b: any) => (a.keys?.[0] || "").localeCompare(b.keys?.[0] || ""));
    totalClicks = sorted.reduce((s: number, r: any) => s + (r.clicks || 0), 0);
    totalImpressions = sorted.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
    avgCtr = sorted.length > 0 ? sorted.reduce((s: number, r: any) => s + (r.ctr || 0), 0) / sorted.length * 100 : 0;
    avgPosition = sorted.length > 0 ? sorted.reduce((s: number, r: any) => s + (r.position || 0), 0) / sorted.length : 0;
    clicksSpark = sorted.map((r: any) => r.clicks || 0);
    impressionsSpark = sorted.map((r: any) => r.impressions || 0);
  } else {
    totalClicks = seoMetrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
    totalImpressions = seoMetrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
    const posCount = seoMetrics.filter((m: any) => m.position > 0).length;
    avgPosition = posCount > 0 ? seoMetrics.reduce((s: number, m: any) => s + (m.position || 0), 0) / posCount : 0;
    avgCtr = seoMetrics.length > 0 ? seoMetrics.reduce((s: number, m: any) => s + (m.ctr || 0), 0) / seoMetrics.length * 100 : 0;
  }

  // GA4 KPIs
  const ga4Users = ga4Overview?.totalUsers || sessions.reduce((s: number, a: any) => s + (a.users_count || 0), 0);
  const ga4Sessions = ga4Overview?.sessions || sessions.reduce((s: number, a: any) => s + (a.sessions_count || 0), 0);
  const ga4BounceRate = ga4Overview?.bounceRate ?? null;
  const ga4EngagementRate = ga4Overview?.engagementRate ?? null;

  const totalConversions = conversions.length;
  const hasRealData = seoMetrics.length > 0 || sessions.length > 0 || conversions.length > 0 || hasLiveGSC || !!ga4Overview;

  // Trend chart from live GSC or DB
  const trendData = (() => {
    if (hasLiveGSC) {
      const sorted = [...gscRows].sort((a: any, b: any) => (a.keys?.[0] || "").localeCompare(b.keys?.[0] || ""));
      return sorted.map((r: any) => ({
        date: new Date(r.keys?.[0]).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
      }));
    }
    const byDate = new Map<string, { clicks: number; impressions: number }>();
    seoMetrics.forEach((m: any) => {
      const d = m.metric_date;
      const existing = byDate.get(d) || { clicks: 0, impressions: 0 };
      existing.clicks += m.clicks || 0;
      existing.impressions += m.impressions || 0;
      byDate.set(d, existing);
    });
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
        clicks: d.clicks,
        impressions: d.impressions,
      }));
  })();

  // Top pages from DB
  const byUrl = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>();
  seoMetrics.forEach((m: any) => {
    if (!m.url) return;
    const existing = byUrl.get(m.url) || { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 };
    existing.clicks += m.clicks || 0;
    existing.impressions += m.impressions || 0;
    existing.ctr += Number(m.ctr || 0);
    existing.position += Number(m.position || 0);
    existing.count++;
    byUrl.set(m.url, existing);
  });
  const topPages = Array.from(byUrl.entries())
    .sort((a, b) => b[1].clicks - a[1].clicks)
    .slice(0, 6)
    .map(([url, d]) => ({
      url,
      clicks: d.clicks,
      impressions: d.impressions,
      ctr: Number((d.ctr / d.count * 100).toFixed(1)),
      position: Number((d.position / d.count).toFixed(1)),
    }));

  // Top queries from DB
  const byQuery = new Map<string, { clicks: number; impressions: number; position: number; count: number }>();
  seoMetrics.forEach((m: any) => {
    if (!m.query) return;
    const existing = byQuery.get(m.query) || { clicks: 0, impressions: 0, position: 0, count: 0 };
    existing.clicks += m.clicks || 0;
    existing.impressions += m.impressions || 0;
    existing.position += Number(m.position || 0);
    existing.count++;
    byQuery.set(m.query, existing);
  });
  const topQueries = Array.from(byQuery.entries())
    .sort((a, b) => b[1].clicks - a[1].clicks)
    .slice(0, 6)
    .map(([query, d]) => ({
      query,
      clicks: d.clicks,
      impressions: d.impressions,
      position: Number((d.position / d.count).toFixed(1)),
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
                    ? hasRealData
                      ? `Projeto: ${projects[0].name} — Dados dos últimos 28 dias.`
                      : `Projeto: ${projects[0].name} — Conecte GSC e GA4 para ver dados reais.`
                    : "Crie um projeto para começar."}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                {hasLiveGSC && <Badge className="bg-white/15 text-white border-white/20 text-[10px]"><Search className="h-3 w-3 mr-1" /> GSC Ativo</Badge>}
                {ga4Overview && <Badge className="bg-white/15 text-white border-white/20 text-[10px]"><Activity className="h-3 w-3 mr-1" /> GA4 Ativo</Badge>}
              </div>
            </div>
          </div>
        </AnimatedContainer>

        {/* KPIs */}
        {isLoading && gscLiveLoading ? (
          <KpiSkeleton />
        ) : (
          <StaggeredGrid className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <OverviewKpi
              label="Cliques"
              value={formatCompact(totalClicks)}
              icon={MousePointerClick}
              color="text-primary"
              bgColor="bg-primary/10"
              sparkData={clicksSpark}
              sparkColor="hsl(var(--primary))"
            />
            <OverviewKpi
              label="Impressões"
              value={formatCompact(totalImpressions)}
              icon={Eye}
              color="text-info"
              bgColor="bg-info/10"
              sparkData={impressionsSpark}
              sparkColor="hsl(var(--info))"
            />
            <OverviewKpi
              label="CTR Médio"
              value={`${avgCtr.toFixed(1)}%`}
              icon={Target}
              color="text-success"
              bgColor="bg-success/10"
            />
            <OverviewKpi
              label="Posição Média"
              value={avgPosition > 0 ? avgPosition.toFixed(1) : "—"}
              icon={TrendingUp}
              color="text-warning"
              bgColor="bg-warning/10"
            />
            <OverviewKpi
              label="Usuários"
              value={formatCompact(ga4Users)}
              icon={Users}
              color="text-chart-5"
              bgColor="bg-chart-5/10"
            />
            <OverviewKpi
              label="Conversões"
              value={formatCompact(totalConversions)}
              icon={Target}
              color="text-chart-6"
              bgColor="bg-chart-6/10"
            />
          </StaggeredGrid>
        )}

        {/* GA4 quick metrics */}
        {(ga4BounceRate !== null || ga4EngagementRate !== null) && (
          <AnimatedContainer delay={0.1}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ga4Sessions > 0 && (
                <Card className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sessões GA4</p>
                  <p className="text-lg font-bold font-display text-foreground">{formatCompact(ga4Sessions)}</p>
                </Card>
              )}
              {ga4BounceRate !== null && (
                <Card className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bounce Rate</p>
                  <p className="text-lg font-bold font-display text-foreground">{(ga4BounceRate * 100).toFixed(1)}%</p>
                </Card>
              )}
              {ga4EngagementRate !== null && (
                <Card className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Engajamento</p>
                  <p className="text-lg font-bold font-display text-foreground">{(ga4EngagementRate * 100).toFixed(1)}%</p>
                </Card>
              )}
              {ga4Overview?.avgSessionDuration !== undefined && (
                <Card className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Duração Média</p>
                  <p className="text-lg font-bold font-display text-foreground">{Math.round(ga4Overview.avgSessionDuration)}s</p>
                </Card>
              )}
            </div>
          </AnimatedContainer>
        )}

        {/* Trend Chart */}
        {isLoading && gscLiveLoading ? (
          <ChartSkeleton />
        ) : trendData.length === 0 ? (
          <EmptyState icon={BarChart3} title="Sem dados de tendência" description="Os dados aparecerão quando suas integrações começarem a sincronizar." />
        ) : (
          <AnimatedContainer delay={0.15}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold tracking-tight font-display">Cliques & Impressões — Últimos 28 dias</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Dados do Google Search Console</p>
                  </div>
                  {hasLiveGSC && <Badge variant="secondary" className="text-[10px]">Tempo Real</Badge>}
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
                      <YAxis tick={{ fontSize: 10, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card) / 0.95)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontFamily: "Inter",
                          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
                        }}
                      />
                      <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#clicksGrad)" dot={false} name="Cliques" />
                      <Area type="monotone" dataKey="impressions" stroke="hsl(var(--info))" strokeWidth={2} fill="url(#impressionsGrad)" dot={false} name="Impressões" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Top Pages */}
          {isLoading ? (
            <TableSkeleton />
          ) : topPages.length === 0 ? (
            <EmptyState icon={Globe} title="Sem dados de páginas" description="Conecte o Search Console para ver suas melhores páginas." />
          ) : (
            <AnimatedContainer delay={0.2}>
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
                        <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Impr.</TableHead>
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
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCompact(page.impressions)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{page.ctr}%</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            <span className={cn(
                              "font-semibold",
                              page.position <= 3 ? "text-success" : page.position <= 10 ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {page.position}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </AnimatedContainer>
          )}

          {/* Top Queries */}
          {isLoading ? (
            <TableSkeleton />
          ) : topQueries.length === 0 ? (
            <AnimatedContainer delay={0.25}>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground tracking-tight font-display">Insights</h3>
                <EmptyState icon={Lightbulb} title="Sem insights ainda" description="Conecte suas integrações para receber insights automáticos." />
              </div>
            </AnimatedContainer>
          ) : (
            <AnimatedContainer delay={0.25}>
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold tracking-tight font-display">Top Consultas</CardTitle>
                    <Badge variant="outline" className="text-[10px]"><Search className="h-3 w-3 mr-1" /> GSC</Badge>
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
                            <span className={cn(
                              "font-semibold",
                              q.position <= 3 ? "text-success" : q.position <= 10 ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {q.position}
                            </span>
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
