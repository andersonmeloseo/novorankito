import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { ChartSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";

interface TrendPoint {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
}

interface OverviewTrendChartProps {
  isLoading: boolean;
  trendData: TrendPoint[];
}

export function OverviewTrendChart({ isLoading, trendData }: OverviewTrendChartProps) {
  if (isLoading) return <ChartSkeleton />;
  if (trendData.length === 0) return <EmptyState icon={BarChart3} title="Sem dados de tendência" description="Sincronize o GSC para ver tendências diárias." />;

  return (
    <AnimatedContainer delay={0.12}>
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-2 px-5 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight font-display">Cliques & Impressões</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tendência diária — {trendData.length} dias via GSC</p>
            </div>
            <Badge variant="secondary" className="text-[10px] rounded-full font-normal">GSC</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground) / 0.4)" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground) / 0.4)" tickLine={false} axisLine={false} width={40} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground) / 0.4)" tickLine={false} axisLine={false} width={40} />
                <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card) / 0.95)", backdropFilter: "blur(12px)", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", fontFamily: "Inter", boxShadow: "0 8px 32px -8px rgba(0,0,0,0.15)" }} />
                <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#clicksGrad)" dot={false} name="Cliques" />
                <Area yAxisId="right" type="monotone" dataKey="impressions" stroke="hsl(var(--info))" strokeWidth={1.5} fill="url(#impressionsGrad)" dot={false} name="Impressões" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}
