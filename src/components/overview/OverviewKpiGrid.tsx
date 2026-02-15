import { StaggeredGrid } from "@/components/ui/animated-container";
import { KpiSkeleton } from "@/components/ui/page-skeleton";
import { MousePointerClick, Eye, Target, TrendingUp, Globe, Search } from "lucide-react";
import { OverviewKpi } from "./OverviewKpi";
import { formatCompact, type OverviewRpcData } from "./types";

interface OverviewKpiGridProps {
  isLoading: boolean;
  overview: OverviewRpcData | null;
  trendData: Array<{ clicks: number; impressions: number; position: number; ctr: number }>;
  clicksChange?: number;
  impressionsChange?: number;
  prevClicks: number;
  prevImpressions: number;
  prevAvgCtr: number;
  prevAvgPosition: number;
  prevTotalPages: number;
  prevTotalQueries: number;
}

export function OverviewKpiGrid({
  isLoading, overview, trendData, clicksChange, impressionsChange,
  prevClicks, prevImpressions, prevAvgCtr, prevAvgPosition, prevTotalPages, prevTotalQueries,
}: OverviewKpiGridProps) {
  if (isLoading) return <KpiSkeleton />;

  const totalClicks = overview?.total_clicks ?? 0;
  const totalImpressions = overview?.total_impressions ?? 0;
  const avgCtr = overview?.avg_ctr ?? 0;
  const avgPosition = overview?.avg_position ?? 0;
  const totalPages = overview?.total_urls ?? 0;
  const totalQueries = overview?.total_queries ?? 0;
  const clicksSpark = trendData.map(d => d.clicks);

  return (
    <StaggeredGrid className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <OverviewKpi
        label="Cliques" value={formatCompact(totalClicks)} previousValue={formatCompact(prevClicks)}
        change={clicksChange} explanation="Total de vezes que usuários clicaram no seu site nos resultados de pesquisa do Google."
        icon={MousePointerClick} color="text-primary" bgColor="bg-primary/10"
        sparkData={clicksSpark} sparkColor="hsl(var(--primary))"
      />
      <OverviewKpi
        label="Impressões" value={formatCompact(totalImpressions)} previousValue={formatCompact(prevImpressions)}
        change={impressionsChange} explanation="Quantas vezes seu site apareceu nos resultados de pesquisa, mesmo sem cliques."
        icon={Eye} color="text-info" bgColor="bg-info/10"
        sparkData={trendData.map(d => d.impressions)} sparkColor="hsl(var(--info))"
      />
      <OverviewKpi
        label="CTR Médio" value={`${avgCtr.toFixed(2)}%`} previousValue={`${prevAvgCtr.toFixed(2)}%`}
        change={prevAvgCtr > 0 ? ((avgCtr - prevAvgCtr) / prevAvgCtr) * 100 : 0}
        explanation="Taxa de cliques: porcentagem de impressões que resultaram em um clique."
        icon={Target} color="text-success" bgColor="bg-success/10"
        sparkData={trendData.map(d => (d.clicks / (d.impressions || 1)) * 100)} sparkColor="hsl(var(--success))"
      />
      <OverviewKpi
        label="Posição Média" value={avgPosition > 0 ? avgPosition.toFixed(1) : "—"}
        previousValue={prevAvgPosition > 0 ? prevAvgPosition.toFixed(1) : "—"}
        change={prevAvgPosition > 0 ? ((prevAvgPosition - avgPosition) / prevAvgPosition) * 100 : 0}
        explanation="Posição média do seu site nos resultados de busca. Quanto menor, melhor."
        icon={TrendingUp} color="text-warning" bgColor="bg-warning/10"
        sparkData={trendData.map(d => d.position > 0 ? d.position : 0).filter(Boolean)} sparkColor="hsl(var(--warning))"
      />
      <OverviewKpi
        label="Páginas" value={formatCompact(totalPages)} previousValue={formatCompact(prevTotalPages)}
        change={prevTotalPages > 0 ? ((totalPages - prevTotalPages) / prevTotalPages) * 100 : 0}
        explanation="Total de URLs inventariadas do seu site (sitemap + descobertas)."
        icon={Globe} color="text-chart-5" bgColor="bg-chart-5/10" sparkColor="hsl(var(--chart-5))"
      />
      <OverviewKpi
        label="Consultas" value={formatCompact(totalQueries)} previousValue={formatCompact(prevTotalQueries)}
        change={prevTotalQueries > 0 ? ((totalQueries - prevTotalQueries) / prevTotalQueries) * 100 : 0}
        explanation="Número de termos de pesquisa únicos (keywords) que exibiram seu site."
        icon={Search} color="text-chart-6" bgColor="bg-chart-6/10" sparkColor="hsl(var(--chart-6))"
      />
    </StaggeredGrid>
  );
}
