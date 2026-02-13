import { AlertTriangle, TrendingUp, Info, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { icon: AlertTriangle, bg: "bg-destructive/8", border: "border-destructive/15", iconBg: "bg-destructive/10 text-destructive", label: "Crítico", labelBg: "bg-destructive/10 text-destructive border-destructive/20" },
  high: { icon: TrendingUp, bg: "bg-warning/8", border: "border-warning/15", iconBg: "bg-warning/10 text-warning", label: "Alto", labelBg: "bg-warning/10 text-warning border-warning/20" },
  medium: { icon: Info, bg: "bg-info/8", border: "border-info/15", iconBg: "bg-info/10 text-info", label: "Médio", labelBg: "bg-info/10 text-info border-info/20" },
  low: { icon: Zap, bg: "bg-muted", border: "border-border", iconBg: "bg-muted text-muted-foreground", label: "Baixo", labelBg: "bg-muted text-muted-foreground border-border" },
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
    <Card className={cn("p-4 border hover:shadow-md transition-all duration-200", config.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", config.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground leading-snug font-display">{title}</h4>
            <Badge variant="outline" className={cn("text-[10px] shrink-0 font-medium", config.labelBg)}>{config.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs font-semibold text-foreground">Impacto: {impact}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
              Criar Tarefa
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
