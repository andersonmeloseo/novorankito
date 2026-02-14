import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, Label, AreaChart, Area, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, BarGradient, DonutCenterLabel, ChartGradient, LineGlowGradient,
  FunnelStep,
} from "./ChartPrimitives";

interface AcquisitionTabProps {
  data: any;
}

export function AcquisitionTab({ data }: AcquisitionTabProps) {
  const channels = data?.channels || [];
  const sources = data?.sources || [];
  const campaigns = data?.campaigns || [];
  const firstUser = data?.firstUserChannels || [];

  const channelChart = channels.slice(0, 8).map((c: any) => ({
    name: (c.sessionDefaultChannelGroup || "—").substring(0, 14),
    sessions: c.sessions || 0,
    users: c.totalUsers || 0,
    engagementRate: ((c.engagementRate || 0) * 100),
    conversions: c.conversions || 0,
  }));

  const totalSessions = channelChart.reduce((s: number, c: any) => s + c.sessions, 0);

  // ─── Stacked Area: sessions + users by channel (top 4) ───
  const stackedData = useMemo(() => {
    return channels.slice(0, 4).map((c: any) => ({
      name: (c.sessionDefaultChannelGroup || "—").substring(0, 12),
      sessions: c.sessions || 0,
      users: c.totalUsers || 0,
      engaged: c.engagedSessions || 0,
    }));
  }, [channels]);

  // ─── Radar: channel quality comparison ───
  const radarData = useMemo(() => {
    return channels.slice(0, 6).map((c: any) => ({
      channel: (c.sessionDefaultChannelGroup || "—").substring(0, 10),
      sessions: c.sessions || 0,
      engagement: ((c.engagementRate || 0) * 100),
      conversions: c.conversions || 0,
    }));
  }, [channels]);

  // ─── Funnel: first user channels ───
  const funnelData = useMemo(() => {
    return firstUser.slice(0, 6).map((f: any) => ({
      name: (f.firstUserDefaultChannelGroup || "—").substring(0, 18),
      value: f.totalUsers || 0,
    }));
  }, [firstUser]);
  const maxFunnelVal = Math.max(...funnelData.map((f: any) => f.value), 1);

  return (
    <div className="space-y-4">
      {/* ─── Row 1: Line Chart com glow + Donut ─── */}
      {channelChart.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <ChartHeader title="Sessões por Canal" subtitle="Line chart com gradiente e glow" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={channelChart} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                  <defs>
                    <LineGlowGradient id="acqLineGlow" color="hsl(var(--chart-1))" />
                    <LineGlowGradient id="acqLineGlow2" color="hsl(var(--chart-6))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} width={45} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                  <Area type="monotone" dataKey="sessions" name="Sessões" stroke="hsl(var(--chart-1))" fill="url(#acqLineGlow)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--chart-1))" }} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} animationDuration={800} />
                  <Area type="monotone" dataKey="users" name="Usuários" stroke="hsl(var(--chart-6))" fill="url(#acqLineGlow2)" strokeWidth={2} dot={false} animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <ChartHeader title="Distribuição de Canais" subtitle="Proporção de sessões por canal" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelChart.map(c => ({ name: c.name, value: c.sessions }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0} animationDuration={900}>
                    {channelChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <Label content={<DonutCenterLabel value={totalSessions.toLocaleString("pt-BR")} label="total" />} />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Row 2: Radar de Qualidade + Stacked Area ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {radarData.length > 2 && (
          <Card className="p-5">
            <ChartHeader title="Radar de Qualidade" subtitle="Sessões × Engajamento × Conversões por canal" />
            <div className="h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="channel" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <Radar name="Sessões" dataKey="sessions" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Engajamento" dataKey="engagement" stroke="hsl(var(--chart-9))" fill="hsl(var(--chart-9))" fillOpacity={0.1} strokeWidth={2} />
                  <Radar name="Conversões" dataKey="conversions" stroke="hsl(var(--chart-7))" fill="hsl(var(--chart-7))" fillOpacity={0.1} strokeWidth={2} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {stackedData.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Composição de Métricas" subtitle="Stacked area: sessões, usuários e engajados" />
            <div className="h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stackedData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <defs>
                    <ChartGradient id="acqStack1" color="hsl(var(--chart-1))" opacity={0.25} />
                    <ChartGradient id="acqStack2" color="hsl(var(--chart-6))" opacity={0.2} />
                    <ChartGradient id="acqStack3" color="hsl(var(--chart-9))" opacity={0.15} />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} width={45} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                  <Area type="monotone" dataKey="sessions" name="Sessões" stackId="1" stroke="hsl(var(--chart-1))" fill="url(#acqStack1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="users" name="Usuários" stackId="1" stroke="hsl(var(--chart-6))" fill="url(#acqStack2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="engaged" name="Engajadas" stackId="1" stroke="hsl(var(--chart-9))" fill="url(#acqStack3)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Row 3: Funnel Horizontal - Primeiro Acesso ─── */}
      {funnelData.length > 0 && (
        <Card className="p-5">
          <ChartHeader title="Funnel de Primeiro Acesso" subtitle="Queda entre canais de entrada dos novos usuários" />
          <div className="space-y-2">
            {funnelData.map((f: any, i: number) => (
              <FunnelStep key={f.name} label={f.name} value={f.value} maxValue={maxFunnelVal} color={CHART_COLORS[i % CHART_COLORS.length]} index={i} />
            ))}
          </div>
        </Card>
      )}

      {/* ─── Data Tables ─── */}
      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels" className="text-xs">Canais</TabsTrigger>
          <TabsTrigger value="sources" className="text-xs">Origem / Mídia</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">Campanhas</TabsTrigger>
          <TabsTrigger value="firstuser" className="text-xs">Primeiro Acesso</TabsTrigger>
        </TabsList>
        <TabsContent value="channels" className="mt-4">
          <AnalyticsDataTable
            columns={["Canal", "Usuários", "Sessões", "Engajadas", "Tx. Engajamento", "Conversões", "Receita"]}
            rows={channels.map((c: any) => [
              c.sessionDefaultChannelGroup || "—",
              (c.totalUsers || 0).toLocaleString(), (c.sessions || 0).toLocaleString(),
              (c.engagedSessions || 0).toLocaleString(), ((c.engagementRate || 0) * 100).toFixed(1) + "%",
              (c.conversions || 0).toLocaleString(),
              "R$ " + (c.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            ])}
          />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <AnalyticsDataTable
            columns={["Origem", "Mídia", "Usuários", "Sessões", "Tx. Engajamento", "Conversões", "Receita"]}
            rows={sources.map((s: any) => [
              s.sessionSource || "—", s.sessionMedium || "—",
              (s.totalUsers || 0).toLocaleString(), (s.sessions || 0).toLocaleString(),
              ((s.engagementRate || 0) * 100).toFixed(1) + "%",
              (s.conversions || 0).toLocaleString(),
              "R$ " + (s.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            ])}
          />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <AnalyticsDataTable
            columns={["Campanha", "Usuários", "Sessões", "Conversões", "Receita"]}
            rows={campaigns.map((c: any) => [
              c.sessionCampaignName || "—",
              (c.totalUsers || 0).toLocaleString(), (c.sessions || 0).toLocaleString(),
              (c.conversions || 0).toLocaleString(),
              "R$ " + (c.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            ])}
          />
        </TabsContent>
        <TabsContent value="firstuser" className="mt-4">
          <AnalyticsDataTable
            columns={["Canal (Primeiro Acesso)", "Usuários", "Novos Usuários", "Tx. Engajamento", "Conversões"]}
            rows={firstUser.map((f: any) => [
              f.firstUserDefaultChannelGroup || "—",
              (f.totalUsers || 0).toLocaleString(), (f.newUsers || 0).toLocaleString(),
              ((f.engagementRate || 0) * 100).toFixed(1) + "%",
              (f.conversions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
