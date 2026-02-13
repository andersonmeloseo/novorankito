import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { mockKpis, mockTrendData } from "@/lib/mock-data";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { Users, Activity, Target, DollarSign } from "lucide-react";

const CHANNEL_DATA = [
  { channel: "Busca Orgânica", users: 9200, sessions: 14800, engagement: "62%", conversions: 420 },
  { channel: "Direto", users: 4100, sessions: 6200, engagement: "58%", conversions: 180 },
  { channel: "Busca Paga", users: 2800, sessions: 5400, engagement: "45%", conversions: 142 },
  { channel: "Social", users: 1400, sessions: 3200, engagement: "52%", conversions: 64 },
  { channel: "Referência", users: 920, sessions: 2500, engagement: "68%", conversions: 36 },
];

const SOURCE_DATA = [
  { source: "google / organic", users: 9200, sessions: 14800, conversions: 420 },
  { source: "direct / (none)", users: 4100, sessions: 6200, conversions: 180 },
  { source: "google / cpc", users: 2800, sessions: 5400, conversions: 142 },
  { source: "instagram / social", users: 840, sessions: 1800, conversions: 38 },
  { source: "facebook / social", users: 560, sessions: 1400, conversions: 26 },
];

const LANDING_DATA = [
  { page: "/", users: 5200, sessions: 8100, bounce: "32%", conversions: 210 },
  { page: "/products/wireless-headphones", users: 3100, sessions: 4800, bounce: "28%", conversions: 142 },
  { page: "/blog/best-noise-cancelling-2026", users: 2400, sessions: 3200, bounce: "45%", conversions: 38 },
  { page: "/products", users: 1800, sessions: 2900, bounce: "35%", conversions: 86 },
  { page: "/contact", users: 920, sessions: 1400, bounce: "22%", conversions: 64 },
];

const DEVICE_BREAKDOWN = [
  { device: "Celular", pct: 58 },
  { device: "Desktop", pct: 36 },
  { device: "Tablet", pct: 6 },
];

export default function AnalyticsPage() {
  return (
    <>
      <TopBar title="Analytics" subtitle="GA4 Dashboard" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Usuários" value={mockKpis.users.value} change={mockKpis.users.change} />
          <KpiCard label="Sessões" value={mockKpis.sessions.value} change={mockKpis.sessions.change} />
          <KpiCard label="Conversões" value={mockKpis.conversions.value} change={mockKpis.conversions.change} />
          <KpiCard label="Receita" value={mockKpis.revenue.value} change={mockKpis.revenue.change} prefix="R$" />
        </div>

        {/* Sessions Chart */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Tendência de Sessões</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTrendData}>
                <defs>
                  <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                <Area type="monotone" dataKey="sessions" stroke="hsl(var(--chart-2))" fill="url(#sessionsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="channels">
          <TabsList>
            <TabsTrigger value="channels" className="text-xs">Canais</TabsTrigger>
            <TabsTrigger value="sources" className="text-xs">Origem / Mídia</TabsTrigger>
            <TabsTrigger value="pages" className="text-xs">Páginas de Entrada</TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="mt-4">
            <SimpleTable
              columns={["Canal", "Usuários", "Sessões", "Engajamento", "Conversões"]}
              rows={CHANNEL_DATA.map((c) => [c.channel, c.users.toLocaleString(), c.sessions.toLocaleString(), c.engagement, c.conversions.toLocaleString()])}
            />
          </TabsContent>
          <TabsContent value="sources" className="mt-4">
            <SimpleTable
              columns={["Origem / Mídia", "Usuários", "Sessões", "Conversões"]}
              rows={SOURCE_DATA.map((s) => [s.source, s.users.toLocaleString(), s.sessions.toLocaleString(), s.conversions.toLocaleString()])}
            />
          </TabsContent>
          <TabsContent value="pages" className="mt-4">
            <SimpleTable
              columns={["Página", "Usuários", "Sessões", "Taxa de Rejeição", "Conversões"]}
              rows={LANDING_DATA.map((p) => [p.page, p.users.toLocaleString(), p.sessions.toLocaleString(), p.bounce, p.conversions.toLocaleString()])}
            />
          </TabsContent>
        </Tabs>

        {/* Device breakdown */}
        <div className="grid sm:grid-cols-3 gap-4">
          {DEVICE_BREAKDOWN.map((d) => (
            <Card key={d.device} className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{d.pct}%</div>
              <div className="text-xs text-muted-foreground mt-1">{d.device}</div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
