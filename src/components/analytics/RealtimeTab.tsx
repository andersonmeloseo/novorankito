import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px -4px rgba(0,0,0,0.12)" };

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

  const sourceChart = bySource.slice(0, 6).map((s: any) => ({
    name: (s.platform || "—").substring(0, 16),
    users: s.activeUsers || 0,
  }));

  const countryChart = byCountry.slice(0, 5).map((c: any) => ({
    name: c.country || "—",
    value: c.activeUsers || 0,
  }));

  return (
    <div className="space-y-4">
      {/* Active users hero */}
      <Card className="p-5 text-center">
        <div className="text-4xl font-bold text-foreground font-display">{activeUsers}</div>
        <div className="text-xs text-muted-foreground mt-1.5 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          Usuários ativos agora
        </div>
        {byDevice.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {byDevice.map((d: any) => (
              <Badge key={d.deviceCategory} variant="secondary" className="text-[10px] px-2 py-0.5">
                {d.deviceCategory}: {d.activeUsers}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Charts row */}
      <div className="grid sm:grid-cols-3 gap-4">
        {deviceChart.length > 0 && (
          <Card className="p-4">
            <h3 className="text-xs font-medium text-foreground mb-1">Dispositivos</h3>
            <p className="text-[10px] text-muted-foreground mb-2">Ativos por tipo de dispositivo</p>
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceChart} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={30} outerRadius={52} paddingAngle={3} label={false}>
                    {deviceChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={7} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {sourceChart.length > 0 && (
          <Card className="p-4">
            <h3 className="text-xs font-medium text-foreground mb-1">Plataformas</h3>
            <p className="text-[10px] text-muted-foreground mb-2">Web, iOS, Android</p>
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChart} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={60} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="users" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {countryChart.length > 0 && (
          <Card className="p-4">
            <h3 className="text-xs font-medium text-foreground mb-1">Países</h3>
            <p className="text-[10px] text-muted-foreground mb-2">Top países com ativos agora</p>
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={countryChart} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={30} outerRadius={52} paddingAngle={3} label={false}>
                    {countryChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={7} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Tables */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-medium text-foreground mb-2">Páginas ativas</h3>
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
            <h3 className="text-xs font-medium text-foreground mb-2">Plataformas</h3>
            <AnalyticsDataTable
              columns={["Plataforma", "Usuários Ativos"]}
              rows={bySource.map((s: any) => [s.platform || "—", (s.activeUsers || 0).toLocaleString()])}
            />
          </div>
          <div>
            <h3 className="text-xs font-medium text-foreground mb-2">Países</h3>
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
