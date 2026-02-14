import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Loader2, Newspaper, Compass, Download, ExternalLink, AlertTriangle, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  projectId: string | undefined;
}

type SortDir = "asc" | "desc";
const PAGE_SIZE = 20;

function sortData(data: any[], key: string, dir: SortDir) {
  return [...data].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return dir === "desc" ? bv - av : av - bv;
    return dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
}

export function DiscoverNewsTab({ projectId }: Props) {
  const [activeSource, setActiveSource] = useState<"discover" | "news">("discover");
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "clicks", dir: "desc" });
  const [page, setPage] = useState(1);

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
  const rawPageData = data?.pageData || [];
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

  const pageRows = useMemo(() => {
    let rows = rawPageData.map((r: any) => ({
      page: r.page,
      clicks: Number(r.clicks) || 0,
      impressions: Number(r.impressions) || 0,
      ctr: r.ctr ? Number(r.ctr.toFixed(2)) : 0,
    }));
    if (searchTerm) rows = rows.filter((r: any) => r.page.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(rows, sort.key, sort.dir);
  }, [rawPageData, searchTerm, sort]);

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

  const columns = [
    { key: "page", label: "Página" },
    { key: "clicks", label: "Cliques" },
    { key: "impressions", label: "Impressões" },
    { key: "ctr", label: "CTR" },
  ];

  const totalPages = Math.ceil(pageRows.length / PAGE_SIZE);
  const paginated = pageRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            <Button
              variant={activeSource === "discover" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => { setActiveSource("discover"); setPage(1); }}
            >
              <Compass className="h-4 w-4" />
              Google Discover
            </Button>
            <Button
              variant={activeSource === "news" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => { setActiveSource("news"); setPage(1); }}
            >
              <Newspaper className="h-4 w-4" />
              Google News
            </Button>
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar páginas..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-8 h-9 text-xs"
            />
          </div>
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
                  {unavailableMsg || "Este tipo de busca não está disponível para esta propriedade."}
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

          {/* Sortable pages table */}
          {pageRows.length > 0 && (
            <AnimatedContainer delay={0.15}>
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <span className="text-xs text-muted-foreground">{pageRows.length} resultados</span>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => exportCSV(pageRows, `${activeSource}-pages`)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> CSV
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {columns.map(col => (
                          <th
                            key={col.key}
                            className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => { setSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === "desc" ? "asc" : "desc" })); setPage(1); }}
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              <ArrowUpDown className={`h-3 w-3 ${sort.key === col.key ? "text-primary" : "opacity-40"}`} />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
                      ) : (
                        paginated.map((row, i) => (
                          <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                            <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[400px] truncate" title={row.page}>
                              <a href={row.page} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                                {row.page}
                                <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                              </a>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.clicks).toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.impressions).toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.ctr}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                    <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                        return (
                          <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>
                            {p}
                          </Button>
                        );
                      })}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </AnimatedContainer>
          )}
        </>
      )}
    </div>
  );
}
