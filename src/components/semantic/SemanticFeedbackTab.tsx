import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target, TrendingUp, AlertTriangle, CheckCircle2, Zap,
  Network, GitBranch, Code2, Loader2, ArrowRight,
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

  // Fetch entities and relations for diagnostic
  const { data: entities = [] } = useQuery({
    queryKey: ["semantic-entities-feedback", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("semantic_entities")
        .select("id, name, entity_type, schema_type, description")
        .eq("project_id", projectId)
        .eq("owner_id", user?.id || "");
      return data || [];
    },
    enabled: !!projectId && !!user?.id,
  });

  const { data: relations = [] } = useQuery({
    queryKey: ["semantic-relations-feedback", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("semantic_relations")
        .select("id, subject_id, object_id, predicate")
        .eq("project_id", projectId)
        .eq("owner_id", user?.id || "");
      return data || [];
    },
    enabled: !!projectId && !!user?.id,
  });

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

    // Entity count check
    if (entities.length === 0) {
      issues.push({ severity: "warning", title: "Nenhuma entidade criada", description: "Comece criando sua primeira entidade no Construtor de Grafo.", icon: Network });
    } else if (entities.length < 5) {
      issues.push({ severity: "info", title: `Apenas ${entities.length} entidades`, description: "Grafos com mais de 5 entidades têm mais impacto no SEO semântico.", icon: Network });
    } else {
      issues.push({ severity: "success", title: `${entities.length} entidades criadas`, description: "Boa cobertura de entidades no grafo.", icon: Network });
    }

    // Relations check
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

    // Schema coverage
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

    // Description coverage
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

    // Disconnected entities
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
