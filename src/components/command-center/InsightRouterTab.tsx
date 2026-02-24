import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, AlertTriangle, TrendingDown,
  Target, Zap, BarChart3, ArrowRight, Bot, Sparkles,
  ListChecks, Send, Brain, LayoutTemplate, Search,
  Link2, FileWarning, Gauge, ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

/* ── Prebuilt Action Templates ── */
interface ActionTemplate {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  prompt: string;
  matchTypes: string[];
  description: string;
}

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: "traffic-recovery",
    label: "Recuperar Tráfego",
    icon: TrendingDown,
    color: "text-destructive",
    matchTypes: ["traffic_drop"],
    description: "Diagnostica quedas de tráfego e gera plano de recuperação com ações priorizadas",
    prompt: `Para cada anomalia de queda de tráfego, gere tarefas focadas em recuperação:
1. Diagnóstico da causa raiz (atualização de algoritmo, perda de backlinks, canibalização)
2. Ações corretivas imediatas (redirect, atualização de conteúdo, re-otimização)
3. Monitoramento pós-correção
Responda em JSON array com campos: title, description, category, priority, source_index.`,
  },
  {
    id: "indexing-fix",
    label: "Corrigir Indexação",
    icon: FileWarning,
    color: "text-orange-500",
    matchTypes: ["indexing_error"],
    description: "Identifica problemas de indexação e cria tarefas técnicas de correção",
    prompt: `Para cada erro de indexação, gere tarefas técnicas:
1. Verificar robots.txt e meta robots
2. Corrigir erros de crawl (404, 500, redirect loops)
3. Submeter URLs corrigidas para re-indexação
4. Validar sitemap.xml
Responda em JSON array com campos: title, description, category (sempre "technical"), priority, source_index.`,
  },
  {
    id: "opportunity-capture",
    label: "Capturar Oportunidades",
    icon: Target,
    color: "text-emerald-500",
    matchTypes: ["opportunity", "ctr_spike"],
    description: "Transforma oportunidades detectadas em ações de crescimento rápido",
    prompt: `Para cada oportunidade detectada, gere tarefas de crescimento:
1. Quick wins de CTR (melhorar titles/descriptions)
2. Conteúdo complementar para queries emergentes
3. Internal linking estratégico
4. Schema markup para rich snippets
Responda em JSON array com campos: title, description, category (seo/content/growth), priority, source_index.`,
  },
  {
    id: "position-defense",
    label: "Defender Posições",
    icon: ShieldAlert,
    color: "text-yellow-500",
    matchTypes: ["position_change"],
    description: "Protege rankings em queda com ações de fortalecimento de conteúdo",
    prompt: `Para cada mudança de posição negativa, gere tarefas defensivas:
1. Atualização e expansão do conteúdo existente
2. Fortalecimento de backlinks internos
3. Análise competitiva da SERP
4. Otimização de E-E-A-T
Responda em JSON array com campos: title, description, category (seo/content), priority, source_index.`,
  },
  {
    id: "full-audit",
    label: "Auditoria Completa",
    icon: Search,
    color: "text-primary",
    matchTypes: [],
    description: "Análise profunda de todas as anomalias com plano estratégico completo",
    prompt: `Analise TODAS as anomalias em conjunto e gere um plano estratégico:
1. Priorize por impacto no negócio
2. Agrupe ações relacionadas
3. Defina dependências entre tarefas
4. Estime esforço (quick-win / médio / alto)
Responda em JSON array com campos: title, description, category (seo/content/technical/analytics/growth), priority (critical/high/medium/low), source_index.`,
  },
  {
    id: "link-building",
    label: "Link Building",
    icon: Link2,
    color: "text-blue-500",
    matchTypes: ["opportunity", "position_change"],
    description: "Gera estratégias de aquisição de links baseadas nos insights detectados",
    prompt: `Com base nas anomalias, gere tarefas de link building:
1. Identificar páginas que precisam de autoridade
2. Sugerir estratégias de outreach
3. Criar plano de guest posting
4. Digital PR para conteúdos de destaque
Responda em JSON array com campos: title, description, category (sempre "seo"), priority, source_index.`,
  },
  {
    id: "performance-boost",
    label: "Boost de Performance",
    icon: Gauge,
    color: "text-violet-500",
    matchTypes: ["traffic_drop", "position_change"],
    description: "Otimizações técnicas de Core Web Vitals e velocidade de carregamento",
    prompt: `Para anomalias que podem ter causa técnica, gere tarefas de performance:
1. Otimização de Core Web Vitals (LCP, FID, CLS)
2. Compressão de imagens e lazy loading
3. Minificação de CSS/JS
4. Cache headers e CDN
Responda em JSON array com campos: title, description, category (sempre "technical"), priority, source_index.`,
  },
];

const ANOMALY_ICONS: Record<string, React.ElementType> = {
  traffic_drop: TrendingDown,
  indexing_error: AlertTriangle,
  opportunity: Target,
  ctr_spike: Zap,
  position_change: BarChart3,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-500 border-blue-500/30",
};

type RoutingPhase = "idle" | "analyzing" | "planning" | "creating" | "done";

interface RoutingResult {
  anomalyId: string;
  analysis: string;
  tasksCreated: number;
}

export function InsightRouterTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<RoutingPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RoutingResult[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string>("auto");

  const { data: anomalies = [], isLoading } = useQuery({
    queryKey: ["router-anomalies", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("mcp_anomalies")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data as any[]) || [];
    },
    enabled: !!projectId,
  });

  const toggleAll = () => {
    if (selected.size === anomalies.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(anomalies.map((a: any) => a.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const routeMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      if (!ids.length) throw new Error("Selecione pelo menos uma anomalia");
      const routingResults: RoutingResult[] = [];

      // Phase 1: AI Analysis
      setPhase("analyzing");
      setProgress(10);

      // Gather anomaly details for AI context
      const selectedAnomalies = anomalies.filter((a: any) => ids.includes(a.id));
      const anomalySummary = selectedAnomalies.map((a: any) =>
        `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description || "sem descrição"}`
      ).join("\n");

      setProgress(25);

      // Phase 2: Ask AI for action plan using selected template
      setPhase("planning");
      const tpl = ACTION_TEMPLATES.find(t => t.id === activeTemplate);
      const templatePrompt = tpl
        ? `${tpl.prompt}\n\nAnomalias:\n${anomalySummary}`
        : `Analise as seguintes anomalias detectadas e para CADA UMA gere exatamente uma tarefa acionável com título, categoria (seo/content/technical/analytics/growth), prioridade (low/medium/high/critical) e descrição curta. Responda em JSON array com campos: title, description, category, priority, source_index (0-based).\n\nAnomalias:\n${anomalySummary}`;

      const { data: aiResp, error: aiErr } = await supabase.functions.invoke("mcp-server", {
        body: {
          jsonrpc: "2.0", id: 1, method: "tools/call",
          params: {
            name: "ask_rankito_ai",
            arguments: {
              project_id: projectId,
              question: templatePrompt,
              agent_name: tpl ? `Rankito ${tpl.label}` : "Rankito Task Planner",
            },
          },
        },
      });
      if (aiErr) throw aiErr;

      setProgress(55);

      // Parse AI response
      const aiText = aiResp?.result?.content?.[0]?.text || "";
      let parsedAnswer: string;
      try {
        const parsed = JSON.parse(aiText);
        parsedAnswer = parsed.answer || aiText;
      } catch {
        parsedAnswer = aiText;
      }

      // Extract JSON array from AI response
      let taskPlans: any[] = [];
      const jsonMatch = parsedAnswer.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try { taskPlans = JSON.parse(jsonMatch[0]); } catch { /* fallback */ }
      }

      // Fallback: create simple tasks from anomalies if AI didn't return parseable JSON
      if (!taskPlans.length) {
        taskPlans = selectedAnomalies.map((a: any, i: number) => ({
          title: `[Auto] ${a.title}`,
          description: a.description || "",
          category: a.anomaly_type === "indexing_error" ? "technical" : "seo",
          priority: a.severity === "critical" ? "critical" : a.severity === "high" ? "high" : "medium",
          source_index: i,
        }));
      }

      setProgress(70);

      // Phase 3: Create tasks via MCP
      setPhase("creating");
      const tasksWithSource = taskPlans.map((t: any, i: number) => ({
        ...t,
        source_anomaly_id: selectedAnomalies[t.source_index ?? i]?.id,
      }));

      const { data: batchResp, error: batchErr } = await supabase.functions.invoke("mcp-server", {
        body: {
          jsonrpc: "2.0", id: 2, method: "tools/call",
          params: {
            name: "batch_create_tasks",
            arguments: { project_id: projectId, tasks: tasksWithSource },
          },
        },
      });
      if (batchErr) throw batchErr;

      setProgress(90);

      const batchResult = batchResp?.result?.content?.[0]?.text;
      const batchParsed = batchResult ? JSON.parse(batchResult) : {};

      // Build results
      for (let i = 0; i < selectedAnomalies.length; i++) {
        routingResults.push({
          anomalyId: selectedAnomalies[i].id,
          analysis: taskPlans[i]?.description || "Tarefa criada",
          tasksCreated: 1,
        });
      }

      setProgress(100);
      setPhase("done");
      setResults(routingResults);

      return { total: batchParsed.created_count || routingResults.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.total} tarefas criadas via IA`);
      qc.invalidateQueries({ queryKey: ["router-anomalies"] });
      qc.invalidateQueries({ queryKey: ["cc-anomalies"] });
    },
    onError: (e: any) => {
      toast.error(`Erro: ${e.message}`);
      setPhase("idle");
      setProgress(0);
    },
  });

  const phaseLabels: Record<RoutingPhase, string> = {
    idle: "",
    analyzing: "Analisando anomalias com IA...",
    planning: "Gerando plano de ação...",
    creating: "Criando tarefas no Kanban...",
    done: "Roteamento concluído!",
  };

  const isProcessing = phase !== "idle" && phase !== "done";

  return (
    <div className="space-y-4">
      {/* Pipeline visualization */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold">Pipeline de Roteamento Inteligente</h3>
        </div>
        <div className="flex items-center gap-2">
          {[
            { icon: AlertTriangle, label: "Insights", active: phase === "analyzing" || phase === "idle" },
            { icon: Bot, label: "Análise IA", active: phase === "planning" },
            { icon: ListChecks, label: "Tarefas", active: phase === "creating" },
            { icon: CheckCircle2, label: "Concluído", active: phase === "done" },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all flex-1 justify-center ${
                step.active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : phase === "done"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-muted text-muted-foreground"
              }`}>
                <step.icon className={`h-3 w-3 ${step.active && isProcessing ? "animate-pulse" : ""}`} />
                {step.label}
              </div>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
        {(isProcessing || phase === "done") && (
          <div className="mt-3 space-y-1.5">
            <Progress value={progress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground text-center">
              {isProcessing && <Loader2 className="h-2.5 w-2.5 animate-spin inline mr-1" />}
              {phaseLabels[phase]}
            </p>
          </div>
        )}
      </Card>

      {/* Action Templates */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold">Templates de Ação</h3>
          <Badge variant="secondary" className="text-[9px] ml-auto">{ACTION_TEMPLATES.length} disponíveis</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => setActiveTemplate("auto")}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-center transition-all ${
              activeTemplate === "auto"
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/20 hover:bg-muted/50"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${activeTemplate === "auto" ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-[10px] font-medium">Auto-detectar</span>
          </button>
          {ACTION_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setActiveTemplate(tpl.id)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-center transition-all ${
                activeTemplate === tpl.id
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/20 hover:bg-muted/50"
              }`}
            >
              <tpl.icon className={`h-4 w-4 ${activeTemplate === tpl.id ? "text-primary" : tpl.color}`} />
              <span className="text-[10px] font-medium">{tpl.label}</span>
            </button>
          ))}
        </div>
        {activeTemplate !== "auto" && (
          <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5">
            {ACTION_TEMPLATES.find(t => t.id === activeTemplate)?.description}
          </p>
        )}
      </Card>

      {/* Actions bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={anomalies.length > 0 && selected.size === anomalies.length}
            onCheckedChange={toggleAll}
            disabled={isProcessing}
          />
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selecionada(s)` : "Selecionar anomalias para rotear"}
          </span>
        </div>
        <Button
          size="sm" className="text-xs gap-1.5 h-8"
          onClick={() => routeMutation.mutate()}
          disabled={selected.size === 0 || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Rotear para Claude ({selected.size})
        </Button>
      </div>

      {/* Results banner */}
      <AnimatePresence>
        {phase === "done" && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-3 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {results.length} anomalias roteadas → {results.reduce((s, r) => s + r.tasksCreated, 0)} tarefas criadas
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    As tarefas estão disponíveis no Kanban do Orquestrador.
                  </p>
                </div>
                <Button
                  variant="ghost" size="sm" className="text-[10px] h-6"
                  onClick={() => { setPhase("idle"); setProgress(0); setResults([]); setSelected(new Set()); }}
                >
                  Limpar
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anomalies list */}
      {isLoading ? (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : anomalies.length === 0 ? (
        <Card className="p-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma anomalia pendente para rotear.</p>
          <p className="text-xs text-muted-foreground mt-1">Execute um scan de anomalias ou aguarde a detecção automática.</p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {anomalies.map((a: any) => {
            const Icon = ANOMALY_ICONS[a.anomaly_type] || AlertTriangle;
            const isSelected = selected.has(a.id);
            const routed = results.find(r => r.anomalyId === a.id);
            return (
              <Card
                key={a.id}
                className={`p-3 transition-all cursor-pointer ${
                  routed
                    ? "border-emerald-500/30 bg-emerald-500/5 opacity-70"
                    : isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "hover:border-border/80"
                }`}
                onClick={() => !isProcessing && !routed && toggleOne(a.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    disabled={isProcessing || !!routed}
                    onCheckedChange={() => toggleOne(a.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${SEVERITY_COLORS[a.severity] || "bg-muted"}`}>
                    {routed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{a.title}</p>
                      <Badge variant="outline" className={`text-[8px] ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</Badge>
                    </div>
                    {routed ? (
                      <p className="text-[10px] text-emerald-500 mt-0.5 truncate">✓ {routed.analysis}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(a.created_at), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
