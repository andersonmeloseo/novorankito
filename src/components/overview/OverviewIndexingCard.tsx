import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { CheckCircle2, FileSearch, AlertTriangle, Clock } from "lucide-react";
import { formatCompact, type IndexingStats } from "./types";
import { cn } from "@/lib/utils";

interface OverviewIndexingCardProps {
  stats: IndexingStats | null;
}

export function OverviewIndexingCard({ stats }: OverviewIndexingCardProps) {
  if (!stats || stats.totalUrls <= 0) return null;

  return (
    <AnimatedContainer delay={0.08}>
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-2 px-5 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <FileSearch className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-sm font-bold tracking-tight font-display">Indexação</CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px] rounded-full font-normal">{formatCompact(stats.totalUrls)} URLs</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <IndexingStat icon={CheckCircle2} iconColor="text-success" label="Enviadas" value={stats.submitted}
              percent={stats.totalUrls > 0 ? (stats.submitted / stats.totalUrls) * 100 : 0} suffix="do total" />
            <IndexingStat icon={FileSearch} iconColor="text-info" label="Inspecionadas" value={stats.inspected}
              percent={stats.totalUrls > 0 ? (stats.inspected / stats.totalUrls) * 100 : 0} suffix="do total" />
            <IndexingStat icon={AlertTriangle} iconColor="text-warning" label="Falhas" value={stats.failed}
              percent={stats.totalRequests > 0 ? (stats.failed / stats.totalRequests) * 100 : 0} suffix="das requisições" />
            <IndexingStat icon={Clock} iconColor="text-muted-foreground" label="Pendentes" value={stats.totalUrls - stats.submitted}
              percent={stats.totalUrls > 0 ? ((stats.totalUrls - stats.submitted) / stats.totalUrls) * 100 : 0} suffix="Aguardando" />
          </div>
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}

function IndexingStat({ icon: Icon, iconColor, label, value, percent, suffix }: {
  icon: React.ElementType; iconColor: string; label: string; value: number; percent: number; suffix: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold font-display text-foreground leading-tight">{formatCompact(value)}</p>
      <Progress value={percent} className="h-1" />
      <p className="text-[10px] text-muted-foreground/60">{suffix === "Aguardando" ? suffix : `${percent.toFixed(0)}% ${suffix}`}</p>
    </div>
  );
}
