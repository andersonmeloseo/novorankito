import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const COLORS = ["hsl(var(--chart-9))", "hsl(var(--chart-7))", "hsl(var(--chart-6))", "hsl(var(--chart-12))"];
const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px -4px rgba(0,0,0,0.12)" };

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
            <h3 className="text-sm font-medium text-foreground mb-1">Novos vs Recorrentes</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Proporção de novos visitantes vs retornos</p>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={35} outerRadius={60} paddingAngle={3} label={false}>
                    {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
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
          <h3 className="text-sm font-medium text-foreground mb-1">Tendência: Novos vs Recorrentes</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Evolução diária de novos e recorrentes</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-9))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--chart-9))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-7))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--chart-7))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="new" name="Novos" stroke="hsl(var(--chart-9))" fill="url(#newGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="returning" name="Recorrentes" stroke="hsl(var(--chart-7))" fill="url(#retGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
