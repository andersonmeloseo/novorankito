import { Card } from "@/components/ui/card";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { ArrowDown, Users, Activity, Target, Timer } from "lucide-react";
import { formatCompact } from "./types";
import { cn } from "@/lib/utils";

interface Ga4Data {
  totalUsers?: number;
  sessions?: number;
  bounceRate?: number;
  avgSessionDuration?: number;
}

interface OverviewGa4RowProps {
  ga4Overview: Ga4Data | null;
  ga4Users: number;
  ga4Sessions: number;
  totalConversions: number;
}

function Ga4Stat({ icon: Icon, iconColor, bgColor, label, value }: {
  icon: React.ElementType; iconColor: string; bgColor: string; label: string; value: string;
}) {
  return (
    <Card className="p-3.5 card-hover border-border/60 group">
      <div className="flex items-center gap-3">
        <div className={cn("p-1.5 rounded-lg shrink-0", bgColor)}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-base font-bold font-display text-foreground leading-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export function OverviewGa4Row({ ga4Overview, ga4Users, ga4Sessions, totalConversions }: OverviewGa4RowProps) {
  if (!ga4Overview || (ga4Users <= 0 && ga4Sessions <= 0)) return null;

  return (
    <AnimatedContainer delay={0.1}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ga4Overview.bounceRate != null && (
          <Ga4Stat icon={ArrowDown} iconColor="text-destructive" bgColor="bg-destructive/8" label="Bounce Rate" value={`${(ga4Overview.bounceRate * 100).toFixed(1)}%`} />
        )}
        {ga4Users > 0 && (
          <Ga4Stat icon={Users} iconColor="text-chart-5" bgColor="bg-chart-5/10" label="Usuários" value={formatCompact(ga4Users)} />
        )}
        {ga4Sessions > 0 && (
          <Ga4Stat icon={Activity} iconColor="text-primary" bgColor="bg-primary/10" label="Sessões" value={formatCompact(ga4Sessions)} />
        )}
        {ga4Overview.avgSessionDuration != null && (
          <Ga4Stat icon={Timer} iconColor="text-success" bgColor="bg-success/10" label="Duração Média" value={`${Math.round(ga4Overview.avgSessionDuration)}s`} />
        )}
        {totalConversions > 0 && (
          <Ga4Stat icon={Target} iconColor="text-chart-6" bgColor="bg-chart-6/10" label="Conversões" value={formatCompact(totalConversions)} />
        )}
      </div>
    </AnimatedContainer>
  );
}
