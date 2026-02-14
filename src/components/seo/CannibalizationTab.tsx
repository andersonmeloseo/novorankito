import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Copy, Loader2, Download, ArrowUpDown, ChevronLeft, ChevronRight, Search, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
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

export function CannibalizationTab({ projectId }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "totalImpressions", dir: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["gsc-cannibalization", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-insights", {
        body: { project_id: projectId, analysis_type: "cannibalization" },
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
    const flat: any[] = [];
    for (const row of rows) {
      for (const p of row.pages) {
        flat.push({ query: row.query, page: p.page, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position });
      }
    }
    const headers = Object.keys(flat[0]);
    const csv = [headers.join(","), ...flat.map(r => headers.map(h => `"${r[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cannibalization.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "query", label: "Keyword" },
    { key: "pageCount", label: "Páginas" },
    { key: "totalClicks", label: "Cliques Total" },
    { key: "totalImpressions", label: "Impressões Total" },
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
    return <EmptyState icon={Copy} title="Nenhuma canibalização detectada" description="Keywords com múltiplas páginas competindo aparecerão aqui." />;
  }

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <Card className="p-3 bg-warning/5 border-warning/20">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-foreground font-medium">Canibalização:</span>
            <span className="text-muted-foreground">Keywords onde 2+ páginas competem na busca. Consolide o conteúdo ou use canonical tags para focar autoridade.</span>
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
            <span className="text-xs text-muted-foreground">{rows.length} keywords canibalizadas</span>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 w-8"></th>
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
                  <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
                ) : paginated.map((row: any, i: number) => (
                  <>
                    <tr key={`main-${i}`} className="border-b border-border last:border-0 table-row-hover cursor-pointer" onClick={() => setExpandedQuery(expandedQuery === row.query ? null : row.query)}>
                      <td className="px-4 py-3">
                        {expandedQuery === row.query ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[300px] truncate" title={row.query}>{row.query}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.pageCount >= 3 ? "destructive" : "secondary"} className="text-[10px]">{row.pageCount} páginas</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.totalClicks).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.totalImpressions).toLocaleString()}</td>
                    </tr>
                    {expandedQuery === row.query && row.pages.map((p: any, j: number) => (
                      <tr key={`sub-${i}-${j}`} className="bg-muted/20 border-b border-border">
                        <td className="px-4 py-2"></td>
                        <td colSpan={2} className="px-4 py-2 text-xs font-mono text-muted-foreground max-w-[400px] truncate pl-8" title={p.page}>{p.page}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{p.clicks} cliques · {p.ctr}% CTR</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">Pos. {p.position}</td>
                      </tr>
                    ))}
                  </>
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
