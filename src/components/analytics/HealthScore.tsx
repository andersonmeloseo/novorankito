import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HealthScoreProps {
  engagementRate: number;
  bounceRate: number;
  conversions: number;
  totalUsers: number;
  newUsers: number;
  sessions: number;
  prevEngagementRate?: number;
  prevConversions?: number;
  prevTotalUsers?: number;
  showComparison?: boolean;
}

function calculateScore(
  engagementRate: number,
  bounceRate: number,
  conversions: number,
  totalUsers: number,
  newUsers: number,
  sessions: number
): number {
  // Engagement (0-30 pts): engagement rate × 30
  const engScore = Math.min(engagementRate * 30, 30);
  // Growth (0-25 pts): new users ratio
  const growthRatio = totalUsers > 0 ? newUsers / totalUsers : 0;
  const growthScore = Math.min(growthRatio * 50, 25);
  // Conversions (0-25 pts): conversion rate
  const convRate = sessions > 0 ? conversions / sessions : 0;
  const convScore = Math.min(convRate * 500, 25);
  // Retention (0-20 pts): inverse bounce
  const retScore = Math.min((1 - bounceRate) * 25, 20);

  return Math.round(engScore + growthScore + convScore + retScore);
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-chart-2";
  if (score >= 40) return "text-amber-400";
  return "text-destructive";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Regular";
  return "Precisa melhorar";
}

function getScoreBg(score: number) {
  if (score >= 80) return "from-emerald-500/20 to-emerald-500/5";
  if (score >= 60) return "from-blue-500/20 to-blue-500/5";
  if (score >= 40) return "from-amber-500/20 to-amber-500/5";
  return "from-red-500/20 to-red-500/5";
}

export function HealthScore({
  engagementRate, bounceRate, conversions, totalUsers, newUsers, sessions,
  prevEngagementRate, prevConversions, prevTotalUsers, showComparison,
}: HealthScoreProps) {
  const score = calculateScore(engagementRate, bounceRate, conversions, totalUsers, newUsers, sessions);

  const metrics = [
    { label: "Engajamento", value: Math.min(Math.round(engagementRate * 30), 30), max: 30 },
    { label: "Crescimento", value: Math.min(Math.round((totalUsers > 0 ? newUsers / totalUsers : 0) * 50), 25), max: 25 },
    { label: "Conversões", value: Math.min(Math.round((sessions > 0 ? conversions / sessions : 0) * 500), 25), max: 25 },
    { label: "Retenção", value: Math.min(Math.round((1 - bounceRate) * 25), 20), max: 20 },
  ];

  return (
    <Card className={cn("p-5 bg-gradient-to-br border-0", getScoreBg(score))}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Score de Saúde</h3>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full bg-background/50", getScoreColor(score))}>
          {getScoreLabel(score)}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className={cn("text-5xl font-bold font-display tracking-tight", getScoreColor(score))}>
          {score}
        </div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
      <div className="mt-4 space-y-2">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-20">{m.label}</span>
            <div className="flex-1 h-1.5 bg-background/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/60 transition-all duration-700"
                style={{ width: `${(m.value / m.max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-8 text-right">{m.value}/{m.max}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
