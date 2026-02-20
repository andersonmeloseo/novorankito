import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Legend, Label,
  BarChart, Bar,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, ChartGradient, LineGlowGradient, DonutCenterLabel, formatDuration,
  FunnelStep, CohortHeatmap,
} from "./ChartPrimitives";

interface RetentionTabProps {
  data: any;
}

const RET_COLORS = ["hsl(var(--chart-9))", "hsl(var(--chart-7))"];

export function RetentionTab({ data }: RetentionTabProps) {
  const newVsReturning = data?.newVsReturning || [];
  const cohortTrend = data?.cohortTrend || [];

  const pieData = newVsReturning.map((r: any) => ({
    name: r.newVsReturning === "new" ? "Novos" : "Recorrentes",
    value: r.totalUsers || 0,
  }));
  const totalRetUsers = pieData.reduce((s: number, p: any) => s + p.value, 0);

  const trendMap = new Map<string, { date: string; new: number; returning: number }>();
  cohortTrend.forEach((r: any) => {
    const d = r.date;
    const existing = trendMap.get(d) || { date: d, new: 0, returning: 0 };
    if (r.newVsReturning === "new") existing.new += r.totalUsers || 0;
    else existing.returning += r.totalUsers || 0;
    trendMap.set(d, existing);
  });
  const trendData = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
    ...d,
    date: d.date.substring(4, 6) + "/" + d.date.substring(6, 8),
  }));

  // ─── Step Funnel: new vs returning breakdown ───
  const funnelSteps = useMemo(() => {
    if (!newVsReturning.length) return [];
    const totalUsers = newVsReturning.reduce((s: number, r: any) => s + (r.totalUsers || 0), 0);
    const totalSessions = newVsReturning.reduce((s: number, r: any) => s + (r.sessions || 0), 0);
    const totalConversions = newVsReturning.reduce((s: number, r: any) => s + (r.conversions || 0), 0);
    return [
      { name: "Total Usuários", value: totalUsers },
      { name: "Total Sessões", value: totalSessions },
      { name: "Conversões", value: totalConversions },
    ];
  }, [newVsReturning]);
  const maxFunnel = Math.max(...funnelSteps.map(f => f.value), 1);

  // ─── Cohort Heatmap: retention by day ───
  const cohortHeatData = useMemo(() => {
    if (trendData.length < 3) return null;
    const rows = trendData.slice(0, 5);
    const data = rows.map(r => [r.new, r.returning, r.new + r.returning]);
    const maxVal = Math.max(...data.flat(), 1);
    return {
      data,
      xLabels: ["Novos", "Recorrentes", "Total"],
      yLabels: rows.map(r => r.date),
      maxValue: maxVal,
    };
  }, [trendData]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Novos vs Recorrentes" subtitle="Proporção de novos visitantes vs retornos" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4} strokeWidth={0} animationDuration={900}>
                    {pieData.map((_: any, i: number) => <Cell key={i} fill={RET_COLORS[i % RET_COLORS.length]} />)}
                    <Label content={<DonutCenterLabel value={totalRetUsers.toLocaleString("pt-BR")} label="total" />} />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <AnalyticsDataTable
          columns={["Tipo", "Usuários", "Sessões", "Tx. Engajamento", "Duração Média", "Pags/Sessão", "Conversões"]}
          rows={newVsReturning.map((r: any) => [
            r.newVsReturning === "new" ? "Novos" : "Recorrentes",
            (r.totalUsers || 0).toLocaleString(), (r.sessions || 0).toLocaleString(),
            ((r.engagementRate || 0) * 100).toFixed(1) + "%",
            formatDuration(r.averageSessionDuration || 0),
            (r.screenPageViewsPerSession || 0).toFixed(1),
            (r.conversions || 0).toLocaleString(),
          ])}
        />
      </div>

      {/* ─── Stacked Area com Transparência ─── */}
      {trendData.length > 1 && (
        <Card className="p-5">
          <ChartHeader title="Tendência: Novos vs Recorrentes" subtitle="Area chart com transparência e glow" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <defs>
                  <LineGlowGradient id="retNewGlow" color="hsl(var(--chart-9))" />
                  <LineGlowGradient id="retRetGlow" color="hsl(var(--chart-7))" />
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} width={40} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Area type="monotone" dataKey="new" name="Novos" stroke="hsl(var(--chart-9))" fill="url(#retNewGlow)" strokeWidth={2.5} dot={{ r: 2.5, fill: "hsl(var(--chart-9))" }} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
                <Area type="monotone" dataKey="returning" name="Recorrentes" stroke="hsl(var(--chart-7))" fill="url(#retRetGlow)" strokeWidth={2.5} dot={{ r: 2.5, fill: "hsl(var(--chart-7))" }} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ─── Row 3: Step Funnel + Cohort Heatmap ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {funnelSteps.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Step Funnel" subtitle="Queda entre etapas: usuários → sessões → conversões" />
            <div className="space-y-2">
              {funnelSteps.map((f, i) => (
                <FunnelStep key={f.name} label={f.name} value={f.value} maxValue={maxFunnel} color={CHART_COLORS[i % CHART_COLORS.length]} index={i} />
              ))}
            </div>
          </Card>
        )}

        {cohortHeatData && (
          <Card className="p-5">
            <ChartHeader title="Cohort Heatmap" subtitle="Retenção diária: novos vs recorrentes" />
            <CohortHeatmap {...cohortHeatData} hue={155} />
          </Card>
        )}
      </div>
    </div>
  );
}
