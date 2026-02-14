import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface EngagementTabProps {
  data: any;
}

export function EngagementTab({ data }: EngagementTabProps) {
  const pages = data?.pages || [];
  const events = data?.events || [];
  const landingPages = data?.landingPages || [];

  const topPagesChart = pages.slice(0, 8).map((p: any) => ({
    name: (p.pagePath || "—").replace(/^\//, "").substring(0, 25) || "/",
    views: p.screenPageViews || 0,
  }));

  const topEventsChart = events.slice(0, 8).map((e: any) => ({
    name: (e.eventName || "—").substring(0, 20),
    count: e.eventCount || 0,
  }));

  const landingChart = landingPages.slice(0, 6).map((l: any) => ({
    name: (l.landingPage || "—").replace(/^\//, "").substring(0, 25) || "/",
    value: l.sessions || 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {topPagesChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Top Páginas (Views)</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPagesChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={130} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="views" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {topEventsChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Top Eventos</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEventsChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={130} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {landingChart.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Sessões por Página de Entrada</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={landingChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {landingChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
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

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
