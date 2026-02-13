import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-semibold text-foreground tracking-tight">
            {prefix}{formatted}{suffix}
          </span>
          <span className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
            isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
          )}>
            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
