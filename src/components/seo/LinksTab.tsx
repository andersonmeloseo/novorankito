import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Link2, Loader2, Search, TrendingUp, Hash, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinksInfoCard } from "./links/LinksInfoCard";
import { LinksKpiCards } from "./links/LinksKpiCards";
import { LinksTable } from "./links/LinksTable";
import { LinksDomainSummary } from "./links/LinksDomainSummary";

interface Props {
  projectId: string | undefined;
}

export function LinksTab({ projectId }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["gsc-links", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-links", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId,
  });

  const topPages = useMemo(() => {
    let rows = (data?.topPages || []).map((r: any) => ({
      page: r.page,
      clicks: Number(r.clicks) || 0,
      impressions: Number(r.impressions) || 0,
      ctr: Number(r.impressions) > 0 ? ((Number(r.clicks) / Number(r.impressions)) * 100) : 0,
    }));
    if (searchTerm) rows = rows.filter((r: any) => r.page.toLowerCase().includes(searchTerm.toLowerCase()));
    return rows;
  }, [data, searchTerm]);

  const internalLinks = useMemo(() => {
    let rows = (data?.internalLinks || []).map((r: any) => ({
      page: r.page,
      queryCount: Number(r.queryCount) || 0,
      clicks: Number(r.clicks) || 0,
      impressions: Number(r.impressions) || 0,
    }));
    if (searchTerm) rows = rows.filter((r: any) => r.page.toLowerCase().includes(searchTerm.toLowerCase()));
    return rows;
  }, [data, searchTerm]);

  const exportCSV = (rows: any[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => `"${r[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topPagesColumns = [
    { key: "page", label: "Página", tooltip: "URL da página indexada no Google", width: "45%" },
    { key: "clicks", label: "Cliques", tooltip: "Total de cliques orgânicos nos últimos 90 dias" },
    { key: "impressions", label: "Impressões", tooltip: "Quantas vezes a página apareceu nos resultados de busca" },
    { key: "ctr", label: "CTR", tooltip: "Taxa de cliques: proporção entre cliques e impressões" },
  ];

  const coverageColumns = [
    { key: "page", label: "Página", tooltip: "URL da página analisada", width: "40%" },
    { key: "queryCount", label: "Queries", tooltip: "Quantidade de termos de busca diferentes que levam a esta página" },
    { key: "clicks", label: "Cliques", tooltip: "Total de cliques vindos de todos os termos" },
    { key: "impressions", label: "Impressões", tooltip: "Total de impressões para todos os termos" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LinksInfoCard />
        <Card className="p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Carregando dados de links do Google Search Console...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <LinksInfoCard />
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="text-sm text-destructive font-medium mb-1">Erro ao carregar dados</div>
          <div className="text-xs text-destructive/80">{(error as Error).message}</div>
          <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1.5" /> Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (topPages.length === 0 && internalLinks.length === 0 && !searchTerm) {
    return (
      <div className="space-y-4">
        <LinksInfoCard />
        <EmptyState
          icon={Link2}
          title="Sem dados de links"
          description="Os dados de links serão exibidos quando houver dados disponíveis no Google Search Console."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <AnimatedContainer>
        <LinksInfoCard />
      </AnimatedContainer>

      {/* KPI Cards */}
      <AnimatedContainer delay={0.05}>
        <LinksKpiCards topPages={topPages} internalLinks={internalLinks} />
      </AnimatedContainer>

      {/* Search + Refresh */}
      <AnimatedContainer delay={0.1}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filtrar por URL da página..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </AnimatedContainer>

      {/* Domain Summary */}
      {topPages.length > 0 && (
        <AnimatedContainer delay={0.15}>
          <LinksDomainSummary topPages={topPages} />
        </AnimatedContainer>
      )}

      {/* Tabs */}
      <AnimatedContainer delay={0.2}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-muted/50">
            <TabsTrigger value="top-pages" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Top Páginas
            </TabsTrigger>
            <TabsTrigger value="coverage" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-foreground">
              <Hash className="h-3.5 w-3.5" />
              Cobertura de Queries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="top-pages">
            <LinksTable
              columns={topPagesColumns}
              rows={topPages}
              onExport={() => exportCSV(topPages, "top-pages-performance")}
              linkKey="page"
              showDomainBadge
              showProgressBar="clicks"
              onRowClick={(row) => handlePageClick(row.page)}
              rowClickTooltip="Clique para ver queries desta página"
            />
          </TabsContent>

          <TabsContent value="coverage">
            <LinksTable
              columns={coverageColumns}
              rows={internalLinks}
              onExport={() => exportCSV(internalLinks, "query-coverage")}
              linkKey="page"
              showProgressBar="clicks"
            />
          </TabsContent>
        </Tabs>
      </AnimatedContainer>
    </div>
  );
}
