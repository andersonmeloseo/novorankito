import { AlertTriangle, TrendingUp, Info, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20", label: "Crítico" },
  high: { icon: TrendingUp, color: "bg-warning/10 text-warning border-warning/20", label: "Alto" },
  medium: { icon: Info, color: "bg-info/10 text-info border-info/20", label: "Médio" },
  low: { icon: Zap, color: "bg-muted text-muted-foreground border-border", label: "Baixo" },
};

interface InsightCardProps {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  action: string;
}

export function InsightCard({ severity, title, description, impact, action }: InsightCardProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={cn("p-4 border hover:shadow-md transition-shadow", config.color.split(" ").pop())}>
      <div className="flex items-start gap-3">
        <div className={cn("p-1.5 rounded-md shrink-0", config.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground leading-snug">{title}</h4>
            <Badge variant="outline" className="text-[10px] shrink-0">{config.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs font-medium text-foreground">Impacto: {impact}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Criar Tarefa
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
