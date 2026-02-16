import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { FolderOpen, Activity, Bot, Crown, Zap, Infinity, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/hooks/use-plans";

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap, start: Zap, growth: Crown, unlimited: Infinity,
};

interface PlanCardProps {
  plan: Plan;
  isSelected: boolean;
  index: number;
  subscriberCount: number;
  onClick: () => void;
}

export function PlanCard({ plan, isSelected, index, subscriberCount, onClick }: PlanCardProps) {
  const Icon = PLAN_ICONS[plan.slug] || Zap;
  const isHighTier = plan.slug === "growth" || plan.slug === "unlimited";

  return (
    <AnimatedContainer delay={index * 0.04}>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-xl border p-3.5 transition-all duration-300 group relative overflow-hidden",
          isSelected
            ? "border-primary shadow-lg ring-2 ring-primary/20"
            : "border-border bg-card hover:border-primary/40 hover:shadow-md",
          isHighTier && isSelected && "bg-gradient-to-br from-primary/8 via-transparent to-chart-4/5",
          !isHighTier && isSelected && "bg-primary/5",
        )}
      >
        {/* Glow effect on selected */}
        {isSelected && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        )}

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isSelected
                  ? isHighTier ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground block leading-tight">{plan.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {plan.is_default && (
                <Star className="h-3 w-3 text-warning fill-warning" />
              )}
              <div className={cn(
                "h-2 w-2 rounded-full",
                plan.is_active ? "bg-success" : "bg-destructive"
              )} />
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-lg font-bold text-foreground">
              R${Number(plan.price).toLocaleString("pt-BR")}
            </span>
            <span className="text-[10px] text-muted-foreground">/mês</span>
          </div>

          <div className="flex gap-2.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5" title="Projetos">
              <FolderOpen className="h-2.5 w-2.5" />
              {plan.projects_limit === -1 ? "∞" : plan.projects_limit}
            </span>
            <span className="flex items-center gap-0.5" title="Eventos">
              <Activity className="h-2.5 w-2.5" />
              {plan.events_limit === -1 ? "∞" : (plan.events_limit / 1000).toFixed(0) + "k"}
            </span>
            <span className="flex items-center gap-0.5" title="IA">
              <Bot className="h-2.5 w-2.5" />
              {plan.ai_requests_limit === -1 ? "∞" : plan.ai_requests_limit}
            </span>
            <span className="flex items-center gap-0.5 ml-auto font-medium" title="Assinantes">
              <Users className="h-2.5 w-2.5" />
              {subscriberCount}
            </span>
          </div>
        </div>
      </button>
    </AnimatedContainer>
  );
}
