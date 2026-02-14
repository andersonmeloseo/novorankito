import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface RealtimeTabProps {
  data: any;
  isLoading: boolean;
}

export function RealtimeTab({ data, isLoading }: RealtimeTabProps) {
  const activeUsers = data?.activeUsers || 0;
  const byPage = data?.byPage || [];
  const bySource = data?.bySource || [];
  const byCountry = data?.byCountry || [];
  const byDevice = data?.byDevice || [];

  if (isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground">Carregando dados em tempo real...</Card>;

  const deviceChart = byDevice.map((d: any) => ({
    name: d.deviceCategory || "—",
    value: d.activeUsers || 0,
  }));

  const sourceChart = bySource.slice(0, 8).map((s: any) => ({
    name: (s.source || "—").substring(0, 20),
    users: s.activeUsers || 0,
  }));

  const countryChart = byCountry.slice(0, 6).map((c: any) => ({
    name: c.country || "—",
    value: c.activeUsers || 0,
  }));

  return (
    <div className="space-y-4">
      <Card className="p-6 text-center">
        <div className="text-5xl font-bold text-foreground">{activeUsers}</div>
        <div className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
          </span>
          Usuários ativos agora
        </div>
        {byDevice.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {byDevice.map((d: any) => (
              <Badge key={d.deviceCategory} variant="secondary" className="text-[10px]">
                {d.deviceCategory}: {d.activeUsers}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {deviceChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Dispositivos</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {deviceChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {sourceChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Origens</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="users" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {countryChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Países</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={countryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {countryChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Páginas ativas</h3>
          <AnalyticsDataTable
            columns={["Página", "Usuários Ativos", "Views"]}
            rows={byPage.map((p: any) => [
              p.unifiedScreenName || "—",
              (p.activeUsers || 0).toLocaleString(),
              (p.screenPageViews || 0).toLocaleString(),
            ])}
          />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Origens</h3>
            <AnalyticsDataTable
              columns={["Origem", "Usuários Ativos"]}
              rows={bySource.map((s: any) => [s.source || "—", (s.activeUsers || 0).toLocaleString()])}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Países</h3>
            <AnalyticsDataTable
              columns={["País", "Usuários Ativos"]}
              rows={byCountry.map((c: any) => [c.country || "—", (c.activeUsers || 0).toLocaleString()])}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
