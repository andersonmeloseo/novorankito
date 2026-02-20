import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";
import { exportCSV, exportXML } from "@/lib/export-utils";
import { TrendingDown, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, Search, AlertTriangle } from "lucide-react";
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

export function ContentDecayTab({ projectId }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "diffClicks", dir: "asc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["gsc-decay", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-insights", {
        body: { project_id: projectId, analysis_type: "decay" },
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
    if (searchTerm) items = items.filter((r: any) => r.page.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(items, sort.key, sort.dir);
  }, [data, searchTerm, sort]);

  const doExportCSV = () => exportCSV(rows, "declinio-conteudo");
  const doExportXML = () => exportXML(rows, "declinio-conteudo", "contentDecay", "page");

  const severityBadge = (pct: number) => {
    if (pct <= -50) return <Badge variant="destructive" className="text-[10px]">Crítico</Badge>;
    if (pct <= -30) return <Badge variant="default" className="text-[10px] bg-warning text-warning-foreground">Alerta</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Leve</Badge>;
  };

  const columns = [
    { key: "page", label: "Página" },
    { key: "currentClicks", label: "Cliques Atual" },
    { key: "previousClicks", label: "Cliques Anterior" },
    { key: "diffClicks", label: "Diferença" },
    { key: "pctChange", label: "Variação %" },
    { key: "currentImpressions", label: "Impr. Atual" },
    { key: "previousImpressions", label: "Impr. Anterior" },
    { key: "currentPosition", label: "Pos. Atual" },
    { key: "previousPosition", label: "Pos. Anterior" },
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
    return <EmptyState icon={TrendingDown} title="Nenhum conteúdo em declínio" description="Páginas perdendo mais de 20% de cliques vs período anterior aparecerão aqui." />;
  }

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <Card className="p-3 bg-destructive/5 border-destructive/20">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-destructive" />
             <span className="text-foreground font-medium">Declínio de Conteúdo:</span>
             <span className="text-muted-foreground">Páginas com queda de 20%+ em cliques nos últimos 28 dias vs período anterior. Atualize o conteúdo para recuperar tráfego.</span>
          </div>
        </Card>
      </AnimatedContainer>

      <AnimatedContainer>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar páginas..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 h-9 text-xs" />
        </div>
      </AnimatedContainer>

      <AnimatedContainer delay={0.05}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
             <span className="text-xs text-muted-foreground">{rows.length} páginas em declínio</span>
             <ExportMenu onExportCSV={doExportCSV} onExportXML={doExportXML} />
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
                     <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[300px] truncate" title={row.page}><a href={row.page} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{row.page}</a></td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.currentClicks).toLocaleString()}</td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.previousClicks).toLocaleString()}</td>
                     <td className="px-4 py-3 text-xs text-destructive font-semibold">{row.diffClicks}</td>
                     <td className="px-4 py-3">{severityBadge(row.pctChange)}</td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.currentImpressions).toLocaleString()}</td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.previousImpressions).toLocaleString()}</td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">{row.currentPosition}</td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">{row.previousPosition}</td>
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
