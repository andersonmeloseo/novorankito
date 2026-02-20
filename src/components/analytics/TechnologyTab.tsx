import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Treemap,
} from "recharts";
import { StaggeredGrid } from "@/components/ui/animated-container";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, DonutCenterLabel, BarGradient, formatDuration, TreemapContent, CohortHeatmap,
} from "./ChartPrimitives";

interface TechnologyTabProps {
  data: any;
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
  const totalDeviceUsers = deviceChart.reduce((s: number, d: any) => s + d.value, 0);

  // ─── Treemap: browsers by users ───
  const browserTreemap = useMemo(() => {
    return browsers.slice(0, 10).map((b: any, i: number) => ({
      name: (b.browser || "—").substring(0, 14),
      value: b.totalUsers || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [browsers]);

  // ─── Radar: device quality ───
  const deviceRadar = useMemo(() => {
    return devices.map((d: any) => ({
      device: d.deviceCategory || "—",
      users: d.totalUsers || 0,
      engagement: Math.round((d.engagementRate || 0) * 100),
      pagesPerSession: Math.round((d.screenPageViewsPerSession || 0) * 10),
    }));
  }, [devices]);

  // ─── Cohort Heatmap: OS × metrics ───
  const osHeatmap = useMemo(() => {
    const topOS = operatingSystems.slice(0, 5);
    const metrics = ["Usuários", "Sessões", "Engaj. %"];
    const heatData = topOS.map((o: any) => [
      o.totalUsers || 0,
      o.sessions || 0,
      Math.round((o.engagementRate || 0) * 100),
    ]);
    const maxVal = Math.max(...heatData.flat(), 1);
    return {
      data: heatData,
      xLabels: metrics,
      yLabels: topOS.map((o: any) => (o.operatingSystem || "—").substring(0, 12)),
      maxValue: maxVal,
    };
  }, [operatingSystems]);

  // ─── Horizontal Bar: resolutions ───
  const resChart = useMemo(() => {
    return screenResolutions.slice(0, 8).map((r: any) => ({
      name: r.screenResolution || "—",
      users: r.totalUsers || 0,
    }));
  }, [screenResolutions]);

  return (
    <div className="space-y-4">
      {/* ─── Row 1: Device Donut + Device Radar ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {deviceChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Dispositivos" subtitle="Desktop, mobile e tablet" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4} strokeWidth={0} animationDuration={900}>
                    {deviceChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <Label content={<DonutCenterLabel value={totalDeviceUsers.toLocaleString("pt-BR")} label="usuários" />} />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {deviceRadar.length > 1 && (
          <Card className="p-5">
            <ChartHeader title="Radar de Dispositivos" subtitle="Qualidade de experiência por dispositivo" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={deviceRadar}>
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="device" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <Radar name="Usuários" dataKey="users" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Engajamento" dataKey="engagement" stroke="hsl(var(--chart-9))" fill="hsl(var(--chart-9))" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Row 2: Browser Treemap + Resolution Bar ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {browserTreemap.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Treemap de Navegadores" subtitle="Área proporcional ao volume de usuários" />
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={browserTreemap} dataKey="value" aspectRatio={4 / 3} animationDuration={800} content={<TreemapContent />} />
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {resChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Resoluções de Tela" subtitle="Distribuição de resoluções dos usuários" />
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resChart} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <defs>
                    {resChart.map((_: any, i: number) => (
                      <BarGradient key={i} id={`resBar${i}`} color={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" {...AXIS_STYLE} width={90} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="users" radius={[0, 8, 8, 0]} barSize={16} animationDuration={800}>
                    {resChart.map((_: any, i: number) => <Cell key={i} fill={`url(#resBar${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Row 3: OS Heatmap ─── */}
      {osHeatmap.data.length > 0 && (
        <Card className="p-5">
          <ChartHeader title="Heatmap: Sistemas Operacionais" subtitle="Matriz de calor com usuários, sessões e engajamento" />
          <CohortHeatmap {...osHeatmap} hue={270} />
        </Card>
      )}

      {/* ─── Data Tables ─── */}
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
              b.browser || "—", (b.totalUsers || 0).toLocaleString(), (b.sessions || 0).toLocaleString(),
              ((b.engagementRate || 0) * 100).toFixed(1) + "%", ((b.bounceRate || 0) * 100).toFixed(1) + "%",
            ])}
          />
        </TabsContent>
        <TabsContent value="os" className="mt-4">
          <AnalyticsDataTable
            columns={["Sistema Operacional", "Usuários", "Sessões", "Tx. Engajamento"]}
            rows={operatingSystems.map((o: any) => [
              o.operatingSystem || "—", (o.totalUsers || 0).toLocaleString(), (o.sessions || 0).toLocaleString(),
              ((o.engagementRate || 0) * 100).toFixed(1) + "%",
            ])}
          />
        </TabsContent>
        <TabsContent value="resolution" className="mt-4">
          <AnalyticsDataTable
            columns={["Resolução", "Usuários", "Sessões"]}
            rows={screenResolutions.map((r: any) => [
              r.screenResolution || "—", (r.totalUsers || 0).toLocaleString(), (r.sessions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
