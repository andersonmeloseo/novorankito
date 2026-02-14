import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkles, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ExportMenu } from "@/components/ui/export-menu";
import { exportCSV, exportXML } from "@/lib/export-utils";

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

export function SearchAppearanceTab({ projectId }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "clicks", dir: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["gsc-search-appearance", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-search-appearance", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId,
  });

  const rows = useMemo(() => {
    let items = (data?.rows || []).map((r: any) => ({
      name: r.type,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));
    if (searchTerm) items = items.filter((r: any) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(items, sort.key, sort.dir);
  }, [data, searchTerm, sort]);

  const doExportCSV = () => exportCSV(rows, "aparencia-busca");
  const doExportXML = () => exportXML(rows, "aparencia-busca", "searchAppearance", "type");

  const columns = [
    { key: "name", label: "Tipo de Resultado" },
    { key: "clicks", label: "Cliques" },
    { key: "impressions", label: "Impressões" },
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
    return <EmptyState icon={Sparkles} title="Sem dados de Search Appearance" description="Os dados de aparência na busca serão exibidos quando houver rich results ou outros tipos especiais." />;
  }

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar tipos..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 h-9 text-xs" />
        </div>
      </AnimatedContainer>

      <AnimatedContainer delay={0.05}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
             <span className="text-xs text-muted-foreground">{rows.length} resultados</span>
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
                ) : paginated.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                    <td className="px-4 py-3 text-xs font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.clicks).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.impressions).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.ctr}%</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.position}</td>
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
