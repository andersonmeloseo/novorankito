import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Newspaper, Compass, Download, ExternalLink, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  projectId: string | undefined;
}

export function DiscoverNewsTab({ projectId }: Props) {
  const [activeSource, setActiveSource] = useState<"discover" | "news">("discover");

  const { data, isLoading, error } = useQuery({
    queryKey: ["gsc-discover-news", projectId, activeSource],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-discover-news", {
        body: { project_id: projectId, search_type: activeSource },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const dateData = data?.dateData || [];
  const pageData = data?.pageData || [];
  const unavailable = data?.unavailable;
  const unavailableMsg = data?.message;

  const totalClicks = dateData.reduce((s: number, d: any) => s + (d.clicks || 0), 0);
  const totalImpressions = dateData.reduce((s: number, d: any) => s + (d.impressions || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100) : 0;

  const chartData = dateData.map((d: any) => ({
    date: format(parseISO(d.date), "dd MMM", { locale: ptBR }),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  const exportCSV = (rows: any[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => `"${r[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <div className="flex gap-2">
          <Button
            variant={activeSource === "discover" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActiveSource("discover")}
          >
            <Compass className="h-4 w-4" />
            Google Discover
          </Button>
          <Button
            variant={activeSource === "news" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActiveSource("news")}
          >
            <Newspaper className="h-4 w-4" />
            Google News
          </Button>
        </div>
      </AnimatedContainer>

      {isLoading ? (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : unavailable ? (
        <AnimatedContainer>
          <Card className="p-6 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <h4 className="text-sm font-semibold">{activeSource === "discover" ? "Google Discover" : "Google News"} indisponível</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {unavailableMsg || "Este tipo de busca não está disponível para esta propriedade. Geralmente, o Discover requer um certo volume de tráfego para ser habilitado pelo Google."}
                </p>
              </div>
            </div>
          </Card>
        </AnimatedContainer>
      ) : dateData.length === 0 ? (
        <EmptyState
          icon={activeSource === "discover" ? Compass : Newspaper}
          title={`Sem dados de ${activeSource === "discover" ? "Discover" : "News"}`}
          description="Não há dados disponíveis para o período selecionado."
        />
      ) : (
        <>
          {/* KPIs */}
          <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard label="Cliques" value={totalClicks} change={0} sparklineData={dateData.map((d: any) => d.clicks)} sparklineColor="hsl(var(--chart-1))" />
            <KpiCard label="Impressões" value={totalImpressions} change={0} sparklineData={dateData.map((d: any) => d.impressions)} sparklineColor="hsl(var(--chart-2))" />
            <KpiCard label="CTR Médio" value={Number(avgCtr.toFixed(2))} change={0} suffix="%" sparklineData={dateData.map((d: any) => d.ctr)} sparklineColor="hsl(var(--chart-3))" />
          </StaggeredGrid>

          {/* Trend chart */}
          {chartData.length > 1 && (
            <AnimatedContainer delay={0.1}>
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  {activeSource === "discover" ? <Compass className="h-4 w-4 text-primary" /> : <Newspaper className="h-4 w-4 text-primary" />}
                  Tendência — {activeSource === "discover" ? "Google Discover" : "Google News"}
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="discoverClicksGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                      <Area type="monotone" dataKey="clicks" name="Cliques" stroke="hsl(var(--chart-1))" fill="url(#discoverClicksGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="impressions" name="Impressões" stroke="hsl(var(--chart-2))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </AnimatedContainer>
          )}

          {/* Pages table */}
          {pageData.length > 0 && (
            <AnimatedContainer delay={0.15}>
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <span className="text-xs text-muted-foreground">{pageData.length} páginas</span>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => exportCSV(pageData, `${activeSource}-pages`)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> CSV
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Página</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cliques</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Impressões</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.slice(0, 50).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                          <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[400px] truncate">
                            <a href={row.page} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                              {row.page}
                              <ExternalLink className="h-3 w-3 opacity-40" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.clicks).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.impressions).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{row.ctr?.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </AnimatedContainer>
          )}
        </>
      )}
    </div>
  );
}
