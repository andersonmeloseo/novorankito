import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface KpiCardProps {
  label: string;
  value: number;
  change: number;
  prefix?: string;
  suffix?: string;
  prevValue?: number;
  showComparison?: boolean;
  sparklineData?: number[];
  sparklinePrevData?: number[];
  sparklineColor?: string;
}

function formatValue(value: number, suffix?: string) {
  if (suffix === "%" || suffix === "x") return value.toFixed(2);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export function KpiCard({ label, value, change, prefix, suffix, prevValue, showComparison, sparklineData, sparklinePrevData, sparklineColor = "hsl(var(--primary))" }: KpiCardProps) {
  const isPositive = change >= 0;

  const chartData = sparklineData?.map((v, i) => ({
    v,
    prev: sparklinePrevData?.[i] ?? undefined,
  })) || [];

  return (
    <Card className="p-4 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground font-display tracking-tight">
              {prefix}{formatValue(value, suffix)}{suffix}
            </span>
            {showComparison && prevValue !== undefined && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                vs {prefix}{formatValue(prevValue, suffix)}{suffix}
              </span>
            )}
          </div>
          {change !== 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
              isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            )}>
              {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        {chartData.length > 1 && (
          <div className="h-10 mt-2 -mx-1">
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
