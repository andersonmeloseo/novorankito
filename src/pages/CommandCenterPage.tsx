import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot, Zap, AlertTriangle, TrendingDown, Target, Shield,
  RefreshCw, Loader2, Activity, Clock, CheckCircle2, XCircle,
  Sparkles, Terminal, Eye, BarChart3, ArrowRight, Copy,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { McpHealthBadge } from "@/components/command-center/McpHealthBadge";
import { ProjectSyncButton } from "@/components/command-center/ProjectSyncButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-500 border-blue-500/30",
};

const ANOMALY_ICONS: Record<string, React.ElementType> = {
  traffic_drop: TrendingDown,
  indexing_error: AlertTriangle,
  opportunity: Target,
  ctr_spike: Zap,
  position_change: BarChart3,
};

export default function CommandCenterPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>("");

  const projectId = selectedProject || (typeof window !== "undefined" ? localStorage.getItem("rankito_current_project") || "" : "");

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["cc-projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, domain").eq("owner_id", user!.id).order("name");
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch anomalies
  const { data: anomalies = [], isLoading: loadingAnomalies } = useQuery({
    queryKey: ["cc-anomalies", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_anomalies").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50);
      return (data as any[]) || [];
    },
    enabled: !!projectId,
  });

  // Fetch action log
  const { data: actionLog = [], isLoading: loadingLog } = useQuery({
    queryKey: ["cc-action-log", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_action_log").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(30);
      return (data as any[]) || [];
    },
    enabled: !!projectId,
  });

  // Trigger anomaly scan
  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mcp-server", {
        body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "trigger_anomaly_scan", arguments: { project_id: projectId } } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const result = data?.result?.content?.[0]?.text;
      const parsed = result ? JSON.parse(result) : {};
      toast.success(`Scan completo: ${parsed.new_anomalies?.length || 0} novas anomalias detectadas`);
      qc.invalidateQueries({ queryKey: ["cc-anomalies"] });
    },
    onError: (e: any) => toast.error(`Erro no scan: ${e.message}`),
  });

  // Update anomaly status
  const updateAnomaly = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("mcp_anomalies").update({ status, ...(status === "actioned" ? { actioned_at: new Date().toISOString() } : {}) } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["cc-anomalies"] });
    },
  });

  const mcpUrl = `https://luulxhajwrxnthjutibc.supabase.co/functions/v1/mcp-server`;

  const newAnomalies = anomalies.filter((a: any) => a.status === "new");
  const actionedAnomalies = anomalies.filter((a: any) => a.status === "actioned");
  const successActions = actionLog.filter((a: any) => a.status === "success");
  const errorActions = actionLog.filter((a: any) => a.status === "error");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Claude Command Center"
          description="Central de automação IA — anomalias, ações do Claude e integração MCP"
        />
        <McpHealthBadge />
      </div>

      {/* Project selector + MCP info */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={projectId} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64 text-xs h-9">
            <SelectValue placeholder="Selecionar projeto..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9" onClick={() => { navigator.clipboard.writeText(mcpUrl); toast.success("URL copiada!"); }}>
          <Copy className="h-3 w-3" /> Copiar URL MCP
        </Button>

        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9" onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending || !projectId}>
          {scanMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Scan de Anomalias
        </Button>
        <ProjectSyncButton
          projectId={projectId}
          projectName={projects.find((p: any) => p.id === projectId)?.name}
          compact
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Anomalias Novas</span>
          </div>
          <p className="text-2xl font-bold">{newAnomalies.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Ações Tomadas</span>
          </div>
          <p className="text-2xl font-bold">{actionedAnomalies.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Chamadas MCP</span>
          </div>
          <p className="text-2xl font-bold">{actionLog.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Erros</span>
          </div>
          <p className="text-2xl font-bold">{errorActions.length}</p>
        </Card>
      </div>

      {/* Main content */}
      <Tabs defaultValue="anomalies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="anomalies" className="text-xs gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Anomalias {newAnomalies.length > 0 && <Badge variant="destructive" className="text-[9px] px-1 h-4">{newAnomalies.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs gap-1.5">
            <Terminal className="h-3.5 w-3.5" /> Log de Ações
          </TabsTrigger>
          <TabsTrigger value="setup" className="text-xs gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Configuração MCP
          </TabsTrigger>
        </TabsList>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="space-y-3">
          {loadingAnomalies ? (
            <Card className="p-8 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Card>
          ) : anomalies.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma anomalia detectada.</p>
              <p className="text-xs text-muted-foreground mt-1">Execute um scan ou aguarde a detecção automática.</p>
            </Card>
          ) : (
            anomalies.map((a: any) => {
              const Icon = ANOMALY_ICONS[a.anomaly_type] || AlertTriangle;
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${SEVERITY_COLORS[a.severity] || "bg-muted"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-medium">{a.title}</h4>
                          <Badge variant="outline" className={`text-[9px] ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</Badge>
                          <Badge variant="outline" className="text-[9px]">{a.anomaly_type.replace("_", " ")}</Badge>
                          {a.status !== "new" && <Badge variant="secondary" className="text-[9px]">{a.status}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                        {a.claude_response && (
                          <div className="mt-2 p-2 rounded bg-muted text-xs">
                            <p className="font-medium text-[10px] text-muted-foreground mb-0.5">🤖 Resposta do Claude:</p>
                            <p className="line-clamp-3">{a.claude_response}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1.5">{format(new Date(a.created_at), "dd MMM yyyy HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {a.status === "new" && (
                        <>
                          <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1" onClick={() => updateAnomaly.mutate({ id: a.id, status: "actioned" })}>
                            <CheckCircle2 className="h-3 w-3" /> Resolver
                          </Button>
                          <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1" onClick={() => updateAnomaly.mutate({ id: a.id, status: "dismissed" })}>
                            <Eye className="h-3 w-3" /> Ignorar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Action Log Tab */}
        <TabsContent value="actions" className="space-y-3">
          {loadingLog ? (
            <Card className="p-8 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Card>
          ) : actionLog.length === 0 ? (
            <Card className="p-8 text-center">
              <Terminal className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Quando o Claude executar ações via MCP, elas aparecerão aqui.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {actionLog.map((a: any) => (
                <Card key={a.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${a.status === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                      {a.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-medium">{a.tool_name}</code>
                        <Badge variant="outline" className="text-[9px]">{a.source}</Badge>
                        {a.duration_ms && <span className="text-[10px] text-muted-foreground">{a.duration_ms}ms</span>}
                      </div>
                      {a.error_message && <p className="text-[10px] text-destructive mt-0.5 truncate">{a.error_message}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(a.created_at), "HH:mm dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Configuração do MCP Server
            </h3>

            <div className="space-y-4">
              {/* Sync card */}
              <ProjectSyncButton
                projectId={projectId}
                projectName={projects.find((p: any) => p.id === projectId)?.name}
              />

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">URL do Servidor MCP</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono break-all">{mcpUrl}</code>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(mcpUrl); toast.success("Copiado!"); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Transport</p>
                <code className="text-xs bg-muted px-3 py-2 rounded-lg font-mono block">Streamable HTTP (JSON-RPC 2.0 via POST)</code>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Configuração para Antigravity / Claude Mode</p>
                <pre className="text-[11px] bg-muted p-3 rounded-lg font-mono overflow-x-auto">
{`{
  "mcpServers": {
    "rankito": {
      "type": "streamable-http",
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer SUA_API_KEY"
      }
    }
  }
}`}
                </pre>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tools Disponíveis ({TOOL_NAMES.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {TOOL_NAMES.map(t => (
                    <div key={t.name} className="flex items-center gap-1.5 text-[10px] p-1.5 rounded bg-muted/50">
                      <ArrowRight className="h-2.5 w-2.5 text-primary shrink-0" />
                      <code className="font-mono truncate">{t.name}</code>
                      <Badge variant={t.isAction ? "default" : "secondary"} className="text-[8px] ml-auto shrink-0">
                        {t.isAction ? "ação" : "dados"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const TOOL_NAMES = [
  { name: "list_projects", isAction: false },
  { name: "get_project_overview", isAction: false },
  { name: "get_seo_metrics", isAction: false },
  { name: "get_analytics_sessions", isAction: false },
  { name: "get_site_urls", isAction: false },
  { name: "get_indexing_status", isAction: false },
  { name: "get_index_coverage", isAction: false },
  { name: "get_conversions", isAction: false },
  { name: "get_anomalies", isAction: false },
  { name: "ask_rankito_ai", isAction: true },
  { name: "list_ai_agents", isAction: false },
  { name: "get_orchestrator_runs", isAction: false },
  { name: "run_orchestrator", isAction: true },
  { name: "create_task", isAction: true },
  { name: "trigger_anomaly_scan", isAction: true },
  { name: "update_anomaly_status", isAction: true },
  { name: "generate_seo_report", isAction: true },
  { name: "get_mcp_action_log", isAction: false },
  { name: "sync_project_context", isAction: true },
  { name: "get_latest_sync", isAction: false },
];
