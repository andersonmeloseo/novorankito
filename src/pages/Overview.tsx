import { TopBar } from "@/components/layout/TopBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { mockTrendData, mockInsights } from "@/lib/mock-data";
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
import { BarChart3 } from "lucide-react";

export default function Overview() {
  const { user } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").limit(1);
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;

  const { data: seoMetrics = [], isLoading: seoLoading } = useSeoMetrics(projectId);
  const { data: sessions = [], isLoading: sessionsLoading } = useAnalyticsSessions(projectId);
  const { data: conversions = [], isLoading: conversionsLoading } = useConversions(projectId);

  const isLoading = seoLoading || sessionsLoading || conversionsLoading;

  // Compute KPIs from real data, fallback to mock
  const totalClicks = seoMetrics.reduce((s, m: any) => s + (m.clicks || 0), 0);
  const totalImpressions = seoMetrics.reduce((s, m: any) => s + (m.impressions || 0), 0);
  const totalSessions = sessions.reduce((s, a: any) => s + (a.sessions_count || 0), 0);
  const totalConversions = conversions.length;

  const hasRealData = seoMetrics.length > 0 || sessions.length > 0 || conversions.length > 0;

  const kpiList = hasRealData
    ? [
        { value: totalClicks, change: 0, label: "Cliques" },
        { value: totalImpressions, change: 0, label: "Impressões" },
        { value: totalSessions, change: 0, label: "Sessões" },
        { value: totalConversions, change: 0, label: "Conversões" },
      ]
    : [
        { value: 24832, change: 12.4, label: "Cliques" },
        { value: 1284920, change: 8.1, label: "Impressões" },
        { value: 32100, change: 9.7, label: "Sessões" },
        { value: 842, change: 22.3, label: "Conversões" },
      ];

  // Top pages from SEO metrics
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
  const topPages = hasRealData
    ? Array.from(byUrl.entries())
        .sort((a, b) => b[1].clicks - a[1].clicks)
        .slice(0, 5)
        .map(([url, d]) => ({
          url,
          clicks: d.clicks,
          ctr: Number((d.ctr / d.count).toFixed(2)),
          position: Number((d.position / d.count).toFixed(1)),
        }))
    : [
        { url: "/products/wireless-headphones", clicks: 3842, ctr: 3.9, position: 4.2 },
        { url: "/blog/best-noise-cancelling-2026", clicks: 2910, ctr: 2.04, position: 6.1 },
        { url: "/products/smart-speaker", clicks: 2104, ctr: 3.08, position: 5.8 },
        { url: "/blog/home-audio-guide", clicks: 1890, ctr: 1.68, position: 8.3 },
        { url: "/category/headphones", clicks: 1542, ctr: 3.41, position: 3.9 },
      ];

  return (
    <>
      <TopBar title="Visão Geral" subtitle="Resumo de performance do seu projeto" />
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-auto">
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
        ) : (
          <AnimatedContainer delay={0.15}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">Tendência de Cliques & Sessões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="sessions" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold tracking-tight">Top Páginas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">URL</TableHead>
                        <TableHead className="text-xs text-right">Cliques</TableHead>
                        <TableHead className="text-xs text-right">CTR</TableHead>
                        <TableHead className="text-xs text-right">Posição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.map((page) => (
                        <TableRow key={page.url} className="cursor-pointer">
                          <TableCell className="text-xs font-medium text-primary truncate max-w-[200px]">{page.url}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{page.clicks.toLocaleString()}</TableCell>
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

          {/* Recent Insights */}
          <AnimatedContainer delay={0.25}>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Insights Recentes</h3>
              {mockInsights.map((insight) => (
                <InsightCard key={insight.id} {...insight} />
              ))}
            </div>
          </AnimatedContainer>
        </div>
      </div>
    </>
  );
}
