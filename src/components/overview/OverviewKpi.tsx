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
    <Card className="p-4 card-hover group relative overflow-hidden border-border/60">
      {/* Subtle gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {explanation && (
        <div className="absolute top-2.5 right-2.5 z-20">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help opacity-0 group-hover:opacity-60 transition-opacity p-1 hover:opacity-100">
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
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
        <div className="flex items-center justify-between mb-2.5">
          <div className={cn("p-1.5 rounded-lg", bgColor)}>
            <Icon className={cn("h-3.5 w-3.5", color)} />
          </div>
          {change !== undefined && change !== 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              isPositive ? "text-success bg-success/8" : "text-destructive bg-destructive/8"
            )}>
              {isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
        
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-bold text-foreground font-display tracking-tight leading-tight">{value}</p>
        
        {previousValue && (
          <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
            <span>ant:</span>
            <span className="font-medium">{previousValue}</span>
          </p>
        )}

        {chartData.length > 2 ? (
          <div className="h-8 mt-2.5 -mx-1">
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
          <div className="h-8 mt-2.5" />
        )}
      </div>
    </Card>
  );
}
