import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Zap, Plus, Loader2, CheckCircle2, AlertTriangle,
  TrendingDown, Target, BarChart3, ArrowRight, Play, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ANOMALY_TYPES = [
  { value: "traffic_drop", label: "Queda de tráfego", icon: TrendingDown },
  { value: "indexing_error", label: "Erros de indexação", icon: AlertTriangle },
  { value: "opportunity", label: "Oportunidade SEO", icon: Target },
  { value: "ctr_spike", label: "Pico de CTR", icon: Zap },
  { value: "position_change", label: "Mudança de posição", icon: BarChart3 },
];

const SEVERITY_LEVELS = ["low", "medium", "high", "critical"];
const CATEGORIES = ["seo", "content", "technical", "analytics", "growth"];
const PRIORITIES = ["low", "medium", "high", "critical"];

interface AutomationRulesTabProps {
  projectId: string;
}

export function AutomationRulesTab({ projectId }: AutomationRulesTabProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [anomalyType, setAnomalyType] = useState("traffic_drop");
  const [minSeverity, setMinSeverity] = useState("medium");
  const [taskCategory, setTaskCategory] = useState("seo");
  const [taskPriority, setTaskPriority] = useState("high");
  const [taskRole, setTaskRole] = useState("");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation-rules", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("mcp_automation_rules" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!projectId,
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mcp_automation_rules" as any).insert({
        owner_id: user!.id,
        project_id: projectId,
        name: ruleName,
        trigger_type: "anomaly",
        trigger_filter: { anomaly_type: anomalyType, min_severity: minSeverity },
        action_type: "create_task",
        action_config: { category: taskCategory, priority: taskPriority, assigned_role: taskRole || null },
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra criada!");
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
      setDialogOpen(false);
      setRuleName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("mcp_automation_rules" as any)
        .update({ enabled } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mcp_automation_rules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra removida");
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });

  const runAutomation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mcp-server", {
        body: {
          jsonrpc: "2.0", id: 1, method: "tools/call",
          params: { name: "automate_from_anomalies", arguments: { project_id: projectId } },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const result = data?.result?.content?.[0]?.text;
      const parsed = result ? JSON.parse(result) : {};
      toast.success(`Automação executada: ${parsed.tasks_created || 0} tarefas criadas`);
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Regras que convertem anomalias detectadas em tarefas automaticamente para o Claude executar.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline" size="sm" className="text-xs gap-1.5 h-8"
            onClick={() => runAutomation.mutate()}
            disabled={runAutomation.isPending || !projectId}
          >
            {runAutomation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Executar Agora
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs gap-1.5 h-8">
                <Plus className="h-3 w-3" /> Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">Nova Regra de Automação</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome da Regra</label>
                  <Input
                    value={ruleName} onChange={(e) => setRuleName(e.target.value)}
                    placeholder="Ex: Criar tarefa para quedas de tráfego"
                    className="text-xs h-8 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Quando detectar</label>
                    <Select value={anomalyType} onValueChange={setAnomalyType}>
                      <SelectTrigger className="text-xs h-8 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ANOMALY_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Severidade mínima</label>
                    <Select value={minSeverity} onValueChange={setMinSeverity}>
                      <SelectTrigger className="text-xs h-8 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map(s => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">→ Criar tarefa com:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Categoria</label>
                      <Select value={taskCategory} onValueChange={setTaskCategory}>
                        <SelectTrigger className="text-xs h-8 mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Prioridade</label>
                      <Select value={taskPriority} onValueChange={setTaskPriority}>
                        <SelectTrigger className="text-xs h-8 mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(p => (
                            <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-[10px] text-muted-foreground">Atribuir ao agente (opcional)</label>
                    <Input
                      value={taskRole} onChange={(e) => setTaskRole(e.target.value)}
                      placeholder="Ex: SEO Specialist"
                      className="text-xs h-8 mt-0.5"
                    />
                  </div>
                </div>

                <Button
                  className="w-full text-xs h-8"
                  onClick={() => createRule.mutate()}
                  disabled={!ruleName || createRule.isPending}
                >
                  {createRule.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
                  Criar Regra
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : rules.length === 0 ? (
        <Card className="p-8 text-center">
          <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma regra de automação configurada.</p>
          <p className="text-xs text-muted-foreground mt-1">Crie regras para converter anomalias em tarefas automaticamente.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule: any) => {
            const triggerType = ANOMALY_TYPES.find(t => t.value === rule.trigger_filter?.anomaly_type);
            const TriggerIcon = triggerType?.icon || AlertTriangle;
            return (
              <Card key={rule.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, enabled: checked })}
                  />
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <TriggerIcon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{rule.name}</p>
                      <Badge variant="outline" className="text-[8px] shrink-0">
                        {triggerType?.label || rule.trigger_filter?.anomaly_type}
                      </Badge>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                      <Badge variant="secondary" className="text-[8px] shrink-0">
                        {rule.action_config?.category || "task"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        Sev. mín: {rule.trigger_filter?.min_severity || "any"}
                      </span>
                      {rule.runs_count > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          • {rule.runs_count} execuções
                        </span>
                      )}
                      {rule.last_run_at && (
                        <span className="text-[10px] text-muted-foreground">
                          • Último: {format(new Date(rule.last_run_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-destructive/60 hover:text-destructive"
                    onClick={() => deleteRule.mutate(rule.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
