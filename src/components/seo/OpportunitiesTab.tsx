import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Target, Loader2, Download, ArrowUpDown, ChevronLeft, ChevronRight, Search, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export function OpportunitiesTab({ projectId }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "impressions", dir: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["gsc-opportunities", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-insights", {
        body: { project_id: projectId, analysis_type: "opportunities" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const rows = useMemo(() => {
    let items = (data?.rows || []);
    if (searchTerm) items = items.filter((r: any) => r.query.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(items, sort.key, sort.dir);
  }, [data, searchTerm, sort]);

  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => `"${r[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "keyword-opportunities.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const positionBadge = (pos: number) => {
    if (pos <= 3) return <Badge variant="default" className="text-[10px] bg-success">Top 3</Badge>;
    if (pos <= 10) return <Badge variant="default" className="text-[10px]">Top 10</Badge>;
    if (pos <= 20) return <Badge variant="secondary" className="text-[10px]">Top 20</Badge>;
    return <Badge variant="outline" className="text-[10px]">{pos}</Badge>;
  };

  const columns = [
    { key: "query", label: "Keyword" },
    { key: "impressions", label: "Impressões" },
    { key: "clicks", label: "Cliques" },
    { key: "ctr", label: "CTR" },
    { key: "position", label: "Posição" },
  ];

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return <Card className="p-8 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Card>;
  }

  if (error) {
    return <Card className="p-4 border-destructive/30 bg-destructive/5"><div className="text-destructive text-sm">{(error as Error).message}</div></Card>;
  }

  if (rows.length === 0 && !searchTerm) {
    return <EmptyState icon={Target} title="Nenhuma oportunidade encontrada" description="Keywords com muitas impressões e CTR baixo aparecerão aqui como oportunidades de otimização." />;
  }

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium">Oportunidades:</span>
            <span className="text-muted-foreground">Keywords com 50+ impressões, CTR &lt; 3% e posição ≤ 20. Otimize títulos e meta descriptions para aumentar o CTR.</span>
          </div>
        </Card>
      </AnimatedContainer>

      <AnimatedContainer>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar keywords..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 h-9 text-xs" />
        </div>
      </AnimatedContainer>

      <AnimatedContainer delay={0.05}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground">{rows.length} oportunidades</span>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {columns.map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => { setSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === "desc" ? "asc" : "desc" })); setPage(1); }}>
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
                ) : paginated.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                    <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[300px] truncate" title={row.query}>{row.query}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-primary">{Number(row.impressions).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.clicks).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-destructive font-medium">{row.ctr}%</td>
                    <td className="px-4 py-3">{positionBadge(row.position)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>{p}</Button>;
                })}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </Card>
      </AnimatedContainer>
    </div>
  );
}
