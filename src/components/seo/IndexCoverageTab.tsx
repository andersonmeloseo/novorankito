import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid } from "@/components/ui/animated-container";
import { ExportMenu } from "@/components/ui/export-menu";
import { exportCSV as exportCSVUtil, exportXML } from "@/lib/export-utils";
import { toast } from "@/hooks/use-toast";
import {
  Shield, Loader2, ArrowUpDown, ChevronLeft, ChevronRight,
  Search, Play, CheckCircle, XCircle, AlertTriangle, MinusCircle, RefreshCw,
  Info, Clock, Zap, Users, CalendarClock, Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";

interface Props {
  projectId: string | undefined;
}

type SortDir = "asc" | "desc";
const PAGE_SIZE = 20;
const URLS_PER_ACCOUNT = 20;

function sortData(data: any[], key: string, dir: SortDir) {
  return [...data].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return dir === "desc" ? bv - av : av - bv;
    return dir === "desc" ? String(bv || "").localeCompare(String(av || "")) : String(av || "").localeCompare(String(bv || ""));
  });
}

const verdictMap: Record<string, { label: string; color: string; icon: any; explanation: string }> = {
  PASS: { label: "Válida", color: "bg-success text-success-foreground", icon: CheckCircle, explanation: "Esta URL foi rastreada pelo Google e está incluída no índice de busca. Ela pode aparecer nos resultados de pesquisa normalmente." },
  NEUTRAL: { label: "Excluída", color: "bg-muted text-muted-foreground", icon: MinusCircle, explanation: "O Google conhece esta URL mas decidiu não indexá-la. Motivos comuns: página duplicada, canonical apontando para outra URL, bloqueio por noindex, redirect, ou o Google considerou outra versão mais relevante." },
  FAIL: { label: "Erro", color: "bg-destructive text-destructive-foreground", icon: XCircle, explanation: "O Google tentou acessar esta URL mas encontrou um erro que impediu a indexação. Pode ser erro 404 (não encontrada), 5xx (servidor), bloqueio por robots.txt ou problemas de acesso." },
  VERDICT_UNSPECIFIED: { label: "Desconhecido", color: "bg-muted text-muted-foreground", icon: AlertTriangle, explanation: "O Google ainda não determinou o status desta URL ou a inspeção não retornou informação suficiente. Tente inspecionar novamente." },
};

const coverageStateMap: Record<string, { label: string; tip: string }> = {
  "Submitted and indexed": { label: "Enviada e indexada", tip: "A URL foi enviada e aceita pelo Google no índice." },
  "Crawled - currently not indexed": { label: "Rastreada — não indexada", tip: "O Google rastreou a página mas decidiu não indexá-la. Pode ser conteúdo de baixa qualidade, duplicado ou pouco relevante." },
  "Discovered - currently not indexed": { label: "Descoberta — não indexada", tip: "O Google sabe que a URL existe mas ainda não a rastreou. Pode indicar baixa prioridade de rastreio." },
  "Page with redirect": { label: "Página com redirecionamento", tip: "A URL redireciona para outra página. O Google indexa o destino final, não esta URL." },
  "Not found (404)": { label: "Não encontrada (404)", tip: "A página retornou erro 404. Remova links internos apontando para ela ou crie o conteúdo." },
  "Soft 404": { label: "Soft 404", tip: "A página existe mas o Google a interpreta como se não existisse (conteúdo vazio ou muito fino)." },
  "Blocked by robots.txt": { label: "Bloqueada por robots.txt", tip: "O arquivo robots.txt do seu site está impedindo o Google de rastrear esta URL." },
  "Blocked due to unauthorized request (401)": { label: "Bloqueada — não autorizada (401)", tip: "A página requer autenticação. O Google não consegue acessá-la." },
  "Excluded by 'noindex' tag": { label: "Excluída por tag 'noindex'", tip: "A página tem uma tag meta noindex, instruindo o Google a não indexá-la. Remova a tag se quiser que seja indexada." },
  "Alternate page with proper canonical tag": { label: "Alternativa com canonical correto", tip: "Esta é uma versão alternativa (ex: mobile) e o canonical aponta para a versão principal. Comportamento esperado." },
  "Duplicate without user-selected canonical": { label: "Duplicada sem canonical", tip: "O Google detectou conteúdo duplicado e não há tag canonical definida. Adicione um canonical para indicar a versão preferida." },
  "Duplicate, Google chose different canonical than user": { label: "Duplicada — canonical diferente", tip: "Você definiu um canonical, mas o Google escolheu outra URL como a versão principal. Revise se o canonical está correto." },
  "Server error (5xx)": { label: "Erro no servidor (5xx)", tip: "O servidor retornou erro ao Google. Verifique a estabilidade do seu servidor." },
  "Blocked due to access forbidden (403)": { label: "Bloqueada — acesso proibido (403)", tip: "O servidor recusou o acesso do Google. Verifique permissões e firewalls." },
  "Blocked due to other 4xx issue": { label: "Bloqueada — outro erro 4xx", tip: "Outro tipo de erro de cliente impediu o acesso." },
  "URL is unknown to Google": { label: "URL desconhecida pelo Google", tip: "O Google nunca viu esta URL. Envie-a para indexação ou adicione-a ao sitemap." },
};

const indexingStateMap: Record<string, string> = {
  INDEXING_ALLOWED: "Indexação permitida",
  BLOCKED_BY_META_TAG: "Bloqueada por meta tag",
  BLOCKED_BY_HTTP_HEADER: "Bloqueada por header HTTP",
  BLOCKED_BY_ROBOTS_TXT: "Bloqueada por robots.txt",
  INDEXING_STATE_UNSPECIFIED: "Não especificado",
};

const pageFetchStateMap: Record<string, string> = {
  SUCCESSFUL: "Sucesso",
  SOFT_404: "Soft 404",
  BLOCKED_ROBOTS_TXT: "Bloqueada por robots.txt",
  NOT_FOUND: "Não encontrada",
  ACCESS_DENIED: "Acesso negado",
  SERVER_ERROR: "Erro no servidor",
  REDIRECT_ERROR: "Erro de redirecionamento",
  ACCESS_FORBIDDEN: "Acesso proibido",
  BLOCKED_4XX: "Bloqueada (4xx)",
  INTERNAL_CRAWL_ERROR: "Erro interno de rastreio",
  INVALID_URL: "URL inválida",
  PAGE_FETCH_STATE_UNSPECIFIED: "Não especificado",
};

const crawledAsMap: Record<string, string> = {
  DESKTOP: "Desktop",
  MOBILE: "Dispositivo móvel",
  CRAWLING_USER_AGENT_UNSPECIFIED: "Não especificado",
};

function translateField(value: string | null, map: Record<string, string>): string {
  if (!value) return "—";
  return map[value] || value;
}

export function IndexCoverageTab({ projectId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "inspected_at", dir: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [scanning, setScanning] = useState(false);

  // Fetch GSC connections count for this project
  const { data: gscConnections } = useQuery({
    queryKey: ["gsc-connections-count", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gsc_connections")
        .select("id, connection_name")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Check existing scheduled scan
  const { data: scheduledScan } = useQuery({
    queryKey: ["coverage-schedule", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indexing_schedules")
        .select("*")
        .eq("project_id", projectId!)
        .contains("actions", ["coverage_scan"])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const toggleSchedule = useMutation({
    mutationFn: async (enable: boolean) => {
      if (scheduledScan) {
        const { error } = await supabase
          .from("indexing_schedules")
          .update({ enabled: enable, updated_at: new Date().toISOString() })
          .eq("id", scheduledScan.id);
        if (error) throw error;
      } else if (enable) {
        const { error } = await supabase
          .from("indexing_schedules")
          .insert({
            project_id: projectId!,
            owner_id: user!.id,
            schedule_type: "recurring",
            cron_time: "0 6 * * *",
            actions: ["coverage_scan"],
            label: "Varredura automática de cobertura",
            enabled: true,
            max_urls: accountsCount * URLS_PER_ACCOUNT,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, enable) => {
      queryClient.invalidateQueries({ queryKey: ["coverage-schedule", projectId] });
      toast({ title: enable ? "Varredura programada ativada" : "Varredura programada desativada", description: enable ? "A varredura será executada diariamente às 06:00 UTC." : "" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const accountsCount = gscConnections?.length || 1;
  const totalQuota = accountsCount * URLS_PER_ACCOUNT;
  const isScheduleEnabled = scheduledScan?.enabled ?? false;

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

  const doExportCSV = () => {
    const headers = ["url", "verdict", "coverage_state", "indexing_state", "page_fetch_state", "crawled_as", "last_crawl_time", "sitemap", "inspected_at"];
    const exportRows = rows.map((r: any) => { const obj: any = {}; headers.forEach(h => obj[h] = r[h] || ""); return obj; });
    exportCSVUtil(exportRows, "cobertura-indexacao");
  };
  const doExportXML = () => {
    const headers = ["url", "verdict", "coverage_state", "indexing_state", "page_fetch_state", "crawled_as", "last_crawl_time", "sitemap", "inspected_at"];
    const exportRows = rows.map((r: any) => { const obj: any = {}; headers.forEach(h => obj[h] = r[h] || ""); return obj; });
    exportXML(exportRows, "cobertura-indexacao", "indexCoverage", "url");
  };

  const renderVerdict = (verdict: string) => {
    const v = verdictMap[verdict] || verdictMap.VERDICT_UNSPECIFIED;
    const Icon = v.icon;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`text-[10px] gap-1 cursor-help ${v.color}`}>
            <Icon className="h-3 w-3" />
            {v.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md p-3 text-xs leading-relaxed whitespace-normal">
          <p>{v.explanation}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderCoverageState = (state: string | null) => {
    if (!state) return <span>—</span>;
    const entry = coverageStateMap[state];
    if (!entry) return <span>{state}</span>;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">{entry.label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md p-3 text-xs leading-relaxed whitespace-normal">
          <p>{entry.tip}</p>
        </TooltipContent>
      </Tooltip>
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
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4">
      {/* Explanation Card */}
      <AnimatedContainer>
        <Card className="p-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex gap-3">
            <div className="mt-0.5 rounded-lg bg-primary/10 p-2 h-fit">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-semibold text-foreground">O que é a Cobertura de Indexação?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A cobertura de indexação inspeciona cada URL do seu site diretamente na API do Google Search Console 
                para verificar se está indexada, excluída ou com erro. Com isso, você identifica rapidamente problemas 
                que impedem suas páginas de aparecer nos resultados de busca — como bloqueios por robots.txt, 
                erros 404, soft 404, redirecionamentos incorretos e tags noindex acidentais.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Dica:</strong> Ative a varredura programada para monitorar automaticamente a saúde do seu índice todos os dias.
              </p>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Inspecionadas" value={kpis.total} change={0} />
        <KpiCard label="Indexadas" value={kpis.indexed} change={kpis.total > 0 ? parseFloat(((kpis.indexed / kpis.total) * 100).toFixed(1)) : 0} suffix="%" />
        <KpiCard label="Excluídas" value={kpis.excluded} change={0} />
        <KpiCard label="Com Erro" value={kpis.errors} change={0} />
      </StaggeredGrid>

      {/* Scan Control Card */}
      <AnimatedContainer>
        <Card className="p-4 space-y-3">
          {/* Quota info row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">{accountsCount}</span>
              <span className="text-xs text-muted-foreground">conta{accountsCount !== 1 ? "s" : ""} GSC</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-foreground">{totalQuota}</span>
              <span className="text-xs text-muted-foreground">URLs por varredura</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Refresca a cada 24h</span>
            </div>
          </div>

          {/* Scan + Schedule row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button onClick={startScan} disabled={scanning} size="sm" className="gap-1.5 text-xs">
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {scanning ? "Varrendo..." : "Iniciar Varredura"}
              </Button>
              <span className="text-[10px] text-muted-foreground">
                ~{URLS_PER_ACCOUNT} URLs × {accountsCount} conta{accountsCount !== 1 ? "s" : ""} = <strong className="text-foreground">{totalQuota} URLs</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 border border-border">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Varredura diária automática</span>
              <Switch
                checked={isScheduleEnabled}
                onCheckedChange={(checked) => toggleSchedule.mutate(checked)}
                disabled={toggleSchedule.isPending}
                className="ml-1"
              />
            </div>
          </div>

          {isScheduleEnabled && (
            <div className="text-[10px] text-muted-foreground bg-success/5 border border-success/20 rounded px-3 py-1.5">
              ✓ Varredura programada ativa — execução diária às 06:00 UTC inspecionando até {totalQuota} URLs automaticamente.
            </div>
          )}
        </Card>
      </AnimatedContainer>

      {/* Filters */}
      <AnimatedContainer>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="max-w-sm flex-1 space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar URL</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar URLs..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 h-9 text-xs" />
            </div>
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
                <ExportMenu onExportCSV={doExportCSV} onExportXML={doExportXML} />
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
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{renderCoverageState(row.coverage_state)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{translateField(row.indexing_state, indexingStateMap)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{translateField(row.page_fetch_state, pageFetchStateMap)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{translateField(row.crawled_as, crawledAsMap)}</td>
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
    </TooltipProvider>
  );
}
