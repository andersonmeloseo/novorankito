import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { FolderOpen, Activity, Bot, ChevronRight, Crown, Zap, Infinity, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/hooks/use-plans";

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap, start: Zap, growth: Crown, unlimited: Infinity,
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground border-border",
  start: "bg-muted text-muted-foreground border-border",
  growth: "bg-primary/10 text-primary border-primary/20",
  unlimited: "bg-chart-4/10 text-chart-4 border-chart-4/20",
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

  return (
    <AnimatedContainer delay={index * 0.05}>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-xl border p-4 transition-all duration-200",
          isSelected
            ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
            : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn("p-2 rounded-lg border", PLAN_COLORS[plan.slug] || PLAN_COLORS.free)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground block">{plan.name}</span>
              <span className="text-[10px] text-muted-foreground">{plan.slug}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {plan.is_default && <Badge variant="secondary" className="text-[9px]">Padrão</Badge>}
            <Badge variant={plan.is_active ? "default" : "destructive"} className="text-[9px]">
              {plan.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">
            R$ {Number(plan.price).toLocaleString("pt-BR")}
          </span>
          <span className="text-xs text-muted-foreground">/mês</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {plan.projects_limit === -1 ? "∞" : plan.projects_limit}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {plan.events_limit === -1 ? "∞" : (plan.events_limit / 1000).toFixed(0) + "k"}
            </span>
            <span className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {plan.ai_requests_limit === -1 ? "∞" : plan.ai_requests_limit}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {subscriberCount}
            </span>
          </div>
          <ChevronRight className={cn("h-3.5 w-3.5 transition-colors", isSelected ? "text-primary" : "text-muted-foreground/40")} />
        </div>
      </button>
    </AnimatedContainer>
  );
}
