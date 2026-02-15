import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Trash2, Target, Trophy, TrendingUp, DollarSign,
  Loader2, AlertTriangle, Pencil, X, Check, Flag,
  Eye, Zap, ChevronRight, ChevronLeft, Globe, Search
} from "lucide-react";
import { toast } from "sonner";
import { useTrackingGoals, GOAL_TYPES, TrackingGoal } from "@/hooks/use-tracking-goals";
import { useTrackingEvents, EVENT_LABELS, PLUGIN_EVENT_TYPES } from "@/hooks/use-tracking-events";
import { supabase } from "@/integrations/supabase/client";

function useProjectAndUser() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("rankito_current_project");
    if (stored) setProjectId(stored);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
    const handleStorage = () => {
      const s = localStorage.getItem("rankito_current_project");
      if (s) setProjectId(s);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return { projectId, userId };
}

function useSiteUrls(projectId: string | null) {
  const [urls, setUrls] = useState<{ id: string; url: string }[]>([]);
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from("site_urls")
      .select("id, url")
      .eq("project_id", projectId)
      .order("url")
      .limit(500)
      .then(({ data }) => {
        if (data) setUrls(data);
      });
  }, [projectId]);
  return urls;
}

/* ─── Goal Progress Calculator ─── */
function useGoalProgress(goal: TrackingGoal, events: any[]) {
  return useMemo(() => {
    if (!events.length) return { current: 0, percentage: 0, completed: false };

    let current = 0;

    if (goal.goal_type === "pages_visited") {
      // Count unique pages visited that match target URLs
      const visitedUrls = new Set<string>();
      events.forEach(e => {
        if (e.event_type === "page_view" && e.page_url) {
          const normalized = e.page_url.replace(/\/$/, "").toLowerCase();
          goal.target_urls.forEach(target => {
            const normalizedTarget = target.replace(/\/$/, "").toLowerCase();
            if (normalized.includes(normalizedTarget) || normalizedTarget.includes(normalized)) {
              visitedUrls.add(normalizedTarget);
            }
          });
        }
      });
      current = visitedUrls.size;
    } else if (goal.goal_type === "event_count") {
      // Count events matching target event types
      events.forEach(e => {
        if (goal.target_events.includes(e.event_type)) {
          current++;
        }
      });
    } else if (goal.goal_type === "page_value") {
      // Count page views on target URLs × currency value
      events.forEach(e => {
        if (e.event_type === "page_view" && e.page_url) {
          const normalized = e.page_url.replace(/\/$/, "").toLowerCase();
          const matched = goal.target_urls.some(target =>
            normalized.includes(target.replace(/\/$/, "").toLowerCase())
          );
          if (matched) current++;
        }
      });
    }

    const percentage = Math.min(100, Math.round((current / Math.max(goal.target_value, 1)) * 100));
    return { current, percentage, completed: current >= goal.target_value };
  }, [goal, events]);
}

/* ─── Goal Card ─── */
function GoalCard({ goal, events, onToggle, onDelete, onEdit, loading }: {
  goal: TrackingGoal;
  events: any[];
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  loading: boolean;
}) {
  const progress = useGoalProgress(goal, events);
  const typeInfo = GOAL_TYPES.find(t => t.value === goal.goal_type);
  const goalIcon = goal.goal_type === "pages_visited" ? Globe : goal.goal_type === "event_count" ? Zap : DollarSign;
  const GoalIcon = goalIcon;

  return (
    <Card className={`p-4 transition-all ${goal.enabled ? progress.completed ? "border-success/40 bg-success/5" : "border-primary/20" : "border-border opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${progress.completed ? "bg-success/10" : goal.enabled ? "bg-primary/10" : "bg-muted/30"}`}>
          {progress.completed ? (
            <Trophy className="h-5 w-5 text-success" />
          ) : (
            <GoalIcon className={`h-5 w-5 ${goal.enabled ? "text-primary" : "text-muted-foreground"}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold font-display truncate">{goal.name}</h4>
            {progress.completed ? (
              <Badge className="text-[9px] bg-success/10 text-success border-success/20 gap-0.5">
                <Check className="h-2.5 w-2.5" /> Concluída
              </Badge>
            ) : goal.enabled ? (
              <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-primary/20">Em andamento</Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px]">Pausada</Badge>
            )}
          </div>
          {goal.description && (
            <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">{goal.description}</p>
          )}

          {/* Progress bar */}
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground">
                {progress.current} / {goal.target_value} {typeInfo?.label.toLowerCase()}
              </span>
              <span className={`text-xs font-bold ${progress.completed ? "text-success" : "text-primary"}`}>
                {progress.percentage}%
              </span>
            </div>
            <Progress
              value={progress.percentage}
              className={`h-2 ${progress.completed ? "[&>div]:bg-success" : ""}`}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[9px] gap-1">
              <GoalIcon className="h-2.5 w-2.5" /> {typeInfo?.label}
            </Badge>
            {goal.goal_type === "page_value" && goal.currency_value > 0 && (
              <Badge variant="outline" className="text-[9px] gap-1 text-success border-success/20">
                <DollarSign className="h-2.5 w-2.5" /> R$ {goal.currency_value.toFixed(2)}
              </Badge>
            )}
            {goal.target_urls.length > 0 && (
              <Badge variant="outline" className="text-[9px] gap-1">
                <Globe className="h-2.5 w-2.5" /> {goal.target_urls.length} URL(s)
              </Badge>
            )}
            {goal.target_events.length > 0 && (
              <Badge variant="outline" className="text-[9px] gap-1">
                <Zap className="h-2.5 w-2.5" /> {goal.target_events.length} evento(s)
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} disabled={loading}>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Switch checked={goal.enabled} onCheckedChange={onToggle} disabled={loading} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} disabled={loading}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Wizard ─── */
type WizardData = {
  name: string;
  description: string;
  goalType: TrackingGoal["goal_type"];
  targetValue: string;
  currencyValue: string;
  targetUrls: string[];
  targetEvents: string[];
};

const EMPTY_WIZARD: WizardData = {
  name: "", description: "", goalType: "pages_visited",
  targetValue: "3", currencyValue: "0", targetUrls: [], targetEvents: [],
};

function WizardStep1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h4 className="text-sm font-bold font-display">Passo 1 — Tipo de Meta</h4>
        <p className="text-xs text-muted-foreground mt-1">Escolha como a meta será medida.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {GOAL_TYPES.map(t => {
          const Icon = t.value === "pages_visited" ? Globe : t.value === "event_count" ? Zap : DollarSign;
          const selected = data.goalType === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ goalType: t.value })}
              className={`p-4 rounded-lg border text-left transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/30"}`}
            >
              <Icon className={`h-5 w-5 mb-2 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold block">{t.label}</span>
              <p className="text-[10px] text-muted-foreground mt-1">{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WizardStep2({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h4 className="text-sm font-bold font-display">Passo 2 — Detalhes da Meta</h4>
        <p className="text-xs text-muted-foreground mt-1">Nomeie e defina o valor alvo.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome da Meta</label>
          <Input value={data.name} onChange={e => onChange({ name: e.target.value })} className="h-9 text-xs" placeholder="ex: Visitou 3 páginas do blog" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descrição (opcional)</label>
          <Textarea value={data.description} onChange={e => onChange({ description: e.target.value })} className="text-xs min-h-[60px]" placeholder="Descreva o objetivo desta meta..." />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {data.goalType === "pages_visited" ? "Páginas necessárias" : data.goalType === "event_count" ? "Eventos necessários" : "Views necessárias"}
          </label>
          <Input type="number" min="1" value={data.targetValue} onChange={e => onChange({ targetValue: e.target.value })} className="h-9 text-xs" />
        </div>
        {data.goalType === "page_value" && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Valor por conversão (R$)</label>
            <Input type="number" min="0" step="0.01" value={data.currencyValue} onChange={e => onChange({ currencyValue: e.target.value })} className="h-9 text-xs" placeholder="10.00" />
          </div>
        )}
      </div>
    </div>
  );
}

function WizardStep3({ data, onChange, siteUrls }: {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  siteUrls: { id: string; url: string }[];
}) {
  const [urlSearch, setUrlSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  const showUrls = data.goalType === "pages_visited" || data.goalType === "page_value";
  const showEvents = data.goalType === "event_count";

  const filteredUrls = siteUrls.filter(u => u.url.toLowerCase().includes(urlSearch.toLowerCase()));

  const allEvents = [...PLUGIN_EVENT_TYPES];
  const filteredEvents = allEvents.filter(e =>
    e.toLowerCase().includes(eventSearch.toLowerCase()) ||
    (EVENT_LABELS[e] || "").toLowerCase().includes(eventSearch.toLowerCase())
  );

  const toggleUrl = (url: string) => {
    const current = data.targetUrls;
    onChange({ targetUrls: current.includes(url) ? current.filter(u => u !== url) : [...current, url] });
  };

  const toggleEvent = (ev: string) => {
    const current = data.targetEvents;
    onChange({ targetEvents: current.includes(ev) ? current.filter(e => e !== ev) : [...current, ev] });
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h4 className="text-sm font-bold font-display">Passo 3 — {showUrls ? "Selecionar URLs" : "Selecionar Eventos"}</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {showUrls ? "Escolha as páginas que o visitante precisa acessar." : "Escolha os eventos que contam para a meta."}
        </p>
      </div>

      {showUrls && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={urlSearch}
              onChange={e => setUrlSearch(e.target.value)}
              className="h-8 text-xs pl-8"
              placeholder="Buscar URLs do projeto..."
            />
          </div>
          {data.targetUrls.length > 0 && (
            <p className="text-[10px] text-primary font-medium">{data.targetUrls.length} URL(s) selecionada(s)</p>
          )}
          <ScrollArea className="h-[200px] rounded-lg border border-border">
            <div className="p-2 space-y-0.5">
              {filteredUrls.length > 0 ? filteredUrls.map(u => (
                <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={data.targetUrls.includes(u.url)}
                    onCheckedChange={() => toggleUrl(u.url)}
                  />
                  <span className="text-xs font-mono truncate">{u.url}</span>
                </label>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {siteUrls.length === 0 ? "Nenhuma URL cadastrada no projeto." : "Nenhuma URL encontrada."}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {showEvents && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              className="h-8 text-xs pl-8"
              placeholder="Buscar eventos..."
            />
          </div>
          {data.targetEvents.length > 0 && (
            <p className="text-[10px] text-primary font-medium">{data.targetEvents.length} evento(s) selecionado(s)</p>
          )}
          <ScrollArea className="h-[200px] rounded-lg border border-border">
            <div className="p-2 space-y-0.5">
              {filteredEvents.map(ev => (
                <label key={ev} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={data.targetEvents.includes(ev)}
                    onCheckedChange={() => toggleEvent(ev)}
                  />
                  <span className="text-xs">{EVENT_LABELS[ev] || ev}</span>
                  <span className="text-[9px] text-muted-foreground font-mono ml-auto">{ev}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export function GoalsTab() {
  const { projectId, userId } = useProjectAndUser();
  const { data: goals = [], isLoading, createGoal, updateGoal, deleteGoal, toggleGoal } = useTrackingGoals(projectId);
  const { data: events = [] } = useTrackingEvents(projectId);
  const siteUrls = useSiteUrls(projectId);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(EMPTY_WIZARD);
  const [editingId, setEditingId] = useState<string | null>(null);

  const completedGoals = goals.filter(g => {
    if (!g.enabled) return false;
    // Quick check
    if (g.goal_type === "event_count") {
      const count = events.filter(e => g.target_events.includes(e.event_type)).length;
      return count >= g.target_value;
    }
    if (g.goal_type === "pages_visited" || g.goal_type === "page_value") {
      const visited = new Set<string>();
      events.forEach(e => {
        if (e.event_type === "page_view" && e.page_url) {
          const n = e.page_url.replace(/\/$/, "").toLowerCase();
          g.target_urls.forEach(t => {
            if (n.includes(t.replace(/\/$/, "").toLowerCase())) visited.add(t);
          });
        }
      });
      return visited.size >= g.target_value;
    }
    return false;
  });

  const totalValue = goals.reduce((sum, g) => {
    if (g.goal_type === "page_value" && g.enabled) return sum + g.currency_value;
    return sum;
  }, 0);

  const openCreate = () => {
    setEditingId(null);
    setWizardData(EMPTY_WIZARD);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const openEdit = (g: TrackingGoal) => {
    setEditingId(g.id);
    setWizardData({
      name: g.name,
      description: g.description || "",
      goalType: g.goal_type,
      targetValue: String(g.target_value),
      currencyValue: String(g.currency_value),
      targetUrls: g.target_urls || [],
      targetEvents: g.target_events || [],
    });
    setWizardStep(1);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!wizardData.name.trim()) {
      toast.error("Preencha o nome da meta.");
      return;
    }
    if (!projectId || !userId) {
      toast.error("Projeto ou usuário não encontrado.");
      return;
    }

    const payload = {
      project_id: projectId,
      owner_id: userId,
      name: wizardData.name,
      description: wizardData.description || null,
      goal_type: wizardData.goalType,
      target_value: Number(wizardData.targetValue) || 1,
      target_urls: wizardData.targetUrls,
      target_events: wizardData.targetEvents,
      currency_value: Number(wizardData.currencyValue) || 0,
      enabled: true,
    };

    try {
      if (editingId) {
        await updateGoal.mutateAsync({ id: editingId, ...payload });
        toast.success("Meta atualizada!");
      } else {
        await createGoal.mutateAsync(payload);
        toast.success("Meta criada!");
      }
      closeWizard();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    }
  };

  if (!projectId) {
    return (
      <AnimatedContainer>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
          <h3 className="text-sm font-bold font-display">Selecione um Projeto</h3>
          <p className="text-xs text-muted-foreground mt-1">Escolha um projeto na sidebar para gerenciar metas.</p>
        </Card>
      </AnimatedContainer>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <AnimatedContainer>
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-success/5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-success/20">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold font-display">Metas de Conversão</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Defina metas inteligentes: <strong>páginas visitadas</strong>, <strong>contagem de eventos</strong> ou <strong>valor monetário</strong>. O progresso é calculado automaticamente com base nos eventos capturados pelo Pixel.
              </p>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Metas Criadas", value: goals.length, icon: Flag, color: "hsl(var(--primary))" },
          { label: "Concluídas", value: completedGoals.length, icon: Trophy, color: "hsl(var(--success))" },
          { label: "Em Andamento", value: goals.filter(g => g.enabled).length - completedGoals.length, icon: TrendingUp, color: "hsl(var(--warning))" },
          { label: "Valor Total", value: `R$ ${totalValue.toFixed(2)}`, icon: DollarSign, color: "hsl(var(--success))" },
        ].map((kpi, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-1.5">
              <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            </div>
            <span className="text-2xl font-bold font-display mt-1 block">{kpi.value}</span>
          </Card>
        ))}
      </StaggeredGrid>

      {/* Create button */}
      <AnimatedContainer delay={0.04}>
        {!wizardOpen && (
          <Button onClick={openCreate} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Criar Meta
          </Button>
        )}
      </AnimatedContainer>

      {/* Wizard */}
      {wizardOpen && (
        <AnimatedContainer delay={0.04}>
          <Card className="p-5 border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setWizardStep(s)}
                    className={`h-7 w-7 rounded-full text-xs font-bold transition-all ${
                      wizardStep === s
                        ? "bg-primary text-primary-foreground"
                        : wizardStep > s
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  {editingId ? "Editando meta" : "Nova meta"}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeWizard}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {wizardStep === 1 && (
              <WizardStep1 data={wizardData} onChange={d => setWizardData(prev => ({ ...prev, ...d }))} />
            )}
            {wizardStep === 2 && (
              <WizardStep2 data={wizardData} onChange={d => setWizardData(prev => ({ ...prev, ...d }))} />
            )}
            {wizardStep === 3 && (
              <WizardStep3 data={wizardData} onChange={d => setWizardData(prev => ({ ...prev, ...d }))} siteUrls={siteUrls} />
            )}

            <div className="flex justify-between pt-2">
              {wizardStep > 1 ? (
                <Button size="sm" variant="outline" onClick={() => setWizardStep(s => s - 1)} className="gap-1 text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={closeWizard} className="text-xs">Cancelar</Button>
              )}
              {wizardStep < 3 ? (
                <Button size="sm" onClick={() => setWizardStep(s => s + 1)} className="gap-1 text-xs">
                  Próximo <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs" disabled={createGoal.isPending || updateGoal.isPending}>
                  {(createGoal.isPending || updateGoal.isPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                  {editingId ? "Salvar Alterações" : "Criar Meta"}
                </Button>
              )}
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Goals list */}
      {!isLoading && goals.length > 0 && (
        <AnimatedContainer delay={0.06}>
          <div className="space-y-2">
            {goals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                events={events}
                loading={toggleGoal.isPending || deleteGoal.isPending}
                onEdit={() => openEdit(g)}
                onToggle={() => toggleGoal.mutateAsync({ id: g.id, enabled: !g.enabled })}
                onDelete={() => {
                  if (confirm("Excluir esta meta?")) {
                    deleteGoal.mutateAsync(g.id).then(() => toast.success("Meta excluída!")).catch(() => toast.error("Erro ao excluir."));
                  }
                }}
              />
            ))}
          </div>
        </AnimatedContainer>
      )}

      {/* Empty state */}
      {!isLoading && goals.length === 0 && !wizardOpen && (
        <AnimatedContainer delay={0.06}>
          <Card className="p-8 text-center border-dashed">
            <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold font-display">Nenhuma meta criada</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Crie metas para acompanhar a conversão dos visitantes. Exemplo: "Visitou 3 páginas do blog" ou "Enviou 5 formulários de contato".
            </p>
            <Button onClick={openCreate} className="gap-1.5 text-xs mt-4">
              <Plus className="h-3.5 w-3.5" /> Criar Primeira Meta
            </Button>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}
