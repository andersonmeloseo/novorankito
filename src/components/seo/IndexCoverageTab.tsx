import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid } from "@/components/ui/animated-container";
import { toast } from "@/hooks/use-toast";
import {
  Shield, Loader2, Download, ArrowUpDown, ChevronLeft, ChevronRight,
  Search, Play, CheckCircle, XCircle, AlertTriangle, MinusCircle, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface Props {
  projectId: string | undefined;
}

type SortDir = "asc" | "desc";
const PAGE_SIZE = 20;

function sortData(data: any[], key: string, dir: SortDir) {
  return [...data].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return dir === "desc" ? bv - av : av - bv;
    return dir === "desc" ? String(bv || "").localeCompare(String(av || "")) : String(av || "").localeCompare(String(bv || ""));
  });
}

const verdictMap: Record<string, { label: string; color: string; icon: any }> = {
  PASS: { label: "Válida", color: "bg-success text-success-foreground", icon: CheckCircle },
  NEUTRAL: { label: "Excluída", color: "bg-muted text-muted-foreground", icon: MinusCircle },
  FAIL: { label: "Erro", color: "bg-destructive text-destructive-foreground", icon: XCircle },
  VERDICT_UNSPECIFIED: { label: "Desconhecido", color: "bg-muted text-muted-foreground", icon: AlertTriangle },
};

export function IndexCoverageTab({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "inspected_at", dir: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [scanning, setScanning] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["index-coverage", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-index-coverage", {
        body: { project_id: projectId, action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const allRows = data?.rows || [];

  // KPIs
  const kpis = useMemo(() => {
    const total = allRows.length;
    const indexed = allRows.filter((r: any) => r.verdict === "PASS").length;
    const excluded = allRows.filter((r: any) => r.verdict === "NEUTRAL").length;
    const errors = allRows.filter((r: any) => r.verdict === "FAIL").length;
    return { total, indexed, excluded, errors };
  }, [allRows]);

  const rows = useMemo(() => {
    let items = allRows;
    if (statusFilter !== "all") items = items.filter((r: any) => r.verdict === statusFilter);
    if (searchTerm) items = items.filter((r: any) => r.url.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(items, sort.key, sort.dir);
  }, [allRows, searchTerm, statusFilter, sort]);

  const startScan = async () => {
    if (!projectId) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("gsc-index-coverage", {
        body: { project_id: projectId, action: "scan" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.message) {
        toast({ title: "Varredura", description: data.message });
      } else {
        toast({
          title: "Varredura concluída!",
          description: `${data?.inspected || 0} URLs inspecionadas. ${data?.remaining || 0} restantes. ${data?.errors || 0} erros.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["index-coverage"] });
    } catch (e: any) {
      toast({ title: "Erro na varredura", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = ["url", "verdict", "coverage_state", "indexing_state", "page_fetch_state", "crawled_as", "last_crawl_time", "sitemap", "inspected_at"];
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => `"${r[h] || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "index-coverage.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const renderVerdict = (verdict: string) => {
    const v = verdictMap[verdict] || verdictMap.VERDICT_UNSPECIFIED;
    const Icon = v.icon;
    return (
      <Badge className={`text-[10px] gap-1 ${v.color}`}>
        <Icon className="h-3 w-3" />
        {v.label}
      </Badge>
    );
  };

  const columns = [
    { key: "url", label: "URL" },
    { key: "verdict", label: "Veredito" },
    { key: "coverage_state", label: "Status de Cobertura" },
    { key: "indexing_state", label: "Indexação" },
    { key: "page_fetch_state", label: "Fetch" },
    { key: "crawled_as", label: "Rastreado como" },
    { key: "last_crawl_time", label: "Último Rastreio" },
    { key: "inspected_at", label: "Inspecionado em" },
  ];

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return <Card className="p-8 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Card>;
  }

  if (error) {
    return <Card className="p-4 border-destructive/30 bg-destructive/5"><div className="text-destructive text-sm">{(error as Error).message}</div></Card>;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Inspecionadas" value={kpis.total} change={0} />
        <KpiCard label="Indexadas" value={kpis.indexed} change={kpis.total > 0 ? parseFloat(((kpis.indexed / kpis.total) * 100).toFixed(1)) : 0} suffix="%" />
        <KpiCard label="Excluídas" value={kpis.excluded} change={0} />
        <KpiCard label="Com Erro" value={kpis.errors} change={0} />
      </StaggeredGrid>

      {/* Scan button + info */}
      <AnimatedContainer>
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-foreground font-medium">Cobertura de Indexação:</span>
              <span className="text-muted-foreground">Inspeciona suas URLs para verificar o status no índice do Google. Limite: ~20 URLs por varredura (cota da API).</span>
            </div>
            <Button onClick={startScan} disabled={scanning} size="sm" className="gap-1.5 text-xs">
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {scanning ? "Varrendo..." : "Iniciar Varredura"}
            </Button>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Filters */}
      <AnimatedContainer>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar URLs..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 h-9 text-xs" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PASS">Válidas (Indexadas)</SelectItem>
              <SelectItem value="NEUTRAL">Excluídas</SelectItem>
              <SelectItem value="FAIL">Com Erro</SelectItem>
              <SelectItem value="VERDICT_UNSPECIFIED">Desconhecido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AnimatedContainer>

      {/* Table */}
      {allRows.length === 0 && !searchTerm ? (
        <EmptyState
          icon={Shield}
          title="Nenhuma URL inspecionada"
          description="Clique em 'Iniciar Varredura' para verificar o status de indexação das suas URLs."
        />
      ) : (
        <AnimatedContainer delay={0.05}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground">{rows.length} URLs</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1.5" onClick={() => queryClient.invalidateQueries({ queryKey: ["index-coverage"] })}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Atualizar
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={exportCSV}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
              </div>
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
                  ) : paginated.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                      <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[300px] truncate" title={row.url}>
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{row.url}</a>
                      </td>
                      <td className="px-4 py-3">{renderVerdict(row.verdict)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={row.coverage_state || ""}>{row.coverage_state || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.indexing_state || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.page_fetch_state || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.crawled_as || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.last_crawl_time ? format(parseISO(row.last_crawl_time), "dd/MM/yyyy HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.inspected_at ? format(parseISO(row.inspected_at), "dd/MM/yyyy HH:mm") : "—"}
                      </td>
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
      )}
    </div>
  );
}
