import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Play, Pause, Trash2, CheckCircle2, XCircle,
  Loader2, ChevronDown, ChevronRight, Send, Plus, Clock,
  AlertTriangle, MonitorPlay, Users, ListChecks, Map,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { FREQUENCY_LABELS } from "./OrchestratorTemplates";
import { CreateOrchestratorDialog } from "./CreateOrchestratorDialog";
import { CeoOnboardingChat } from "./CeoOnboardingChat";
import { TeamWarRoom } from "./TeamWarRoom";
import { OrchestratorTaskBoard } from "./OrchestratorTaskBoard";
import { StrategicPlanPanel } from "./StrategicPlanPanel";

interface OrchestratorDashboardProps {
  projectId?: string;
  onViewCanvas?: (nodes: any[], edges: any[], name: string) => void;
}

/** Translate raw AI error messages into user-friendly Portuguese */
function friendlyError(raw: string): string {
  if (raw.includes("402") || raw.includes("payment_required") || raw.includes("Not enough credits")) {
    return "⚠️ Créditos de IA insuficientes. Aguarde a renovação ou faça upgrade do plano.";
  }
  if (raw.includes("429") || raw.includes("rate_limited")) {
    return "⚠️ Limite de requisições atingido. Tente novamente em alguns minutos.";
  }
  if (raw.includes("500") || raw.includes("internal")) {
    return "⚠️ Erro interno do servidor de IA. Tente novamente.";
  }
  return raw;
}

export function OrchestratorDashboard({ projectId, onViewCanvas }: OrchestratorDashboardProps) {
  const { user } = useAuth();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [expandedDeployment, setExpandedDeployment] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [ceoOnboardingOpen, setCeoOnboardingOpen] = useState(false);
  const [warRoomDepId, setWarRoomDepId] = useState<string | null>(null);

  const { data: deployments = [], refetch: refetchDeployments } = useQuery({
    queryKey: ["orchestrator-deployments", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from("orchestrator_deployments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: runs = [], refetch: refetchRuns } = useQuery({
    queryKey: ["orchestrator-runs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from("orchestrator_runs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!projectId,
    refetchInterval: 10000,
  });

  const handleRunNow = async (deployment: any) => {
    if (!user || !projectId) return;
    setRunningId(deployment.id);
    try {
      const { data, error } = await supabase.functions.invoke("run-orchestrator", {
        body: {
          deployment_id: deployment.id,
          project_id: projectId,
          owner_id: user.id,
          roles: deployment.roles,
          hierarchy: deployment.hierarchy,
          trigger_type: "manual",
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(friendlyError(data.error));
      } else {
        toast.success("Execução iniciada!");
        // Auto-open war room for this deployment
        setWarRoomDepId(deployment.id);
      }
      refetchRuns();
      refetchDeployments();
    } catch (err: any) {
      toast.error(friendlyError(err.message || "Erro ao executar"));
    } finally {
      setRunningId(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("orchestrator_deployments")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(newStatus === "active" ? "Orquestrador ativado" : "Orquestrador pausado");
      refetchDeployments();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("orchestrator_deployments")
      .delete()
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Orquestrador removido");
      if (warRoomDepId === id) setWarRoomDepId(null);
      refetchDeployments();
    }
  };

  const handleGenerated = () => {
    refetchDeployments();
    refetchRuns();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Orquestrador de Agentes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Equipes autônomas de IA que analisam dados reais, geram relatórios e tomam ações automaticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setCeoOnboardingOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Criar Equipe
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Modo Avançado
          </Button>
        </div>
      </div>

      {/* Stats summary */}
      {deployments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Equipes</p>
            <p className="text-2xl font-bold">{deployments.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Ativas</p>
            <p className="text-2xl font-bold text-emerald-500">{deployments.filter((d: any) => d.status === "active").length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Execuções</p>
            <p className="text-2xl font-bold">{runs.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Agentes</p>
            <p className="text-2xl font-bold">{deployments.reduce((sum: number, d: any) => sum + ((d.roles as any[])?.length || 0), 0)}</p>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {deployments.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <h3 className="text-sm font-semibold mb-1">Nenhum orquestrador criado</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Crie uma equipe autônoma de agentes de IA para analisar seu projeto automaticamente.
          </p>
          <Button size="sm" onClick={() => setCeoOnboardingOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Criar Primeira Equipe
          </Button>
        </Card>
      )}

      {/* Deployments list */}
      <div className="space-y-4">
        {deployments.map((dep: any) => {
          const depRuns = runs.filter((r: any) => r.deployment_id === dep.id);
          const lastRun = depRuns[0];
          const roles = (dep.roles as any[]) || [];
          const isExpanded = expandedDeployment === dep.id;
          const isWarRoomOpen = warRoomDepId === dep.id;
          const allFailed = lastRun && (lastRun.agent_results as any[])?.every((r: any) => r.status === "error");
          const hasCreditsError = lastRun && JSON.stringify(lastRun.agent_results || "").includes("402");
          const hasRateLimit = lastRun && JSON.stringify(lastRun.agent_results || "").includes("429");

          return (
            <Card key={dep.id} className="border-border overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExpandedDeployment(isExpanded ? null : dep.id)}
                    className="flex items-center gap-3 text-left flex-1"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        🏢 {dep.name}
                        <Badge variant={dep.status === "active" ? "default" : "secondary"} className="text-[9px]">
                          {dep.status === "active" ? "Ativo" : "Pausado"}
                        </Badge>
                        {lastRun?.status === "running" && (
                          <Badge className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 gap-1">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" /> Em execução
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {roles.length} agentes · {dep.run_count || 0} execuções
                        {dep.last_run_at && ` · Última: ${new Date(dep.last_run_at).toLocaleString("pt-BR")}`}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5">
                    {/* War Room toggle */}
                    <Button
                      variant={isWarRoomOpen ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setWarRoomDepId(isWarRoomOpen ? null : dep.id)}
                    >
                      <MonitorPlay className="h-3 w-3" />
                      War Room
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleRunNow(dep)}
                      disabled={runningId === dep.id}
                    >
                      {runningId === dep.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Executar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => handleToggleStatus(dep.id, dep.status)}>
                      {dep.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => handleDelete(dep.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Error banner */}
                {allFailed && (hasCreditsError || hasRateLimit) && (
                  <div className="mt-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="text-[11px] text-destructive">
                      {hasCreditsError
                        ? "A última execução falhou por falta de créditos de IA. Aguarde a renovação ou faça upgrade do plano para executar novamente."
                        : "A última execução foi limitada por taxa de requisições. Tente novamente em alguns minutos."}
                    </div>
                  </div>
                )}

                {/* Role chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {roles.map((r: any) => (
                    <Badge key={r.id} variant="outline" className="text-[9px] gap-1">
                      {r.emoji} {r.title}
                      <span className="text-muted-foreground">({FREQUENCY_LABELS[r.routine?.frequency] || "—"})</span>
                    </Badge>
                  ))}
                </div>

                {/* War Room — full command center */}
                {isWarRoomOpen && (
                  <div className="mt-3 border-t border-border pt-3 space-y-3">
                    <Tabs defaultValue="warroom" className="w-full">
                      <TabsList className="w-full h-8 text-xs grid grid-cols-3">
                        <TabsTrigger value="warroom" className="gap-1.5 text-[11px]">
                          <MonitorPlay className="h-3.5 w-3.5" /> War Room
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="gap-1.5 text-[11px]">
                          <ListChecks className="h-3.5 w-3.5" /> Tarefas do Time
                        </TabsTrigger>
                        <TabsTrigger value="plan" className="gap-1.5 text-[11px]">
                          <Map className="h-3.5 w-3.5" /> Plano Estratégico
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="warroom" className="mt-3">
                        <TeamWarRoom
                          deployment={dep}
                          runs={runs}
                          onClose={() => setWarRoomDepId(null)}
                          onRunNow={() => handleRunNow(dep)}
                          isRunning={runningId === dep.id}
                          onRefresh={() => { refetchDeployments(); refetchRuns(); }}
                          projectId={projectId}
                        />
                      </TabsContent>
                      <TabsContent value="tasks" className="mt-3">
                        <OrchestratorTaskBoard deploymentId={dep.id} projectId={projectId} />
                      </TabsContent>
                      <TabsContent value="plan" className="mt-3">
                        <StrategicPlanPanel deploymentId={dep.id} projectId={projectId} />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardHeader>

              {/* Expanded content - runs history */}
              {isExpanded && (
                <CardContent className="px-5 pb-4 pt-0 space-y-3 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase pt-3">Histórico de Execuções</p>

                  {depRuns.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma execução ainda. Clique em "Executar" para iniciar.</p>
                  )}

                  {depRuns.slice(0, 10).map((run: any) => {
                    const isRunExpanded = expandedRun === run.id;
                    const results = (run.agent_results as any[]) || [];
                    const successCount = results.filter((r: any) => r.status === "success").length;

                    return (
                      <div key={run.id} className="rounded-lg border border-border bg-card/50">
                        <button
                          onClick={() => setExpandedRun(isRunExpanded ? null : run.id)}
                          className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
                        >
                          {run.status === "running" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                          ) : run.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <div className="flex-1">
                            <span className="text-xs font-medium">
                              {new Date(run.started_at).toLocaleString("pt-BR")}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              {run.status === "running" ? "Em execução..." : run.status === "completed" ? "Concluído" : successCount === 0 ? "Falhou" : "Parcial"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            {successCount}/{results.length} ✓
                          </Badge>
                          {run.completed_at && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                            </span>
                          )}
                          {isRunExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>

                        {isRunExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                            {results.map((ar: any, i: number) => (
                              <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{ar.emoji}</span>
                                  <span className="text-xs font-semibold">{ar.role_title}</span>
                                  {ar.status === "success" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 text-destructive ml-auto" />
                                  )}
                                </div>
                                <ScrollArea className="max-h-48">
                                  <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                    {ar.status === "error" ? friendlyError(ar.result) : ar.result}
                                  </p>
                                </ScrollArea>
                              </div>
                            ))}

                            {run.summary && !run.summary.includes("AI error") && (
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <p className="text-xs font-semibold text-primary mb-1.5">📝 Resumo Executivo (CEO)</p>
                                <ScrollArea className="max-h-60">
                                  <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                    {run.summary}
                                  </p>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* CEO Onboarding Chat */}
      <CeoOnboardingChat
        open={ceoOnboardingOpen}
        onOpenChange={setCeoOnboardingOpen}
        projectId={projectId}
        onDeployed={() => { refetchDeployments(); refetchRuns(); }}
      />

      {/* Advanced Create dialog */}
      <CreateOrchestratorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onGenerated={handleGenerated}
        projectId={projectId}
      />
    </div>
  );
}
