import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Label } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader, BarGradient, DonutCenterLabel, formatDuration } from "./ChartPrimitives";

interface EngagementTabProps {
  data: any;
}

export function EngagementTab({ data }: EngagementTabProps) {
  const pages = data?.pages || [];
  const events = data?.events || [];
  const landingPages = data?.landingPages || [];

  const topPagesChart = pages.slice(0, 6).map((p: any) => ({
    name: (p.pagePath || "—").replace(/^\//, "").substring(0, 20) || "/",
    views: p.screenPageViews || 0,
  }));

  const topEventsChart = events.slice(0, 6).map((e: any) => ({
    name: (e.eventName || "—").substring(0, 16),
    count: e.eventCount || 0,
  }));

  const landingChart = landingPages.slice(0, 5).map((l: any) => ({
    name: (l.landingPage || "—").replace(/^\//, "").substring(0, 18) || "/",
    value: l.sessions || 0,
  }));

  const totalLandingSessions = landingChart.reduce((s: number, l: any) => s + l.value, 0);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {topPagesChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Top Páginas" subtitle="Páginas mais visualizadas no período" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPagesChart} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <defs>
                    <BarGradient id="pagesBarGrad" color="hsl(var(--chart-1))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" {...AXIS_STYLE} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={110} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="views" fill="url(#pagesBarGrad)" radius={[0, 8, 8, 0]} barSize={18} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {topEventsChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Top Eventos" subtitle="Eventos mais disparados pelos usuários" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEventsChart} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <defs>
                    <BarGradient id="eventsBarGrad" color="hsl(var(--chart-6))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" {...AXIS_STYLE} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="count" fill="url(#eventsBarGrad)" radius={[0, 8, 8, 0]} barSize={18} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {landingChart.length > 0 && (
        <Card className="p-5">
          <ChartHeader title="Páginas de Entrada" subtitle="Sessões por landing page" />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={landingChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0} animationDuration={900}>
                  {landingChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  <Label content={<DonutCenterLabel value={totalLandingSessions.toLocaleString("pt-BR")} label="sessões" />} />
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages" className="text-xs">Páginas</TabsTrigger>
          <TabsTrigger value="landing" className="text-xs">Páginas de Entrada</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Eventos</TabsTrigger>
        </TabsList>
        <TabsContent value="pages" className="mt-4">
          <AnalyticsDataTable
            columns={["Título", "Caminho", "Views", "Usuários", "Duração Média", "Tx. Engajamento", "Tx. Rejeição"]}
            rows={pages.map((p: any) => [
              (p.pageTitle || "—").substring(0, 60),
              p.pagePath || "—",
              (p.screenPageViews || 0).toLocaleString(),
              (p.totalUsers || 0).toLocaleString(),
              formatDuration(p.averageSessionDuration || 0),
              ((p.engagementRate || 0) * 100).toFixed(1) + "%",
              ((p.bounceRate || 0) * 100).toFixed(1) + "%",
            ])}
          />
        </TabsContent>
        <TabsContent value="landing" className="mt-4">
          <AnalyticsDataTable
            columns={["Página de Entrada", "Sessões", "Usuários", "Tx. Engajamento", "Tx. Rejeição", "Duração Média", "Conversões"]}
            rows={landingPages.map((l: any) => [
              l.landingPage || "—",
              (l.sessions || 0).toLocaleString(),
              (l.totalUsers || 0).toLocaleString(),
              ((l.engagementRate || 0) * 100).toFixed(1) + "%",
              ((l.bounceRate || 0) * 100).toFixed(1) + "%",
              formatDuration(l.averageSessionDuration || 0),
              (l.conversions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <AnalyticsDataTable
            columns={["Evento", "Total", "Usuários", "Eventos/Usuário", "Valor"]}
            rows={events.map((e: any) => [
              e.eventName || "—",
              (e.eventCount || 0).toLocaleString(),
              (e.totalUsers || 0).toLocaleString(),
              (e.eventCountPerUser || 0).toFixed(1),
              "R$ " + (e.eventValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
