import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GitBranch, Play, Plus, ArrowRight, ArrowDown, Loader2, CheckCircle2,
  X, Sparkles, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAiChat } from "@/hooks/use-ai-chat";

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
      { agent: "Agente Analytics", emoji: "📊", action: "Cruza com dados de tráfego", prompt: "Com base na análise SEO, cruze os dados de tráfego orgânico com as landing pages. Identifique quais páginas têm melhor conversão e quais têm bounce rate alto. Use dados REAIS." },
      { agent: "Agente Growth", emoji: "🚀", action: "Gera estratégia priorizada", prompt: "Com base nas análises anteriores, crie um plano de ação priorizado pelo framework ICE (Impacto × Confiança × Facilidade). Top 5 ações com ROI estimado." },
      { agent: "Relatório", emoji: "📄", action: "Compila relatório executivo", prompt: "Compile tudo em um relatório executivo: Resumo (3 bullets), Métricas-chave, Top 5 Ações Prioritárias, Previsão de Impacto 30 dias." },
    ],
  },
  {
    id: "content-decay-alert",
    name: "Alerta de Decay de Conteúdo",
    description: "Detecta quedas → Analisa causa → Correções → Notifica",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Monitora quedas de posição", prompt: "Identifique todas as páginas que perderam posições significativas (3+ posições). Liste URL, keyword, posição anterior vs atual e volume de busca." },
      { agent: "Agente Analytics", emoji: "📊", action: "Analisa impacto no tráfego", prompt: "Calcule o impacto em tráfego orgânico das quedas identificadas. Identifique correlação com mudanças no bounce rate." },
      { agent: "Agente Growth", emoji: "🚀", action: "Plano de recuperação", prompt: "Crie um plano urgente de recuperação para cada página em decay: atualização de conteúdo, otimização de title/meta, internal linking e timeline." },
      { agent: "Notificador", emoji: "📱", action: "Resume para notificação", prompt: "Gere resumo compacto do alerta de content decay: páginas afetadas, impacto estimado e ações prioritárias." },
    ],
  },
  {
    id: "weekly-report",
    name: "Relatório Semanal Automático",
    description: "Métricas → Comparação → Insights → Resumo",
    steps: [
      { agent: "Agente Analytics", emoji: "📊", action: "Coleta métricas da semana", prompt: "Relatório semanal: sessões, usuários, bounce rate, top sources, top landing pages. Compare com semana anterior, destaque variações >10%." },
      { agent: "Agente SEO", emoji: "🔍", action: "Evolução de keywords", prompt: "Relatório semanal SEO: evolução top 20 keywords, novas no top 10, saíram do top 10, evolução de cliques orgânicos." },
      { agent: "Agente Growth", emoji: "🚀", action: "Identifica tendências", prompt: "Identifique 3 tendências positivas e 3 riscos com base nos dados semanais. Sugira 3 ações para próxima semana." },
      { agent: "Notificador", emoji: "📱", action: "Newsletter semanal", prompt: "Compile em formato newsletter: Destaque da Semana, Métricas-chave (↑↓), Top 3 Wins, Top 3 Ações Próxima Semana." },
    ],
  },
  {
    id: "indexing-pipeline",
    name: "Pipeline de Indexação",
    description: "Descobre → Prioriza → Indexa → Reporta",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Descobre URLs não indexadas", prompt: "Liste todas as URLs não indexadas ou com problemas de cobertura. Classifique por prioridade baseado no potencial de tráfego." },
      { agent: "Agente Analytics", emoji: "📊", action: "Prioriza por potencial", prompt: "Estime o potencial de tráfego de cada URL não indexada: keywords-alvo, volume, concorrência. Crie ranking de prioridade." },
      { agent: "Agente SEO", emoji: "⚡", action: "Prepara indexação", prompt: "Para as URLs priorizadas, verifique: robots.txt permite? Canonical correto? Conteúdo pronto? Liste as prontas para submissão." },
      { agent: "Notificador", emoji: "📱", action: "Reporta resultado", prompt: "Resumo do pipeline: URLs identificadas, priorizadas, prontas para submissão, próximos passos." },
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

  // Execution canvas state
  const [executingWorkflow, setExecutingWorkflow] = useState<PresetWorkflow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepResults, setStepResults] = useState<Record<number, string>>({});
  const [isStepLoading, setIsStepLoading] = useState(false);
  const { messages, isLoading, sendMessage, clearMessages } = useAiChat();

  const toggleWorkflow = (id: string) => {
    setActiveWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("rankito_active_workflows", JSON.stringify([...next]));
      return next;
    });
  };

  // Execute workflow step by step
  const startWorkflow = (workflow: PresetWorkflow) => {
    setExecutingWorkflow(workflow);
    setCurrentStepIndex(-1);
    setStepResults({});
    clearMessages();
  };

  const executeNextStep = useCallback(async () => {
    if (!executingWorkflow || isStepLoading || isLoading) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= executingWorkflow.steps.length) {
      toast.success(`Workflow "${executingWorkflow.name}" concluído!`);
      return;
    }

    const step = executingWorkflow.steps[nextIndex];
    setCurrentStepIndex(nextIndex);
    setIsStepLoading(true);

    // Build context from previous steps
    const previousContext = Object.entries(stepResults)
      .map(([i, result]) => `[Passo ${Number(i) + 1} - ${executingWorkflow.steps[Number(i)].agent}]:\n${result}`)
      .join("\n\n---\n\n");

    const fullPrompt = previousContext
      ? `CONTEXTO DOS PASSOS ANTERIORES:\n${previousContext}\n\n---\n\nAGORA EXECUTE O PASSO ${nextIndex + 1}:\n${step.prompt}`
      : step.prompt;

    await sendMessage(fullPrompt, {
      agentName: step.agent,
      agentInstructions: `Você é o ${step.agent}. Execute EXATAMENTE o que é pedido usando dados REAIS do projeto. Seja específico e acionável.`,
      projectId,
    });

    setIsStepLoading(false);
  }, [executingWorkflow, currentStepIndex, stepResults, isStepLoading, isLoading, sendMessage, projectId]);

  // Capture step result from messages
  useEffect(() => {
    if (!executingWorkflow || currentStepIndex < 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && !isLoading && lastMsg.content.length > 50) {
      setStepResults(prev => ({ ...prev, [currentStepIndex]: lastMsg.content }));
    }
  }, [messages, isLoading, currentStepIndex, executingWorkflow]);

  const closeCanvas = () => {
    setExecutingWorkflow(null);
    setCurrentStepIndex(-1);
    setStepResults({});
    clearMessages();
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

              {/* Compact flow */}
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
                <Button
                  size="sm"
                  variant="default"
                  className="w-full text-xs gap-1.5"
                  onClick={() => startWorkflow(workflow)}
                >
                  <Play className="h-3 w-3" /> Executar Agora
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* ===== EXECUTION CANVAS (Full-screen modal) ===== */}
      <Dialog open={!!executingWorkflow} onOpenChange={(o) => !o && closeCanvas()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              {executingWorkflow?.name}
              <Badge variant="outline" className="text-[10px] ml-2">
                {currentStepIndex < 0 ? "Pronto para iniciar" :
                 currentStepIndex < (executingWorkflow?.steps.length || 0) - 1 ? `Passo ${currentStepIndex + 1}/${executingWorkflow?.steps.length}` :
                 stepResults[currentStepIndex] ? "Concluído ✓" : `Passo ${currentStepIndex + 1}/${executingWorkflow?.steps.length}`}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Flow visualization - vertical canvas */}
            {executingWorkflow?.steps.map((step, i) => {
              const c = getStepColor(step.agent);
              const isDone = !!stepResults[i];
              const isCurrent = i === currentStepIndex && !isDone;
              const isWaiting = i > currentStepIndex;
              const isNext = i === currentStepIndex + 1 && !isLoading;

              return (
                <div key={i}>
                  <div className={cn(
                    "rounded-xl border-2 p-4 transition-all duration-500",
                    isDone ? "border-green-500/40 bg-green-500/5" :
                    isCurrent ? cn("animate-pulse", c.border, c.bg, "shadow-lg", c.glow) :
                    cn(c.border, c.bg, isWaiting && "opacity-50")
                  )}>
                    {/* Step header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-xl",
                        isDone ? "bg-green-500/20" : c.bg
                      )}>
                        {isDone ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                         isCurrent && isLoading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> :
                         <span>{step.emoji}</span>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{step.agent}</span>
                          <Badge variant="outline" className={cn("text-[9px]", c.text)}>
                            Passo {i + 1}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{step.action}</p>
                      </div>
                      {isWaiting && isNext && !isLoading && (
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={executeNextStep}>
                          <Play className="h-3 w-3" /> Executar
                        </Button>
                      )}
                    </div>

                    {/* Step result */}
                    {isDone && stepResults[i] && (
                      <div className="mt-3 p-3 rounded-lg bg-card border border-border max-h-[200px] overflow-y-auto scrollbar-thin">
                        <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{stepResults[i]}</p>
                      </div>
                    )}

                    {/* Current step loading */}
                    {isCurrent && isLoading && (
                      <div className="mt-3 p-3 rounded-lg bg-card border border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span>{step.agent} está analisando os dados do projeto...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connector arrow */}
                  {i < executingWorkflow.steps.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className={cn(
                        "h-5 w-5",
                        isDone ? "text-green-500" : "text-muted-foreground/30"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-muted/20">
            <div className="text-[11px] text-muted-foreground">
              {Object.keys(stepResults).length} de {executingWorkflow?.steps.length} passos concluídos
            </div>
            <div className="flex gap-2">
              {currentStepIndex < 0 && (
                <Button size="sm" className="text-xs gap-1.5" onClick={executeNextStep}>
                  <Play className="h-3 w-3" /> Iniciar Workflow
                </Button>
              )}
              {currentStepIndex >= 0 && !isLoading && currentStepIndex < (executingWorkflow?.steps.length || 0) - 1 && stepResults[currentStepIndex] && (
                <Button size="sm" className="text-xs gap-1.5" onClick={executeNextStep}>
                  <ArrowRight className="h-3 w-3" /> Próximo Passo
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-xs" onClick={closeCanvas}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
