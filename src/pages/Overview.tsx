import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { formatCompact } from "@/components/overview/types";
import { cn } from "@/lib/utils";
import {
  Globe, Search, BarChart3, Database, Bot, MousePointerClick,
  Target, TrendingUp, Eye, FileSearch, CheckCircle2, XCircle,
  Users, Activity, Layers, DollarSign, Sparkles, Settings,
  ArrowRight, Wifi, WifiOff, FileText, Zap, Clock, AlertTriangle,
  Link2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// --- Mini stat card ---
function MiniStat({ icon: Icon, iconColor, bgColor, label, value, subtitle }: {
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

// --- Section wrapper ---
function Section({ title, icon: Icon, badge, children, to, delay = 0 }: {
  title: string; icon: React.ElementType; badge?: string; children: React.ReactNode; to?: string; delay?: number;
}) {
  const navigate = useNavigate();
  return (
    <AnimatedContainer delay={delay}>
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-2 px-5 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-sm font-bold tracking-tight font-display">{title}</CardTitle>
              {badge && <Badge variant="secondary" className="text-[10px] rounded-full font-normal">{badge}</Badge>}
            </div>
            {to && (
              <Button variant="ghost" size="sm" className="text-[11px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => navigate(to)}>
                Ver detalhes <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {children}
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentProjectId] = useState(localStorage.getItem("rankito_current_project"));

  // Project
  const { data: project } = useQuery({
    queryKey: ["overview-project", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return null;
      const { data } = await supabase.from("projects").select("*").eq("id", currentProjectId).maybeSingle();
      return data;
    },
    enabled: !!currentProjectId,
  });

  const projectId = project?.id;

  // Integrations
  const { data: gscConn } = useQuery({
    queryKey: ["overview-gsc", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("gsc_connections").select("site_url, connection_name, last_sync_at").eq("project_id", projectId!).limit(1);
      return data?.[0] || null;
    },
    enabled: !!projectId,
  });

  const { data: ga4Conn } = useQuery({
    queryKey: ["overview-ga4", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("ga4_connections").select("property_name, property_id, last_sync_at").eq("project_id", projectId!).limit(1);
      return data?.[0] || null;
    },
    enabled: !!projectId,
  });

  // Counts (parallel)
  const { data: counts } = useQuery({
    queryKey: ["overview-counts", projectId],
    queryFn: async () => {
      const [seo, urls, sessions, conversions, events, agents, workflows, indexReqs, rrPages, rrContracts] = await Promise.all([
        supabase.from("seo_metrics").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("site_urls").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("conversions").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("tracking_events").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("ai_agents").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("agent_workflows").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("indexing_requests").select("id, status", { count: "exact", head: false }).eq("project_id", projectId!),
        supabase.from("rr_pages").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
        supabase.from("rr_contracts").select("id", { count: "exact", head: true }).eq("project_id", projectId!),
      ]);

      const indexData = indexReqs.data || [];
      return {
        seo: seo.count || 0,
        urls: urls.count || 0,
        sessions: sessions.count || 0,
        conversions: conversions.count || 0,
        events: events.count || 0,
        agents: agents.count || 0,
        workflows: workflows.count || 0,
        indexTotal: indexReqs.count || 0,
        indexSubmitted: indexData.filter((r: any) => r.status === "completed" || r.status === "success").length,
        indexFailed: indexData.filter((r: any) => r.status === "failed" || r.status === "quota_exceeded").length,
        indexPending: indexData.filter((r: any) => r.status === "pending" || r.status === "processing").length,
        rrPages: rrPages.count || 0,
        rrContracts: rrContracts.count || 0,
      };
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  // SEO top-level from RPC
  const { data: seoSummary } = useQuery({
    queryKey: ["overview-seo-summary", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_project_overview_v2", { p_project_id: projectId! });
      if (error) return null;
      return data as any;
    },
    enabled: !!projectId,
    staleTime: 2 * 60_000,
  });

  // Recent sync jobs
  const { data: recentJobs = [] } = useQuery({
    queryKey: ["overview-jobs", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("sync_jobs").select("id, job_type, status, created_at")
        .eq("project_id", projectId!).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!projectId,
  });

  // Greeting
  const hour = new Date().getHours();
  const greet = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";

  if (!projectId) {
    return (
      <>
        <TopBar title="Visão Geral" subtitle="Resumo do projeto" />
        <div className="p-6 flex flex-col items-center justify-center h-[60vh] text-center gap-4">
          <Globe className="h-16 w-16 text-muted-foreground/20" />
          <h2 className="text-lg font-bold text-foreground">Nenhum projeto selecionado</h2>
          <p className="text-sm text-muted-foreground max-w-md">Selecione um projeto na barra lateral ou crie um novo para começar.</p>
          <Button onClick={() => navigate("/projects")} className="gap-2">
            <Layers className="h-4 w-4" /> Ver Projetos
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Visão Geral" subtitle={project ? `${project.name} — Resumo completo do projeto` : "Resumo do projeto"} />
      <div className="p-4 sm:p-6 space-y-4">

        {/* Welcome Banner */}
        <AnimatedContainer>
          <div className="gradient-primary rounded-2xl p-5 sm:p-6 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
            <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/[0.04] blur-3xl" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 opacity-70" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">Projeto Ativo</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight">
                  {greet}, {displayName}! 👋
                </h2>
                <p className="text-xs opacity-70 max-w-lg leading-relaxed">
                  Aqui está o resumo completo do projeto <strong>{project?.name}</strong> ({project?.domain}).
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge className={cn("text-[10px] backdrop-blur-sm border", gscConn ? "bg-white/10 text-white border-white/15" : "bg-white/5 text-white/50 border-white/10")}>
                  {gscConn ? <Wifi className="h-2.5 w-2.5 mr-1" /> : <WifiOff className="h-2.5 w-2.5 mr-1" />}
                  GSC {gscConn ? "✓" : "—"}
                </Badge>
                <Badge className={cn("text-[10px] backdrop-blur-sm border", ga4Conn ? "bg-white/10 text-white border-white/15" : "bg-white/5 text-white/50 border-white/10")}>
                  {ga4Conn ? <Wifi className="h-2.5 w-2.5 mr-1" /> : <WifiOff className="h-2.5 w-2.5 mr-1" />}
                  GA4 {ga4Conn ? "✓" : "—"}
                </Badge>
              </div>
            </div>
          </div>
        </AnimatedContainer>

        {/* Project Info */}
        <Section title="Informações do Projeto" icon={Settings} to="/project-settings" delay={0.04}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Domínio</p>
              <p className="text-sm font-semibold text-foreground truncate">{project?.domain}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo de Site</p>
              <p className="text-sm font-semibold text-foreground">{project?.site_type || "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">País / Cidade</p>
              <p className="text-sm font-semibold text-foreground">{[project?.country, project?.city].filter(Boolean).join(", ") || "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
              <Badge variant={project?.status === "active" ? "default" : "secondary"} className="text-[10px]">
                {project?.status === "active" ? "Ativo" : project?.status || "—"}
              </Badge>
            </div>
          </div>
        </Section>

        {/* Integrações */}
        <Section title="Integrações" icon={Link2} to="/project-settings" delay={0.06}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={cn("flex items-center gap-3 p-3 rounded-xl border", gscConn ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30")}>
              <div className={cn("p-2 rounded-lg", gscConn ? "bg-emerald-500/10" : "bg-muted")}>
                <Search className={cn("h-4 w-4", gscConn ? "text-emerald-600" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Google Search Console</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {gscConn ? `${gscConn.site_url} • ${gscConn.connection_name}` : "Não conectado"}
                </p>
              </div>
              {gscConn ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
            </div>
            <div className={cn("flex items-center gap-3 p-3 rounded-xl border", ga4Conn ? "border-blue-500/30 bg-blue-500/5" : "border-border bg-muted/30")}>
              <div className={cn("p-2 rounded-lg", ga4Conn ? "bg-blue-500/10" : "bg-muted")}>
                <BarChart3 className={cn("h-4 w-4", ga4Conn ? "text-blue-600" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Google Analytics 4</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {ga4Conn ? `${ga4Conn.property_name} (ID: ${ga4Conn.property_id})` : "Não conectado"}
                </p>
              </div>
              {ga4Conn ? <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
            </div>
          </div>
        </Section>

        {/* SEO Summary */}
        <Section title="SEO" icon={Search} badge={counts ? `${formatCompact(counts.seo)} métricas` : undefined} to="/seo" delay={0.08}>
          <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniStat icon={MousePointerClick} iconColor="text-primary" bgColor="bg-primary/10" label="Cliques" value={formatCompact(seoSummary?.total_clicks ?? 0)} subtitle="28 dias" />
            <MiniStat icon={Eye} iconColor="text-info" bgColor="bg-info/10" label="Impressões" value={formatCompact(seoSummary?.total_impressions ?? 0)} />
            <MiniStat icon={Target} iconColor="text-success" bgColor="bg-success/10" label="CTR Médio" value={`${(seoSummary?.avg_ctr ?? 0).toFixed(2)}%`} />
            <MiniStat icon={TrendingUp} iconColor="text-warning" bgColor="bg-warning/10" label="Posição Média" value={seoSummary?.avg_position > 0 ? seoSummary.avg_position.toFixed(1) : "—"} />
            <MiniStat icon={Globe} iconColor="text-chart-5" bgColor="bg-chart-5/10" label="Páginas" value={formatCompact(seoSummary?.total_urls ?? 0)} />
            <MiniStat icon={Search} iconColor="text-chart-6" bgColor="bg-chart-6/10" label="Consultas" value={formatCompact(seoSummary?.total_queries ?? 0)} />
          </StaggeredGrid>
        </Section>

        {/* URLs & Indexação */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="URLs Mapeadas" icon={Globe} badge={counts ? formatCompact(counts.urls) : undefined} to="/urls" delay={0.1}>
            <MiniStat icon={Globe} iconColor="text-primary" bgColor="bg-primary/10" label="Total de URLs" value={formatCompact(counts?.urls ?? 0)} subtitle="Inventário completo" />
          </Section>

          <Section title="Indexação" icon={FileSearch} badge={counts ? `${formatCompact(counts.indexTotal)} requests` : undefined} to="/indexing" delay={0.12}>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={CheckCircle2} iconColor="text-success" bgColor="bg-success/10" label="Enviadas" value={counts?.indexSubmitted ?? 0} />
              <MiniStat icon={AlertTriangle} iconColor="text-warning" bgColor="bg-warning/10" label="Falhas" value={counts?.indexFailed ?? 0} />
              <MiniStat icon={Clock} iconColor="text-muted-foreground" bgColor="bg-muted" label="Pendentes" value={counts?.indexPending ?? 0} />
            </div>
          </Section>
        </div>

        {/* Analytics & Tracking */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Analytics (GA4)" icon={BarChart3} badge={ga4Conn ? "Conectado" : "Não conectado"} to="/ga4" delay={0.14}>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat icon={Users} iconColor="text-chart-5" bgColor="bg-chart-5/10" label="Sessões" value={counts?.sessions ? formatCompact(counts.sessions) : ga4Conn ? "Ver GA4" : "—"} />
              <MiniStat icon={Target} iconColor="text-chart-6" bgColor="bg-chart-6/10" label="Conversões" value={counts?.conversions ? formatCompact(counts.conversions) : ga4Conn ? "Ver GA4" : "—"} />
            </div>
          </Section>

          <Section title="Analítica Rankito" icon={MousePointerClick} badge={counts ? `${formatCompact(counts.events)} eventos` : undefined} to="/analitica-rankito" delay={0.16}>
            <MiniStat icon={Zap} iconColor="text-primary" bgColor="bg-primary/10" label="Eventos Capturados" value={formatCompact(counts?.events ?? 0)} subtitle="Tracking comportamental" />
          </Section>
        </div>

        {/* IA & Workflows */}
        <Section title="Rankito IA" icon={Bot} badge={counts ? `${counts.agents} agentes` : undefined} to="/rankito-ai" delay={0.18}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniStat icon={Bot} iconColor="text-primary" bgColor="bg-primary/10" label="Agentes" value={counts?.agents ?? 0} subtitle="Configurados" />
            <MiniStat icon={Sparkles} iconColor="text-chart-5" bgColor="bg-chart-5/10" label="Workflows" value={counts?.workflows ?? 0} subtitle="Automatizados" />
            <MiniStat icon={Activity} iconColor="text-info" bgColor="bg-info/10" label="Status" value={gscConn || ga4Conn ? "Conectado" : "Sem dados"} subtitle="Dados em tempo real" />
          </div>
        </Section>

        {/* Rank & Rent (if any) */}
        {(counts?.rrPages ?? 0) > 0 || (counts?.rrContracts ?? 0) > 0 ? (
          <Section title="Rank & Rent" icon={DollarSign} to="/rank-rent" delay={0.2}>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat icon={Layers} iconColor="text-primary" bgColor="bg-primary/10" label="Páginas R&R" value={counts?.rrPages ?? 0} />
              <MiniStat icon={FileText} iconColor="text-success" bgColor="bg-success/10" label="Contratos" value={counts?.rrContracts ?? 0} />
            </div>
          </Section>
        ) : null}

        {/* Jobs recentes */}
        {recentJobs.length > 0 && (
          <Section title="Atividade Recente" icon={Clock} delay={0.22}>
            <div className="space-y-1.5">
              {recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">{job.job_type}</span>
                    <Badge variant="outline" className={cn("text-[10px]",
                      job.status === "completed" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" :
                      job.status === "failed" ? "bg-red-500/15 text-red-600 border-red-500/30" :
                      "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
                    )}>
                      {job.status === "completed" ? "✓" : job.status === "failed" ? "✗" : "⏳"} {job.status}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(job.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  );
}
