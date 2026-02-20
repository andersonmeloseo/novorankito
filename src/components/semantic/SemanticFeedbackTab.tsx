import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Target, TrendingUp, AlertTriangle, CheckCircle2, Zap,
  Network, GitBranch, Code2, Loader2, ArrowRight,
  Sparkles, Rocket, BookOpen, Lightbulb, MessageSquare,
} from "lucide-react";
import { useSemanticGoals } from "@/hooks/use-semantic-goals";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface Props {
  projectId: string;
  goalProjectId: string;
}

export function SemanticFeedbackTab({ projectId, goalProjectId }: Props) {
  const { user } = useAuth();
  const { data: goals = [], isLoading: goalsLoading } = useSemanticGoals(projectId, goalProjectId);

  const { data: entities = [] } = useQuery({
    queryKey: ["semantic-entities-feedback", projectId, goalProjectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("semantic_entities")
        .select("id, name, entity_type, schema_type, description")
        .eq("project_id", projectId)
        .eq("goal_project_id", goalProjectId)
        .eq("owner_id", user?.id || "");
      return data || [];
    },
    enabled: !!projectId && !!goalProjectId && !!user?.id,
  });

  const { data: relations = [] } = useQuery({
    queryKey: ["semantic-relations-feedback", projectId, goalProjectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("semantic_relations")
        .select("id, subject_id, object_id, predicate")
        .eq("project_id", projectId)
        .eq("goal_project_id", goalProjectId)
        .eq("owner_id", user?.id || "");
      return data || [];
    },
    enabled: !!projectId && !!goalProjectId && !!user?.id,
  });

  // ── Check if project is truly empty (no goals, no entities)
  const isEmpty = goals.length === 0 && entities.length === 0 && relations.length === 0;

  // ── Compute overall progress ──
  const { totalSteps, completedSteps, overallPct, activeGoals, completedGoals } = useMemo(() => {
    const total = goals.reduce((acc, g) => acc + g.steps.length, 0);
    const completed = goals.reduce((acc, g) => acc + g.steps.filter(s => s.completed).length, 0);
    return {
      totalSteps: total,
      completedSteps: completed,
      overallPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      activeGoals: goals.filter(g => g.status === "active").length,
      completedGoals: goals.filter(g => g.status === "completed").length,
    };
  }, [goals]);

  // ── Compute next steps ──
  const nextSteps = useMemo(() => {
    const steps: { goalName: string; step: typeof goals[0]["steps"][0] }[] = [];
    for (const g of goals) {
      if (g.status === "completed") continue;
      for (const step of g.steps) {
        if (!step.completed) {
          steps.push({ goalName: g.name, step });
          if (steps.length >= 5) break;
        }
      }
      if (steps.length >= 5) break;
    }
    return steps;
  }, [goals]);

  // ── Diagnostic analysis ──
  const diagnostics = useMemo(() => {
    const issues: { severity: "warning" | "info" | "success"; title: string; description: string; icon: React.ElementType }[] = [];

    if (entities.length === 0) {
      issues.push({ severity: "warning", title: "Nenhuma entidade criada", description: "Comece criando sua primeira entidade no Construtor de Grafo.", icon: Network });
    } else if (entities.length < 5) {
      issues.push({ severity: "info", title: `Apenas ${entities.length} entidades`, description: "Grafos com mais de 5 entidades têm mais impacto no SEO semântico.", icon: Network });
    } else {
      issues.push({ severity: "success", title: `${entities.length} entidades criadas`, description: "Boa cobertura de entidades no grafo.", icon: Network });
    }

    if (relations.length === 0 && entities.length > 1) {
      issues.push({ severity: "warning", title: "Nenhuma relação criada", description: "Conecte suas entidades para criar uma rede semântica.", icon: GitBranch });
    } else if (relations.length > 0) {
      const ratio = entities.length > 0 ? (relations.length / entities.length).toFixed(1) : 0;
      issues.push({
        severity: Number(ratio) >= 1.5 ? "success" : "info",
        title: `${relations.length} relações (${ratio}x por entidade)`,
        description: Number(ratio) >= 1.5 ? "Rede densa de relações." : "Tente ter pelo menos 1.5 relações por entidade.",
        icon: GitBranch,
      });
    }

    const withSchema = entities.filter(e => e.schema_type);
    if (entities.length > 0) {
      const schemaPct = Math.round((withSchema.length / entities.length) * 100);
      issues.push({
        severity: schemaPct >= 80 ? "success" : schemaPct >= 50 ? "info" : "warning",
        title: `${schemaPct}% de cobertura Schema.org`,
        description: `${withSchema.length}/${entities.length} entidades com Schema type definido.`,
        icon: Code2,
      });
    }

    const withDesc = entities.filter(e => e.description && e.description.length > 10);
    if (entities.length > 0) {
      const descPct = Math.round((withDesc.length / entities.length) * 100);
      if (descPct < 50) {
        issues.push({
          severity: "warning",
          title: `${descPct}% das entidades têm descrição`,
          description: "Descrições ricas melhoram a compreensão do Google sobre suas entidades.",
          icon: AlertTriangle,
        });
      }
    }

    const connectedIds = new Set([...relations.map(r => r.subject_id), ...relations.map(r => r.object_id)]);
    const disconnected = entities.filter(e => !connectedIds.has(e.id));
    if (disconnected.length > 0 && entities.length > 1) {
      issues.push({
        severity: "warning",
        title: `${disconnected.length} entidades desconectadas`,
        description: `Entidades sem relações: ${disconnected.slice(0, 3).map(e => e.name).join(", ")}${disconnected.length > 3 ? "..." : ""}`,
        icon: AlertTriangle,
      });
    }

    return issues;
  }, [entities, relations]);

  const SEVERITY_STYLES = {
    warning: "border-l-destructive/50 bg-destructive/5",
    info: "border-l-primary/50 bg-primary/5",
    success: "border-l-green-500/50 bg-green-500/5",
  };

  if (goalsLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // ── EMPTY / ONBOARDING STATE ──
  if (isEmpty) {
    const onboardingSteps = [
      {
        icon: Target,
        title: "1. Defina uma Meta",
        description: "Vá na aba Metas e escolha um template de nicho (ex: Clínica, E-commerce) ou um objetivo SEO para guiar seu trabalho.",
        tab: "goals",
      },
      {
        icon: Network,
        title: "2. Construa seu Grafo",
        description: "Na aba Construtor de Grafo, crie entidades (sua empresa, serviços, pessoas) e conecte-as com relações semânticas.",
        tab: "graph",
      },
      {
        icon: Code2,
        title: "3. Gere os Schemas",
        description: "Use a aba Schema.org para gerar o JSON-LD de cada entidade e implementar nas páginas do seu site.",
        tab: "schema",
      },
      {
        icon: Lightbulb,
        title: "4. Analise e Otimize",
        description: "Volte aqui para ver o diagnóstico do seu grafo, próximos passos priorizados e progresso rumo às suas metas.",
        tab: "feedback",
      },
    ];

    return (
      <div className="space-y-6">
        {/* Welcome Card */}
        <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex gap-4 items-start">
            <div className="rounded-xl bg-primary/10 p-3 shrink-0">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">Bem-vindo ao Feedback Semântico!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Esta aba é seu <strong>centro de controle</strong> para construir o grafo semântico perfeito. 
                Aqui você verá o progresso das suas metas, diagnósticos automáticos do grafo e os próximos passos priorizados.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Para começar, siga o passo-a-passo abaixo. Conforme você avançar, este painel se transformará em um dashboard completo com análises e recomendações.
              </p>
            </div>
          </div>
        </Card>

        {/* Step-by-step Guide */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Como Começar</h3>
          </div>
          <div className="space-y-2">
            {onboardingSteps.map((step, i) => (
              <Card key={i} className="p-4 flex items-start gap-3 hover:border-primary/30 transition-colors">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0 mt-0.5">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-7 px-2 text-primary shrink-0"
                  onClick={() => window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: step.tab }))}
                >
                  Ir <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Tips */}
        <Card className="p-4 bg-muted/30 border-muted">
          <div className="flex items-start gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground">💡 Dica Rápida</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                O <strong>Wizard por Nicho</strong> na aba Metas cria automaticamente um grafo com 10+ entidades e relações pré-configuradas.
                É a forma mais rápida de começar — depois você personaliza e expande conforme seu negócio.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Progress Overview ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progresso Geral</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">{overallPct}%</span>
            <span className="text-xs text-muted-foreground mb-1">{completedSteps}/{totalSteps} passos</span>
          </div>
          <Progress value={overallPct} className="h-2" />
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Metas</span>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <span className="text-2xl font-bold">{activeGoals}</span>
              <span className="text-xs text-muted-foreground ml-1">ativas</span>
            </div>
            <div>
              <span className="text-lg font-semibold text-green-500">{completedGoals}</span>
              <span className="text-xs text-muted-foreground ml-1">concluídas</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Grafo</span>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <span className="text-2xl font-bold">{entities.length}</span>
              <span className="text-xs text-muted-foreground ml-1">entidades</span>
            </div>
            <div>
              <span className="text-lg font-semibold">{relations.length}</span>
              <span className="text-xs text-muted-foreground ml-1">relações</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Next Steps ── */}
      {nextSteps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Próximos Passos</h3>
          </div>
          <div className="space-y-1.5">
            {nextSteps.map((ns, i) => (
              <Card key={i} className="p-3 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 w-6 h-6 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{ns.step.title}</p>
                  {ns.step.description && (
                    <p className="text-[10px] text-muted-foreground">{ns.step.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0">{ns.goalName}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── No goals hint ── */}
      {goals.length === 0 && entities.length > 0 && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">Defina uma meta para ter próximos passos</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Você já tem entidades no grafo! Vá na aba <strong>Metas</strong> para escolher um template ou criar uma checklist personalizada e acompanhar seu progresso aqui.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] h-7 px-2 shrink-0"
              onClick={() => window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: "goals" }))}
            >
              Metas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* ── Diagnostic ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Diagnóstico do Grafo</h3>
        </div>
        {diagnostics.length === 0 ? (
          <Card className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Tudo certo!</p>
            <p className="text-xs text-muted-foreground">Seu grafo está bem estruturado.</p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {diagnostics.map((d, i) => (
              <Card key={i} className={`p-3 flex items-start gap-3 border-l-4 ${SEVERITY_STYLES[d.severity]}`}>
                <d.icon className={`h-4 w-4 shrink-0 mt-0.5 ${
                  d.severity === "warning" ? "text-destructive" : d.severity === "success" ? "text-green-500" : "text-primary"
                }`} />
                <div>
                  <p className="text-xs font-medium">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground">{d.description}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
