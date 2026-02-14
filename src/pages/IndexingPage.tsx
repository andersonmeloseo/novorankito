import React, { useState, useMemo, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useInventory, useIndexingRequests, useSubmitUrls, useRetryRequest, useInspectUrls,
  type InventoryUrl, type IndexingRequest,
} from "@/hooks/use-indexing";
import {
  Send, CheckCircle2, Clock, AlertTriangle, RotateCcw, Zap, Globe, Link2,
  ArrowUpFromLine, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search, ExternalLink, Eye, Shield, ShieldOff,
  ShieldCheck, HelpCircle, ChevronRight, ChevronLeft, ChevronDown, Layers, History, Package, ScanSearch,
  AlertCircle, Ban, Info, Map, FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// ─── Status Maps ───
const VERDICT_MAP: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PASS: { color: "bg-success/10 text-success border-success/20", icon: ShieldCheck, label: "Indexada" },
  PARTIAL: { color: "bg-warning/10 text-warning border-warning/20", icon: AlertCircle, label: "Parcial" },
  FAIL: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldOff, label: "Não Indexada" },
  NEUTRAL: { color: "bg-muted text-muted-foreground border-border", icon: HelpCircle, label: "Sem Inspeção" },
  VERDICT_UNSPECIFIED: { color: "bg-muted text-muted-foreground border-border", icon: HelpCircle, label: "Sem Inspeção" },
};

const REQUEST_STATUS_MAP: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  success: { color: "bg-success/10 text-success border-success/20", icon: CheckCircle2, label: "Sucesso" },
  pending: { color: "bg-warning/10 text-warning border-warning/20", icon: Clock, label: "Pendente" },
  failed: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle, label: "Falha" },
  quota_exceeded: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Ban, label: "Quota" },
};

function StatusBadge({ status, map }: { status: string | null; map: Record<string, any> }) {
  if (!status) return <span className="text-[10px] text-muted-foreground">—</span>;
  const info = map[status] || map.VERDICT_UNSPECIFIED || { color: "bg-muted text-muted-foreground border-border", icon: HelpCircle, label: status };
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${info.color}`}>
      <Icon className="h-2.5 w-2.5" /> {info.label}
    </span>
  );
}

export default function IndexingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchFilter, setSearchFilter] = useState("");
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [submitOpen, setSubmitOpen] = useState(false);
  const [urlsText, setUrlsText] = useState("");
  const [requestType, setRequestType] = useState("URL_UPDATED");
  const [detailUrl, setDetailUrl] = useState<InventoryUrl | null>(null);
  const [invPage, setInvPage] = useState(0);
  const [histPage, setHistPage] = useState(0);
  const [smPage, setSmPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedSitemap, setExpandedSitemap] = useState<string | null>(null);
  const [selectedSmUrls, setSelectedSmUrls] = useState<Set<string>>(new Set());
  const INV_PAGE_SIZE = 50;

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
    setInvPage(0);
  };

  // Get active project
  const { data: projects } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("owner_id", user!.id).limit(1);
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects?.[0]?.id;

  const { data: inventoryData, isLoading: invLoading } = useInventory(projectId);
  const { data: requests, isLoading: reqLoading } = useIndexingRequests(projectId);
  const submitMutation = useSubmitUrls(projectId);
  const retryMutation = useRetryRequest(projectId);
  const inspectMutation = useInspectUrls(projectId);

  const inventory = inventoryData?.inventory || [];
  const stats = inventoryData?.stats || { totalUrls: 0, indexed: 0, notIndexed: 0, unknown: 0, sentToday: 0, dailyLimit: 200 };

  // ─── Sitemaps from GSC ───
  const { data: sitemapsData, isLoading: smLoading } = useQuery({
    queryKey: ["gsc-sitemaps-list", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-sitemaps", {
        body: { project_id: projectId, action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId,
    staleTime: 120_000,
  });

  const sitemaps = useMemo(() => {
    const rawSitemaps = sitemapsData?.sitemap || [];
    return rawSitemaps.map((sm: any) => ({
      ...sm,
      urlCount: sm.contents?.reduce((acc: number, c: any) => acc + (c.submitted || 0), 0) || 0,
      indexedCount: sm.contents?.reduce((acc: number, c: any) => acc + (c.indexed || 0), 0) || 0,
    }));
  }, [sitemapsData]);

  // ─── Filtered & Sorted Inventory ───
  const filteredInventory = useMemo(() => {
    let items = inventory.filter(u => {
      if (searchFilter && !u.url.toLowerCase().includes(searchFilter.toLowerCase()) && !(u.meta_title || "").toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (verdictFilter === "indexed" && u.verdict !== "PASS") return false;
      if (verdictFilter === "not_indexed" && (u.verdict === "PASS" || !u.verdict)) return false;
      if (verdictFilter === "unknown" && u.verdict) return false;
      if (verdictFilter === "never_sent" && u.last_request_status) return false;
      return true;
    });
    if (sortCol) {
      items = [...items].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortCol) {
          case "url": aVal = a.url; bVal = b.url; break;
          case "verdict": aVal = a.verdict || ""; bVal = b.verdict || ""; break;
          case "clicks_28d": aVal = a.clicks_28d; bVal = b.clicks_28d; break;
          case "impressions_28d": aVal = a.impressions_28d; bVal = b.impressions_28d; break;
          case "coverage_state": aVal = a.coverage_state || ""; bVal = b.coverage_state || ""; break;
          case "last_crawl_time": aVal = a.last_crawl_time || ""; bVal = b.last_crawl_time || ""; break;
          default: aVal = ""; bVal = "";
        }
        if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        const cmp = String(aVal).localeCompare(String(bVal), "pt-BR", { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return items;
  }, [inventory, searchFilter, verdictFilter, sortCol, sortDir]);

  const invTotalPages = Math.max(1, Math.ceil(filteredInventory.length / INV_PAGE_SIZE));
  const safeInvPage = Math.min(invPage, invTotalPages - 1);
  const paginatedInventory = filteredInventory.slice(safeInvPage * INV_PAGE_SIZE, (safeInvPage + 1) * INV_PAGE_SIZE);

  // ─── Filtered History ───
  const filteredHistory = useMemo(() => {
    if (!requests) return [];
    return requests.filter(r => {
      if (historyStatusFilter !== "all" && r.status !== historyStatusFilter) return false;
      if (searchFilter && !r.url.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    });
  }, [requests, historyStatusFilter, searchFilter]);

  const histTotalPages = Math.max(1, Math.ceil(filteredHistory.length / INV_PAGE_SIZE));
  const safeHistPage = Math.min(histPage, histTotalPages - 1);
  const paginatedHistory = filteredHistory.slice(safeHistPage * INV_PAGE_SIZE, (safeHistPage + 1) * INV_PAGE_SIZE);

  // ─── Selection ───
  const toggleUrl = (url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUrls.size === filteredInventory.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredInventory.map(u => u.url)));
    }
  };

  // ─── Submit ───
  const handleSubmitManual = () => {
    const urls = urlsText.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
    if (urls.length === 0) return;
    submitMutation.mutate({ urls, requestType }, {
      onSuccess: () => { setSubmitOpen(false); setUrlsText(""); },
    });
  };

  const handleSubmitSelected = () => {
    if (selectedUrls.size === 0) { toast.warning("Selecione ao menos uma URL"); return; }
    submitMutation.mutate({ urls: Array.from(selectedUrls), requestType: "URL_UPDATED" }, {
      onSuccess: () => setSelectedUrls(new Set()),
    });
  };

  const handleInspectSelected = () => {
    if (selectedUrls.size === 0) { toast.warning("Selecione ao menos uma URL"); return; }
    inspectMutation.mutate(Array.from(selectedUrls));
  };

  const handleInspectAll = () => {
    const unknowns = inventory.filter(u => !u.verdict).map(u => u.url).slice(0, 20);
    if (unknowns.length === 0) { toast.info("Todas as URLs já foram inspecionadas"); return; }
    inspectMutation.mutate(unknowns);
  };

  const quotaUsedPercent = Math.min(100, Math.round((stats.sentToday / stats.dailyLimit) * 100));

  return (
    <>
      <TopBar title="Indexação" subtitle="Gerencie a indexação das suas páginas via Google Search Console" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPIs */}
        {invLoading ? <KpiSkeleton /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="URLs no Inventário" value={stats.totalUrls} change={0} />
            <Card className="p-3 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-success">{stats.indexed}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Indexadas</div>
            </Card>
            <Card className="p-3 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-destructive">{stats.notIndexed}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Não Indexadas</div>
            </Card>
            <Card className="p-3 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-muted-foreground">{stats.unknown}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Sem Inspeção</div>
            </Card>
            <Card className="p-3 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-foreground">{stats.sentToday}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Enviadas Hoje</div>
            </Card>
            <Card className="p-3 flex flex-col items-center justify-center space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-foreground">{stats.sentToday}/{stats.dailyLimit}</span>
              </div>
              <Progress value={quotaUsedPercent} className="h-1.5 w-full" />
              <div className="text-[9px] text-muted-foreground">Quota Diária</div>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <TabsList>
              <TabsTrigger value="inventory" className="gap-1.5 text-xs">
                <Layers className="h-3 w-3" /> Inventário
              </TabsTrigger>
              <TabsTrigger value="sitemap" className="gap-1.5 text-xs">
                <Map className="h-3 w-3" /> Sitemap
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="h-3 w-3" /> Histórico
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar URL..." value={searchFilter} onChange={e => { setSearchFilter(e.target.value); setInvPage(0); setHistPage(0); }} className="pl-8 h-9 text-xs" />
              </div>
              {activeTab === "inventory" && (
                <Select value={verdictFilter} onValueChange={v => { setVerdictFilter(v); setInvPage(0); }}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <Filter className="h-3 w-3 mr-1.5" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="indexed">Indexadas</SelectItem>
                    <SelectItem value="not_indexed">Não Indexadas</SelectItem>
                    <SelectItem value="unknown">Sem Inspeção</SelectItem>
                    <SelectItem value="never_sent">Nunca Enviadas</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {activeTab === "history" && (
                <Select value={historyStatusFilter} onValueChange={v => { setHistoryStatusFilter(v); setHistPage(0); }}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <Filter className="h-3 w-3 mr-1.5" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="failed">Falha</SelectItem>
                    <SelectItem value="quota_exceeded">Quota</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* ─── INVENTORY TAB ─── */}
          <TabsContent value="inventory" className="mt-4 space-y-4">
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Send className="h-3 w-3" /> Enviar URLs Manualmente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ArrowUpFromLine className="h-5 w-5 text-primary" />
                      Enviar URLs para Indexação
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <Textarea
                      placeholder={"Cole as URLs (uma por linha):\nhttps://seusite.com/pagina-1\nhttps://seusite.com/pagina-2"}
                      value={urlsText} onChange={e => setUrlsText(e.target.value)}
                      rows={8} className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {urlsText.split("\n").filter(u => u.trim().startsWith("http")).length} URL(s) detectada(s) • Máx. 50 por envio
                    </p>
                    <Select value={requestType} onValueChange={setRequestType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="URL_UPDATED">URL Atualizada / Nova</SelectItem>
                        <SelectItem value="URL_DELETED">URL Removida</SelectItem>
                      </SelectContent>
                    </Select>
                    <Card className="p-3 bg-muted/30 border-dashed">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="text-[11px] text-muted-foreground">
                          <strong className="text-foreground">Limite:</strong> ~200 notificações/dia. Restam ~{Math.max(0, stats.dailyLimit - stats.sentToday)}.
                        </div>
                      </div>
                    </Card>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
                    <Button size="sm" className="gap-1.5" onClick={handleSubmitManual} disabled={submitMutation.isPending || !urlsText.trim()}>
                      {submitMutation.isPending ? <RotateCcw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      {submitMutation.isPending ? "Enviando..." : "Enviar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
                const allUrls = filteredInventory.map(u => u.url);
                if (allUrls.length === 0) { toast.warning("Nenhuma URL no inventário"); return; }
                const batch = allUrls.slice(0, 50);
                submitMutation.mutate({ urls: batch, requestType: "URL_UPDATED" });
                if (allUrls.length > 50) toast.info(`Enviando as primeiras 50 de ${allUrls.length} URLs. Repita para enviar mais.`);
              }} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <RotateCcw className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                Enviar Sitemap ({Math.min(filteredInventory.length, 50)} URLs)
              </Button>

              {selectedUrls.size > 0 && (
                <>
                  <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={handleSubmitSelected} disabled={submitMutation.isPending}>
                    <Send className="h-3 w-3" /> Indexar {selectedUrls.size} selecionada(s)
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleInspectSelected} disabled={inspectMutation.isPending}>
                    <ScanSearch className="h-3 w-3" /> Inspecionar {selectedUrls.size}
                  </Button>
                </>
              )}

              <Button size="sm" variant="outline" className="gap-1.5 text-xs ml-auto" onClick={handleInspectAll} disabled={inspectMutation.isPending}>
                {inspectMutation.isPending ? <RotateCcw className="h-3 w-3 animate-spin" /> : <ScanSearch className="h-3 w-3" />}
                Varrer Status (até 20)
              </Button>
            </div>

            {/* Inventory Table */}
            {invLoading ? <TableSkeleton /> : inventory.length === 0 ? (
              <EmptyState icon={Globe} title="Nenhuma URL no inventário" description="Importe as URLs via Sitemap no onboarding ou na gestão de URLs." />
            ) : (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    URLs do Projeto
                    <Badge variant="secondary" className="ml-2 text-[10px]">{filteredInventory.length}</Badge>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-3 w-10">
                          <Checkbox checked={selectedUrls.size === filteredInventory.length && filteredInventory.length > 0} onCheckedChange={toggleAll} />
                        </th>
                        {[
                          { key: "url", label: "URL" },
                          { key: "verdict", label: "Indexação" },
                          { key: "clicks_28d", label: "Cliques (28d)" },
                          { key: "impressions_28d", label: "Impressões (28d)" },
                          { key: "coverage_state", label: "Cobertura" },
                          { key: "last_crawl_time", label: "Último Crawl" },
                        ].map(col => (
                          <th
                            key={col.key}
                            className="px-3 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors group"
                            onClick={() => handleSort(col.key)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                              {sortCol === col.key ? (
                                sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                              )}
                            </span>
                          </th>
                        ))}
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Último Envio</th>
                        <th className="px-3 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInventory.map(item => (
                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5">
                            <Checkbox checked={selectedUrls.has(item.url)} onCheckedChange={() => toggleUrl(item.url)} />
                          </td>
                          <td className="px-3 py-2.5 max-w-[350px]">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-mono text-xs text-foreground truncate cursor-default">{item.url}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-md">
                                    <p className="font-mono text-xs break-all">{item.url}</p>
                                  </TooltipContent>
                                </Tooltip>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                  <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                                </a>
                              </div>
                              {item.meta_title && <span className="text-[10px] text-muted-foreground truncate" title={item.meta_title}>{item.meta_title}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge status={item.verdict} map={VERDICT_MAP} />
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs tabular-nums text-muted-foreground">{(item.clicks_28d || 0).toLocaleString("pt-BR")}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs tabular-nums text-muted-foreground">{(item.impressions_28d || 0).toLocaleString("pt-BR")}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] text-muted-foreground">{item.coverage_state || "—"}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">
                              {item.last_crawl_time ? formatDistanceToNow(new Date(item.last_crawl_time), { addSuffix: true, locale: ptBR }) : "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {item.last_request_status ? (
                              <div className="flex flex-col gap-0.5">
                                <StatusBadge status={item.last_request_status} map={REQUEST_STATUS_MAP} />
                                <span className="text-[9px] text-muted-foreground">
                                  {item.last_request_at ? formatDistanceToNow(new Date(item.last_request_at), { addSuffix: true, locale: ptBR }) : ""}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Nunca enviada</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDetailUrl(item)}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Detalhes</TooltipContent>
                            </Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {invTotalPages > 1 && (
                  <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {safeInvPage * INV_PAGE_SIZE + 1}–{Math.min((safeInvPage + 1) * INV_PAGE_SIZE, filteredInventory.length)} de {filteredInventory.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safeInvPage === 0} onClick={() => setInvPage(p => p - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-[10px] text-muted-foreground px-1">{safeInvPage + 1} / {invTotalPages}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safeInvPage >= invTotalPages - 1} onClick={() => setInvPage(p => p + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* ─── SITEMAP TAB ─── */}
          <TabsContent value="sitemap" className="mt-4 space-y-4">
            {smLoading ? <TableSkeleton /> : !sitemaps || sitemaps.length === 0 ? (
              <EmptyState icon={Map} title="Nenhum sitemap encontrado" description="O Google Search Console não retornou sitemaps para esta propriedade." />
            ) : (
              <div className="space-y-4">
                {/* Sitemap Actions Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={selectedSmUrls.size === sitemaps.length ? "secondary" : "outline"}
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      if (selectedSmUrls.size === sitemaps.length) {
                        setSelectedSmUrls(new Set());
                      } else {
                        setSelectedSmUrls(new Set(sitemaps.map((s: any) => s.path)));
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedSmUrls.size === sitemaps.length && sitemaps.length > 0}
                      onCheckedChange={() => {
                        if (selectedSmUrls.size === sitemaps.length) {
                          setSelectedSmUrls(new Set());
                        } else {
                          setSelectedSmUrls(new Set(sitemaps.map((s: any) => s.path)));
                        }
                      }}
                      className="h-3.5 w-3.5"
                    />
                    {selectedSmUrls.size === sitemaps.length ? "Desmarcar Todos" : "Selecionar Todos"}
                  </Button>

                  {selectedSmUrls.size > 0 && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          const batch = inventory.map(u => u.url).slice(0, 50);
                          if (batch.length === 0) { toast.warning("Nenhuma URL no inventário"); return; }
                          submitMutation.mutate({ urls: batch, requestType: "URL_UPDATED" });
                          if (inventory.length > 50) toast.info(`Enviando as primeiras 50 de ${inventory.length} URLs.`);
                        }}
                        disabled={submitMutation.isPending}
                      >
                        {submitMutation.isPending ? <RotateCcw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Enviar em Lote ({Math.min(inventory.length, 50)} URLs)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          const unknowns = inventory.filter(u => !u.verdict).map(u => u.url).slice(0, 20);
                          if (unknowns.length === 0) { toast.info("Todas já foram inspecionadas"); return; }
                          inspectMutation.mutate(unknowns);
                        }}
                        disabled={inspectMutation.isPending}
                      >
                        {inspectMutation.isPending ? <RotateCcw className="h-3 w-3 animate-spin" /> : <ScanSearch className="h-3 w-3" />}
                        Inspecionar Não Verificadas (até 20)
                      </Button>
                    </>
                  )}

                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {selectedSmUrls.size > 0 ? `${selectedSmUrls.size} de ${sitemaps.length} selecionado(s)` : `${sitemaps.length} sitemap(s)`}
                  </span>
                </div>

                {/* Sitemaps Table */}
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-3 w-10">
                            <Checkbox
                              checked={selectedSmUrls.size === sitemaps.length && sitemaps.length > 0}
                              onCheckedChange={() => {
                                if (selectedSmUrls.size === sitemaps.length) setSelectedSmUrls(new Set());
                                else setSelectedSmUrls(new Set(sitemaps.map((s: any) => s.path)));
                              }}
                            />
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">URL do Sitemap</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground">URLs Enviadas</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground">URLs Indexadas</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground">% Indexada</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Último Envio</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Último Crawl</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                          <th className="px-3 py-3 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {sitemaps.map((sm: any, idx: number) => {
                          const isExpanded = expandedSitemap === sm.path;
                          const lastSubmitted = sm.lastSubmitted ? format(new Date(sm.lastSubmitted), "dd/MM/yyyy HH:mm") : "—";
                          const lastDownloaded = sm.lastDownloaded ? format(new Date(sm.lastDownloaded), "dd/MM/yyyy HH:mm") : "—";
                          const isPending = sm.isPending;
                          const hasErrors = (sm.errors || 0) > 0 || (sm.warnings || 0) > 0;
                          const indexPercent = sm.urlCount > 0 ? Math.round((sm.indexedCount / sm.urlCount) * 100) : 0;

                          return (
                            <React.Fragment key={sm.path || idx}>
                              <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="px-3 py-2.5">
                                  <Checkbox
                                    checked={selectedSmUrls.has(sm.path)}
                                    onCheckedChange={() => {
                                      setSelectedSmUrls(prev => {
                                        const next = new Set(prev);
                                        if (next.has(sm.path)) next.delete(sm.path); else next.add(sm.path);
                                        return next;
                                      });
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2.5 max-w-[300px]">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="font-mono text-xs text-foreground truncate cursor-default">{sm.path}</span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-md">
                                        <p className="font-mono text-xs break-all">{sm.path}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <a href={sm.path} target="_blank" rel="noopener noreferrer" className="shrink-0" onClick={e => e.stopPropagation()}>
                                      <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                    </a>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {sm.type === "sitemapIndex" ? "Índice" : sm.type || "Sitemap"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <span className="text-xs tabular-nums font-medium text-foreground">{(sm.urlCount || 0).toLocaleString("pt-BR")}</span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <span className="text-xs tabular-nums font-medium text-success">{(sm.indexedCount || 0).toLocaleString("pt-BR")}</span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <Progress value={indexPercent} className="h-1.5 w-12" />
                                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{indexPercent}%</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="text-xs text-muted-foreground">{lastSubmitted}</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="text-xs text-muted-foreground">{lastDownloaded}</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  {hasErrors ? (
                                    <Badge variant="destructive" className="text-[10px]">
                                      {sm.errors > 0 ? `${sm.errors} erro(s)` : `${sm.warnings} aviso(s)`}
                                    </Badge>
                                  ) : isPending ? (
                                    <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-success/20">OK</Badge>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <Button
                                    variant="ghost" size="sm" className="h-6 w-6 p-0"
                                    onClick={() => setExpandedSitemap(isExpanded ? null : sm.path)}
                                  >
                                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                                  </Button>
                                </td>
                              </tr>
                              {isExpanded && sm.contents && sm.contents.length > 0 && (
                                <tr>
                                  <td colSpan={10} className="bg-muted/10 px-6 py-3 border-b border-border">
                                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Tipos de Conteúdo</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {sm.contents.map((c: any, ci: number) => (
                                        <div key={ci} className="p-2 rounded-lg bg-background border border-border">
                                          <div className="text-[10px] text-muted-foreground capitalize">{c.type || "web"}</div>
                                          <div className="flex items-baseline gap-2 mt-0.5">
                                            <span className="text-sm font-bold text-foreground">{(c.submitted || 0).toLocaleString("pt-BR")}</span>
                                            <span className="text-[10px] text-success">{(c.indexed || 0).toLocaleString("pt-BR")} idx</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ─── HISTORY TAB ─── */}
          <TabsContent value="history" className="mt-4">
            {reqLoading ? <TableSkeleton /> : !requests || requests.length === 0 ? (
              <EmptyState icon={History} title="Nenhuma requisição ainda" description="Envie URLs pela aba Inventário ou pelo botão de envio manual." />
            ) : (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-medium text-foreground">
                    Histórico de Envios
                    <Badge variant="secondary" className="ml-2 text-[10px]">{filteredHistory.length}</Badge>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">URL</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Enviado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tentativas</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Motivo</th>
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.map(item => (
                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 max-w-[300px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-foreground truncate">{item.url}</span>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {item.request_type === "URL_UPDATED" ? "Indexar" : "Remover"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={item.status} map={REQUEST_STATUS_MAP} />
                          </td>
                          <td className="px-4 py-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground cursor-default">
                                  {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true, locale: ptBR })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{format(new Date(item.submitted_at), "dd/MM/yyyy HH:mm:ss")}</TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{item.retries}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{item.fail_reason || "—"}</td>
                          <td className="px-4 py-3">
                            {(item.status === "failed" || item.status === "quota_exceeded") && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => retryMutation.mutate(item.id)} disabled={retryMutation.isPending}>
                                    <RotateCcw className={`h-3 w-3 ${retryMutation.isPending ? "animate-spin" : ""}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reenviar</TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {histTotalPages > 1 && (
                  <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {safeHistPage * INV_PAGE_SIZE + 1}–{Math.min((safeHistPage + 1) * INV_PAGE_SIZE, filteredHistory.length)} de {filteredHistory.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safeHistPage === 0} onClick={() => setHistPage(p => p - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-[10px] text-muted-foreground px-1">{safeHistPage + 1} / {histTotalPages}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safeHistPage >= histTotalPages - 1} onClick={() => setHistPage(p => p + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* ─── URL Detail Dialog ─── */}
        <Dialog open={!!detailUrl} onOpenChange={() => setDetailUrl(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-medium">Detalhes da URL</DialogTitle>
            </DialogHeader>
            {detailUrl && (
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">URL</label>
                  <p className="font-mono text-xs text-foreground break-all mt-0.5">{detailUrl.url}</p>
                </div>
                {detailUrl.meta_title && (
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Título</label>
                    <p className="text-xs text-foreground mt-0.5">{detailUrl.meta_title}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Indexação</label>
                    <div className="mt-1"><StatusBadge status={detailUrl.verdict} map={VERDICT_MAP} /></div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Estado de Cobertura</label>
                    <p className="text-xs text-foreground mt-0.5">{detailUrl.coverage_state || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Estado de Indexação</label>
                    <p className="text-xs text-foreground mt-0.5">{detailUrl.indexing_state || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Crawled As</label>
                    <p className="text-xs text-foreground mt-0.5">{detailUrl.crawled_as || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Page Fetch</label>
                    <p className="text-xs text-foreground mt-0.5">{detailUrl.page_fetch_state || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Robots.txt</label>
                    <p className="text-xs text-foreground mt-0.5">{detailUrl.robotstxt_state || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Último Crawl</label>
                    <p className="text-xs text-foreground mt-0.5">
                      {detailUrl.last_crawl_time ? format(new Date(detailUrl.last_crawl_time), "dd/MM/yyyy HH:mm") : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Inspecionada em</label>
                    <p className="text-xs text-foreground mt-0.5">
                      {detailUrl.inspected_at ? format(new Date(detailUrl.inspected_at), "dd/MM/yyyy HH:mm") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="gap-1.5 text-xs flex-1" onClick={() => {
                    submitMutation.mutate({ urls: [detailUrl.url], requestType: "URL_UPDATED" });
                    setDetailUrl(null);
                  }} disabled={submitMutation.isPending}>
                    <Send className="h-3 w-3" /> Enviar para Indexação
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={() => {
                    inspectMutation.mutate([detailUrl.url]);
                    setDetailUrl(null);
                  }} disabled={inspectMutation.isPending}>
                    <ScanSearch className="h-3 w-3" /> Inspecionar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── API Info Card ─── */}
        <Card className="p-4 bg-muted/20 border-dashed">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-foreground">Como funciona a Google Indexing API</h4>
              <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                <li><strong>Limite:</strong> ~200 notificações por dia por propriedade do Search Console</li>
                <li><strong>URL_UPDATED:</strong> Notifica o Google que uma URL foi criada ou atualizada (solicita crawl)</li>
                <li><strong>URL_DELETED:</strong> Notifica que uma URL foi removida (solicita remoção do índice)</li>
                <li>A API <strong>não garante</strong> indexação — apenas prioriza o crawl pelo Googlebot</li>
                <li><strong>URL Inspection API:</strong> Verifica se uma URL está indexada, bloqueada por robots.txt, com erro de fetch, etc.</li>
                <li>A inspeção tem limite de ~2.000 requisições/dia e retorna dados detalhados de cobertura</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
