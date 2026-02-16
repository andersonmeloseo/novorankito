import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAdminPlans } from "@/hooks/use-plans";
import { useAdminBilling } from "@/hooks/use-admin";
import { PlanStatsCards } from "@/components/admin/plans/PlanStatsCards";
import { PlanCard } from "@/components/admin/plans/PlanCard";
import { PlanEditor } from "@/components/admin/plans/PlanEditor";
import { CreatePlanDialog } from "@/components/admin/plans/CreatePlanDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { PlanFeature } from "@/hooks/use-plans";

export default function AdminPlansPage() {
  const { data: plans = [], isLoading } = useAdminPlans();
  const { data: billing = [] } = useAdminBilling();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // All features for stats
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

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Gestão de Planos" description="Configure planos, limites rígidos e features disponíveis para cada tier" />
        <Button onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo Plano
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <PlanStatsCards plans={plans} allFeatures={allFeatures} subscriberCounts={subscriberCounts} />

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-3">
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
            </div>

            {selectedPlan && (
              <PlanEditor
                plan={selectedPlan}
                subscriberCount={subscriberCounts[selectedPlan.slug] || 0}
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
