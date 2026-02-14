import { ArrowUp, ArrowDown, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KpiCardProps {
  label: string;
  value: number;
  change: number;
  prefix?: string;
  suffix?: string;
  description?: string;
  prevValue?: number;
  showComparison?: boolean;
  sparklineData?: number[];
  sparklinePrevData?: number[];
  sparklineColor?: string;
}

function formatValue(value: number, suffix?: string) {
  if (suffix === "%" || suffix === "x") return value.toFixed(1);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString("pt-BR");
}

export function KpiCard({ label, value, change, prefix, suffix, description, prevValue, showComparison, sparklineData, sparklinePrevData, sparklineColor = "hsl(var(--primary))" }: KpiCardProps) {
  const isPositive = change >= 0;

  const chartData = sparklineData?.map((v, i) => ({
    v,
    prev: sparklinePrevData?.[i] ?? undefined,
  })) || [];

  return (
    <Card className="p-3.5 card-hover group relative overflow-hidden min-h-[120px] flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-center gap-1 mb-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
          {description && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-end justify-between gap-1.5 mt-auto">
          <div className="flex flex-col min-w-0">
            <span className="text-xl font-bold text-foreground font-display tracking-tight truncate">
              {prefix}{formatValue(value, suffix)}{suffix}
            </span>
            {showComparison && prevValue !== undefined && change !== 0 && (
              <span className="text-[9px] text-muted-foreground mt-0.5 truncate">
                ant: {prefix}{formatValue(prevValue, suffix)}{suffix}
              </span>
            )}
          </div>
          {change !== 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
              isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            )}>
              {isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        {chartData.length > 1 && (
          <div className="h-8 mt-1.5 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="v" stroke={sparklineColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                {showComparison && sparklinePrevData && sparklinePrevData.length > 0 && (
                  <Line type="monotone" dataKey="prev" stroke={sparklineColor} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.35} dot={false} isAnimationActive={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
