import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSeoMetrics } from "@/hooks/use-data-modules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Search } from "lucide-react";

export default function SeoPage() {
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
  const { data: metrics = [], isLoading } = useSeoMetrics(projectId);

  // Aggregate KPIs
  const totalClicks = metrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const totalImpressions = metrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const avgCtr = metrics.length ? metrics.reduce((s: number, m: any) => s + Number(m.ctr || 0), 0) / metrics.length : 0;
  const avgPosition = metrics.length ? metrics.reduce((s: number, m: any) => s + Number(m.position || 0), 0) / metrics.length : 0;

  const byUrl = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>();
  metrics.forEach((m: any) => {
    if (!m.url) return;
    const existing = byUrl.get(m.url) || { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 };
    existing.clicks += m.clicks || 0;
    existing.impressions += m.impressions || 0;
    existing.ctr += Number(m.ctr || 0);
    existing.position += Number(m.position || 0);
    existing.count++;
    byUrl.set(m.url, existing);
  });
  const urlRows = Array.from(byUrl.entries()).map(([url, d]) => [
    url, d.clicks.toLocaleString(), d.impressions.toLocaleString(),
    (d.ctr / d.count).toFixed(2) + "%", (d.position / d.count).toFixed(1),
  ]).slice(0, 20);

  const byQuery = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>();
  metrics.forEach((m: any) => {
    if (!m.query) return;
    const existing = byQuery.get(m.query) || { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 };
    existing.clicks += m.clicks || 0;
    existing.impressions += m.impressions || 0;
    existing.ctr += Number(m.ctr || 0);
    existing.position += Number(m.position || 0);
    existing.count++;
    byQuery.set(m.query, existing);
  });
  const queryRows = Array.from(byQuery.entries()).map(([q, d]) => [
    q, d.clicks.toLocaleString(), d.impressions.toLocaleString(),
    (d.ctr / d.count).toFixed(2) + "%", (d.position / d.count).toFixed(1),
  ]).slice(0, 20);

  const byCountry = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>();
  metrics.forEach((m: any) => {
    if (!m.country) return;
    const existing = byCountry.get(m.country) || { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 };
    existing.clicks += m.clicks || 0;
    existing.impressions += m.impressions || 0;
    existing.ctr += Number(m.ctr || 0);
    existing.position += Number(m.position || 0);
    existing.count++;
    byCountry.set(m.country, existing);
  });
  const countryRows = Array.from(byCountry.entries()).map(([c, d]) => [
    c, d.clicks.toLocaleString(), d.impressions.toLocaleString(),
    (d.ctr / d.count).toFixed(2) + "%", (d.position / d.count).toFixed(1),
  ]);

  const byDevice = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>();
  metrics.forEach((m: any) => {
    if (!m.device) return;
    const existing = byDevice.get(m.device) || { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 };
    existing.clicks += m.clicks || 0;
    existing.impressions += m.impressions || 0;
    existing.ctr += Number(m.ctr || 0);
    existing.position += Number(m.position || 0);
    existing.count++;
    byDevice.set(m.device, existing);
  });
  const deviceRows = Array.from(byDevice.entries()).map(([d, data]) => [
    d, data.clicks.toLocaleString(), data.impressions.toLocaleString(),
    (data.ctr / data.count).toFixed(2) + "%", (data.position / data.count).toFixed(1),
  ]);

  const byDate = new Map<string, { clicks: number; impressions: number }>();
  metrics.forEach((m: any) => {
    const d = m.metric_date;
    const existing = byDate.get(d) || { clicks: 0, impressions: 0 };
    existing.clicks += m.clicks || 0;
    existing.impressions += m.impressions || 0;
    byDate.set(d, existing);
  });
  const trendData = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, clicks: d.clicks, impressions: d.impressions }));

  const hasData = metrics.length > 0;

  return (
    <>
      <TopBar title="SEO" subtitle="Monitore cliques, impressões e posições via Google Search Console" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {isLoading ? (
          <>
            <KpiSkeleton />
            <ChartSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Cliques" value={totalClicks} change={0} />
              <KpiCard label="Impressões" value={totalImpressions} change={0} />
              <KpiCard label="CTR" value={Number(avgCtr.toFixed(2))} change={0} suffix="%" />
              <KpiCard label="Posição Média" value={Number(avgPosition.toFixed(1))} change={0} />
            </StaggeredGrid>

            {hasData && trendData.length > 1 && (
              <AnimatedContainer delay={0.15}>
                <Card className="p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Tendência de Performance</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                        <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#clicksGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </AnimatedContainer>
            )}

            {!hasData && (
              <EmptyState
                icon={Search}
                title="Nenhuma métrica SEO"
                description="Conecte o Google Search Console ou adicione dados manualmente para visualizar performance."
              />
            )}

            {hasData && (
              <AnimatedContainer delay={0.2}>
                <Tabs defaultValue="pages">
                  <TabsList>
                    <TabsTrigger value="pages" className="text-xs">Páginas</TabsTrigger>
                    <TabsTrigger value="queries" className="text-xs">Consultas</TabsTrigger>
                    <TabsTrigger value="countries" className="text-xs">Países</TabsTrigger>
                    <TabsTrigger value="devices" className="text-xs">Dispositivos</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pages" className="mt-4">
                    <DataTable columns={["URL", "Cliques", "Impressões", "CTR", "Posição"]} rows={urlRows} />
                  </TabsContent>
                  <TabsContent value="queries" className="mt-4">
                    <DataTable columns={["Consulta", "Cliques", "Impressões", "CTR", "Posição"]} rows={queryRows} />
                  </TabsContent>
                  <TabsContent value="countries" className="mt-4">
                    <DataTable columns={["País", "Cliques", "Impressões", "CTR", "Posição"]} rows={countryRows} />
                  </TabsContent>
                  <TabsContent value="devices" className="mt-4">
                    <DataTable columns={["Dispositivo", "Cliques", "Impressões", "CTR", "Posição"]} rows={deviceRows} />
                  </TabsContent>
                </Tabs>
              </AnimatedContainer>
            )}
          </>
        )}
      </div>
    </>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? "font-mono text-foreground" : "text-muted-foreground"}`}>{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
