import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/components/overview/types";
import {
  ArrowLeft, Globe, Search, BarChart3, MousePointerClick, Eye,
  Target, TrendingUp, FileSearch, CheckCircle2, XCircle, AlertTriangle,
  Clock, Users, Zap, Wifi, WifiOff, Loader2, Activity, Layers,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip,
  CartesianGrid, Bar, BarChart, PieChart, Pie, Cell,
} from "recharts";

// ─── Mini stat ───
function Stat({ icon: Icon, iconColor, bgColor, label, value, subtitle }: {
  icon: React.ElementType; iconColor: string; bgColor: string; label: string; value: string | number; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
      <div className={cn("p-2 rounded-lg shrink-0", bgColor)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-lg font-bold font-display text-foreground leading-tight">{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground/60">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Section wrapper ───
function Section({ title, icon: Icon, badge, children, delay = 0 }: {
  title: string; icon: React.ElementType; badge?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <AnimatedContainer delay={delay}>
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-2 px-5 pt-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <CardTitle className="text-sm font-bold tracking-tight font-display">{title}</CardTitle>
            {badge && <Badge variant="secondary" className="text-[10px] rounded-full font-normal">{badge}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">{children}</CardContent>
      </Card>
    </AnimatedContainer>
  );
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--chart-5))",
];

export default function ProjectDashboardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Project info
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project-dashboard", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId!).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  // Overview data via RPC
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["project-dashboard-overview", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_project_overview_v2", { p_project_id: projectId! });
      if (error) return null;
      return data as any;
    },
    enabled: !!projectId,
    staleTime: 2 * 60_000,
  });

  // Connections
  const { data: gscConn } = useQuery({
    queryKey: ["dashboard-gsc", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("gsc_connections").select("site_url, connection_name").eq("project_id", projectId!).limit(1);
      return data?.[0] || null;
    },
    enabled: !!projectId,
  });

  const { data: ga4Conn } = useQuery({
    queryKey: ["dashboard-ga4", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("ga4_connections").select("property_name, property_id").eq("project_id", projectId!).limit(1);
      return data?.[0] || null;
    },
    enabled: !!projectId,
  });

  // Counts
  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts", projectId],
    queryFn: async () => {
      const [sessions, conversions, events] = await Promise.all([
        supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("conversions").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("tracking_events").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
      ]);
      return {
        sessions: sessions.count || 0,
        conversions: conversions.count || 0,
        events: events.count || 0,
      };
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const isLoading = loadingProject || loadingOverview;

  if (isLoading) {
    return (
      <>
        <TopBar title="Dashboard do Projeto" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <TopBar title="Dashboard" subtitle="Projeto não encontrado" />
        <div className="p-6 flex flex-col items-center justify-center h-[60vh] text-center gap-4">
          <Globe className="h-16 w-16 text-muted-foreground/20" />
          <h2 className="text-lg font-bold text-foreground">Projeto não encontrado</h2>
          <Button onClick={() => navigate("/projects")} variant="outline">Voltar aos Projetos</Button>
        </div>
      </>
    );
  }

  const dailyTrend = overview?.daily_trend || [];
  const topPages = overview?.top_pages || [];
  const topQueries = overview?.top_queries || [];
  const devices = overview?.devices || [];
  const countries = overview?.countries || [];
  const indexing = overview?.indexing || {};

  return (
    <>
      <TopBar title={`Dashboard — ${project.name}`} subtitle={project.domain} />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Back + project info bar */}
        <AnimatedContainer>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/projects")}>
              <ArrowLeft className="h-3.5 w-3.5" /> Projetos
            </Button>
            <div className="flex gap-1.5 ml-auto">
              <Badge className={cn("text-[10px]", gscConn ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground")}>
                {gscConn ? <Wifi className="h-2.5 w-2.5 mr-1" /> : <WifiOff className="h-2.5 w-2.5 mr-1" />}
                GSC {gscConn ? "✓" : "—"}
              </Badge>
              <Badge className={cn("text-[10px]", ga4Conn ? "bg-info/10 text-info border-info/30" : "bg-muted text-muted-foreground")}>
                {ga4Conn ? <Wifi className="h-2.5 w-2.5 mr-1" /> : <WifiOff className="h-2.5 w-2.5 mr-1" />}
                GA4 {ga4Conn ? "✓" : "—"}
              </Badge>
            </div>
          </div>
        </AnimatedContainer>

        {/* ═══ SEO KPIs ═══ */}
        <Section title="SEO — Google Search Console" icon={Search} badge="28 dias" delay={0.04}>
          <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat icon={MousePointerClick} iconColor="text-primary" bgColor="bg-primary/10" label="Cliques" value={formatCompact(overview?.total_clicks ?? 0)} />
            <Stat icon={Eye} iconColor="text-info" bgColor="bg-info/10" label="Impressões" value={formatCompact(overview?.total_impressions ?? 0)} />
            <Stat icon={Target} iconColor="text-success" bgColor="bg-success/10" label="CTR Médio" value={`${(overview?.avg_ctr ?? 0).toFixed(2)}%`} />
            <Stat icon={TrendingUp} iconColor="text-warning" bgColor="bg-warning/10" label="Posição Média" value={(overview?.avg_position ?? 0) > 0 ? (overview?.avg_position).toFixed(1) : "—"} />
            <Stat icon={Globe} iconColor="text-chart-5" bgColor="bg-chart-5/10" label="URLs" value={formatCompact(overview?.total_urls ?? 0)} />
            <Stat icon={Search} iconColor="text-chart-6" bgColor="bg-chart-6/10" label="Consultas" value={formatCompact(overview?.total_queries ?? 0)} />
          </StaggeredGrid>
        </Section>

        {/* ═══ Trend Chart ═══ */}
        {dailyTrend.length > 0 && (
          <Section title="Tendência Diária — Cliques & Impressões" icon={Activity} delay={0.06}>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric_date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: string) => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#clicksGrad)" strokeWidth={2} name="Cliques" />
                  <Area type="monotone" dataKey="impressions" stroke="hsl(var(--info))" fill="url(#impressionsGrad)" strokeWidth={1.5} name="Impressões" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        {/* ═══ Top Pages + Top Queries ═══ */}
        <div className="grid lg:grid-cols-2 gap-4">
          {topPages.length > 0 && (
            <Section title="Top Páginas" icon={Globe} badge={`${topPages.length}`} delay={0.08}>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                {topPages.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                    <span className="text-[10px] font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.url?.replace(/https?:\/\/[^/]+/, '') || p.url}</p>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{p.clicks} cliques</span>
                        <span className="text-[10px] text-muted-foreground">{p.impressions} impr.</span>
                        <span className="text-[10px] text-muted-foreground">Pos. {p.position}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {topQueries.length > 0 && (
            <Section title="Top Consultas" icon={Search} badge={`${topQueries.length}`} delay={0.1}>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                {topQueries.map((q: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                    <span className="text-[10px] font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{q.query}</p>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{q.clicks} cliques</span>
                        <span className="text-[10px] text-muted-foreground">{q.impressions} impr.</span>
                        <span className="text-[10px] text-muted-foreground">Pos. {q.position}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ═══ Devices + Countries ═══ */}
        <div className="grid lg:grid-cols-2 gap-4">
          {devices.length > 0 && (
            <Section title="Dispositivos" icon={Layers} delay={0.12}>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={devices} dataKey="clicks" nameKey="device" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} label={({ device, percent }) => `${device} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {devices.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}

          {countries.length > 0 && (
            <Section title="Países" icon={Globe} badge={`${countries.length}`} delay={0.14}>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countries.slice(0, 8)} layout="vertical" margin={{ left: 50, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="country" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={45} />
                    <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Cliques" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}
        </div>

        {/* ═══ Indexação ═══ */}
        <Section title="Indexação" icon={FileSearch} delay={0.16}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={Globe} iconColor="text-primary" bgColor="bg-primary/10" label="Total URLs" value={formatCompact(indexing.total_urls ?? 0)} />
            <Stat icon={CheckCircle2} iconColor="text-success" bgColor="bg-success/10" label="Indexadas" value={formatCompact(indexing.indexed ?? 0)} />
            <Stat icon={AlertTriangle} iconColor="text-warning" bgColor="bg-warning/10" label="Falhas" value={formatCompact(indexing.failed ?? 0)} />
            <Stat icon={Clock} iconColor="text-muted-foreground" bgColor="bg-muted" label="Requests" value={formatCompact(indexing.total_requests ?? 0)} />
          </div>
        </Section>

        {/* ═══ Analytics & Tracking ═══ */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Analytics (GA4)" icon={BarChart3} badge={ga4Conn ? "Conectado" : "Não conectado"} delay={0.18}>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={Users} iconColor="text-chart-5" bgColor="bg-chart-5/10" label="Sessões" value={counts?.sessions ? formatCompact(counts.sessions) : "—"} />
              <Stat icon={Target} iconColor="text-chart-6" bgColor="bg-chart-6/10" label="Conversões" value={counts?.conversions ? formatCompact(counts.conversions) : "—"} />
            </div>
          </Section>

          <Section title="Analítica Rankito" icon={Zap} badge={counts ? `${formatCompact(counts.events)} eventos` : undefined} delay={0.2}>
            <Stat icon={Zap} iconColor="text-primary" bgColor="bg-primary/10" label="Eventos Capturados" value={formatCompact(counts?.events ?? 0)} subtitle="Tracking comportamental" />
          </Section>
        </div>

        {/* Quick actions */}
        <AnimatedContainer delay={0.22}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
              localStorage.setItem("rankito_current_project", projectId!);
              window.dispatchEvent(new Event("rankito_project_changed"));
              navigate("/seo");
            }}>
              <Search className="h-3.5 w-3.5" /> Ver SEO completo
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
              localStorage.setItem("rankito_current_project", projectId!);
              window.dispatchEvent(new Event("rankito_project_changed"));
              navigate("/ga4");
            }}>
              <BarChart3 className="h-3.5 w-3.5" /> Ver Analytics
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
              localStorage.setItem("rankito_current_project", projectId!);
              window.dispatchEvent(new Event("rankito_project_changed"));
              navigate("/indexing");
            }}>
              <FileSearch className="h-3.5 w-3.5" /> Ver Indexação
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
              localStorage.setItem("rankito_current_project", projectId!);
              window.dispatchEvent(new Event("rankito_project_changed"));
              navigate("/conversions");
            }}>
              <Target className="h-3.5 w-3.5" /> Ver Conversões
            </Button>
          </div>
        </AnimatedContainer>
      </div>
    </>
  );
}
