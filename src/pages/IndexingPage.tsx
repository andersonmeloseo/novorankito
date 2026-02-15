import React, { useState, useMemo, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useInventory, useIndexingRequests, useSubmitUrls, useRetryRequest, useInspectUrls,
  type InventoryUrl, type IndexingRequest,
} from "@/hooks/use-indexing";
import { IndexingDashboard } from "@/components/indexing/IndexingDashboard";
import { ScheduleDialog, type ManualSchedule, type CronConfig } from "@/components/indexing/ScheduleDialog";
import {
  Send, CheckCircle2, Clock, AlertTriangle, RotateCcw, Zap, Globe, Link2,
  ArrowUpFromLine, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search, ExternalLink, Eye, Shield, ShieldOff,
  ShieldCheck, HelpCircle, ChevronRight, ChevronLeft, ChevronDown, Layers, History, Package, ScanSearch,
  AlertCircle, Ban, Info, Map, FileText, LayoutDashboard, CalendarClock, Wifi, WifiOff, Upload,
  Pencil, Trash2, TestTube, RefreshCw, Loader2, Settings2, Plus, XCircle
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchFilter, setSearchFilter] = useState("");
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [urlTypeFilter, setUrlTypeFilter] = useState("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
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
      urlCount: sm.contents?.reduce((acc: number, c: any) => acc + (parseInt(String(c.submitted), 10) || 0), 0) || 0,
      indexedCount: sm.contents?.reduce((acc: number, c: any) => acc + (parseInt(String(c.indexed), 10) || 0), 0) || 0,
    }));
  }, [sitemapsData]);

  // ─── Schedule Config ───
  const { data: scheduleData } = useQuery({
    queryKey: ["indexing-schedule", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("indexing_schedules")
        .select("*")
        .eq("project_id", projectId!)
        .eq("schedule_type", "cron")
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const cronConfig: CronConfig = {
    enabled: scheduleData?.enabled ?? false,
    time: scheduleData?.cron_time ?? "03:00",
    actions: (scheduleData?.actions as ("indexing" | "inspection")[]) ?? [],
    maxUrls: scheduleData?.max_urls ?? 200,
  };

  const handleToggleAutoCron = async (enabled: boolean, config: CronConfig) => {
    if (!projectId || !user) return;
    const payload = {
      project_id: projectId,
      owner_id: user.id,
      schedule_type: "cron" as const,
      enabled,
      cron_time: config.time,
      actions: config.actions,
      max_urls: config.maxUrls,
      status: "active" as const,
    };
    if (scheduleData?.id) {
      await supabase.from("indexing_schedules").update(payload).eq("id", scheduleData.id);
    } else {
      await supabase.from("indexing_schedules").insert(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["indexing-schedule", projectId] });
  };

  const handleScheduleManual = async (config: ManualSchedule) => {
    if (!projectId || !user) return;
    await supabase.from("indexing_schedules").insert({
      project_id: projectId,
      owner_id: user.id,
      schedule_type: "manual",
      enabled: true,
      actions: [config.type],
      max_urls: config.urlCount,
      scheduled_at: config.scheduledAt,
      status: "pending",
    });
    queryClient.invalidateQueries({ queryKey: ["indexing-schedule", projectId] });
  };

  // ─── GSC Connections ───
  const { data: gscConnections = [], isLoading: gscLoading } = useQuery({
    queryKey: ["gsc-connections", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("gsc_connections").select("*").eq("project_id", projectId!).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!projectId,
  });

  // ─── Schedule History ───
  const { data: allSchedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["indexing-schedules-all", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("indexing_schedules")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!projectId,
  });

  // ─── Filtered & Sorted Inventory ───
  const filteredInventory = useMemo(() => {
    let items = inventory.filter(u => {
      if (searchFilter && !u.url.toLowerCase().includes(searchFilter.toLowerCase()) && !(u.meta_title || "").toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (verdictFilter === "indexed" && u.verdict !== "PASS") return false;
      if (verdictFilter === "not_indexed" && u.verdict !== "FAIL" && u.verdict !== "PARTIAL") return false;
      if (verdictFilter === "unknown" && u.verdict && u.verdict !== "NEUTRAL" && u.verdict !== "VERDICT_UNSPECIFIED") return false;
      if (verdictFilter === "never_sent" && u.last_request_status) return false;
      if (priorityFilter !== "all" && u.priority !== priorityFilter) return false;
      if (urlTypeFilter !== "all" && u.url_type !== urlTypeFilter) return false;
      if (requestStatusFilter === "quota_exceeded" && u.last_request_status !== "quota_exceeded") return false;
      if (requestStatusFilter === "success" && u.last_request_status !== "success") return false;
      if (requestStatusFilter === "failed" && u.last_request_status !== "failed") return false;
      if (requestStatusFilter === "pending" && u.last_request_status !== "pending") return false;
      if (requestStatusFilter === "never" && u.last_request_status) return false;
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
  }, [inventory, searchFilter, verdictFilter, priorityFilter, urlTypeFilter, requestStatusFilter, sortCol, sortDir]);

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

  return (
    <>
      <TopBar title="Indexação" subtitle="Gerencie a indexação das suas páginas via Google Search Console" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <TabsList className="flex flex-wrap h-auto gap-0.5">
              <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
                <LayoutDashboard className="h-3 w-3" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="inventory" className="gap-1.5 text-xs">
                <Layers className="h-3 w-3" /> URLs
              </TabsTrigger>
              <TabsTrigger value="sitemap" className="gap-1.5 text-xs">
                <Map className="h-3 w-3" /> Sitemap
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="h-3 w-3" /> Histórico
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-1.5 text-xs">
                <CalendarClock className="h-3 w-3" /> Agendar
                {cronConfig.enabled && <Badge variant="secondary" className="text-[8px] ml-1 bg-success/10 text-success px-1">ON</Badge>}
              </TabsTrigger>
              <TabsTrigger value="accounts" className="gap-1.5 text-xs">
                <Wifi className="h-3 w-3" /> Contas
                <Badge variant="secondary" className="text-[8px] ml-1 px-1">{gscConnections.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 flex-1 w-full sm:w-auto">
              {(activeTab === "inventory" || activeTab === "history" || activeTab === "sitemap") && (
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar URL ou título..." value={searchFilter} onChange={e => { setSearchFilter(e.target.value); setInvPage(0); setHistPage(0); }} className="pl-8 h-9 text-xs" />
                </div>
              )}
              {activeTab === "inventory" && (
                <>
                  <Select value={verdictFilter} onValueChange={v => { setVerdictFilter(v); setInvPage(0); }}>
                    <SelectTrigger className="w-[150px] h-9 text-xs" title="Filtrar por status de indexação">
                      <ShieldCheck className="h-3 w-3 mr-1 shrink-0" /><SelectValue placeholder="Indexação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Indexação: Todas</SelectItem>
                      <SelectItem value="indexed">Indexadas</SelectItem>
                      <SelectItem value="not_indexed">Não Indexadas</SelectItem>
                      <SelectItem value="unknown">Sem Inspeção</SelectItem>
                      <SelectItem value="never_sent">Nunca Enviadas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={requestStatusFilter} onValueChange={v => { setRequestStatusFilter(v); setInvPage(0); }}>
                    <SelectTrigger className="w-[150px] h-9 text-xs" title="Filtrar por status do último envio">
                      <Send className="h-3 w-3 mr-1 shrink-0" /><SelectValue placeholder="Último Envio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Envio: Todos</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="failed">Falha</SelectItem>
                      <SelectItem value="quota_exceeded">Quota Excedida</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="never">Nunca Enviada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setInvPage(0); }}>
                    <SelectTrigger className="w-[130px] h-9 text-xs" title="Filtrar por prioridade">
                      <Zap className="h-3 w-3 mr-1 shrink-0" /><SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Prioridade: Todas</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={urlTypeFilter} onValueChange={v => { setUrlTypeFilter(v); setInvPage(0); }}>
                    <SelectTrigger className="w-[130px] h-9 text-xs" title="Filtrar por tipo de URL">
                      <FileText className="h-3 w-3 mr-1 shrink-0" /><SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tipo: Todos</SelectItem>
                      <SelectItem value="page">Página</SelectItem>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="category">Categoria</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {activeTab === "history" && (
                <Select value={historyStatusFilter} onValueChange={v => { setHistoryStatusFilter(v); setHistPage(0); }}>
                  <SelectTrigger className="w-[150px] h-9 text-xs" title="Filtrar por status">
                    <Filter className="h-3 w-3 mr-1.5" /><SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: Todos</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="failed">Falha</SelectItem>
                    <SelectItem value="quota_exceeded">Quota Excedida</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* ─── DASHBOARD TAB ─── */}
          <TabsContent value="dashboard" className="mt-4">
            {invLoading ? <KpiSkeleton /> : (
              <IndexingDashboard
                stats={stats}
                inventory={inventory}
                requests={requests || []}
                sitemaps={sitemaps}
              />
            )}
          </TabsContent>

          {/* ─── INVENTORY TAB ─── */}
          <TabsContent value="inventory" className="mt-4 space-y-4">
            {/* Active Filters Summary */}
            {(verdictFilter !== "all" || priorityFilter !== "all" || urlTypeFilter !== "all" || requestStatusFilter !== "all" || searchFilter) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-medium">Filtros ativos:</span>
                {searchFilter && <Badge variant="secondary" className="text-[10px] gap-1">Busca: "{searchFilter}"</Badge>}
                {verdictFilter !== "all" && <Badge variant="secondary" className="text-[10px] gap-1">Indexação: {verdictFilter}</Badge>}
                {requestStatusFilter !== "all" && <Badge variant="secondary" className="text-[10px] gap-1">Envio: {requestStatusFilter}</Badge>}
                {priorityFilter !== "all" && <Badge variant="secondary" className="text-[10px] gap-1">Prioridade: {priorityFilter}</Badge>}
                {urlTypeFilter !== "all" && <Badge variant="secondary" className="text-[10px] gap-1">Tipo: {urlTypeFilter}</Badge>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-muted-foreground hover:text-destructive gap-1 px-2"
                  onClick={() => { setVerdictFilter("all"); setPriorityFilter("all"); setUrlTypeFilter("all"); setRequestStatusFilter("all"); setSearchFilter(""); setInvPage(0); }}
                >
                  <XCircle className="h-3 w-3" /> Limpar tudo
                </Button>
                <span className="text-[10px] text-muted-foreground ml-auto">{filteredInventory.length} resultado(s)</span>
              </div>
            )}
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

              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleInspectAll} disabled={inspectMutation.isPending}>
                {inspectMutation.isPending ? <RotateCcw className="h-3 w-3 animate-spin" /> : <ScanSearch className="h-3 w-3" />}
                Varrer Status (até 20)
              </Button>

              {/* Retry quota-exceeded URLs */}
              {inventory.some(u => u.last_request_status === "quota_exceeded") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                  onClick={() => {
                    const quotaUrls = inventory.filter(u => u.last_request_status === "quota_exceeded").map(u => u.url);
                    if (quotaUrls.length === 0) return;
                    toast.info(`Reenviando ${quotaUrls.slice(0, 50).length} URL(s) com quota excedida...`);
                    submitMutation.mutate({ urls: quotaUrls.slice(0, 50), requestType: "URL_UPDATED" });
                  }}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Reenviar Quota ({inventory.filter(u => u.last_request_status === "quota_exceeded").length})
                </Button>
              )}

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
                            <div className="flex items-center gap-1">
                              {item.last_request_status === "quota_exceeded" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                      onClick={() => submitMutation.mutate({ urls: [item.url], requestType: "URL_UPDATED" })}
                                      disabled={submitMutation.isPending}
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reenviar (quota excedida)</TooltipContent>
                                </Tooltip>
                              )}
                              {item.last_request_status === "failed" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => submitMutation.mutate({ urls: [item.url], requestType: "URL_UPDATED" })}
                                      disabled={submitMutation.isPending}
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reenviar (falhou)</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDetailUrl(item)}>
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Detalhes</TooltipContent>
                              </Tooltip>
                            </div>
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
            ) : (() => {
              // Local sort for sitemap tab
              const smSortKey = sortCol;
              const filteredSm = sitemaps.filter((sm: any) =>
                !searchFilter || sm.path?.toLowerCase().includes(searchFilter.toLowerCase())
              );
              const sortedSm = [...filteredSm].sort((a: any, b: any) => {
                if (!smSortKey) return 0;
                let aVal: any, bVal: any;
                switch (smSortKey) {
                  case "sm_path": aVal = a.path || ""; bVal = b.path || ""; break;
                  case "sm_type": aVal = a.type || ""; bVal = b.type || ""; break;
                  case "sm_urls": aVal = a.urlCount || 0; bVal = b.urlCount || 0; break;
                  case "sm_indexed": aVal = a.indexedCount || 0; bVal = b.indexedCount || 0; break;
                  case "sm_percent": aVal = a.urlCount > 0 ? a.indexedCount / a.urlCount : 0; bVal = b.urlCount > 0 ? b.indexedCount / b.urlCount : 0; break;
                  case "sm_submitted": aVal = a.lastSubmitted || ""; bVal = b.lastSubmitted || ""; break;
                  case "sm_crawled": aVal = a.lastDownloaded || ""; bVal = b.lastDownloaded || ""; break;
                  default: return 0;
                }
                if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
                const cmp = String(aVal).localeCompare(String(bVal), "pt-BR", { sensitivity: "base" });
                return sortDir === "asc" ? cmp : -cmp;
              });

              const smColumns = [
                { key: "sm_path", label: "Sitemap" },
                { key: "sm_type", label: "Tipo" },
                { key: "sm_urls", label: "URLs Declaradas", align: "right" as const },
                { key: "sm_indexed", label: "Indexadas", align: "right" as const },
                { key: "sm_percent", label: "% Indexada", align: "right" as const },
                { key: "sm_submitted", label: "Último Envio" },
                { key: "sm_crawled", label: "Último Crawl" },
              ];

              return (
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
                          if (selectedSmUrls.size === sitemaps.length) setSelectedSmUrls(new Set());
                          else setSelectedSmUrls(new Set(sitemaps.map((s: any) => s.path)));
                        }}
                        className="h-3.5 w-3.5"
                      />
                      {selectedSmUrls.size === sitemaps.length ? "Desmarcar Todos" : "Selecionar Todos"}
                    </Button>

                    {selectedSmUrls.size > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5 text-xs"
                          onClick={() => {
                            // Get all inventory URLs that belong to selected sitemaps
                            // Since sitemaps don't directly map to inventory URLs, we submit the sitemap paths
                            // to fetch their URLs via the edge function
                            const selectedPaths = Array.from(selectedSmUrls);
                            // Filter inventory URLs whose url starts with any selected sitemap domain
                            const urlsToSubmit = inventory
                              .filter(u => selectedPaths.some(smPath => {
                                try {
                                  const smDomain = new URL(smPath).origin;
                                  return u.url.startsWith(smDomain);
                                } catch { return false; }
                              }))
                              .map(u => u.url);
                            if (urlsToSubmit.length === 0) {
                              toast.warning("Nenhuma URL do inventário corresponde aos sitemaps selecionados");
                              return;
                            }
                            toast.info(`Enviando ${Math.min(urlsToSubmit.length, 50)} URL(s) dos sitemaps selecionados...`);
                            submitMutation.mutate({ urls: urlsToSubmit.slice(0, 50), requestType: "URL_UPDATED" });
                          }}
                          disabled={submitMutation.isPending}
                        >
                          {submitMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          Enviar para Indexação
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => {
                            const selectedPaths = Array.from(selectedSmUrls);
                            const urlsToInspect = inventory
                              .filter(u => selectedPaths.some(smPath => {
                                try {
                                  const smDomain = new URL(smPath).origin;
                                  return u.url.startsWith(smDomain);
                                } catch { return false; }
                              }))
                              .map(u => u.url);
                            if (urlsToInspect.length === 0) {
                              toast.warning("Nenhuma URL do inventário corresponde aos sitemaps selecionados");
                              return;
                            }
                            inspectMutation.mutate(urlsToInspect.slice(0, 20));
                          }}
                          disabled={inspectMutation.isPending}
                        >
                          {inspectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanSearch className="h-3 w-3" />}
                          Inspecionar URLs
                        </Button>
                      </>
                    )}

                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {selectedSmUrls.size > 0 ? `${selectedSmUrls.size} de ${sitemaps.length} selecionado(s)` : `${filteredSm.length} sitemap(s)`}
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
                            {smColumns.map(col => (
                              <th
                                key={col.key}
                                className={`px-3 py-3 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors group ${col.align === "right" ? "text-right" : "text-left"}`}
                                onClick={() => handleSort(col.key)}
                              >
                                <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                                  {col.label}
                                  {sortCol === col.key ? (
                                    sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                                  )}
                                </span>
                              </th>
                            ))}
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                            <th className="px-3 py-3 w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSm.length === 0 ? (
                            <tr><td colSpan={smColumns.length + 3} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum sitemap encontrado</td></tr>
                          ) : sortedSm.map((sm: any, idx: number) => {
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
                                    <td colSpan={smColumns.length + 3} className="bg-muted/10 px-6 py-3 border-b border-border">
                                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Tipos de Conteúdo</h4>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {sm.contents.map((c: any, ci: number) => (
                                          <div key={ci} className="p-2 rounded-lg bg-background border border-border">
                                            <div className="text-[10px] text-muted-foreground capitalize">{c.type || "web"}</div>
                                            <div className="flex items-baseline gap-2 mt-0.5">
                                              <span className="text-sm font-bold text-foreground">{(parseInt(String(c.submitted), 10) || 0).toLocaleString("pt-BR")}</span>
                                              <span className="text-[10px] text-success">{(parseInt(String(c.indexed), 10) || 0).toLocaleString("pt-BR")} idx</span>
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
              );
            })()}
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

          {/* ─── SCHEDULE TAB ─── */}
          <TabsContent value="schedule" className="mt-4 space-y-4">
            <ScheduleTabContent
              projectId={projectId}
              user={user}
              cronConfig={cronConfig}
              scheduleData={scheduleData}
              allSchedules={allSchedules}
              schedulesLoading={schedulesLoading}
              stats={stats}
              onToggleAutoCron={handleToggleAutoCron}
              onScheduleManual={handleScheduleManual}
            />
          </TabsContent>

          {/* ─── ACCOUNTS TAB ─── */}
          <TabsContent value="accounts" className="mt-4 space-y-4">
            <AccountsTabContent
              projectId={projectId}
              user={user}
              connections={gscConnections}
              isLoading={gscLoading}
            />
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

/* ═══════════════════════════════════════════
   SCHEDULE TAB CONTENT
   ═══════════════════════════════════════════ */
const WEEKDAYS = [
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
];

function ScheduleTabContent({ projectId, user, cronConfig, scheduleData, allSchedules, schedulesLoading, stats, onToggleAutoCron, onScheduleManual }: {
  projectId: string | undefined; user: any; cronConfig: CronConfig; scheduleData: any;
  allSchedules: any[]; schedulesLoading: boolean; stats: any;
  onToggleAutoCron: (enabled: boolean, config: CronConfig) => void;
  onScheduleManual: (config: ManualSchedule) => void;
}) {
  const [autoEnabled, setAutoEnabled] = useState(cronConfig.enabled);
  const [autoTime, setAutoTime] = useState(cronConfig.time || "03:00");
  const [autoIndexing, setAutoIndexing] = useState(cronConfig.actions.includes("indexing"));
  const [autoInspection, setAutoInspection] = useState(cronConfig.actions.includes("inspection"));
  const [autoMaxUrls, setAutoMaxUrls] = useState(cronConfig.maxUrls || 200);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(WEEKDAYS.map(d => d.key)));

  // Manual schedule
  const [manualType, setManualType] = useState<"indexing" | "inspection">("indexing");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("08:00");
  const [manualCount, setManualCount] = useState(50);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => { const n = new Set(prev); if (n.has(day)) n.delete(day); else n.add(day); return n; });
  };

  const handleSaveAuto = () => {
    const actions: ("indexing" | "inspection")[] = [];
    if (autoIndexing) actions.push("indexing");
    if (autoInspection) actions.push("inspection");
    if (actions.length === 0 && autoEnabled) { toast.warning("Selecione pelo menos uma ação"); return; }
    if (selectedDays.size === 0 && autoEnabled) { toast.warning("Selecione pelo menos um dia"); return; }
    onToggleAutoCron(autoEnabled, { enabled: autoEnabled, time: autoTime, actions, maxUrls: autoMaxUrls, days: Array.from(selectedDays) });
    toast.success(autoEnabled ? "Agendamento automático salvo!" : "Agendamento desativado");
  };

  const handleScheduleManual = () => {
    if (!manualDate) { toast.warning("Selecione uma data"); return; }
    onScheduleManual({ type: manualType, scheduledAt: `${manualDate}T${manualTime}:00`, urlCount: manualCount });
    toast.success(`Agendamento criado para ${manualDate} às ${manualTime}`);
    setManualDate("");
  };

  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [editMaxUrls, setEditMaxUrls] = useState(200);
  const [editActions, setEditActions] = useState<string[]>([]);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const handleDeleteSchedule = async (id: string) => {
    setDeletingId(id);
    try {
      await supabase.from("indexing_schedules").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["indexing-schedules-all", projectId] });
      queryClient.invalidateQueries({ queryKey: ["indexing-schedule", projectId] });
      toast.success("Agendamento excluído");
    } catch (e: any) { toast.error(e.message); }
    finally { setDeletingId(null); }
  };

  const handleToggleEnabled = async (schedule: any) => {
    const newEnabled = !schedule.enabled;
    await supabase.from("indexing_schedules").update({ enabled: newEnabled }).eq("id", schedule.id);
    queryClient.invalidateQueries({ queryKey: ["indexing-schedules-all", projectId] });
    queryClient.invalidateQueries({ queryKey: ["indexing-schedule", projectId] });
    toast.success(newEnabled ? "Agendamento ativado" : "Agendamento desativado");
  };

  const openEdit = (s: any) => {
    setEditingSchedule(s);
    setEditMaxUrls(s.max_urls || 200);
    setEditActions(s.actions || []);
    setEditEnabled(s.enabled);
    if (s.schedule_type === "manual" && s.scheduled_at) {
      const d = new Date(s.scheduled_at);
      setEditDate(d.toISOString().slice(0, 10));
      setEditTime(d.toISOString().slice(11, 16));
    } else {
      setEditDate("");
      setEditTime(s.cron_time || "03:00");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;
    const payload: any = { max_urls: editMaxUrls, actions: editActions, enabled: editEnabled };
    if (editingSchedule.schedule_type === "cron") {
      payload.cron_time = editTime;
    } else if (editDate) {
      payload.scheduled_at = `${editDate}T${editTime}:00`;
    }
    await supabase.from("indexing_schedules").update(payload).eq("id", editingSchedule.id);
    queryClient.invalidateQueries({ queryKey: ["indexing-schedules-all", projectId] });
    queryClient.invalidateQueries({ queryKey: ["indexing-schedule", projectId] });
    toast.success("Agendamento atualizado");
    setEditingSchedule(null);
  };

  const getStatusInfo = (s: any) => {
    if (s.status === "completed") return { label: "Concluído", class: "bg-success/10 text-success border-success/20" };
    if (s.status === "failed") return { label: "Falhou", class: "bg-destructive/10 text-destructive border-destructive/20" };
    if (s.status === "pending") return { label: "Pendente", class: "bg-warning/10 text-warning border-warning/20" };
    if (s.enabled) return { label: "Ativo", class: "bg-success/10 text-success border-success/20" };
    return { label: "Desativado", class: "bg-muted text-muted-foreground border-border" };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Auto Cron Config ── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Agendamento Automático</h3>
          </div>
          <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
        </div>
        <p className="text-[10px] text-muted-foreground">
          O sistema executa automaticamente as ações selecionadas nos dias e horários definidos.
        </p>

        {autoEnabled && (
          <div className="space-y-4">
            {/* Days */}
            <div className="space-y-1.5">
              <Label className="text-xs">Dias da semana</Label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map(day => (
                  <button
                    key={day.key}
                    onClick={() => toggleDay(day.key)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                      selectedDays.has(day.key)
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <Label className="text-xs">Horário</Label>
              <Input type="time" value={autoTime} onChange={e => setAutoTime(e.target.value)} className="w-32 h-8 text-xs" />
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Label className="text-xs">Ações</Label>
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                <Switch checked={autoIndexing} onCheckedChange={setAutoIndexing} id="auto-idx" />
                <Label htmlFor="auto-idx" className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <Send className="h-3 w-3 text-primary" /> Enviar para Indexação
                </Label>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                <Switch checked={autoInspection} onCheckedChange={setAutoInspection} id="auto-insp" />
                <Label htmlFor="auto-insp" className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <ScanSearch className="h-3 w-3 text-primary" /> Inspecionar URLs sem status
                </Label>
              </div>
            </div>

            {/* Max URLs */}
            <div className="space-y-1.5">
              <Label className="text-xs">Máx. URLs por execução</Label>
              <Input type="number" min={10} max={500} value={autoMaxUrls} onChange={e => setAutoMaxUrls(Number(e.target.value))} className="w-32 h-8 text-xs" />
            </div>
          </div>
        )}

        <Button size="sm" className="w-full text-xs gap-1.5" onClick={handleSaveAuto}>
          <CheckCircle2 className="h-3 w-3" /> Salvar Configuração
        </Button>
      </Card>

      {/* ── Manual Schedule ── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Agendar Manualmente</h3>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Crie um agendamento pontual para uma data e horário específicos.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Ação</Label>
            <Select value={manualType} onValueChange={(v: any) => setManualType(v)}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="indexing">Enviar para Indexação</SelectItem>
                <SelectItem value="inspection">Inspecionar URLs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário</Label>
              <Input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quantidade de URLs</Label>
            <Input type="number" min={1} max={500} value={manualCount} onChange={e => setManualCount(Number(e.target.value))} className="w-32 h-8 text-xs" />
          </div>
          <Button size="sm" className="w-full text-xs gap-1.5" onClick={handleScheduleManual} disabled={!manualDate}>
            <CalendarClock className="h-3 w-3" /> Agendar
          </Button>
        </div>
      </Card>

      {/* ── Schedules List ── */}
      <Card className="p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Agendamentos Criados</h3>
            <Badge variant="secondary" className="text-[10px]">{allSchedules.length}</Badge>
          </div>
        </div>
        {schedulesLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : allSchedules.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhum agendamento" description="Configure o agendamento automático ou crie um manualmente acima." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Ações</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Máx URLs</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Horário / Data</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Última Execução</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Criado em</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {allSchedules.map((s: any) => {
                  const statusInfo = getStatusInfo(s);
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {s.schedule_type === "cron" ? "Automático" : "Manual"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          {(s.actions || []).map((a: string) => (
                            <Badge key={a} variant="outline" className="text-[9px]">
                              {a === "indexing" ? "Indexação" : "Inspeção"}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{s.max_urls}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={`text-[10px] border ${statusInfo.class}`}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {s.schedule_type === "cron" ? (s.cron_time || "—") : (s.scheduled_at ? format(new Date(s.scheduled_at), "dd/MM/yyyy HH:mm") : "—")}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {s.last_run_at ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">{formatDistanceToNow(new Date(s.last_run_at), { addSuffix: true, locale: ptBR })}</span>
                            </TooltipTrigger>
                            <TooltipContent>{format(new Date(s.last_run_at), "dd/MM/yyyy HH:mm:ss")}</TooltipContent>
                          </Tooltip>
                        ) : "Nunca"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle active */}
                          {s.status !== "completed" && s.status !== "failed" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggleEnabled(s)}>
                                  {s.enabled ? <Eye className="h-3 w-3 text-success" /> : <Ban className="h-3 w-3 text-muted-foreground" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{s.enabled ? "Desativar" : "Ativar"}</TooltipContent>
                            </Tooltip>
                          )}
                          {/* Edit */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          {/* Delete */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteSchedule(s.id)} disabled={deletingId === s.id}>
                                {deletingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => { if (!open) setEditingSchedule(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Editar Agendamento
            </DialogTitle>
          </DialogHeader>
          {editingSchedule && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <Label className="text-xs">Ativo</Label>
                <Switch checked={editEnabled} onCheckedChange={setEditEnabled} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Ações</Label>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                  <Switch
                    checked={editActions.includes("indexing")}
                    onCheckedChange={(c) => setEditActions(prev => c ? [...prev, "indexing"] : prev.filter(a => a !== "indexing"))}
                    id="edit-idx"
                  />
                  <Label htmlFor="edit-idx" className="text-xs cursor-pointer flex items-center gap-1.5">
                    <Send className="h-3 w-3 text-primary" /> Indexação
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                  <Switch
                    checked={editActions.includes("inspection")}
                    onCheckedChange={(c) => setEditActions(prev => c ? [...prev, "inspection"] : prev.filter(a => a !== "inspection"))}
                    id="edit-insp"
                  />
                  <Label htmlFor="edit-insp" className="text-xs cursor-pointer flex items-center gap-1.5">
                    <ScanSearch className="h-3 w-3 text-primary" /> Inspeção
                  </Label>
                </div>
              </div>

              {editingSchedule.schedule_type === "manual" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Horário</Label>
                    <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              )}

              {editingSchedule.schedule_type === "cron" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Horário</Label>
                  <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="w-32 h-8 text-xs" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Máx. URLs</Label>
                <Input type="number" min={1} max={500} value={editMaxUrls} onChange={e => setEditMaxUrls(Number(e.target.value))} className="w-32 h-8 text-xs" />
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditingSchedule(null)}>Cancelar</Button>
                <Button size="sm" className="text-xs gap-1.5" onClick={handleSaveEdit}>
                  <CheckCircle2 className="h-3 w-3" /> Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ACCOUNTS TAB CONTENT
   ═══════════════════════════════════════════ */
function AccountsTabContent({ projectId, user, connections, isLoading }: {
  projectId: string | undefined; user: any; connections: any[]; isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [sites, setSites] = useState<{ siteUrl: string; permissionLevel: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [step, setStep] = useState<"form" | "validating" | "select">("form");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setAdding(false); setStep("form"); setJsonInput(""); setConnectionName(""); setJsonError(""); setSites([]); setSelectedSite("");
  };

  const handleTest = async (conn: any) => {
    setTestingId(conn.id);
    try {
      const { data, error } = await supabase.functions.invoke("verify-gsc", {
        body: { credentials: { client_email: conn.client_email, private_key: conn.private_key } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      toast.success(`Conexão OK! ${data.sites?.length || 0} propriedade(s)`);
    } catch (e: any) { toast.error("Falha: " + e.message); }
    finally { setTestingId(null); }
  };

  const handleSync = async (conn: any) => {
    setSyncingId(conn.id);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-gsc-data", {
        body: { project_id: projectId, connection_id: conn.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["seo-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["gsc-connections"] });
      toast.success(`${data?.inserted?.toLocaleString() || 0} métricas importadas`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSyncingId(null); }
  };

  const handleDelete = async (connId: string) => {
    setDeletingId(connId);
    try {
      await supabase.from("gsc_connections").delete().eq("id", connId);
      queryClient.invalidateQueries({ queryKey: ["gsc-connections"] });
      toast.success("Conexão removida");
    } catch (e: any) { toast.error(e.message); }
    finally { setDeletingId(null); }
  };

  const handleValidate = async () => {
    if (!connectionName.trim()) { setJsonError("Informe um nome."); return; }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput.trim());
      if (!parsed.client_email || !parsed.private_key) { setJsonError("JSON inválido: client_email e private_key são obrigatórios."); return; }
    } catch { setJsonError("JSON inválido."); return; }
    setStep("validating"); setJsonError("");
    try {
      const { data, error } = await supabase.functions.invoke("verify-gsc", {
        body: { credentials: { client_email: parsed.client_email, private_key: parsed.private_key } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      if ((data.sites || []).length === 0) { setJsonError("Nenhuma propriedade encontrada."); setStep("form"); return; }
      setSites(data.sites); setSelectedSite(data.sites[0]?.siteUrl || ""); setStep("select");
    } catch (e: any) { setJsonError(e.message); setStep("form"); }
  };

  const handleSave = async () => {
    if (!user || !selectedSite) return;
    let parsed: any;
    try { parsed = JSON.parse(jsonInput.trim()); } catch { return; }
    try {
      await supabase.from("gsc_connections").insert({
        project_id: projectId, owner_id: user.id, connection_name: connectionName,
        client_email: parsed.client_email, private_key: parsed.private_key, site_url: selectedSite,
      });
      queryClient.invalidateQueries({ queryKey: ["gsc-connections"] });
      resetForm();
      toast.success("Conta GSC adicionada!");
    } catch (e: any) { toast.error(e.message); }
  };

  if (isLoading) return <Card className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Card>;

  return (
    <div className="space-y-4">
      {/* Info */}
      <Card className="p-4 bg-primary/5 border-primary/10">
        <div className="flex items-start gap-3">
          <Settings2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Múltiplas Contas de API</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Adicione várias Service Accounts do Google Search Console para <strong className="text-foreground">multiplicar sua quota de API</strong>.
              Cada conta possui ~200 notificações/dia e ~2.000 inspeções/dia independentes.
              O processo é o mesmo do onboarding: crie uma Service Account no Google Cloud, baixe o JSON e adicione aqui.
            </p>
          </div>
        </div>
      </Card>

      {/* Connections list */}
      {connections.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="text-xs font-semibold text-foreground mb-2">
            Contas Conectadas
            <Badge variant="secondary" className="text-[10px] ml-2">{connections.length}</Badge>
          </h3>
          {connections.map((conn: any) => (
            <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{conn.connection_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{conn.site_url}</p>
                  <p className="text-[9px] text-muted-foreground">{conn.client_email}</p>
                  {conn.last_sync_at && (
                    <p className="text-[9px] text-muted-foreground">Último sync: {format(new Date(conn.last_sync_at), "dd/MM/yyyy HH:mm")}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleTest(conn)} disabled={testingId === conn.id}>
                    {testingId === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger><TooltipContent>Testar conexão</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSync(conn)} disabled={syncingId === conn.id}>
                    {syncingId === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger><TooltipContent>Sincronizar dados</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(conn.id)} disabled={deletingId === conn.id}>
                    {deletingId === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger><TooltipContent>Remover</TooltipContent></Tooltip>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Add new connection */}
      {adding ? (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Nova Conta GSC</h3>
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={resetForm}>Cancelar</Button>
          </div>

          {step === "form" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome da conexão</Label>
                <Input placeholder="Ex: GSC Conta 2" value={connectionName} onChange={e => { setConnectionName(e.target.value); setJsonError(""); }} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">JSON da Service Account</Label>
                <label className="cursor-pointer">
                  <input type="file" accept=".json" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => { setJsonInput(evt.target?.result as string); setJsonError(""); };
                    reader.readAsText(file);
                    e.target.value = "";
                  }} />
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors px-3 py-2 text-xs text-muted-foreground">
                    <Upload className="h-3.5 w-3.5" /> Upload arquivo .json
                  </div>
                </label>
                <textarea
                  className="w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  placeholder='{"type": "service_account", ...}'
                  value={jsonInput}
                  onChange={e => { setJsonInput(e.target.value); setJsonError(""); }}
                />
              </div>
              {jsonError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {jsonError}
                </div>
              )}
              <Button size="sm" className="w-full text-xs h-8 gap-1" onClick={handleValidate} disabled={!jsonInput.trim() || !connectionName.trim()}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Validar e conectar
              </Button>
            </div>
          )}

          {step === "validating" && (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Verificando credenciais...</span>
            </div>
          )}

          {step === "select" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 text-success text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verificada! Selecione a propriedade.
              </div>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sites.map(s => <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="w-full text-xs h-8 gap-1" onClick={handleSave} disabled={!selectedSite}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Salvar conexão
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Adicionar Conta GSC
        </Button>
      )}
    </div>
  );
}
