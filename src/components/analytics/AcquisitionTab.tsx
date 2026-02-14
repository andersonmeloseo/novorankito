import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px -4px rgba(0,0,0,0.12)" };

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

  return (
    <div className="space-y-4">
      {channelChart.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Sessões por Canal</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Distribuição de tráfego por canal de aquisição</p>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelChart} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="sessions" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Distribuição de Canais</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Proporção de sessões por canal</p>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelChart} dataKey="sessions" nameKey="name" cx="50%" cy="45%" innerRadius={45} outerRadius={75} paddingAngle={2} label={false}>
                    {channelChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
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
