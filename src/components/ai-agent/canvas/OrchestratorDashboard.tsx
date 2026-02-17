import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Play, Pause, Trash2, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { FREQUENCY_LABELS } from "./OrchestratorTemplates";

interface OrchestratorDashboardProps {
  projectId?: string;
}

export function OrchestratorDashboard({ projectId }: OrchestratorDashboardProps) {
  const { user } = useAuth();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

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
        .limit(20);
      return data || [];
    },
    enabled: !!projectId,
    refetchInterval: 10000, // poll for running status
  });

  const handleRunNow = async (deployment: any) => {
    if (!user || !projectId) return;
    setRunningId(deployment.id);
    try {
      const { error } = await supabase.functions.invoke("run-orchestrator", {
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
      toast.success("Execução iniciada!");
      refetchRuns();
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar");
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
      refetchDeployments();
    }
  };

  if (deployments.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        Orquestradores Implantados
      </h3>

      {deployments.map((dep: any) => {
        const depRuns = runs.filter((r: any) => r.deployment_id === dep.id);
        const lastRun = depRuns[0];
        const roles = (dep.roles as any[]) || [];

        return (
          <Card key={dep.id} className="border-border bg-card/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  🏢 {dep.name}
                  <Badge variant={dep.status === "active" ? "default" : "secondary"} className="text-[8px]">
                    {dep.status === "active" ? "Ativo" : "Pausado"}
                  </Badge>
                  <Badge variant="outline" className="text-[8px]">{roles.length} agentes</Badge>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleRunNow(dep)}
                    disabled={runningId === dep.id}
                  >
                    {runningId === dep.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 text-primary" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleToggleStatus(dep.id, dep.status)}
                  >
                    {dep.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDelete(dep.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {/* Role chips */}
              <div className="flex flex-wrap gap-1">
                {roles.map((r: any) => (
                  <Badge key={r.id} variant="outline" className="text-[8px] gap-1">
                    {r.emoji} {r.title}
                    <span className="text-muted-foreground">({FREQUENCY_LABELS[r.routine?.frequency] || "—"})</span>
                  </Badge>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span>Execuções: {dep.run_count || 0}</span>
                {dep.last_run_at && (
                  <span>Última: {new Date(dep.last_run_at).toLocaleString("pt-BR")}</span>
                )}
              </div>

              {/* Recent runs */}
              {depRuns.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase">Últimas Execuções</p>
                  {depRuns.slice(0, 3).map((run: any) => {
                    const isExpanded = expandedRun === run.id;
                    const results = (run.agent_results as any[]) || [];
                    const successCount = results.filter((r: any) => r.status === "success").length;

                    return (
                      <div key={run.id} className="rounded border border-border bg-background/50">
                        <button
                          onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                          className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted/30 transition-colors"
                        >
                          {run.status === "running" ? (
                            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                          ) : run.status === "completed" ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-destructive" />
                          )}
                          <span className="text-[10px] flex-1">
                            {new Date(run.started_at).toLocaleString("pt-BR")}
                          </span>
                          <Badge variant="outline" className="text-[8px]">
                            {successCount}/{results.length} ✓
                          </Badge>
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>

                        {isExpanded && (
                          <div className="px-2 pb-2 space-y-2">
                            {results.map((ar: any, i: number) => (
                              <div key={i} className="p-2 rounded bg-muted/30 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">{ar.emoji}</span>
                                  <span className="text-[10px] font-semibold">{ar.role_title}</span>
                                  {ar.status === "success" ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-destructive ml-auto" />
                                  )}
                                </div>
                                <ScrollArea className="max-h-32">
                                  <p className="text-[10px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                    {ar.result?.slice(0, 500)}
                                    {ar.result?.length > 500 && "..."}
                                  </p>
                                </ScrollArea>
                              </div>
                            ))}

                            {run.summary && (
                              <div className="p-2 rounded bg-primary/5 border border-primary/20">
                                <p className="text-[10px] font-semibold text-primary mb-1">📝 Resumo Executivo (CEO)</p>
                                <ScrollArea className="max-h-40">
                                  <p className="text-[10px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
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
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
