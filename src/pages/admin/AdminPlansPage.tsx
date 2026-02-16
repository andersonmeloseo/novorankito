import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Plus, Crown, Zap, Infinity, Package } from "lucide-react";
import { useAdminPlans } from "@/hooks/use-plans";
import { useAdminBilling, useAdminProfiles } from "@/hooks/use-admin";
import { PlanCard } from "@/components/admin/plans/PlanCard";
import { PlanEditor } from "@/components/admin/plans/PlanEditor";
import { CreatePlanDialog } from "@/components/admin/plans/CreatePlanDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { PlanFeature } from "@/hooks/use-plans";

export default function AdminPlansPage() {
  const { data: plans = [], isLoading } = useAdminPlans();
  const { data: billing = [] } = useAdminBilling();
  const { data: profiles = [] } = useAdminProfiles();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: allFeatures = [] } = useQuery({
    queryKey: ["admin-all-plan-features"],
    queryFn: async () => {
      const { data } = await supabase.from("plan_features").select("*");
      return (data || []) as PlanFeature[];
    },
  });

  const subscriberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    plans.forEach(p => { counts[p.slug] = 0; });
    billing.forEach(b => {
      if (counts[b.plan] !== undefined) counts[b.plan]++;
      else counts[b.plan] = 1;
    });
    return counts;
  }, [plans, billing]);

  const getSubscribers = (planSlug: string) => {
    return billing
      .filter((b: any) => b.plan === planSlug)
      .map((b: any) => {
        const profile = profiles.find((p: any) => p.user_id === b.user_id);
        return {
          user_id: b.user_id,
          display_name: profile?.display_name || null,
          status: b.status,
          mrr: Number(b.mrr || 0),
        };
      });
  };

  const totalSubscribers = Object.values(subscriberCounts).reduce((a, b) => a + b, 0);
  const activePlans = plans.filter(p => p.is_active).length;
  const totalFeatures = new Set(allFeatures.map(f => f.feature_key)).size;
  const totalMRR = billing.reduce((s, b) => s + Number(b.mrr || 0), 0);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Gestão de Planos"
          description="Gerencie planos, limites, features e preços da plataforma"
        />
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0 shadow-md">
          <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-60">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <StaggeredGrid className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Planos Ativos" value={activePlans} change={0} sparklineColor="hsl(var(--success))" />
            <KpiCard label="Assinantes" value={totalSubscribers} change={0} sparklineColor="hsl(var(--chart-1))" />
            <KpiCard label="Features" value={totalFeatures} change={0} sparklineColor="hsl(var(--chart-5))" />
            <KpiCard label="MRR Estimado" value={totalMRR} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
          </StaggeredGrid>

          {/* Plans comparison strip */}
          <AnimatedContainer delay={0.1}>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Comparativo de Planos</h3>
                <Badge variant="secondary" className="text-[9px] ml-auto">{plans.length} planos</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Plano", "Preço", "Projetos", "Eventos/mês", "IA/mês", "Membros", "Indexação/dia", "Status", "Assinantes"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map(plan => (
                      <tr
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                          selectedPlan?.id === plan.id
                            ? "bg-primary/5"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="px-3 py-2.5 font-semibold text-foreground flex items-center gap-2">
                          {plan.slug === "unlimited" ? <Infinity className="h-3.5 w-3.5 text-chart-4" /> :
                           plan.slug === "growth" ? <Crown className="h-3.5 w-3.5 text-primary" /> :
                           <Zap className="h-3.5 w-3.5 text-muted-foreground" />}
                          {plan.name}
                          {plan.is_default && <Badge variant="outline" className="text-[8px] ml-1">Padrão</Badge>}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-foreground">R$ {Number(plan.price).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{plan.projects_limit === -1 ? "∞" : plan.projects_limit}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{plan.events_limit === -1 ? "∞" : (plan.events_limit / 1000).toFixed(0) + "k"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{plan.ai_requests_limit === -1 ? "∞" : plan.ai_requests_limit}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{plan.members_limit === -1 ? "∞" : plan.members_limit}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{plan.indexing_daily_limit}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={plan.is_active ? "default" : "destructive"} className="text-[9px]">
                            {plan.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-foreground">{subscriberCounts[plan.slug] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </AnimatedContainer>

          {/* Plan selector + Editor */}
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
            {/* Sidebar cards */}
            <div className="space-y-2.5">
              {plans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={selectedPlan?.id === plan.id}
                  index={i}
                  subscriberCount={subscriberCounts[plan.slug] || 0}
                  onClick={() => setSelectedPlanId(plan.id)}
                />
              ))}
              <button
                onClick={() => setShowCreate(true)}
                className="w-full rounded-xl border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Adicionar Plano
              </button>
            </div>

            {/* Editor */}
            {selectedPlan && (
              <PlanEditor
                key={selectedPlan.id}
                plan={selectedPlan}
                subscriberCount={subscriberCounts[selectedPlan.slug] || 0}
                subscribers={getSubscribers(selectedPlan.slug)}
                onDeleted={() => setSelectedPlanId(null)}
              />
            )}
          </div>
        </>
      )}

      <CreatePlanDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        nextSortOrder={plans.length}
      />
    </div>
  );
}
