import { useCheckPlanLimit, usePlanHasFeature } from "@/hooks/use-plans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlanGateProps {
  /** Feature key to check (e.g. 'heatmaps', 'rankito_ai') */
  feature?: string;
  /** Limit type to check (e.g. 'projects', 'ai_requests') */
  limitType?: string;
  /** Content shown when access is granted */
  children: React.ReactNode;
  /** Custom message when blocked */
  blockedMessage?: string;
}

/**
 * Wraps content that requires a specific plan feature or limit.
 * Shows an upgrade prompt if the user's plan doesn't include the feature
 * or if they've exceeded their limit.
 */
export function PlanGate({ feature, limitType, children, blockedMessage }: PlanGateProps) {
  const navigate = useNavigate();
  const { data: hasFeature, isLoading: featureLoading } = usePlanHasFeature(feature || "");
  const { data: limitCheck, isLoading: limitLoading } = useCheckPlanLimit(limitType || "");

  const isLoading = (feature && featureLoading) || (limitType && limitLoading);

  if (isLoading) return <>{children}</>;

  // Check feature access
  if (feature && hasFeature === false) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
        <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-warning" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">Recurso não disponível no seu plano</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {blockedMessage || "Faça upgrade do seu plano para ter acesso a esta funcionalidade."}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/account/billing")} className="gap-1.5 text-xs">
          <Crown className="h-3.5 w-3.5" /> Ver planos <ArrowRight className="h-3 w-3" />
        </Button>
      </Card>
    );
  }

  // Check limit
  if (limitType && limitCheck && !limitCheck.allowed) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">Limite do plano atingido</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {blockedMessage || `Você atingiu o limite de ${limitCheck.limit} (${limitCheck.used}/${limitCheck.limit} usado). Faça upgrade para continuar.`}
          </p>
          <Badge variant="destructive" className="text-[10px]">
            Plano {limitCheck.plan} — {limitCheck.used}/{limitCheck.limit}
          </Badge>
        </div>
        <Button size="sm" onClick={() => navigate("/account/billing")} className="gap-1.5 text-xs">
          <Crown className="h-3.5 w-3.5" /> Fazer upgrade <ArrowRight className="h-3 w-3" />
        </Button>
      </Card>
    );
  }

  return <>{children}</>;
}
