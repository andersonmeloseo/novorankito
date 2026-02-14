import { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndexingRequests, useSubmitUrls, useRetryRequest } from "@/hooks/use-indexing";
import {
  Send, CheckCircle2, Clock, AlertTriangle, RotateCcw, Zap, Globe, Link2,
  ArrowUpFromLine, Trash2, Filter, Search, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  success: { color: "bg-success/10 text-success border-success/20", icon: CheckCircle2, label: "Sucesso" },
  pending: { color: "bg-warning/10 text-warning border-warning/20", icon: Clock, label: "Pendente" },
  failed: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle, label: "Falha" },
  quota_exceeded: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertTriangle, label: "Quota" },
};

export default function IndexingPage() {
  const { user } = useAuth();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [urlsText, setUrlsText] = useState("");
  const [requestType, setRequestType] = useState("URL_UPDATED");
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromSitemap, setFromSitemap] = useState(false);

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

  const { data: requests, isLoading } = useIndexingRequests(projectId);
  const submitMutation = useSubmitUrls(projectId);
  const retryMutation = useRetryRequest(projectId);

  // Load site_urls for "from sitemap" option
  const { data: siteUrls } = useQuery({
    queryKey: ["site-urls-for-indexing", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("site_urls").select("url").eq("project_id", projectId!).limit(500);
      return data || [];
    },
    enabled: !!projectId && fromSitemap,
  });

  // Stats
  const stats = useMemo(() => {
    if (!requests) return { total: 0, success: 0, pending: 0, failed: 0, quota: 0 };
    return {
      total: requests.length,
      success: requests.filter(r => r.status === "success").length,
      pending: requests.filter(r => r.status === "pending").length,
      failed: requests.filter(r => r.status === "failed").length,
      quota: requests.filter(r => r.status === "quota_exceeded").length,
    };
  }, [requests]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!requests) return [];
    return requests.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (searchFilter && !r.url.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    });
  }, [requests, statusFilter, searchFilter]);

  // Today stats
  const todayStats = useMemo(() => {
    if (!requests) return { submitted: 0, success: 0 };
    const today = new Date().toISOString().slice(0, 10);
    const todayReqs = requests.filter(r => r.submitted_at.slice(0, 10) === today);
    return {
      submitted: todayReqs.length,
      success: todayReqs.filter(r => r.status === "success").length,
    };
  }, [requests]);

  const handleSubmit = () => {
    let urls: string[];
    if (fromSitemap && siteUrls) {
      urls = siteUrls.map(u => u.url);
    } else {
      urls = urlsText
        .split("\n")
        .map(u => u.trim())
        .filter(u => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));
    }
    if (urls.length === 0) return;
    submitMutation.mutate({ urls, requestType }, {
      onSuccess: () => {
        setSubmitOpen(false);
        setUrlsText("");
        setFromSitemap(false);
      },
    });
  };

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  return (
    <>
      <TopBar title="Indexação" subtitle="Envie URLs para indexação via Google Indexing API" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPIs */}
        {isLoading ? (
          <KpiSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total Enviadas" value={stats.total} change={0} />
            <KpiCard label="Sucesso" value={stats.success} change={0} />
            <KpiCard label="Pendentes" value={stats.pending} change={0} />
            <KpiCard label="Falhas" value={stats.failed} change={0} />
            <KpiCard label="Hoje" value={todayStats.submitted} change={0} />
            <Card className="p-3 flex flex-col items-center justify-center">
              <div className={`text-2xl font-bold ${successRate >= 80 ? "text-success" : successRate >= 50 ? "text-warning" : "text-destructive"}`}>
                {successRate}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Taxa de Sucesso</div>
            </Card>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Send className="h-4 w-4" /> Enviar URLs para Indexação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-primary" />
                  Enviar URLs para Google Indexing API
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Tabs defaultValue="manual" onValueChange={v => setFromSitemap(v === "sitemap")}>
                  <TabsList className="w-full">
                    <TabsTrigger value="manual" className="flex-1 gap-1.5 text-xs">
                      <Link2 className="h-3 w-3" /> Digitar URLs
                    </TabsTrigger>
                    <TabsTrigger value="sitemap" className="flex-1 gap-1.5 text-xs">
                      <Globe className="h-3 w-3" /> Do Sitemap
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="manual" className="mt-3">
                    <Textarea
                      placeholder={"Cole as URLs aqui (uma por linha):\nhttps://seusite.com/pagina-1\nhttps://seusite.com/pagina-2"}
                      value={urlsText}
                      onChange={e => setUrlsText(e.target.value)}
                      rows={8}
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {urlsText.split("\n").filter(u => u.trim().startsWith("http")).length} URL(s) detectada(s) • Máx. 50 por envio
                    </p>
                  </TabsContent>
                  <TabsContent value="sitemap" className="mt-3">
                    <Card className="p-4 text-center">
                      <Globe className="h-8 w-8 mx-auto text-primary/60 mb-2" />
                      <p className="text-sm text-foreground font-medium">
                        {siteUrls ? `${siteUrls.length} URLs importadas` : "Carregando..."}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Todas as URLs do seu inventário serão enviadas (máx. 50)
                      </p>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Tipo de Notificação</label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URL_UPDATED">URL Atualizada / Nova</SelectItem>
                      <SelectItem value="URL_DELETED">URL Removida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className="p-3 bg-muted/30 border-dashed">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground">Limite da API:</strong> ~200 notificações/dia por propriedade.
                      URLs já indexadas podem ser ignoradas pelo Google.
                    </div>
                  </div>
                </Card>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Cancelar</Button>
                </DialogClose>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending || (!fromSitemap && urlsText.trim().length === 0)}
                >
                  {submitMutation.isPending ? (
                    <RotateCcw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  {submitMutation.isPending ? "Enviando..." : "Enviar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrar por URL..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falha</SelectItem>
                <SelectItem value="quota_exceeded">Quota</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : !requests || requests.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Nenhuma URL enviada ainda"
            description="Envie suas URLs para o Google Indexing API para acelerar a indexação das suas páginas."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Histórico de Envios
                <Badge variant="secondary" className="ml-2 text-[10px]">{filtered.length}</Badge>
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
                  {filtered.map(item => {
                    const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.failed;
                    const Icon = statusInfo.icon;
                    return (
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
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusInfo.color}`}>
                            <Icon className="h-2.5 w-2.5" /> {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground cursor-default">
                                {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(item.submitted_at), "dd/MM/yyyy HH:mm:ss")}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.retries}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                          {item.fail_reason || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {(item.status === "failed" || item.status === "quota_exceeded") && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => retryMutation.mutate(item.id)}
                                  disabled={retryMutation.isPending}
                                >
                                  <RotateCcw className={`h-3 w-3 ${retryMutation.isPending ? "animate-spin" : ""}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reenviar</TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Bottom Stats */}
        {stats.total > 0 && (
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className={`text-2xl font-bold ${successRate >= 80 ? "text-success" : successRate >= 50 ? "text-warning" : "text-destructive"}`}>
                {successRate}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Taxa de Sucesso Global</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{todayStats.submitted}</div>
              <div className="text-xs text-muted-foreground mt-1">Enviadas Hoje</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Histórico</div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
