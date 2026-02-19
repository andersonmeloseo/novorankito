import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { KpiSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import {
  ScanSearch, Loader2, AlertTriangle, CheckCircle2, XCircle,
  FileText, Clock, Image, Link2, ChevronLeft, ChevronRight,
  Play, History, Globe, Gauge,
} from "lucide-react";

interface OnPageAuditTabProps {
  projectId: string | undefined;
}

export function OnPageAuditTab({ projectId }: OnPageAuditTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [subTab, setSubTab] = useState("dashboard");
  const [pagesPage, setPagesPage] = useState(1);
  const [pagesFilter, setPagesFilter] = useState<string | undefined>();

  // Fetch latest audit for this project
  const { data: audits = [], isLoading: loadingAudits } = useQuery({
    queryKey: ["onpage-audits", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onpage_audits")
        .select("*")
        .eq("project_id", projectId!)
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!user,
  });

  const latestAudit = audits[0] || null;
  const isCrawling = latestAudit?.status === "crawling" || latestAudit?.status === "pending";

  // Poll when crawling
  useEffect(() => {
    if (!isCrawling || !latestAudit) return;

    const interval = setInterval(async () => {
      setPolling(true);
      try {
        const { data, error } = await supabase.functions.invoke("dataforseo-onpage-poll", {
          body: { audit_id: latestAudit.id },
        });
        if (error) throw error;

        if (data?.status === "completed") {
          queryClient.invalidateQueries({ queryKey: ["onpage-audits"] });
          queryClient.invalidateQueries({ queryKey: ["onpage-pages"] });
          toast({ title: "Auditoria concluída!", description: `${data.pages_crawled} páginas analisadas.` });
        } else {
          // Update local state
          queryClient.invalidateQueries({ queryKey: ["onpage-audits"] });
        }
      } catch (e: any) {
        console.error("Poll error:", e);
      } finally {
        setPolling(false);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isCrawling, latestAudit?.id]);

  // Fetch pages for completed audit
  const { data: pagesData, isLoading: loadingPages } = useQuery({
    queryKey: ["onpage-pages", latestAudit?.id, pagesPage, pagesFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("dataforseo-onpage-pages", {
        body: {
          audit_id: latestAudit!.id,
          page: pagesPage,
          page_size: 50,
          filter: pagesFilter,
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!latestAudit && latestAudit.status === "completed",
  });

  const startAudit = async () => {
    if (!projectId) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("dataforseo-onpage-start", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["onpage-audits"] });
      toast({ title: "Auditoria iniciada!", description: `Crawling ${data.domain}...` });
    } catch (e: any) {
      toast({ title: "Erro ao iniciar auditoria", description: e.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  // Extract summary data
  const summary = latestAudit?.summary as any;
  const crawlInfo = summary?.crawl_status_code === 2 ? summary : null;

  const totalPages = summary?.pages_count || latestAudit?.pages_total || 0;
  const pagesCrawled = summary?.pages_crawled || latestAudit?.pages_crawled || 0;

  // On-page score calculation from checks
  const onpageScore = summary?.onpage_score || 0;
  const totalChecks = summary?.total_checks || 0;
  const passedChecks = summary?.checks?.passed || 0;
  const warningChecks = summary?.checks?.warning || 0;
  const errorChecks = summary?.checks?.critical || summary?.checks?.errors || 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-amber-500";
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-success/10";
    if (score >= 50) return "bg-amber-500/10";
    return "bg-destructive/10";
  };

  if (!projectId) {
    return <EmptyState icon={ScanSearch} title="Selecione um projeto" description="Escolha um projeto para realizar a auditoria On-Page." />;
  }

  if (loadingAudits) return <KpiSkeleton count={4} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <AnimatedContainer>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-primary" />
              Auditoria SEO On-Page
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Análise técnica completa do seu site via DataForSEO
            </p>
          </div>
          <div className="flex items-center gap-2">
            {latestAudit && (
              <Badge variant="outline" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                {new Date(latestAudit.created_at).toLocaleDateString("pt-BR")}
              </Badge>
            )}
            <Button
              onClick={startAudit}
              disabled={starting || isCrawling}
              size="sm"
              className="gap-1.5"
            >
              {starting || isCrawling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {starting ? "Iniciando..." : isCrawling ? "Analisando..." : "Nova Auditoria"}
            </Button>
          </div>
        </div>
      </AnimatedContainer>

      {/* Crawling progress */}
      {isCrawling && latestAudit && (
        <AnimatedContainer>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Crawling em andamento</p>
                <p className="text-xs text-muted-foreground">
                  {latestAudit.domain} · {latestAudit.pages_crawled || 0} páginas rastreadas
                </p>
              </div>
            </div>
            <Progress value={Number(latestAudit.crawl_progress) || 0} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {Number(latestAudit.crawl_progress) || 0}% concluído · Atualizando a cada 10s
            </p>
          </Card>
        </AnimatedContainer>
      )}

      {/* No audits yet */}
      {!latestAudit && !isCrawling && (
        <EmptyState
          icon={ScanSearch}
          title="Nenhuma auditoria realizada"
          description="Clique em 'Nova Auditoria' para analisar o SEO técnico do seu site."
        />
      )}

      {/* Completed audit results */}
      {latestAudit && latestAudit.status === "completed" && (
        <>
          {/* KPI Cards */}
          <StaggeredGrid>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Score On-Page"
                value={Math.round(onpageScore * 100) / 100}
                change={0}
                suffix="/100"
                description="Score geral de saúde SEO do site"
              />
              <KpiCard
                label="Páginas Rastreadas"
                value={pagesCrawled}
                change={0}
                description="Total de páginas analisadas"
              />
              <KpiCard
                label="Erros Críticos"
                value={errorChecks}
                change={0}
                description="Problemas que afetam SEO negativamente"
              />
              <KpiCard
                label="Avisos"
                value={warningChecks}
                change={0}
                description="Possíveis melhorias detectadas"
              />
            </div>
          </StaggeredGrid>

          {/* Sub-tabs */}
          <AnimatedContainer delay={0.1}>
            <Tabs value={subTab} onValueChange={setSubTab}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="dashboard" className="text-xs gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> Resumo
                </TabsTrigger>
                <TabsTrigger value="pages" className="text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Páginas
                </TabsTrigger>
                <TabsTrigger value="issues" className="text-xs gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Problemas
                </TabsTrigger>
              </TabsList>

              {/* Dashboard sub-tab */}
              <TabsContent value="dashboard" className="mt-4 space-y-4">
                {/* Score gauge */}
                <Card className="p-5">
                  <div className="flex items-center gap-6">
                    <div className={`h-24 w-24 rounded-full flex items-center justify-center ${getScoreBg(onpageScore)}`}>
                      <span className={`text-3xl font-bold ${getScoreColor(onpageScore)}`}>
                        {Math.round(onpageScore)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-foreground mb-2">Score de Saúde</h3>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          <span className="text-muted-foreground">Aprovados:</span>
                          <span className="font-medium text-foreground">{passedChecks}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-muted-foreground">Avisos:</span>
                          <span className="font-medium text-foreground">{warningChecks}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-muted-foreground">Erros:</span>
                          <span className="font-medium text-foreground">{errorChecks}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress
                          value={totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0}
                          className="h-2"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {passedChecks} de {totalChecks} verificações aprovadas
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">Domínio</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{latestAudit.domain}</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">Páginas</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{pagesCrawled}</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">Links Internos</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {summary?.page_metrics?.links_internal || 0}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Image className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">Imagens s/ Alt</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {summary?.page_metrics?.images_without_alt || 0}
                    </p>
                  </Card>
                </div>

                {/* Audit history */}
                {audits.length > 1 && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        Histórico de Auditorias
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Domínio</TableHead>
                            <TableHead className="text-xs">Score</TableHead>
                            <TableHead className="text-xs">Páginas</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {audits.map((a: any) => (
                            <TableRow key={a.id}>
                              <TableCell className="text-xs">
                                {new Date(a.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-xs font-mono">{a.domain}</TableCell>
                              <TableCell className="text-xs">
                                {a.summary?.onpage_score
                                  ? Math.round(a.summary.onpage_score)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-xs">{a.pages_crawled || 0}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={a.status === "completed" ? "default" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {a.status === "completed" ? "Concluído" : a.status === "crawling" ? "Analisando" : a.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Pages sub-tab */}
              <TabsContent value="pages" className="mt-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={!pagesFilter ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setPagesFilter(undefined); setPagesPage(1); }}
                  >
                    Todas
                  </Button>
                  <Button
                    variant={pagesFilter === "errors" ? "destructive" : "outline"}
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => { setPagesFilter("errors"); setPagesPage(1); }}
                  >
                    <XCircle className="h-3 w-3" /> Erros
                  </Button>
                  <Button
                    variant={pagesFilter === "warnings" ? "secondary" : "outline"}
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => { setPagesFilter("warnings"); setPagesPage(1); }}
                  >
                    <AlertTriangle className="h-3 w-3" /> Avisos
                  </Button>
                  <Button
                    variant={pagesFilter === "passed" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => { setPagesFilter("passed"); setPagesPage(1); }}
                  >
                    <CheckCircle2 className="h-3 w-3" /> Aprovadas
                  </Button>
                </div>

                {loadingPages ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">URL</TableHead>
                          <TableHead className="text-xs w-20">Score</TableHead>
                          <TableHead className="text-xs w-20">Status</TableHead>
                          <TableHead className="text-xs w-24">Título</TableHead>
                          <TableHead className="text-xs w-20">Tempo</TableHead>
                          <TableHead className="text-xs w-20">Imgs s/ Alt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pagesData?.pages || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                              Sem dados
                            </TableCell>
                          </TableRow>
                        ) : (
                          (pagesData?.pages || []).map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="text-xs font-mono max-w-[300px] truncate">
                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary transition-colors"
                                >
                                  {p.url?.replace(/^https?:\/\/[^/]+/, "") || p.url}
                                </a>
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs font-semibold ${getScoreColor(p.page_score || 0)}`}>
                                  {p.page_score ? Math.round(p.page_score) : "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    p.status_code >= 400
                                      ? "destructive"
                                      : p.status_code >= 300
                                      ? "secondary"
                                      : "default"
                                  }
                                  className="text-[10px]"
                                >
                                  {p.status_code || "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs max-w-[200px] truncate" title={p.meta_title}>
                                {p.meta_title || <span className="text-destructive">Ausente</span>}
                              </TableCell>
                              <TableCell className="text-xs">
                                {p.load_time ? `${(p.load_time * 1000).toFixed(0)}ms` : "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {p.images_without_alt > 0 ? (
                                  <span className="text-amber-500">{p.images_without_alt}</span>
                                ) : (
                                  <span className="text-success">0</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pagesData && pagesData.total_pages > 1 && (
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          Página {pagesData.page} de {pagesData.total_pages} · {pagesData.total} páginas
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={pagesPage <= 1}
                            onClick={() => setPagesPage((p) => p - 1)}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={pagesPage >= pagesData.total_pages}
                            onClick={() => setPagesPage((p) => p + 1)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                )}
              </TabsContent>

              {/* Issues sub-tab */}
              <TabsContent value="issues" className="mt-4 space-y-3">
                <IssuesSummary summary={summary} />
              </TabsContent>
            </Tabs>
          </AnimatedContainer>
        </>
      )}
    </div>
  );
}

function IssuesSummary({ summary }: { summary: any }) {
  if (!summary?.page_metrics) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Sem dados de problemas"
        description="Complete uma auditoria para ver os problemas detectados."
      />
    );
  }

  const metrics = summary.page_metrics;
  
  const issues = [
    { label: "Páginas sem title", count: metrics.pages_with_empty_title || 0, severity: "error" },
    { label: "Páginas sem description", count: metrics.pages_with_empty_description || 0, severity: "error" },
    { label: "Páginas sem H1", count: metrics.pages_with_empty_h1 || 0, severity: "error" },
    { label: "Title duplicado", count: metrics.pages_with_duplicate_title || 0, severity: "warning" },
    { label: "Description duplicada", count: metrics.pages_with_duplicate_description || 0, severity: "warning" },
    { label: "H1 duplicado", count: metrics.pages_with_duplicate_h1 || 0, severity: "warning" },
    { label: "Title muito longo", count: metrics.pages_with_too_long_title || 0, severity: "warning" },
    { label: "Title muito curto", count: metrics.pages_with_too_short_title || 0, severity: "warning" },
    { label: "Description muito longa", count: metrics.pages_with_too_long_description || 0, severity: "warning" },
    { label: "Description muito curta", count: metrics.pages_with_too_short_description || 0, severity: "warning" },
    { label: "Imagens sem alt", count: metrics.images_without_alt || 0, severity: "warning" },
    { label: "Links quebrados (4xx)", count: metrics.pages_with_4xx_code || 0, severity: "error" },
    { label: "Erros do servidor (5xx)", count: metrics.pages_with_5xx_code || 0, severity: "error" },
    { label: "Redirecionamentos (3xx)", count: metrics.pages_with_3xx_code || 0, severity: "info" },
    { label: "Tempo de carregamento > 3s", count: metrics.pages_with_high_loading_time || 0, severity: "warning" },
    { label: "Páginas sem canonical", count: metrics.pages_without_canonical || 0, severity: "warning" },
  ].filter(i => i.count > 0);

  if (issues.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Nenhum problema encontrado!</p>
        <p className="text-xs text-muted-foreground mt-1">Seu site passou em todas as verificações.</p>
      </Card>
    );
  }

  const errorIssues = issues.filter(i => i.severity === "error");
  const warningIssues = issues.filter(i => i.severity === "warning");
  const infoIssues = issues.filter(i => i.severity === "info");

  return (
    <div className="space-y-4">
      {errorIssues.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" /> Erros Críticos ({errorIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {errorIssues.map((issue, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{issue.label}</TableCell>
                    <TableCell className="text-xs text-right font-semibold text-destructive">
                      {issue.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {warningIssues.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-4 w-4" /> Avisos ({warningIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {warningIssues.map((issue, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{issue.label}</TableCell>
                    <TableCell className="text-xs text-right font-semibold text-amber-500">
                      {issue.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {infoIssues.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              Info ({infoIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {infoIssues.map((issue, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{issue.label}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {issue.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
