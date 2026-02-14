import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { StaggeredGrid } from "@/components/ui/animated-container";

const COLORS = ["hsl(var(--chart-11))", "hsl(var(--chart-7))", "hsl(var(--chart-9))", "hsl(var(--chart-5))", "hsl(var(--chart-3))"];
const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px -4px rgba(0,0,0,0.12)" };

interface TechnologyTabProps {
  data: any;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function TechnologyTab({ data }: TechnologyTabProps) {
  const browsers = data?.browsers || [];
  const operatingSystems = data?.operatingSystems || [];
  const devices = data?.devices || [];
  const screenResolutions = data?.screenResolutions || [];

  const deviceChart = devices.map((d: any) => ({
    name: d.deviceCategory || "—",
    value: d.totalUsers || 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {deviceChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Dispositivos</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Desktop, mobile e tablet</p>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceChart} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={35} outerRadius={60} paddingAngle={3} label={false}>
                    {deviceChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {devices.length > 0 && (
          <StaggeredGrid className="grid gap-2">
            {devices.map((d: any) => (
              <Card key={d.deviceCategory} className="p-3">
                <div className="text-xs font-medium text-foreground mb-1.5">{d.deviceCategory || "—"}</div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  <div>Usuários: <span className="text-foreground font-medium">{(d.totalUsers || 0).toLocaleString()}</span></div>
                  <div>Sessões: <span className="text-foreground font-medium">{(d.sessions || 0).toLocaleString()}</span></div>
                  <div>Engaj: <span className="text-foreground font-medium">{((d.engagementRate || 0) * 100).toFixed(1)}%</span></div>
                  <div>Rejeição: <span className="text-foreground font-medium">{((d.bounceRate || 0) * 100).toFixed(1)}%</span></div>
                  <div>Duração: <span className="text-foreground font-medium">{formatDuration(d.averageSessionDuration || 0)}</span></div>
                  <div>Pags/S: <span className="text-foreground font-medium">{(d.screenPageViewsPerSession || 0).toFixed(1)}</span></div>
                </div>
              </Card>
            ))}
          </StaggeredGrid>
        )}
      </div>

      <Tabs defaultValue="browsers">
        <TabsList>
          <TabsTrigger value="browsers" className="text-xs">Navegadores</TabsTrigger>
          <TabsTrigger value="os" className="text-xs">Sistemas Operacionais</TabsTrigger>
          <TabsTrigger value="resolution" className="text-xs">Resoluções</TabsTrigger>
        </TabsList>
        <TabsContent value="browsers" className="mt-4">
          <AnalyticsDataTable
            columns={["Navegador", "Usuários", "Sessões", "Tx. Engajamento", "Tx. Rejeição"]}
            rows={browsers.map((b: any) => [
              b.browser || "—",
              (b.totalUsers || 0).toLocaleString(), (b.sessions || 0).toLocaleString(),
              ((b.engagementRate || 0) * 100).toFixed(1) + "%",
              ((b.bounceRate || 0) * 100).toFixed(1) + "%",
            ])}
          />
        </TabsContent>
        <TabsContent value="os" className="mt-4">
          <AnalyticsDataTable
            columns={["Sistema Operacional", "Usuários", "Sessões", "Tx. Engajamento"]}
            rows={operatingSystems.map((o: any) => [
              o.operatingSystem || "—",
              (o.totalUsers || 0).toLocaleString(), (o.sessions || 0).toLocaleString(),
              ((o.engagementRate || 0) * 100).toFixed(1) + "%",
            ])}
          />
        </TabsContent>
        <TabsContent value="resolution" className="mt-4">
          <AnalyticsDataTable
            columns={["Resolução", "Usuários", "Sessões"]}
            rows={screenResolutions.map((r: any) => [
              r.screenResolution || "—",
              (r.totalUsers || 0).toLocaleString(), (r.sessions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
