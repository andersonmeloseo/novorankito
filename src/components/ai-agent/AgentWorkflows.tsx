import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  GitBranch, Play, Plus, ArrowRight, Loader2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    description: "SEO Agent analisa → Analytics Agent cruza dados → Growth Agent sugere estratégia → Relatório gerado",
    steps: [
      { agent: "seo", emoji: "🔍", action: "Analisa posições e keywords", prompt: "Analise todas as posições de keywords do projeto, identifique as top 10 oportunidades de crescimento (keywords em posição 4-20 com alto volume), e liste problemas de CTR abaixo do benchmark." },
      { agent: "analytics", emoji: "📊", action: "Cruza com dados de tráfego", prompt: "Com base na análise SEO anterior, cruze os dados de tráfego orgânico com as landing pages dessas keywords. Identifique quais páginas têm melhor conversão e quais têm bounce rate alto." },
      { agent: "growth", emoji: "🚀", action: "Gera estratégia priorizada", prompt: "Com base nas análises de SEO e Analytics anteriores, crie um plano de ação priorizado pelo framework ICE (Impacto × Confiança × Facilidade). Liste as top 5 ações com ROI estimado para cada uma." },
      { agent: "report", emoji: "📄", action: "Compila relatório executivo", prompt: "Compile todas as análises anteriores em um relatório executivo com: Resumo (3 bullets), Métricas-chave, Top 5 Ações Prioritárias, e Previsão de Impacto para os próximos 30 dias." },
    ],
  },
  {
    id: "content-decay-alert",
    name: "Alerta de Decay de Conteúdo",
    description: "Detecta páginas perdendo posição → Analisa causa → Sugere correções → Notifica via WhatsApp",
    steps: [
      { agent: "seo", emoji: "🔍", action: "Monitora quedas de posição", prompt: "Identifique todas as páginas que perderam posições significativas (3+ posições) nas últimas 4 semanas. Liste URL, keyword, posição anterior, posição atual e volume de busca." },
      { agent: "analytics", emoji: "📊", action: "Analisa impacto no tráfego", prompt: "Para as páginas com queda de posição identificadas, calcule o impacto em tráfego orgânico (cliques perdidos) e receita estimada. Identifique se há correlação com mudanças no bounce rate ou tempo na página." },
      { agent: "growth", emoji: "🚀", action: "Sugere plano de recuperação", prompt: "Crie um plano de recuperação urgente para as páginas em decay. Para cada página sugira: atualização de conteúdo, otimização de title/meta, internal linking, e timeline de implementação." },
      { agent: "notify", emoji: "📱", action: "Notifica equipe", prompt: "Gere um resumo executivo do alerta de content decay em formato compacto para envio via notificação: páginas afetadas, impacto estimado e ações prioritárias." },
    ],
  },
  {
    id: "weekly-report",
    name: "Relatório Semanal Automático",
    description: "Coleta métricas → Compara com semana anterior → Gera insights → Envia resumo",
    steps: [
      { agent: "analytics", emoji: "📊", action: "Coleta métricas da semana", prompt: "Gere o relatório semanal de analytics: sessões, usuários, bounce rate, engajamento, top sources, top landing pages, conversões. Compare com a semana anterior e destaque variações significativas (>10%)." },
      { agent: "seo", emoji: "🔍", action: "Compara evolução de keywords", prompt: "Relatório semanal de SEO: evolução das top 20 keywords, novas keywords que entraram no top 10, keywords que saíram do top 10, evolução de cliques e impressões orgânicas." },
      { agent: "growth", emoji: "🚀", action: "Identifica tendências", prompt: "Com base nos dados semanais de analytics e SEO, identifique 3 tendências positivas e 3 riscos. Sugira 3 ações para a próxima semana com impacto estimado." },
      { agent: "notify", emoji: "📱", action: "Envia resumo semanal", prompt: "Compile o relatório semanal em formato de newsletter: Destaque da Semana, Métricas-chave (com setas ↑↓), Top 3 Wins, Top 3 Ações para Próxima Semana." },
    ],
  },
  {
    id: "indexing-pipeline",
    name: "Pipeline de Indexação",
    description: "Descobre novas URLs → Verifica cobertura → Solicita indexação → Monitora resultado",
    steps: [
      { agent: "seo", emoji: "🔍", action: "Descobre URLs não indexadas", prompt: "Liste todas as URLs do projeto que não estão indexadas ou com problemas de cobertura. Classifique por prioridade (alta, média, baixa) baseado no potencial de tráfego." },
      { agent: "analytics", emoji: "📊", action: "Prioriza por potencial", prompt: "Para as URLs não indexadas, estime o potencial de tráfego de cada uma baseado em: keywords-alvo, volume de busca, concorrência. Crie um ranking de prioridade." },
      { agent: "seo", emoji: "⚡", action: "Solicita indexação", prompt: "Com base na priorização, liste as URLs que devem ser submetidas para indexação no Google. Para cada uma, verifique se o robots.txt permite, se tem canonical correto, e se o conteúdo está pronto." },
      { agent: "notify", emoji: "📱", action: "Reporta resultado", prompt: "Gere um resumo do pipeline de indexação: quantas URLs foram identificadas, quantas foram priorizadas, quantas estão prontas para submissão, e próximos passos." },
    ],
  },
];

const STEP_COLORS: Record<string, string> = {
  seo: "border-blue-500/30 bg-blue-500/5",
  analytics: "border-amber-500/30 bg-amber-500/5",
  growth: "border-emerald-500/30 bg-emerald-500/5",
  report: "border-purple-500/30 bg-purple-500/5",
  notify: "border-pink-500/30 bg-pink-500/5",
};

interface AgentWorkflowsProps {
  onExecuteWorkflow?: (workflowName: string, steps: WorkflowStep[]) => void;
}

export function AgentWorkflows({ onExecuteWorkflow }: AgentWorkflowsProps) {
  const [activeWorkflows, setActiveWorkflows] = useState<Set<string>>(() => {
    // Persist in localStorage
    try {
      const saved = localStorage.getItem("rankito_active_workflows");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, number>>({});

  const toggleWorkflow = (id: string) => {
    setActiveWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("rankito_active_workflows", JSON.stringify([...next]));
      return next;
    });
  };

  const executeWorkflow = useCallback(async (workflow: PresetWorkflow) => {
    if (runningWorkflow) return;
    setRunningWorkflow(workflow.id);
    setCompletedSteps({});

    if (onExecuteWorkflow) {
      onExecuteWorkflow(workflow.name, workflow.steps);
    }

    // Simulate step-by-step execution visually
    for (let i = 0; i < workflow.steps.length; i++) {
      await new Promise(r => setTimeout(r, 1500));
      setCompletedSteps(prev => ({ ...prev, [workflow.id]: i + 1 }));
    }

    toast.success(`Workflow "${workflow.name}" executado! Veja o resultado no Chat.`);
    setRunningWorkflow(null);
  }, [runningWorkflow, onExecuteWorkflow]);

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
        <Button size="sm" variant="outline" className="text-xs gap-1.5" disabled>
          <Plus className="h-3 w-3" /> Criar Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PRESET_WORKFLOWS.map((workflow) => {
          const isActive = activeWorkflows.has(workflow.id);
          const isRunning = runningWorkflow === workflow.id;
          const stepsCompleted = completedSteps[workflow.id] || 0;

          return (
            <Card key={workflow.id} className={cn(
              "p-4 space-y-3 transition-all duration-300",
              isActive && "ring-1 ring-primary/30 shadow-md",
              isRunning && "ring-2 ring-primary shadow-lg"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{workflow.name}</h4>
                    <Badge variant={isRunning ? "default" : isActive ? "default" : "secondary"} className="text-[9px]">
                      {isRunning ? "Executando..." : isActive ? "Ativo" : "Preset"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{workflow.description}</p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={() => toggleWorkflow(workflow.id)}
                  disabled={isRunning}
                />
              </div>

              {/* Flow visualization */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {workflow.steps.map((step, i) => {
                  const isStepDone = isRunning && stepsCompleted > i;
                  const isStepRunning = isRunning && stepsCompleted === i;
                  return (
                    <div key={i} className="flex items-center gap-1 flex-shrink-0">
                      <div className={cn(
                        "px-2.5 py-1.5 rounded-lg border text-[10px] font-medium flex items-center gap-1.5 transition-all duration-300",
                        isStepDone
                          ? "border-green-500/50 bg-green-500/10"
                          : isStepRunning
                            ? "border-primary bg-primary/10 animate-pulse"
                            : STEP_COLORS[step.agent] || "border-border bg-muted/50"
                      )}>
                        {isStepDone ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : isStepRunning ? (
                          <Loader2 className="h-3 w-3 text-primary animate-spin" />
                        ) : (
                          <span>{step.emoji}</span>
                        )}
                        <span className="max-w-[120px] truncate">{step.action}</span>
                      </div>
                      {i < workflow.steps.length - 1 && (
                        <ArrowRight className={cn(
                          "h-3 w-3 flex-shrink-0 transition-colors",
                          isStepDone ? "text-green-500" : "text-muted-foreground/50"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>

              {isActive && (
                <Button
                  size="sm"
                  variant={isRunning ? "secondary" : "default"}
                  className="w-full text-xs gap-1.5"
                  disabled={isRunning || !isActive}
                  onClick={() => executeWorkflow(workflow)}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Executando passo {stepsCompleted + 1} de {workflow.steps.length}...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" /> Executar Agora
                    </>
                  )}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
