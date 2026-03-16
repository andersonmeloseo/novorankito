import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HeatKpiProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number; // percentage change vs previous period
  trendLabel?: string;
}

export function HeatKpi({ label, value, icon: Icon, trend, trendLabel }: HeatKpiProps) {
  const hasTrend = trend !== undefined && trend !== null;
  const isPositive = (trend ?? 0) > 0;
  const isNeutral = trend === 0;

  return (
    <Card className="p-3 sm:p-4 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex flex-col items-center text-center gap-1">
        <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-xl font-bold text-foreground font-display tracking-tight">{value}</span>
        <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {hasTrend && (
          <div className={`flex items-center gap-0.5 text-[9px] font-semibold mt-0.5 ${
            isNeutral ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"
          }`}>
            {isNeutral ? (
              <Minus className="h-2.5 w-2.5" />
            ) : isPositive ? (
              <TrendingUp className="h-2.5 w-2.5" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5" />
            )}
            <span>{isPositive ? "+" : ""}{trend}%</span>
            {trendLabel && <span className="text-muted-foreground font-normal ml-0.5">{trendLabel}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}
