import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, Label } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader, ChartGradient, DonutCenterLabel, formatDuration } from "./ChartPrimitives";

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Novos vs Recorrentes" subtitle="Proporção de novos visitantes vs retornos" />
            <div className="h-[200px]">
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
            (r.totalUsers || 0).toLocaleString(),
            (r.sessions || 0).toLocaleString(),
            ((r.engagementRate || 0) * 100).toFixed(1) + "%",
            formatDuration(r.averageSessionDuration || 0),
            (r.screenPageViewsPerSession || 0).toFixed(1),
            (r.conversions || 0).toLocaleString(),
          ])}
        />
      </div>

      {trendData.length > 1 && (
        <Card className="p-5">
          <ChartHeader title="Tendência: Novos vs Recorrentes" subtitle="Evolução diária de novos e recorrentes" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <defs>
                  <ChartGradient id="retNewGrad" color="hsl(var(--chart-9))" opacity={0.2} />
                  <ChartGradient id="retRetGrad" color="hsl(var(--chart-7))" opacity={0.15} />
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} width={40} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Area type="monotone" dataKey="new" name="Novos" stroke="hsl(var(--chart-9))" fill="url(#retNewGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="returning" name="Recorrentes" stroke="hsl(var(--chart-7))" fill="url(#retRetGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
