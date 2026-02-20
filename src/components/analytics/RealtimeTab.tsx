import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { Badge } from "@/components/ui/badge";
import { WorldMap } from "./WorldMap";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Label } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader, BarGradient, DonutCenterLabel } from "./ChartPrimitives";

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

  const totalDeviceActive = deviceChart.reduce((s: number, d: any) => s + d.value, 0);

  const sourceChart = bySource.slice(0, 6).map((s: any) => ({
    name: (s.platform || "—").substring(0, 16),
    users: s.activeUsers || 0,
  }));

  const countryChart = byCountry.slice(0, 5).map((c: any) => ({
    name: c.country || "—",
    value: c.activeUsers || 0,
  }));

  const totalCountryActive = countryChart.reduce((s: number, c: any) => s + c.value, 0);

  const mapData = byCountry.map((c: any) => ({
    name: c.country || "",
    value: c.activeUsers || 0,
  }));

  return (
    <div className="space-y-4">
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
          <ChartHeader title="Dispositivos" subtitle="Ativos por tipo" />
          {deviceChart.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={22} outerRadius={42} paddingAngle={4} strokeWidth={0} animationDuration={800}>
                    {deviceChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
        </Card>

        {/* Plataformas */}
        <Card className="p-4">
          <ChartHeader title="Plataformas" subtitle="Web, iOS, Android" />
          {sourceChart.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChart} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <defs>
                    <BarGradient id="rtPlatGrad" color="hsl(var(--chart-6))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" {...AXIS_STYLE} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={50} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="users" fill="url(#rtPlatGrad)" radius={[0, 6, 6, 0]} barSize={14} animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
        </Card>

        {/* Países */}
        <Card className="p-4">
          <ChartHeader title="Países" subtitle="Top países ativos" />
          {countryChart.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={countryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={22} outerRadius={42} paddingAngle={4} strokeWidth={0} animationDuration={800}>
                    {countryChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
        </Card>

        {/* Cidades */}
        <Card className="p-4">
          <ChartHeader title="Cidades" subtitle="Top cidades ativas" />
          {byCity.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCity.slice(0, 5).map((c: any) => ({ name: (c.city || "—").substring(0, 10), users: c.activeUsers || 0 }))} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <defs>
                    <BarGradient id="rtCityGrad" color="hsl(var(--chart-9))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" {...AXIS_STYLE} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={55} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="users" fill="url(#rtCityGrad)" radius={[0, 6, 6, 0]} barSize={12} animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
        </Card>
      </div>

      {/* World Map */}
      {mapData.length > 0 && (
        <Card className="p-4">
          <ChartHeader title="Mapa de Usuários Ativos" subtitle="Distribuição geográfica em tempo real — zoom e arraste para navegar" />
          <div className="h-[340px]">
            <WorldMap
              countryData={mapData}
              cityData={byCity.map((c: any) => ({ name: c.city || "", value: c.activeUsers || 0 }))}
            />
          </div>
        </Card>
      )}

      {/* Tables */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div>
          <h3 className="text-xs font-semibold text-foreground mb-2">Páginas ativas</h3>
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
          <h3 className="text-xs font-semibold text-foreground mb-2">Plataformas</h3>
          <AnalyticsDataTable
            columns={["Plataforma", "Usuários Ativos"]}
            rows={bySource.map((s: any) => [s.platform || "—", (s.activeUsers || 0).toLocaleString()])}
          />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-foreground mb-2">Países & Cidades</h3>
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
