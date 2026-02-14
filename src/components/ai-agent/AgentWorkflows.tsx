import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  GitBranch, Play, Plus, ArrowRight, Search, TrendingUp, BarChart3,
  FileText, Bell, Zap, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_WORKFLOWS = [
  {
    id: "seo-full-analysis",
    name: "Análise SEO Completa",
    description: "SEO Agent analisa → Analytics Agent cruza dados → Growth Agent sugere estratégia → Relatório gerado",
    steps: [
      { agent: "seo", emoji: "🔍", action: "Analisa posições, keywords e oportunidades" },
      { agent: "analytics", emoji: "📊", action: "Cruza com dados de tráfego e conversões" },
      { agent: "growth", emoji: "🚀", action: "Gera estratégia priorizada" },
      { agent: "report", emoji: "📄", action: "Compila relatório executivo" },
    ],
  },
  {
    id: "content-decay-alert",
    name: "Alerta de Decay de Conteúdo",
    description: "Detecta páginas perdendo posição → Analisa causa → Sugere correções → Notifica via WhatsApp",
    steps: [
      { agent: "seo", emoji: "🔍", action: "Monitora quedas de posição" },
      { agent: "analytics", emoji: "📊", action: "Analisa impacto no tráfego" },
      { agent: "growth", emoji: "🚀", action: "Sugere plano de recuperação" },
      { agent: "notify", emoji: "📱", action: "Notifica equipe via WhatsApp" },
    ],
  },
  {
    id: "weekly-report",
    name: "Relatório Semanal Automático",
    description: "Coleta métricas → Compara com semana anterior → Gera insights → Envia resumo",
    steps: [
      { agent: "analytics", emoji: "📊", action: "Coleta métricas da semana" },
      { agent: "seo", emoji: "🔍", action: "Compara evolução de keywords" },
      { agent: "growth", emoji: "🚀", action: "Identifica tendências e oportunidades" },
      { agent: "notify", emoji: "📱", action: "Envia resumo semanal" },
    ],
  },
  {
    id: "indexing-pipeline",
    name: "Pipeline de Indexação",
    description: "Descobre novas URLs → Verifica cobertura → Solicita indexação → Monitora resultado",
    steps: [
      { agent: "seo", emoji: "🔍", action: "Descobre URLs não indexadas" },
      { agent: "analytics", emoji: "📊", action: "Prioriza por potencial de tráfego" },
      { agent: "seo", emoji: "⚡", action: "Solicita indexação no Google" },
      { agent: "notify", emoji: "📱", action: "Reporta resultado" },
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

export function AgentWorkflows() {
  const [activeWorkflows, setActiveWorkflows] = useState<Set<string>>(new Set());

  const toggleWorkflow = (id: string) => {
    setActiveWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            Conecte agentes em fluxos automatizados, estilo n8n
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs gap-1.5">
          <Plus className="h-3 w-3" /> Criar Workflow
        </Button>
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

              {/* Flow visualization */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {workflow.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1 flex-shrink-0">
                    <div className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-[10px] font-medium flex items-center gap-1.5",
                      STEP_COLORS[step.agent] || "border-border bg-muted/50"
                    )}>
                      <span>{step.emoji}</span>
                      <span className="max-w-[120px] truncate">{step.action}</span>
                    </div>
                    {i < workflow.steps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {isActive && (
                <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
                  <Play className="h-3 w-3" /> Executar Agora
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
