import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid } from "@/components/ui/animated-container";
import type { Plan, PlanFeature } from "@/hooks/use-plans";

interface PlanStatsCardsProps {
  plans: Plan[];
  allFeatures: PlanFeature[];
  subscriberCounts: Record<string, number>;
}

export function PlanStatsCards({ plans, allFeatures, subscriberCounts }: PlanStatsCardsProps) {
  const activePlans = plans.filter(p => p.is_active).length;
  const totalSubscribers = Object.values(subscriberCounts).reduce((a, b) => a + b, 0);
  const totalFeatures = new Set(allFeatures.map(f => f.feature_key)).size;
  const avgPrice = plans.length > 0
    ? Math.round(plans.reduce((s, p) => s + Number(p.price), 0) / plans.length)
    : 0;

  return (
    <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Planos Ativos" value={activePlans} change={0} sparklineColor="hsl(var(--success))" />
      <KpiCard label="Assinantes Total" value={totalSubscribers} change={0} sparklineColor="hsl(var(--chart-1))" />
      <KpiCard label="Features Únicas" value={totalFeatures} change={0} sparklineColor="hsl(var(--chart-5))" />
      <KpiCard label="Preço Médio" value={avgPrice} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
    </StaggeredGrid>
  );
}
