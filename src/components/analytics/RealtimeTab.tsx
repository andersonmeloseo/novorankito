import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { Badge } from "@/components/ui/badge";
import { WorldMap } from "./WorldMap";
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
  const byCity = data?.byCity || [];
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

  const mapData = byCountry.map((c: any) => ({
    name: c.country || "",
    value: c.activeUsers || 0,
  }));

  return (
    <div className="space-y-4">
      {/* 5 cards in 1 row: Active Users + 4 charts */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Users hero card */}
        <Card className="p-4 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-foreground font-display">{activeUsers}</div>
          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Ativos agora
          </div>
          {byDevice.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1 mt-2">
              {byDevice.map((d: any) => (
                <Badge key={d.deviceCategory} variant="secondary" className="text-[9px] px-1.5 py-0">
                  {d.deviceCategory}: {d.activeUsers}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Dispositivos */}
        <Card className="p-4">
          <h3 className="text-xs font-medium text-foreground mb-1">Dispositivos</h3>
          <p className="text-[10px] text-muted-foreground mb-2">Ativos por tipo</p>
          {deviceChart.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceChart} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={22} outerRadius={40} paddingAngle={3} label={false}>
                    {deviceChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
        </Card>

        {/* Plataformas */}
        <Card className="p-4">
          <h3 className="text-xs font-medium text-foreground mb-1">Plataformas</h3>
          <p className="text-[10px] text-muted-foreground mb-2">Web, iOS, Android</p>
          {sourceChart.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChart} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={50} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="users" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
        </Card>

        {/* Países */}
        <Card className="p-4">
          <h3 className="text-xs font-medium text-foreground mb-1">Países</h3>
          <p className="text-[10px] text-muted-foreground mb-2">Top países ativos</p>
          {countryChart.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={countryChart} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={22} outerRadius={40} paddingAngle={3} label={false}>
                    {countryChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
        </Card>

        {/* Cidades */}
        <Card className="p-4">
          <h3 className="text-xs font-medium text-foreground mb-1">Cidades</h3>
          <p className="text-[10px] text-muted-foreground mb-2">Top cidades ativas</p>
          {byCity.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCity.slice(0, 5).map((c: any) => ({ name: (c.city || "—").substring(0, 10), users: c.activeUsers || 0 }))} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={55} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="users" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
        </Card>
      </div>

      {/* World Map */}
      {mapData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-medium text-foreground mb-1">Mapa de Usuários Ativos</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Distribuição geográfica em tempo real — zoom e arraste para navegar, cidades visíveis com zoom</p>
          <div className="h-[340px]">
            <WorldMap
              countryData={mapData}
              cityData={byCity.map((c: any) => ({ name: c.city || "", value: c.activeUsers || 0 }))}
            />
          </div>
        </Card>
      )}

      {/* Tables in same row: Pages | Platforms + Countries + Cities */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div>
          <h3 className="text-xs font-medium text-foreground mb-2">Páginas ativas</h3>
          <AnalyticsDataTable
            columns={["Página", "Usuários", "Views"]}
            rows={byPage.map((p: any) => [
              p.unifiedScreenName || "—",
              (p.activeUsers || 0).toLocaleString(),
              (p.screenPageViews || 0).toLocaleString(),
            ])}
          />
        </div>
        <div>
          <h3 className="text-xs font-medium text-foreground mb-2">Plataformas</h3>
          <AnalyticsDataTable
            columns={["Plataforma", "Usuários Ativos"]}
            rows={bySource.map((s: any) => [s.platform || "—", (s.activeUsers || 0).toLocaleString()])}
          />
        </div>
        <div>
          <h3 className="text-xs font-medium text-foreground mb-2">Países & Cidades</h3>
          <AnalyticsDataTable
            columns={["País / Cidade", "Usuários Ativos"]}
            rows={[
              ...byCountry.map((c: any) => [`🌍 ${c.country || "—"}`, (c.activeUsers || 0).toLocaleString()]),
              ...byCity.map((c: any) => [`  📍 ${c.city || "—"}`, (c.activeUsers || 0).toLocaleString()]),
            ]}
          />
        </div>
      </div>
    </div>
  );
}