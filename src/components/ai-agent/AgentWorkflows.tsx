import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GitBranch, Play, ArrowRight, ArrowDown, Loader2, CheckCircle2,
  Download, Copy, Bell, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { streamChatToCompletion } from "@/lib/stream-chat";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownContent } from "@/components/ai-agent/AgentChatTab";
import { WorkflowNotificationConfig } from "@/components/ai-agent/WorkflowNotificationConfig";
import { useQuery } from "@tanstack/react-query";

interface WorkflowStep {
  agent: string;
  emoji: string;
  action: string;
  prompt: string;
}

interface PresetWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

const PRESET_WORKFLOWS: PresetWorkflow[] = [
  {
    id: "seo-full-analysis",
    name: "Análise SEO Completa",
    description: "SEO → Analytics → Growth → Relatório",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Analisa posições e keywords", prompt: "Analise todas as posições de keywords do projeto. Identifique top 10 oportunidades de crescimento (keywords em posição 4-20 com alto volume). Liste problemas de CTR abaixo do benchmark. Use os dados REAIS do projeto." },
      { agent: "Agente Analytics", emoji: "📊", action: "Cruza com dados de tráfego", prompt: "Com base na análise SEO do passo anterior, cruze os dados de tráfego orgânico com as landing pages. Identifique quais páginas têm melhor conversão e quais têm bounce rate alto. Use dados REAIS." },
      { agent: "Agente Growth", emoji: "🚀", action: "Gera estratégia priorizada", prompt: "Com base nas análises de SEO e Analytics dos passos anteriores, crie um plano de ação priorizado pelo framework ICE (Impacto × Confiança × Facilidade). Top 5 ações com ROI estimado." },
      { agent: "Relatório", emoji: "📄", action: "Compila relatório executivo", prompt: "Compile TUDO dos passos anteriores em um relatório executivo completo: Resumo Executivo (3 bullets), Métricas-chave, Top 5 Ações Prioritárias com responsável e deadline, Previsão de Impacto para 30 dias." },
    ],
  },
  {
    id: "content-decay-alert",
    name: "Alerta de Decay de Conteúdo",
    description: "Detecta quedas → Analisa causa → Correções → Notifica",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Monitora quedas de posição", prompt: "Identifique todas as páginas que perderam posições significativas (3+ posições). Liste URL, keyword, posição anterior vs atual e volume de busca." },
      { agent: "Agente Analytics", emoji: "📊", action: "Analisa impacto no tráfego", prompt: "Calcule o impacto em tráfego orgânico das quedas identificadas no passo anterior. Identifique correlação com mudanças no bounce rate." },
      { agent: "Agente Growth", emoji: "🚀", action: "Plano de recuperação", prompt: "Crie um plano urgente de recuperação para cada página em decay identificada: atualização de conteúdo, otimização de title/meta, internal linking e timeline." },
      { agent: "Notificador", emoji: "📱", action: "Resume para notificação", prompt: "Gere resumo compacto de todo o workflow para envio via notificação: páginas afetadas, impacto estimado e ações prioritárias em formato bullet point." },
    ],
  },
  {
    id: "weekly-report",
    name: "Relatório Semanal Automático",
    description: "Métricas → Comparação → Insights → Resumo",
    steps: [
      { agent: "Agente Analytics", emoji: "📊", action: "Coleta métricas da semana", prompt: "Relatório semanal: sessões, usuários, bounce rate, top sources, top landing pages. Compare com semana anterior, destaque variações >10%." },
      { agent: "Agente SEO", emoji: "🔍", action: "Evolução de keywords", prompt: "Relatório semanal SEO: evolução top 20 keywords, novas no top 10, saíram do top 10, evolução de cliques orgânicos." },
      { agent: "Agente Growth", emoji: "🚀", action: "Identifica tendências", prompt: "Com base nos dados dos passos anteriores, identifique 3 tendências positivas e 3 riscos. Sugira 3 ações para próxima semana com impacto estimado." },
      { agent: "Notificador", emoji: "📱", action: "Newsletter semanal", prompt: "Compile tudo em formato newsletter profissional: Destaque da Semana, Métricas-chave (↑↓), Top 3 Wins, Top 3 Ações Próxima Semana." },
    ],
  },
  {
    id: "indexing-pipeline",
    name: "Pipeline de Indexação",
    description: "Descobre → Prioriza → Indexa → Reporta",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Descobre URLs não indexadas", prompt: "Liste todas as URLs não indexadas ou com problemas de cobertura. Classifique por prioridade baseado no potencial de tráfego." },
      { agent: "Agente Analytics", emoji: "📊", action: "Prioriza por potencial", prompt: "Estime o potencial de tráfego de cada URL não indexada do passo anterior: keywords-alvo, volume, concorrência. Crie ranking de prioridade." },
      { agent: "Agente SEO", emoji: "⚡", action: "Prepara indexação", prompt: "Para as URLs priorizadas, verifique: robots.txt permite? Canonical correto? Conteúdo pronto? Liste as prontas para submissão." },
      { agent: "Notificador", emoji: "📱", action: "Reporta resultado", prompt: "Resumo completo do pipeline: URLs identificadas, priorizadas, prontas para submissão, e próximos passos concretos." },
    ],
  },
];

const STEP_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  "Agente SEO": { border: "border-blue-500/50", bg: "bg-blue-500/10", text: "text-blue-400", glow: "shadow-blue-500/20" },
  "Agente Analytics": { border: "border-amber-500/50", bg: "bg-amber-500/10", text: "text-amber-400", glow: "shadow-amber-500/20" },
  "Agente Growth": { border: "border-emerald-500/50", bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
  "Relatório": { border: "border-purple-500/50", bg: "bg-purple-500/10", text: "text-purple-400", glow: "shadow-purple-500/20" },
  "Notificador": { border: "border-pink-500/50", bg: "bg-pink-500/10", text: "text-pink-400", glow: "shadow-pink-500/20" },
};

function getStepColor(agent: string) {
  return STEP_COLORS[agent] || { border: "border-border", bg: "bg-muted/50", text: "text-muted-foreground", glow: "" };
}

interface AgentWorkflowsProps {
  onExecuteWorkflow?: (workflowName: string, steps: WorkflowStep[]) => void;
  projectId?: string;
}

export function AgentWorkflows({ onExecuteWorkflow, projectId }: AgentWorkflowsProps) {
  const [activeWorkflows, setActiveWorkflows] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("rankito_active_workflows");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const [executingWorkflow, setExecutingWorkflow] = useState<PresetWorkflow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepResults, setStepResults] = useState<Record<number, string>>({});
  const [stepStreaming, setStepStreaming] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);
  const [notifyWorkflowId, setNotifyWorkflowId] = useState<string | null>(null);

  // Fetch schedule configs to show indicators
  const { data: schedules = [] } = useQuery({
    queryKey: ["workflow-schedules-list", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from("workflow_schedules")
        .select("workflow_id, enabled, notify_email, notify_whatsapp, schedule_time, schedule_days")
        .eq("project_id", projectId);
      return data || [];
    },
    enabled: !!projectId,
  });

  const toggleWorkflow = (id: string) => {
    setActiveWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("rankito_active_workflows", JSON.stringify([...next]));
      return next;
    });
  };

  // Auto-execute ALL steps sequentially
  const executeWorkflow = useCallback(async (workflow: PresetWorkflow) => {
    if (isRunning) return;
    setExecutingWorkflow(workflow);
    setCurrentStepIndex(-1);
    setStepResults({});
    setStepStreaming("");
    setIsRunning(true);
    abortRef.current = false;

    const results: Record<number, string> = {};

    for (let i = 0; i < workflow.steps.length; i++) {
      if (abortRef.current) break;

      const step = workflow.steps[i];
      setCurrentStepIndex(i);
      setStepStreaming("");

      // Build context from ALL previous steps
      const previousContext = Object.entries(results)
        .map(([idx, result]) => `=== RESULTADO DO PASSO ${Number(idx) + 1} (${workflow.steps[Number(idx)].agent}) ===\n${result}`)
        .join("\n\n");

      const fullPrompt = previousContext
        ? `CONTEXTO ACUMULADO DOS PASSOS ANTERIORES:\n${previousContext}\n\n---\n\nAGORA EXECUTE O PASSO ${i + 1} (${step.agent}):\n${step.prompt}`
        : step.prompt;

      try {
        console.log(`[Workflow] Step ${i + 1}/${workflow.steps.length}: ${step.agent}, projectId: ${projectId}`);
        const result = await streamChatToCompletion({
          prompt: fullPrompt,
          agentName: step.agent,
          agentInstructions: `Você é o ${step.agent}, parte de um workflow automatizado chamado "${workflow.name}".

REGRA FUNDAMENTAL: Você TEM acesso aos dados REAIS do projeto via contexto do sistema. USE-OS.
- NÃO diga "não tenho acesso aos dados" — os dados estão no contexto do sistema
- NÃO invente dados fictícios — use APENAS os dados reais fornecidos
- Cite URLs, keywords, métricas e números EXATOS do projeto
- Se um dado específico não estiver disponível, diga claramente qual dado falta

Execute EXATAMENTE o que é pedido. Seja específico, acionável e detalhado.`,
          projectId,
          onDelta: (text) => setStepStreaming(text),
        });

        results[i] = result;
        setStepResults(prev => ({ ...prev, [i]: result }));
        setStepStreaming("");
      } catch (err: any) {
        results[i] = `❌ Erro: ${err.message}`;
        setStepResults(prev => ({ ...prev, [i]: `❌ Erro: ${err.message}` }));
        setStepStreaming("");
        toast.error(`Erro no passo ${i + 1}: ${err.message}`);
        break;
      }
    }

    setIsRunning(false);
    if (!abortRef.current) {
      toast.success(`Workflow "${workflow.name}" concluído! ✅`);

      // Save to agent_action_history if we have results
      const fullReport = Object.entries(results)
        .map(([idx, result]) => `## Passo ${Number(idx) + 1}: ${workflow.steps[Number(idx)].agent}\n${result}`)
        .join("\n\n---\n\n");

      // Try to save - won't fail if no agents exist
      try {
        const { data: agents } = await supabase
          .from("ai_agents")
          .select("id")
          .eq("project_id", projectId || "")
          .limit(1);

        if (agents?.[0] && projectId) {
          await supabase.from("agent_action_history").insert({
            agent_id: agents[0].id,
            project_id: projectId,
            action_type: `Workflow: ${workflow.name}`,
            action_detail: fullReport.substring(0, 5000),
          });
        }
      } catch { /* silent */ }

      // Send notifications if configured
      if (projectId) {
        try {
          const { data: sched } = await supabase
            .from("workflow_schedules")
            .select("id, notify_email, notify_whatsapp")
            .eq("workflow_id", workflow.id)
            .eq("project_id", projectId)
            .maybeSingle();

          if (sched && (sched.notify_email || sched.notify_whatsapp)) {
            const notifResp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-workflow-notification`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                  schedule_id: sched.id,
                  report: fullReport,
                  workflow_name: workflow.name,
                }),
              }
            );
            if (notifResp.ok) {
              toast.success("Notificações enviadas! 📩");
            }
          }
        } catch { /* silent */ }
      }
    }
  }, [isRunning, projectId]);

  const closeCanvas = () => {
    abortRef.current = true;
    setExecutingWorkflow(null);
    setCurrentStepIndex(-1);
    setStepResults({});
    setStepStreaming("");
    setIsRunning(false);
  };

  const copyAllResults = () => {
    if (!executingWorkflow) return;
    const full = Object.entries(stepResults)
      .map(([idx, r]) => `## ${executingWorkflow.steps[Number(idx)].agent}\n${r}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(full);
    toast.success("Relatório copiado!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Workflows de Agentes
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fluxos automatizados que encadeiam agentes — ative e execute
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PRESET_WORKFLOWS.map((workflow) => {
          const isActive = activeWorkflows.has(workflow.id);
          return (
            <Card key={workflow.id} className={cn(
              "p-4 space-y-3 transition-all duration-300",
              isActive && "ring-1 ring-primary/30 shadow-md"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{workflow.name}</h4>
                    <Badge variant={isActive ? "default" : "secondary"} className="text-[9px]">
                      {isActive ? "Ativo" : "Preset"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{workflow.description}</p>
                </div>
                <Switch checked={isActive} onCheckedChange={() => toggleWorkflow(workflow.id)} />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {workflow.steps.map((step, i) => {
                  const c = getStepColor(step.agent);
                  return (
                    <div key={i} className="flex items-center gap-1 flex-shrink-0">
                      <div className={cn("px-2.5 py-1.5 rounded-lg border text-[10px] font-medium flex items-center gap-1.5", c.border, c.bg)}>
                        <span>{step.emoji}</span>
                        <span className="max-w-[100px] truncate">{step.action}</span>
                      </div>
                      {i < workflow.steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {isActive && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => executeWorkflow(workflow)}
                    disabled={isRunning}
                  >
                    {isRunning && executingWorkflow?.id === workflow.id
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Executando...</>
                      : <><Play className="h-3 w-3" /> Executar Agora</>
                    }
                  </Button>
                  {projectId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 px-2.5"
                      onClick={() => setNotifyWorkflowId(workflow.id)}
                    >
                      <Bell className={cn(
                        "h-3 w-3",
                        schedules.find(s => s.workflow_id === workflow.id && s.enabled) && "text-primary"
                      )} />
                    </Button>
                  )}
                </div>
              )}
              {/* Schedule indicator */}
              {(() => {
                const sched = schedules.find(s => s.workflow_id === workflow.id && s.enabled);
                if (!sched) return null;
                const dayLabels = (sched.schedule_days || []).map((d: number) => ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d]).join(", ");
                return (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Bell className="h-3 w-3 text-primary" />
                    <span>{dayLabels} às {(sched.schedule_time as string)?.substring(0, 5)}</span>
                    {sched.notify_email && <span>📧</span>}
                    {sched.notify_whatsapp && <span>💬</span>}
                  </div>
                );
              })()}
            </Card>
          );
        })}
      </div>

      {/* EXECUTION CANVAS */}
      <Dialog open={!!executingWorkflow} onOpenChange={(o) => { if (!o && !isRunning) closeCanvas(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              {executingWorkflow?.name}
              <Badge variant={isRunning ? "default" : "outline"} className="text-[10px] ml-2">
                {isRunning
                  ? `Executando passo ${currentStepIndex + 1}/${executingWorkflow?.steps.length}`
                  : Object.keys(stepResults).length === executingWorkflow?.steps.length
                    ? "Concluído ✅"
                    : "Preparando..."}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {executingWorkflow?.steps.map((step, i) => {
              const c = getStepColor(step.agent);
              const isDone = !!stepResults[i];
              const isCurrent = i === currentStepIndex && !isDone;
              const isWaiting = i > currentStepIndex;

              return (
                <div key={i}>
                  <div className={cn(
                    "rounded-xl border-2 p-4 transition-all duration-500",
                    isDone ? "border-green-500/40 bg-green-500/5" :
                    isCurrent ? cn(c.border, c.bg, "shadow-lg", c.glow) :
                    cn("border-border bg-muted/20", isWaiting && "opacity-40")
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0",
                        isDone ? "bg-green-500/20" : c.bg
                      )}>
                        {isDone ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                         isCurrent ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> :
                         <span>{step.emoji}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{step.agent}</span>
                          <Badge variant="outline" className={cn("text-[9px]", isDone ? "text-green-500" : c.text)}>
                            Passo {i + 1}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{step.action}</p>
                      </div>
                    </div>

                    {/* Live streaming text */}
                    {isCurrent && stepStreaming && (
                      <div className="mt-3 p-3 rounded-lg bg-card border border-border max-h-[250px] overflow-y-auto scrollbar-thin">
                        <div className="text-xs">
                          <MarkdownContent content={stepStreaming} className="[&_table]:text-[10px] [&_th]:px-2 [&_td]:px-2" />
                        </div>
                      </div>
                    )}

                    {isCurrent && !stepStreaming && (
                      <div className="mt-3 p-3 rounded-lg bg-card border border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span>{step.agent} está analisando os dados do projeto...</span>
                        </div>
                      </div>
                    )}

                    {/* Completed result */}
                    {isDone && stepResults[i] && (
                      <div className="mt-3 p-3 rounded-lg bg-card border border-border max-h-[250px] overflow-y-auto scrollbar-thin">
                        <div className="text-xs">
                          <MarkdownContent content={stepResults[i]} className="[&_table]:text-[10px] [&_th]:px-2 [&_td]:px-2" />
                        </div>
                      </div>
                    )}
                  </div>

                  {i < executingWorkflow.steps.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className={cn(
                        "h-4 w-4",
                        isDone ? "text-green-500" : "text-muted-foreground/20"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-muted/20">
            <div className="text-[11px] text-muted-foreground">
              {Object.keys(stepResults).length} de {executingWorkflow?.steps.length} passos concluídos
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {!isRunning && Object.keys(stepResults).length === executingWorkflow?.steps.length && (
                <>
                  <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={copyAllResults}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs gap-1.5"
                    onClick={async () => {
                      if (!executingWorkflow || !projectId) return;
                      const fullReport = Object.entries(stepResults)
                        .map(([idx, r]) => `## ${executingWorkflow.steps[Number(idx)].agent}\n${r}`)
                        .join("\n\n---\n\n");
                      try {
                        const { data: sched } = await supabase
                          .from("workflow_schedules")
                          .select("id, notify_email, notify_whatsapp")
                          .eq("workflow_id", executingWorkflow.id)
                          .eq("project_id", projectId)
                          .maybeSingle();
                        if (!sched) {
                          toast.warning("Configure as notificações primeiro (clique no 🔔)");
                          return;
                        }
                        const res = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-workflow-notification`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                            },
                            body: JSON.stringify({
                              schedule_id: sched.id,
                              report: fullReport,
                              workflow_name: executingWorkflow.name,
                            }),
                          }
                        );
                        if (res.ok) {
                          toast.success("Relatório enviado agora! 📩");
                        } else {
                          const err = await res.json();
                          toast.error(`Erro: ${err.error || "Falha ao enviar"}`);
                        }
                      } catch (e: any) {
                        toast.error(`Erro: ${e.message}`);
                      }
                    }}
                  >
                    <Send className="h-3 w-3" /> Enviar Agora
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      if (!executingWorkflow) return;
                      setNotifyWorkflowId(executingWorkflow.id);
                    }}
                  >
                    <Bell className="h-3 w-3" /> Agendar
                  </Button>
                </>
              )}
              {!isRunning && Object.keys(stepResults).length > 0 && Object.keys(stepResults).length < (executingWorkflow?.steps.length || 0) && (
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={copyAllResults}>
                  <Copy className="h-3 w-3" /> Copiar Relatório
                </Button>
              )}
              <Button
                size="sm"
                variant={isRunning ? "destructive" : "outline"}
                className="text-xs"
                onClick={closeCanvas}
              >
                {isRunning ? "Cancelar" : "Fechar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Config Dialog */}
      {notifyWorkflowId && projectId && (
        <WorkflowNotificationConfig
          open={!!notifyWorkflowId}
          onOpenChange={(open) => !open && setNotifyWorkflowId(null)}
          workflowId={notifyWorkflowId}
          workflowName={PRESET_WORKFLOWS.find(w => w.id === notifyWorkflowId)?.name || "Workflow"}
          projectId={projectId}
        />
      )}
    </div>
  );
}
