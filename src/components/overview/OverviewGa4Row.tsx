import { Card } from "@/components/ui/card";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { ArrowDown, Users, Activity, Target } from "lucide-react";
import { formatCompact } from "./types";

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

export function OverviewGa4Row({ ga4Overview, ga4Users, ga4Sessions, totalConversions }: OverviewGa4RowProps) {
  if (!ga4Overview || (ga4Users <= 0 && ga4Sessions <= 0)) return null;

  return (
    <AnimatedContainer delay={0.1}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ga4Overview.bounceRate != null && (
          <Card className="p-3.5 text-center card-hover">
            <ArrowDown className="h-4 w-4 mx-auto mb-1.5 text-destructive" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Bounce Rate</p>
            <p className="text-lg font-bold font-display text-foreground">{(ga4Overview.bounceRate * 100).toFixed(1)}%</p>
          </Card>
        )}
        {ga4Users > 0 && (
          <Card className="p-3.5 text-center card-hover">
            <Users className="h-4 w-4 mx-auto mb-1.5 text-chart-5" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Usuários</p>
            <p className="text-lg font-bold font-display text-foreground">{formatCompact(ga4Users)}</p>
          </Card>
        )}
        {ga4Sessions > 0 && (
          <Card className="p-3.5 text-center card-hover">
            <Activity className="h-4 w-4 mx-auto mb-1.5 text-primary" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Sessões</p>
            <p className="text-lg font-bold font-display text-foreground">{formatCompact(ga4Sessions)}</p>
          </Card>
        )}
        {ga4Overview.avgSessionDuration != null && (
          <Card className="p-3.5 text-center card-hover">
            <Target className="h-4 w-4 mx-auto mb-1.5 text-success" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Duração Média</p>
            <p className="text-lg font-bold font-display text-foreground">{Math.round(ga4Overview.avgSessionDuration)}s</p>
          </Card>
        )}
        {totalConversions > 0 && (
          <Card className="p-3.5 text-center card-hover">
            <Target className="h-4 w-4 mx-auto mb-1.5 text-chart-6" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Conversões</p>
            <p className="text-lg font-bold font-display text-foreground">{formatCompact(totalConversions)}</p>
          </Card>
        )}
      </div>
    </AnimatedContainer>
  );
}
