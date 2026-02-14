import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Label } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader, BarGradient, DonutCenterLabel } from "./ChartPrimitives";

interface AcquisitionTabProps {
  data: any;
}

export function AcquisitionTab({ data }: AcquisitionTabProps) {
  const channels = data?.channels || [];
  const sources = data?.sources || [];
  const campaigns = data?.campaigns || [];
  const firstUser = data?.firstUserChannels || [];

  const channelChart = channels.slice(0, 6).map((c: any) => ({
    name: (c.sessionDefaultChannelGroup || "—").substring(0, 14),
    sessions: c.sessions || 0,
  }));

  const totalSessions = channelChart.reduce((s: number, c: any) => s + c.sessions, 0);

  return (
    <div className="space-y-4">
      {channelChart.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <ChartHeader title="Sessões por Canal" subtitle="Distribuição de tráfego por canal de aquisição" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelChart} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <defs>
                    {channelChart.map((_: any, i: number) => (
                      <BarGradient key={i} id={`acqBar${i}`} color={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" {...AXIS_STYLE} width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="sessions" radius={[0, 8, 8, 0]} barSize={20} animationDuration={800}>
                    {channelChart.map((_: any, i: number) => (
                      <Cell key={i} fill={`url(#acqBar${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <ChartHeader title="Distribuição de Canais" subtitle="Proporção de sessões por canal" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelChart} dataKey="sessions" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0} animationDuration={900}>
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
              (c.totalUsers || 0).toLocaleString(),
              (c.sessions || 0).toLocaleString(),
              (c.engagedSessions || 0).toLocaleString(),
              ((c.engagementRate || 0) * 100).toFixed(1) + "%",
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
