import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGA4Report } from "@/hooks/use-ga4-reports";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AcquisitionTab } from "@/components/analytics/AcquisitionTab";
import { EngagementTab } from "@/components/analytics/EngagementTab";
import { DemographicsTab } from "@/components/analytics/DemographicsTab";
import { TechnologyTab } from "@/components/analytics/TechnologyTab";
import { RealtimeTab } from "@/components/analytics/RealtimeTab";
import { RetentionTab } from "@/components/analytics/RetentionTab";
import { EcommerceTab } from "@/components/analytics/EcommerceTab";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Activity, Calendar, RefreshCw, Loader2, TrendingUp, Users, MousePointerClick,
  Eye, Timer, BarChart3, Globe, Monitor, Zap, ShoppingCart, UserCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type DateRange = "7" | "28" | "90" | "180" | "365" | "custom";

const DATE_MAP: Record<string, string> = {
  "7": "7daysAgo",
  "28": "28daysAgo",
  "90": "90daysAgo",
  "180": "180daysAgo",
  "365": "365daysAgo",
};

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

  const { data: ga4Connection } = useQuery({
    queryKey: ["ga4-connection", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("ga4_connections").select("id, connection_name, property_name, property_id, last_sync_at").eq("project_id", projectId!).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const [dateRange, setDateRange] = useState<DateRange>("28");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const startDate = dateRange === "custom" && customFrom ? customFrom : (DATE_MAP[dateRange] || "28daysAgo");
  const endDate = dateRange === "custom" && customTo ? customTo : "yesterday";

  // Fetch data based on active tab
  const { data: overviewData, isLoading: loadingOverview, refetch: refetchOverview } = useGA4Report(
    projectId, "overview", startDate, endDate
  );
  const { data: acquisitionData, isLoading: loadingAcquisition } = useGA4Report(
    activeTab === "acquisition" ? projectId : undefined, "acquisition", startDate, endDate
  );
  const { data: engagementData, isLoading: loadingEngagement } = useGA4Report(
    activeTab === "engagement" ? projectId : undefined, "engagement", startDate, endDate
  );
  const { data: demographicsData, isLoading: loadingDemographics } = useGA4Report(
    activeTab === "demographics" ? projectId : undefined, "demographics", startDate, endDate
  );
  const { data: technologyData, isLoading: loadingTechnology } = useGA4Report(
    activeTab === "technology" ? projectId : undefined, "technology", startDate, endDate
  );
  const { data: realtimeData, isLoading: loadingRealtime } = useGA4Report(
    activeTab === "realtime" ? projectId : undefined, "realtime"
  );
  const { data: retentionData, isLoading: loadingRetention } = useGA4Report(
    activeTab === "retention" ? projectId : undefined, "retention", startDate, endDate
  );
  const { data: ecommerceData, isLoading: loadingEcommerce } = useGA4Report(
    activeTab === "ecommerce" ? projectId : undefined, "ecommerce", startDate, endDate
  );

  const [syncing, setSyncing] = useState(false);
  const handleRefresh = async () => {
    setSyncing(true);
    await refetchOverview();
    setSyncing(false);
  };

  const totals = overviewData?.totals || {};
  const trend = overviewData?.trend || [];

  const totalUsers = totals.totalUsers || 0;
  const newUsers = totals.newUsers || 0;
  const sessions = totals.sessions || 0;
  const pageViews = totals.screenPageViews || 0;
  const engagementRate = ((totals.engagementRate || 0) * 100);
  const avgDuration = totals.averageSessionDuration || 0;
  const bounceRate = ((totals.bounceRate || 0) * 100);
  const events = totals.eventCount || 0;
  const conversions = totals.conversions || 0;
  const revenue = totals.totalRevenue || 0;

  const formatDuration = (s: number) => {
    if (!s) return "0s";
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const trendData = trend.map((t: any) => ({
    date: (t.date || "").substring(4, 6) + "/" + (t.date || "").substring(6, 8),
    users: t.totalUsers || 0,
    sessions: t.sessions || 0,
    pageViews: t.screenPageViews || 0,
    events: t.eventCount || 0,
  }));

  const hasConnection = !!ga4Connection?.property_id;

  return (
    <>
      <TopBar title="Analytics" subtitle="Dados completos do Google Analytics 4" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Connection bar */}
        {ga4Connection && (
          <AnimatedContainer>
            <Card className="p-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-muted-foreground">GA4 conectado:</span>
                <span className="font-medium text-foreground">{ga4Connection.property_name || ga4Connection.property_id}</span>
                {ga4Connection.last_sync_at && (
                  <span className="text-muted-foreground">
                    · Último sync: {format(parseISO(ga4Connection.last_sync_at), "dd/MM HH:mm")}
                  </span>
                )}
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" onClick={handleRefresh} disabled={syncing}>
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Atualizar
              </Button>
            </Card>
          </AnimatedContainer>
        )}

        {/* Date filter */}
        <AnimatedContainer>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="28">Últimos 28 dias</SelectItem>
                  <SelectItem value="90">Últimos 3 meses</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {dateRange === "custom" && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-9 text-xs w-[140px]" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-9 text-xs w-[140px]" />
                </div>
              )}
            </div>
          </Card>
        </AnimatedContainer>

        {!hasConnection && (
          <EmptyState
            icon={Activity}
            title="GA4 não conectado"
            description="Conecte o Google Analytics 4 nas configurações do projeto para ver os dados completos."
          />
        )}

        {hasConnection && (
          <>
            {/* KPIs */}
            {loadingOverview ? <KpiSkeleton count={5} /> : (
              <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <KpiCard label="Usuários" value={totalUsers} change={0} />
                <KpiCard label="Novos Usuários" value={newUsers} change={0} />
                <KpiCard label="Sessões" value={sessions} change={0} />
                <KpiCard label="Pageviews" value={pageViews} change={0} />
                <KpiCard label="Tx. Engajamento" value={engagementRate} change={0} suffix="%" />
              </StaggeredGrid>
            )}

            {loadingOverview ? <KpiSkeleton count={5} /> : (
              <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <KpiCard label="Duração Média" value={Math.round(avgDuration)} change={0} suffix="s" />
                <KpiCard label="Tx. Rejeição" value={bounceRate} change={0} suffix="%" />
                <KpiCard label="Eventos" value={events} change={0} />
                <KpiCard label="Conversões" value={conversions} change={0} />
                <KpiCard label="Receita" value={revenue} change={0} prefix="R$" />
              </StaggeredGrid>
            )}

            {/* Trend chart */}
            {!loadingOverview && trendData.length > 1 && (
              <AnimatedContainer delay={0.15}>
                <Card className="p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Tendência Diária</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="sessionsGradA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="users" name="Usuários" stroke="hsl(var(--chart-1))" fill="url(#usersGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="sessions" name="Sessões" stroke="hsl(var(--chart-2))" fill="url(#sessionsGradA)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </AnimatedContainer>
            )}

            {/* Tabs */}
            <AnimatedContainer delay={0.2}>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="overflow-x-auto">
                  <TabsList className="w-auto">
                    <TabsTrigger value="overview" className="text-xs gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
                    <TabsTrigger value="realtime" className="text-xs gap-1.5"><Zap className="h-3.5 w-3.5" />Tempo Real</TabsTrigger>
                    <TabsTrigger value="acquisition" className="text-xs gap-1.5"><MousePointerClick className="h-3.5 w-3.5" />Aquisição</TabsTrigger>
                    <TabsTrigger value="engagement" className="text-xs gap-1.5"><Eye className="h-3.5 w-3.5" />Engajamento</TabsTrigger>
                    <TabsTrigger value="demographics" className="text-xs gap-1.5"><Globe className="h-3.5 w-3.5" />Demografia</TabsTrigger>
                    <TabsTrigger value="technology" className="text-xs gap-1.5"><Monitor className="h-3.5 w-3.5" />Tecnologia</TabsTrigger>
                    <TabsTrigger value="retention" className="text-xs gap-1.5"><UserCheck className="h-3.5 w-3.5" />Retenção</TabsTrigger>
                    <TabsTrigger value="ecommerce" className="text-xs gap-1.5"><ShoppingCart className="h-3.5 w-3.5" />E-commerce</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="mt-4">
                  {loadingOverview ? <TableSkeleton /> : (
                    <Card className="p-6 text-center text-sm text-muted-foreground">
                      Os dados de visão geral são exibidos nos KPIs e gráfico de tendência acima. Selecione uma aba específica para análise detalhada.
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="realtime" className="mt-4">
                  <RealtimeTab data={realtimeData} isLoading={loadingRealtime} />
                </TabsContent>

                <TabsContent value="acquisition" className="mt-4">
                  {loadingAcquisition ? <><ChartSkeleton /><TableSkeleton /></> : <AcquisitionTab data={acquisitionData} />}
                </TabsContent>

                <TabsContent value="engagement" className="mt-4">
                  {loadingEngagement ? <TableSkeleton /> : <EngagementTab data={engagementData} />}
                </TabsContent>

                <TabsContent value="demographics" className="mt-4">
                  {loadingDemographics ? <><ChartSkeleton /><TableSkeleton /></> : <DemographicsTab data={demographicsData} />}
                </TabsContent>

                <TabsContent value="technology" className="mt-4">
                  {loadingTechnology ? <><ChartSkeleton /><TableSkeleton /></> : <TechnologyTab data={technologyData} />}
                </TabsContent>

                <TabsContent value="retention" className="mt-4">
                  {loadingRetention ? <><ChartSkeleton /><TableSkeleton /></> : <RetentionTab data={retentionData} />}
                </TabsContent>

                <TabsContent value="ecommerce" className="mt-4">
                  {loadingEcommerce ? <><ChartSkeleton /><TableSkeleton /></> : <EcommerceTab data={ecommerceData} />}
                </TabsContent>
              </Tabs>
            </AnimatedContainer>
          </>
        )}
      </div>
    </>
  );
}
