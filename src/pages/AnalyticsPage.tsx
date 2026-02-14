import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useAnalyticsSessions } from "@/hooks/use-data-modules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id").limit(1);
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;
  const { data: sessions = [], isLoading } = useAnalyticsSessions(projectId);

  const totalUsers = sessions.reduce((s: number, a: any) => s + (a.users_count || 0), 0);
  const totalSessions = sessions.reduce((s: number, a: any) => s + (a.sessions_count || 0), 0);
  const totalConversions = sessions.reduce((s: number, a: any) => s + (a.conversions_count || 0), 0);
  const totalRevenue = sessions.reduce((s: number, a: any) => s + Number(a.revenue || 0), 0);

  // Group by channel
  const byChannel = new Map<string, { users: number; sessions: number; engagement: number; conversions: number; count: number }>();
  sessions.forEach((s: any) => {
    const ch = s.channel || "Direto";
    const existing = byChannel.get(ch) || { users: 0, sessions: 0, engagement: 0, conversions: 0, count: 0 };
    existing.users += s.users_count || 0;
    existing.sessions += s.sessions_count || 0;
    existing.engagement += Number(s.engagement_rate || 0);
    existing.conversions += s.conversions_count || 0;
    existing.count++;
    byChannel.set(ch, existing);
  });
  const channelRows = Array.from(byChannel.entries()).map(([ch, d]) => [
    ch, d.users.toLocaleString(), d.sessions.toLocaleString(),
    (d.engagement / d.count).toFixed(0) + "%", d.conversions.toLocaleString(),
  ]);

  // Group by source/medium
  const bySource = new Map<string, { users: number; sessions: number; conversions: number }>();
  sessions.forEach((s: any) => {
    const key = `${s.source || "direct"} / ${s.medium || "(none)"}`;
    const existing = bySource.get(key) || { users: 0, sessions: 0, conversions: 0 };
    existing.users += s.users_count || 0;
    existing.sessions += s.sessions_count || 0;
    existing.conversions += s.conversions_count || 0;
    bySource.set(key, existing);
  });
  const sourceRows = Array.from(bySource.entries()).map(([src, d]) => [
    src, d.users.toLocaleString(), d.sessions.toLocaleString(), d.conversions.toLocaleString(),
  ]);

  // Group by landing page
  const byPage = new Map<string, { users: number; sessions: number; bounce: number; conversions: number; count: number }>();
  sessions.forEach((s: any) => {
    const pg = s.landing_page || "/";
    const existing = byPage.get(pg) || { users: 0, sessions: 0, bounce: 0, conversions: 0, count: 0 };
    existing.users += s.users_count || 0;
    existing.sessions += s.sessions_count || 0;
    existing.bounce += Number(s.bounce_rate || 0);
    existing.conversions += s.conversions_count || 0;
    existing.count++;
    byPage.set(pg, existing);
  });
  const pageRows = Array.from(byPage.entries()).map(([pg, d]) => [
    pg, d.users.toLocaleString(), d.sessions.toLocaleString(),
    (d.bounce / d.count).toFixed(0) + "%", d.conversions.toLocaleString(),
  ]);

  // Trend by date
  const byDate = new Map<string, { users: number; sessions: number }>();
  sessions.forEach((s: any) => {
    const d = s.session_date;
    const existing = byDate.get(d) || { users: 0, sessions: 0 };
    existing.users += s.users_count || 0;
    existing.sessions += s.sessions_count || 0;
    byDate.set(d, existing);
  });
  const trendData = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, sessions: d.sessions, users: d.users }));

  // Device breakdown
  const byDevice = new Map<string, number>();
  sessions.forEach((s: any) => {
    const dev = s.device || "Desktop";
    byDevice.set(dev, (byDevice.get(dev) || 0) + (s.sessions_count || 0));
  });
  const deviceBreakdown = Array.from(byDevice.entries()).map(([device, count]) => ({
    device,
    pct: totalSessions ? Math.round((count / totalSessions) * 100) : 0,
  }));

  const hasData = sessions.length > 0;

  return (
    <>
      <TopBar title="Analytics" subtitle="Comportamento de usuários, canais de aquisição e engajamento" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {isLoading ? (
          <>
            <KpiSkeleton />
            <ChartSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Usuários" value={totalUsers} change={0} />
              <KpiCard label="Sessões" value={totalSessions} change={0} />
              <KpiCard label="Conversões" value={totalConversions} change={0} />
              <KpiCard label="Receita" value={totalRevenue} change={0} prefix="R$" />
            </StaggeredGrid>

            {hasData && trendData.length > 1 && (
              <AnimatedContainer delay={0.15}>
                <Card className="p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Tendência de Sessões</h3>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
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
              </AnimatedContainer>
            )}

            {!hasData && (
              <EmptyState
                icon={Activity}
                title="Nenhuma sessão registrada"
                description="Conecte o Google Analytics ou instale o script de tracking para começar."
              />
            )}

            {hasData && (
              <AnimatedContainer delay={0.2}>
                <>
                  <Tabs defaultValue="channels">
                    <TabsList>
                      <TabsTrigger value="channels" className="text-xs">Canais</TabsTrigger>
                      <TabsTrigger value="sources" className="text-xs">Origem / Mídia</TabsTrigger>
                      <TabsTrigger value="pages" className="text-xs">Páginas de Entrada</TabsTrigger>
                    </TabsList>
                    <TabsContent value="channels" className="mt-4">
                      <SimpleTable columns={["Canal", "Usuários", "Sessões", "Engajamento", "Conversões"]} rows={channelRows} />
                    </TabsContent>
                    <TabsContent value="sources" className="mt-4">
                      <SimpleTable columns={["Origem / Mídia", "Usuários", "Sessões", "Conversões"]} rows={sourceRows} />
                    </TabsContent>
                    <TabsContent value="pages" className="mt-4">
                      <SimpleTable columns={["Página", "Usuários", "Sessões", "Taxa de Rejeição", "Conversões"]} rows={pageRows} />
                    </TabsContent>
                  </Tabs>

                  {deviceBreakdown.length > 0 && (
                    <StaggeredGrid className="grid sm:grid-cols-3 gap-4 mt-4">
                      {deviceBreakdown.map((d) => (
                        <Card key={d.device} className="p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">{d.pct}%</div>
                          <div className="text-xs text-muted-foreground mt-1">{d.device}</div>
                        </Card>
                      ))}
                    </StaggeredGrid>
                  )}
                </>
              </AnimatedContainer>
            )}
          </>
        )}
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
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
