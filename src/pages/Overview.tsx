import { TopBar } from "@/components/layout/TopBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSeoMetrics, useAnalyticsSessions, useConversions } from "@/hooks/use-data-modules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, Sparkles, Lightbulb } from "lucide-react";

export default function Overview() {
  const { user } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").order("created_at", { ascending: false }).limit(1);
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;

  const { data: seoMetrics = [], isLoading: seoLoading } = useSeoMetrics(projectId);
  const { data: sessions = [], isLoading: sessionsLoading } = useAnalyticsSessions(projectId);
  const { data: conversions = [], isLoading: conversionsLoading } = useConversions(projectId);

  const isLoading = seoLoading || sessionsLoading || conversionsLoading;

  const totalClicks = seoMetrics.reduce((s, m: any) => s + (m.clicks || 0), 0);
  const totalImpressions = seoMetrics.reduce((s, m: any) => s + (m.impressions || 0), 0);
  const totalSessions = sessions.reduce((s, a: any) => s + (a.sessions_count || 0), 0);
  const totalConversions = conversions.length;

  const hasRealData = seoMetrics.length > 0 || sessions.length > 0 || conversions.length > 0;

  const kpiList = [
    { value: totalClicks, change: 0, label: "Cliques" },
    { value: totalImpressions, change: 0, label: "Impressões" },
    { value: totalSessions, change: 0, label: "Sessões" },
    { value: totalConversions, change: 0, label: "Conversões" },
  ];

  // Build trend data from real seo_metrics grouped by date
  const byDate = new Map<string, { clicks: number; sessions: number }>();
  seoMetrics.forEach((m: any) => {
    const d = m.metric_date;
    const existing = byDate.get(d) || { clicks: 0, sessions: 0 };
    existing.clicks += m.clicks || 0;
    byDate.set(d, existing);
  });
  sessions.forEach((s: any) => {
    const d = s.session_date;
    const existing = byDate.get(d) || { clicks: 0, sessions: 0 };
    existing.sessions += s.sessions_count || 0;
    byDate.set(d, existing);
  });
  const trendData = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
      clicks: d.clicks,
      sessions: d.sessions,
    }));

  // Top pages from real data
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
    .slice(0, 5)
    .map(([url, d]) => ({
      url,
      clicks: d.clicks,
      ctr: Number((d.ctr / d.count).toFixed(2)),
      position: Number((d.position / d.count).toFixed(1)),
    }));

  return (
    <>
      <TopBar title="Visão Geral" subtitle="Resumo de performance do seu projeto" />
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-auto">
        {/* Welcome banner */}
        <AnimatedContainer>
          <div className="gradient-primary rounded-xl p-5 sm:p-6 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.12),transparent_60%)]" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider opacity-80">Dashboard</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight">
                  {(() => {
                    const hour = new Date().getHours();
                    const greet = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
                    const name = user?.user_metadata?.display_name || user?.user_metadata?.name || "";
                    return name ? `${greet}, ${name}! 👋` : `${greet}!`;
                  })()}
                </h2>
                <p className="text-sm opacity-80 mt-1">
                  {projects[0]
                    ? hasRealData
                      ? `Projeto: ${projects[0].name} — Acompanhe a performance em tempo real.`
                      : `Projeto: ${projects[0].name} — Conecte suas integrações para ver dados reais.`
                    : "Crie um projeto para começar."}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 opacity-20 hidden sm:block" />
            </div>
          </div>
        </AnimatedContainer>

        {/* KPIs */}
        {isLoading ? (
          <KpiSkeleton />
        ) : (
          <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpiList.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </StaggeredGrid>
        )}

        {/* Trend Chart */}
        {isLoading ? (
          <ChartSkeleton />
        ) : trendData.length === 0 ? (
          <EmptyState icon={BarChart3} title="Sem dados de tendência" description="Os dados aparecerão aqui quando suas integrações começarem a sincronizar." />
        ) : (
          <AnimatedContainer delay={0.15}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold tracking-tight font-display">Tendência de Cliques & Sessões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontFamily: "Inter",
                          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.15)",
                        }}
                      />
                      <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="sessions" stroke="hsl(var(--success))" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Pages */}
          {isLoading ? (
            <TableSkeleton />
          ) : topPages.length === 0 ? (
            <EmptyState icon={BarChart3} title="Sem dados de páginas" description="Conecte o Google Search Console para ver suas páginas de melhor performance." />
          ) : (
            <AnimatedContainer delay={0.2}>
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold tracking-tight font-display">Top Páginas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold">URL</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Cliques</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">CTR</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Posição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.map((page) => (
                        <TableRow key={page.url} className="cursor-pointer table-row-hover">
                          <TableCell className="text-xs font-medium text-primary truncate max-w-[200px]">{page.url}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{page.clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{page.ctr}%</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{page.position}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </AnimatedContainer>
          )}

          {/* Insights - empty state when no data */}
          <AnimatedContainer delay={0.25}>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground tracking-tight font-display">Insights Recentes</h3>
              {hasRealData ? (
                <EmptyState icon={Lightbulb} title="Insights em breve" description="O agente IA gerará insights assim que houver dados suficientes para análise." />
              ) : (
                <EmptyState icon={Lightbulb} title="Sem insights ainda" description="Conecte suas integrações e aguarde a coleta de dados para receber insights automáticos." />
              )}
            </div>
          </AnimatedContainer>
        </div>
      </div>
    </>
  );
}
