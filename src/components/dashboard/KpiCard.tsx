import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  change: number;
  prefix?: string;
  suffix?: string;
}

export function KpiCard({ label, value, change, prefix, suffix }: KpiCardProps) {
  const isPositive = change >= 0;
  const formatted = suffix === "%" || suffix === "x"
    ? value.toFixed(2)
    : value >= 1000
      ? (value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : `${(value / 1_000).toFixed(1)}K`)
      : value.toString();

  return (
    <Card className="p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-bold text-foreground font-display tracking-tight">
            {prefix}{formatted}{suffix}
          </span>
          <span className={cn(
            "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
            isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
          )}>
            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
