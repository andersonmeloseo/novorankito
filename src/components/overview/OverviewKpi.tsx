import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { HelpCircle, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OverviewKpiProps } from "./types";

export function OverviewKpi({ label, value, change, previousValue, explanation, icon: Icon, color, bgColor, sparkData, sparkColor }: OverviewKpiProps) {
  const isPositive = (change ?? 0) >= 0;
  const chartData = sparkData?.map((v) => ({ v })) || [];

  return (
    <Card className="p-4 card-hover group relative overflow-visible">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {explanation && (
        <div className="absolute top-3 right-3 z-20">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs bg-card border-border shadow-xl">
                {explanation}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2 rounded-xl", bgColor)}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          {change !== undefined && change !== 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full",
              isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            )}>
              {isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
        
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground font-display tracking-tight">{value}</p>
        
        {previousValue && (
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="opacity-70">vs anterior:</span>
            <span className="font-medium opacity-90">{previousValue}</span>
          </p>
        )}

        {chartData.length > 2 ? (
          <div className="h-10 mt-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`kpi-grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparkColor || "hsl(var(--primary))"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={sparkColor || "hsl(var(--primary))"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={sparkColor || "hsl(var(--primary))"} strokeWidth={1.5} fill={`url(#kpi-grad-${label.replace(/\s/g, '')})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-10 mt-3" />
        )}
      </div>
    </Card>
  );
}
