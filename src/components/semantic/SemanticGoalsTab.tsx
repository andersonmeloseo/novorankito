import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Target, Plus, Trash2, Loader2, CheckCircle2, Circle, ChevronDown,
  ChevronRight, Stethoscope, ShoppingBag, UtensilsCrossed, Scale, Home,
  Award, Layers, MapPin, BookOpen, Sparkles, ListChecks, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useSemanticGoals, GoalStep } from "@/hooks/use-semantic-goals";
import { NICHE_TEMPLATES, SEO_OBJECTIVES, GoalTemplate } from "./semantic-goal-templates";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  Stethoscope, ShoppingBag, UtensilsCrossed, Scale, Home,
  Award, Layers, MapPin, BookOpen, Target,
};

const TYPE_LABELS = {
  niche_template: { label: "Template", color: "bg-primary/10 text-primary border-primary/20" },
  seo_objective: { label: "Objetivo SEO", color: "bg-accent text-accent-foreground border-accent" },
  custom: { label: "Personalizado", color: "bg-muted text-muted-foreground border-border" },
};

interface Props {
  projectId: string;
  goalProjectId: string;
}

export function SemanticGoalsTab({ projectId, goalProjectId }: Props) {
  const { data: goals = [], isLoading, createGoal, updateGoalSteps, deleteGoal } = useSemanticGoals(projectId, goalProjectId);
  const [showPicker, setShowPicker] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customSteps, setCustomSteps] = useState<string[]>([""]);

  const handlePickTemplate = async (tpl: GoalTemplate) => {
    try {
      await createGoal.mutateAsync({
        goal_type: tpl.goal_type,
        name: tpl.name,
        description: tpl.description,
        template_key: tpl.key,
        steps: tpl.steps,
      });
      toast.success(`Meta "${tpl.name}" adicionada!`);
      setShowPicker(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar meta.");
    }
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) { toast.error("Informe o nome da meta."); return; }
    const validSteps = customSteps.filter(s => s.trim());
    if (validSteps.length === 0) { toast.error("Adicione pelo menos um passo."); return; }
    try {
      await createGoal.mutateAsync({
        goal_type: "custom",
        name: customName.trim(),
        description: customDesc.trim() || undefined,
        steps: validSteps.map((s, i) => ({
          id: `custom-${i}`,
          title: s.trim(),
          description: "",
          type: "custom" as const,
          completed: false,
        })),
      });
      toast.success("Meta personalizada criada!");
      setShowCustom(false);
      setCustomName(""); setCustomDesc(""); setCustomSteps([""]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar meta.");
    }
  };

  const toggleStep = async (goal: typeof goals[0], stepIdx: number) => {
    const newSteps = [...goal.steps];
    newSteps[stepIdx] = { ...newSteps[stepIdx], completed: !newSteps[stepIdx].completed };
    try {
      await updateGoalSteps.mutateAsync({ goalId: goal.id, steps: newSteps });
    } catch (err: any) {
      toast.error("Erro ao atualizar passo.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta meta?")) return;
    try {
      await deleteGoal.mutateAsync(id);
      toast.success("Meta excluída!");
    } catch (err: any) {
      toast.error("Erro ao excluir.");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold font-display">Metas do Projeto</h3>
          <Badge variant="secondary" className="text-[10px]">{goals.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1 h-8" onClick={() => setShowCustom(true)}>
            <ListChecks className="h-3 w-3" /> Checklist
          </Button>
          <Button size="sm" className="text-xs gap-1 h-8" onClick={() => setShowPicker(true)}>
            <Plus className="h-3 w-3" /> Escolher Meta
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <Card className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="rounded-full bg-primary/10 p-4">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h4 className="text-sm font-semibold">Nenhuma meta definida</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Escolha um template de nicho, um objetivo SEO ou crie uma checklist personalizada para guiar a construção do seu grafo semântico.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowCustom(true)}>
              <ListChecks className="h-3 w-3 mr-1" /> Criar Checklist
            </Button>
            <Button size="sm" className="text-xs" onClick={() => setShowPicker(true)}>
              <Sparkles className="h-3 w-3 mr-1" /> Escolher Template
            </Button>
          </div>
        </Card>
      )}

      {/* Goals list */}
      {goals.map(goal => {
        const completed = goal.steps.filter(s => s.completed).length;
        const total = goal.steps.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const isExpanded = expandedGoal === goal.id;
        const typeConf = TYPE_LABELS[goal.goal_type] || TYPE_LABELS.custom;

        return (
          <Card key={goal.id} className="overflow-hidden">
            <button
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
            >
              <div className="shrink-0">
                {pct === 100 ? (
                  <div className="rounded-full bg-green-500/10 p-2">
                    <Trophy className="h-4 w-4 text-green-500" />
                  </div>
                ) : (
                  <div className="rounded-full bg-primary/10 p-2">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{goal.name}</span>
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", typeConf.color)}>
                    {typeConf.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <Progress value={pct} className="h-1.5 flex-1 max-w-[200px]" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {completed}/{total} ({pct}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }}
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-1 border-t">
                {goal.description && (
                  <p className="text-xs text-muted-foreground py-2">{goal.description}</p>
                )}
                {goal.steps.map((step, idx) => (
                  <button
                    key={step.id}
                    className="w-full flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors text-left"
                    onClick={() => toggleStep(goal, idx)}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className={cn(
                        "text-xs font-medium",
                        step.completed && "line-through text-muted-foreground"
                      )}>
                        {step.title}
                      </span>
                      {step.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{step.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {/* Template Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Escolher Meta</DialogTitle>
            <DialogDescription className="text-xs">
              Selecione um template de nicho ou objetivo SEO para guiar seu grafo semântico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Templates de Nicho</h4>
              <div className="grid gap-2">
                {NICHE_TEMPLATES.map(tpl => {
                  const Icon = ICON_MAP[tpl.icon] || Target;
                  return (
                    <button
                      key={tpl.key}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                      onClick={() => handlePickTemplate(tpl)}
                      disabled={createGoal.isPending}
                    >
                      <div className="rounded-lg p-2 shrink-0" style={{ backgroundColor: `${tpl.color}15` }}>
                        <Icon className="h-4 w-4" style={{ color: tpl.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{tpl.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{tpl.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-[9px] shrink-0">{tpl.steps.length} passos</Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Objetivos SEO</h4>
              <div className="grid gap-2">
                {SEO_OBJECTIVES.map(tpl => {
                  const Icon = ICON_MAP[tpl.icon] || Target;
                  return (
                    <button
                      key={tpl.key}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                      onClick={() => handlePickTemplate(tpl)}
                      disabled={createGoal.isPending}
                    >
                      <div className="rounded-lg p-2 shrink-0" style={{ backgroundColor: `${tpl.color}15` }}>
                        <Icon className="h-4 w-4" style={{ color: tpl.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{tpl.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{tpl.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-[9px] shrink-0">{tpl.steps.length} passos</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Checklist Dialog */}
      <Dialog open={showCustom} onOpenChange={setShowCustom}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Checklist Personalizada</DialogTitle>
            <DialogDescription className="text-xs">
              Crie sua própria meta com passos personalizados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome da Meta *</label>
              <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ex: Mapear entidades do site" className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
              <Textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="Objetivo desta meta..." className="text-xs" rows={2} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Passos</label>
              <div className="space-y-1.5">
                {customSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-1.5">
                    <Input
                      value={step}
                      onChange={e => {
                        const n = [...customSteps];
                        n[idx] = e.target.value;
                        setCustomSteps(n);
                      }}
                      placeholder={`Passo ${idx + 1}...`}
                      className="h-8 text-xs"
                    />
                    {customSteps.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCustomSteps(customSteps.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-[10px] h-7 w-full" onClick={() => setCustomSteps([...customSteps, ""])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Passo
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCustom(false)}>Cancelar</Button>
            <Button size="sm" className="text-xs gap-1" onClick={handleCreateCustom} disabled={createGoal.isPending}>
              {createGoal.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Criar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
