import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { CheckCircle2, FileSearch, AlertTriangle, Clock } from "lucide-react";
import { formatCompact, type IndexingStats } from "./types";

interface OverviewIndexingCardProps {
  stats: IndexingStats | null;
}

export function OverviewIndexingCard({ stats }: OverviewIndexingCardProps) {
  if (!stats || stats.totalUrls <= 0) return null;

  return (
    <AnimatedContainer delay={0.08}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold tracking-tight font-display">Indexação</CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px]">{formatCompact(stats.totalUrls)} URLs</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <IndexingStat icon={CheckCircle2} iconColor="text-success" label="Enviadas" value={stats.submitted}
              percent={stats.totalUrls > 0 ? (stats.submitted / stats.totalUrls) * 100 : 0} suffix="do total" />
            <IndexingStat icon={FileSearch} iconColor="text-info" label="Inspecionadas" value={stats.inspected}
              percent={stats.totalUrls > 0 ? (stats.inspected / stats.totalUrls) * 100 : 0} suffix="do total" />
            <IndexingStat icon={AlertTriangle} iconColor="text-warning" label="Falhas / Quota" value={stats.failed}
              percent={stats.totalRequests > 0 ? (stats.failed / stats.totalRequests) * 100 : 0} suffix="das requisições" />
            <IndexingStat icon={Clock} iconColor="text-muted-foreground" label="Pendentes" value={stats.totalUrls - stats.submitted}
              percent={stats.totalUrls > 0 ? ((stats.totalUrls - stats.submitted) / stats.totalUrls) * 100 : 0} suffix="Aguardando envio" />
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
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold font-display text-foreground">{formatCompact(value)}</p>
      <Progress value={percent} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">{suffix === "Aguardando envio" ? suffix : `${percent.toFixed(1)}% ${suffix}`}</p>
    </div>
  );
}
