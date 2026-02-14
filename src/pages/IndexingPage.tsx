import { useState, useMemo, useCallback } from "react";
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
  ArrowUpFromLine, Filter, Search, ExternalLink, Eye, Shield, ShieldOff,
  ShieldCheck, HelpCircle, ChevronRight, Layers, History, Package, ScanSearch,
  AlertCircle, Ban, Info
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
  NEUTRAL: { color: "bg-muted text-muted-foreground border-border", icon: HelpCircle, label: "Neutro" },
  VERDICT_UNSPECIFIED: { color: "bg-muted text-muted-foreground border-border", icon: HelpCircle, label: "Indefinido" },
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

  // ─── Filtered Inventory ───
  const filteredInventory = useMemo(() => {
    return inventory.filter(u => {
      if (searchFilter && !u.url.toLowerCase().includes(searchFilter.toLowerCase()) && !(u.meta_title || "").toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (verdictFilter === "indexed" && u.verdict !== "PASS") return false;
      if (verdictFilter === "not_indexed" && (u.verdict === "PASS" || !u.verdict)) return false;
      if (verdictFilter === "unknown" && u.verdict) return false;
      if (verdictFilter === "never_sent" && u.last_request_status) return false;
      return true;
    });
  }, [inventory, searchFilter, verdictFilter]);

  // ─── Filtered History ───
  const filteredHistory = useMemo(() => {
    if (!requests) return [];
    return requests.filter(r => {
      if (historyStatusFilter !== "all" && r.status !== historyStatusFilter) return false;
      if (searchFilter && !r.url.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    });
  }, [requests, historyStatusFilter, searchFilter]);

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
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="h-3 w-3" /> Histórico
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar URL..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="pl-8 h-9 text-xs" />
              </div>
              {activeTab === "inventory" && (
                <Select value={verdictFilter} onValueChange={setVerdictFilter}>
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
                <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">URL</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Indexação</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Cobertura</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Último Crawl</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Último Envio</th>
                        <th className="px-3 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map(item => (
                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5">
                            <Checkbox checked={selectedUrls.has(item.url)} onCheckedChange={() => toggleUrl(item.url)} />
                          </td>
                          <td className="px-3 py-2.5 max-w-[350px]">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-foreground truncate">{item.url}</span>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                  <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                                </a>
                              </div>
                              {item.meta_title && <span className="text-[10px] text-muted-foreground truncate">{item.meta_title}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge status={item.verdict} map={VERDICT_MAP} />
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
              </Card>
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
                      {filteredHistory.map(item => (
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
