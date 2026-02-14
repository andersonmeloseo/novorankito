import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

interface RetentionTabProps {
  data: any;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function RetentionTab({ data }: RetentionTabProps) {
  const newVsReturning = data?.newVsReturning || [];
  const cohortTrend = data?.cohortTrend || [];

  const pieData = newVsReturning.map((r: any) => ({
    name: r.newVsReturning === "new" ? "Novos" : "Recorrentes",
    value: r.totalUsers || 0,
  }));

  // Build trend from cohort data
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
      <div className="grid md:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Novos vs Recorrentes</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
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
          <h3 className="text-sm font-medium text-foreground mb-4">Tendência: Novos vs Recorrentes</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="new" name="Novos" stroke="hsl(var(--chart-1))" fill="url(#newGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="returning" name="Recorrentes" stroke="hsl(var(--chart-2))" fill="url(#retGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
