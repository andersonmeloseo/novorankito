import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Label,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
  AreaChart, Area, Treemap, LineChart, Line,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, BarGradient, DonutCenterLabel, ChartGradient, LineGlowGradient,
  formatDuration, FunnelStep, TreemapContent, PipelineVisual,
} from "./ChartPrimitives";

interface EngagementTabProps {
  data: any;
}

export function EngagementTab({ data }: EngagementTabProps) {
  const pages = data?.pages || [];
  const events = data?.events || [];
  const landingPages = data?.landingPages || [];

  // ─── Radar data ───
  const radarData = useMemo(() => events.slice(0, 8).map((e: any) => ({
    event: (e.eventName || "—").substring(0, 12),
    count: e.eventCount || 0,
    users: e.totalUsers || 0,
  })), [events]);

  // ─── Scatter/Bubble ───
  const scatterData = useMemo(() => events.slice(0, 15).map((e: any, i: number) => ({
    name: e.eventName || "—",
    x: e.totalUsers || 0,
    y: e.eventCount || 0,
    z: Math.max(e.eventValue || 1, 1),
    color: CHART_COLORS[i % CHART_COLORS.length],
  })), [events]);

  // ─── Funnel: landing pages ───
  const funnelData = useMemo(() => landingPages.slice(0, 6).map((l: any) => ({
    name: (l.landingPage || "/").replace(/^\//, "").substring(0, 22) || "/",
    sessions: l.sessions || 0,
    users: l.totalUsers || 0,
    conversions: l.conversions || 0,
  })), [landingPages]);
  const maxFunnelSessions = Math.max(...funnelData.map((f: any) => f.sessions), 1);

  // ─── Treemap: pages by views ───
  const treemapData = useMemo(() => pages.slice(0, 12).map((p: any, i: number) => ({
    name: (p.pagePath || "/").replace(/^\//, "").substring(0, 22) || "/",
    value: p.screenPageViews || 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })), [pages]);

  // ─── Multi-line: top 5 pages engagement trend (simulated) ───
  const multiLineData = useMemo(() => {
    return pages.slice(0, 5).map((p: any, i: number) => ({
      name: (p.pagePath || "/").replace(/^\//, "").substring(0, 16) || "/",
      engRate: ((p.engagementRate || 0) * 100),
      bounceRate: ((p.bounceRate || 0) * 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [pages]);

  // ─── Stacked Area: events composition ───
  const topEventsChart = events.slice(0, 6).map((e: any) => ({
    name: (e.eventName || "—").substring(0, 16),
    count: e.eventCount || 0,
  }));

  const totalEvents = events.reduce((s: number, e: any) => s + (e.eventCount || 0), 0);

  // ─── Pipeline visual: conversion steps ───
  const pipelineSteps = useMemo(() => {
    if (!landingPages.length) return [];
    const totalSessions = landingPages.reduce((s: number, l: any) => s + (l.sessions || 0), 0);
    const totalUsers = landingPages.reduce((s: number, l: any) => s + (l.totalUsers || 0), 0);
    const engagedUsers = Math.round(totalUsers * (landingPages[0]?.engagementRate || 0.5));
    const totalConversions = landingPages.reduce((s: number, l: any) => s + (l.conversions || 0), 0);
    return [
      { label: "Sessões", value: totalSessions, color: CHART_COLORS[0] },
      { label: "Usuários", value: totalUsers, color: CHART_COLORS[1] },
      { label: "Engajados", value: engagedUsers, color: CHART_COLORS[2] },
      { label: "Conversões", value: totalConversions, color: CHART_COLORS[3] },
    ];
  }, [landingPages]);

  return (
    <div className="space-y-4">
      {/* ─── Row 1: Radar + Scatter/Bubble ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {radarData.length > 2 && (
          <Card className="p-5">
            <ChartHeader title="Radar de Eventos" subtitle="Comparativo multi-dimensional dos principais eventos" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="event" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <Radar name="Disparos" dataKey="count" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} strokeWidth={2} animationDuration={800} />
                  <Radar name="Usuários" dataKey="users" stroke="hsl(var(--chart-6))" fill="hsl(var(--chart-6))" fillOpacity={0.15} strokeWidth={2} animationDuration={1000} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {scatterData.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Bubble: Eventos × Usuários" subtitle="Tamanho do bubble = valor monetário do evento" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" dataKey="x" name="Usuários" {...AXIS_STYLE} />
                  <YAxis type="number" dataKey="y" name="Disparos" {...AXIS_STYLE} width={45} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [value.toLocaleString("pt-BR"), name]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                  />
                  <Scatter data={scatterData} animationDuration={900}>
                    {scatterData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.7} stroke={entry.color} strokeWidth={1} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Row 2: Treemap + Multi-line Engagement vs Bounce ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {treemapData.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Treemap de Páginas" subtitle="Área proporcional ao volume de pageviews" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={treemapData} dataKey="value" aspectRatio={4 / 3} animationDuration={800} content={<TreemapContent />} />
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {multiLineData.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Engajamento vs Rejeição" subtitle="Comparativo por página (hover para destaque)" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={multiLineData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <defs>
                    <BarGradient id="engBarGrad" color="hsl(var(--chart-9))" />
                    <BarGradient id="bncBarGrad" color="hsl(var(--chart-5))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} vertical={false} />
                  <XAxis dataKey="name" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} width={35} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Legend {...LEGEND_STYLE} />
                  <Bar dataKey="engRate" name="Engajamento %" fill="url(#engBarGrad)" radius={[6, 6, 0, 0]} barSize={16} animationDuration={800} />
                  <Bar dataKey="bounceRate" name="Rejeição %" fill="url(#bncBarGrad)" radius={[6, 6, 0, 0]} barSize={16} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Row 3: Pipeline Visual + Top Events Bar ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {pipelineSteps.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Pipeline de Conversão" subtitle="Funil visual: sessões → usuários → engajados → conversões" />
            <PipelineVisual steps={pipelineSteps} />
          </Card>
        )}

        {topEventsChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Top Eventos" subtitle="Eventos mais disparados pelos usuários" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEventsChart} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <defs>
                    {topEventsChart.map((_: any, i: number) => (
                      <BarGradient key={i} id={`engEvt${i}`} color={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" {...AXIS_STYLE} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={18} animationDuration={800}>
                    {topEventsChart.map((_: any, i: number) => (
                      <Cell key={i} fill={`url(#engEvt${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Row 4: Session Funnel ─── */}
      {funnelData.length > 0 && (
        <Card className="p-5">
          <ChartHeader title="Funnel de Sessões" subtitle="Queda entre etapas por landing page" />
          <div className="space-y-2">
            {funnelData.map((f: any, i: number) => (
              <FunnelStep key={f.name} label={f.name} value={f.sessions} maxValue={maxFunnelSessions} color={CHART_COLORS[i % CHART_COLORS.length]} index={i} />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            {funnelData.slice(0, -1).map((f: any, i: number) => {
              const next = funnelData[i + 1];
              const dropPct = f.sessions > 0 ? ((f.sessions - (next?.sessions || 0)) / f.sessions * 100).toFixed(0) : "0";
              return (
                <div key={i} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <span className="font-medium" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                    {(f.name || "").substring(0, 8)}
                  </span>
                  <span>→ -{dropPct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ─── Row 5: Donut + Heatmap ─── */}
      {topEventsChart.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <ChartHeader title="Distribuição de Eventos" subtitle="Proporção de cada tipo de evento" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topEventsChart.map((e: any) => ({ name: e.name, value: e.count }))} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0} animationDuration={900}>
                    {topEventsChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <Label content={<DonutCenterLabel value={totalEvents.toLocaleString("pt-BR")} label="eventos" />} />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <ChartHeader title="Heatmap de Engajamento" subtitle="Taxa de engajamento por página (intensidade = engajamento)" />
            <div className="grid grid-cols-3 gap-1.5 max-h-[240px] overflow-y-auto">
              {pages.slice(0, 12).map((p: any, i: number) => {
                const engRate = (p.engagementRate || 0) * 100;
                const intensity = Math.min(engRate / 100, 1);
                const hue = 155;
                return (
                  <div key={i} className="rounded-lg p-2.5 flex flex-col justify-between min-h-[60px] transition-transform hover:scale-[1.03] cursor-default"
                    style={{
                      background: `hsla(${hue}, 70%, 42%, ${0.1 + intensity * 0.6})`,
                      border: `1px solid hsla(${hue}, 70%, 42%, ${0.15 + intensity * 0.3})`,
                    }}>
                    <span className="text-[9px] text-foreground font-medium leading-tight truncate">
                      {(p.pagePath || "/").replace(/^\//, "").substring(0, 16) || "/"}
                    </span>
                    <span className="text-sm font-bold text-foreground mt-1">{engRate.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ─── Data Tables ─── */}
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
              (p.pageTitle || "—").substring(0, 60), p.pagePath || "—",
              (p.screenPageViews || 0).toLocaleString(), (p.totalUsers || 0).toLocaleString(),
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
              l.landingPage || "—", (l.sessions || 0).toLocaleString(), (l.totalUsers || 0).toLocaleString(),
              ((l.engagementRate || 0) * 100).toFixed(1) + "%", ((l.bounceRate || 0) * 100).toFixed(1) + "%",
              formatDuration(l.averageSessionDuration || 0), (l.conversions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <AnalyticsDataTable
            columns={["Evento", "Total", "Usuários", "Eventos/Usuário", "Valor"]}
            rows={events.map((e: any) => [
              e.eventName || "—", (e.eventCount || 0).toLocaleString(), (e.totalUsers || 0).toLocaleString(),
              (e.eventCountPerUser || 0).toFixed(1),
              "R$ " + (e.eventValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
