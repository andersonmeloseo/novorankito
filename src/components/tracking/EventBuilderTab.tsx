import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Trash2, MousePointerClick, FormInput, Eye, Scroll,
  Timer, Play, Pause, Zap, Settings, Hash, Loader2, Sparkles, AlertTriangle,
  ChevronRight, ChevronLeft, Pencil, X
} from "lucide-react";
import { toast } from "sonner";
import { useCustomEvents, TRIGGER_OPTIONS, CustomEventConfig } from "@/hooks/use-custom-events";
import { supabase } from "@/integrations/supabase/client";

const TRIGGER_ICONS: Record<string, any> = {
  click: MousePointerClick,
  submit: FormInput,
  visible: Eye,
  scroll: Scroll,
  timer: Timer,
};

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

/* ─── Event Card ─── */
function EventCard({ event, onToggle, onDelete, onEdit, loading }: {
  event: CustomEventConfig;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  loading: boolean;
}) {
  const TriggerIcon = TRIGGER_ICONS[event.trigger_type] || Zap;
  const triggerInfo = TRIGGER_OPTIONS.find(t => t.value === event.trigger_type);

  return (
    <Card className={`p-4 transition-all ${event.enabled ? "border-primary/20" : "border-border opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${event.enabled ? "bg-primary/10" : "bg-muted/30"}`}>
          <TriggerIcon className={`h-4 w-4 ${event.enabled ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold font-display truncate">{event.display_name}</h4>
            {event.enabled ? (
              <Badge variant="secondary" className="text-[9px] bg-success/10 text-success border-success/20">Ativo</Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px]">Inativo</Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{event.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[9px] gap-1">
              <TriggerIcon className="h-2.5 w-2.5" /> {triggerInfo?.label}
            </Badge>
            <Badge variant="outline" className="text-[9px] font-mono truncate max-w-[200px]" title={event.selector}>
              {event.selector}
            </Badge>
            {event.conditions.length > 0 && (
              <Badge variant="outline" className="text-[9px] gap-1">
                <Settings className="h-2.5 w-2.5" /> {event.conditions.length} condição(ões)
              </Badge>
            )}
            {event.fires_count > 0 && (
              <span className="text-[9px] text-muted-foreground">{event.fires_count.toLocaleString("pt-BR")} disparos</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} disabled={loading}>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Switch checked={event.enabled} onCheckedChange={onToggle} disabled={loading} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} disabled={loading}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Wizard Steps ─── */
type WizardData = {
  name: string;
  displayName: string;
  trigger: CustomEventConfig["trigger_type"];
  selector: string;
  metaKey: string;
  metaValue: string;
};

const EMPTY_WIZARD: WizardData = { name: "", displayName: "", trigger: "click", selector: "", metaKey: "", metaValue: "" };

function WizardStep1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h4 className="text-sm font-bold font-display">Passo 1 — Tipo de Evento</h4>
        <p className="text-xs text-muted-foreground mt-1">Escolha como o evento será disparado.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TRIGGER_OPTIONS.map(t => {
          const Icon = TRIGGER_ICONS[t.value] || Zap;
          const selected = data.trigger === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ trigger: t.value })}
              className={`p-3 rounded-lg border text-left transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/30"}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-semibold">{t.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WizardStep2({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const selectorLabel = data.trigger === "scroll" ? "Profundidade (%)" : data.trigger === "timer" ? "Segundos" : "Seletor CSS";
  const selectorPlaceholder = data.trigger === "scroll" ? "75" : data.trigger === "timer" ? "30" : "#meu-botao, .minha-classe";

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h4 className="text-sm font-bold font-display">Passo 2 — O que Rastrear</h4>
        <p className="text-xs text-muted-foreground mt-1">Defina o alvo e identifique o evento.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome do Evento</label>
          <Input value={data.name} onChange={e => onChange({ name: e.target.value })} className="h-9 text-xs" placeholder="ex: cta_footer_click" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Label (exibição)</label>
          <Input value={data.displayName} onChange={e => onChange({ displayName: e.target.value })} className="h-9 text-xs" placeholder="ex: Clique CTA Footer" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{selectorLabel}</label>
          <Input
            value={data.selector}
            onChange={e => onChange({ selector: e.target.value })}
            className="h-9 text-xs font-mono"
            placeholder={selectorPlaceholder}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Metadata Key (opcional)</label>
          <Input value={data.metaKey} onChange={e => onChange({ metaKey: e.target.value })} className="h-9 text-xs" placeholder="ex: section" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Metadata Value (opcional)</label>
          <Input value={data.metaValue} onChange={e => onChange({ metaValue: e.target.value })} className="h-9 text-xs" placeholder="ex: footer" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function EventBuilderTab() {
  const { projectId, userId } = useProjectAndUser();
  const { data: events = [], isLoading, createEvent, toggleEvent, deleteEvent, seedPresets, updateEvent } = useCustomEvents(projectId);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(EMPTY_WIZARD);
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeCount = events.filter(e => e.enabled).length;
  const totalFires = events.reduce((s, e) => s + e.fires_count, 0);

  const openCreate = () => {
    setEditingId(null);
    setWizardData(EMPTY_WIZARD);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const openEdit = (ev: CustomEventConfig) => {
    setEditingId(ev.id);
    setWizardData({
      name: ev.name,
      displayName: ev.display_name,
      trigger: ev.trigger_type,
      selector: ev.selector,
      metaKey: ev.metadata?.[0]?.key || "",
      metaValue: ev.metadata?.[0]?.value || "",
    });
    setWizardStep(1);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setEditingId(null);
  };

  const handleSeedPresets = async () => {
    if (!projectId || !userId) { toast.error("Projeto ou usuário não encontrado."); return; }
    try {
      await seedPresets.mutateAsync({ projectId, ownerId: userId });
      toast.success("Eventos pré-configurados adicionados!");
    } catch (err: any) { toast.error("Erro ao adicionar presets: " + (err.message || "")); }
  };

  const handleSave = async () => {
    if (!wizardData.name.trim() || !wizardData.selector.trim()) {
      toast.error("Preencha o nome e o seletor/valor.");
      return;
    }
    if (!projectId || !userId) { toast.error("Projeto ou usuário não encontrado."); return; }

    const payload = {
      project_id: projectId,
      owner_id: userId,
      name: wizardData.name.replace(/\s+/g, "_").toLowerCase(),
      display_name: wizardData.displayName || wizardData.name,
      trigger_type: wizardData.trigger,
      selector: wizardData.selector,
      conditions: [] as any[],
      metadata: wizardData.metaKey ? [{ key: wizardData.metaKey, value: wizardData.metaValue }] : [],
      enabled: true,
    };

    try {
      if (editingId) {
        await updateEvent.mutateAsync({ id: editingId, ...payload });
        toast.success("Evento atualizado!");
      } else {
        await createEvent.mutateAsync(payload);
        toast.success("Evento criado!");
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
          <p className="text-xs text-muted-foreground mt-1">Escolha um projeto na sidebar para gerenciar eventos personalizados.</p>
        </Card>
      </AnimatedContainer>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <AnimatedContainer>
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <MousePointerClick className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold font-display">Eventos Personalizados</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ative eventos pré-configurados ou crie os seus. O <strong>Pixel Rankito já inclui todos os listeners</strong> — basta ativar aqui, sem código adicional.
              </p>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Eventos Criados", value: events.length, icon: Hash, color: "hsl(var(--primary))" },
          { label: "Ativos", value: activeCount, icon: Play, color: "hsl(var(--success))" },
          { label: "Inativos", value: events.length - activeCount, icon: Pause, color: "hsl(var(--muted-foreground))" },
          { label: "Total Disparos", value: totalFires.toLocaleString("pt-BR"), icon: Zap, color: "hsl(var(--warning))" },
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

      {/* Actions */}
      <AnimatedContainer delay={0.04}>
        <div className="flex flex-wrap gap-2">
          {events.length === 0 && (
            <Button onClick={handleSeedPresets} variant="outline" className="gap-1.5 text-xs" disabled={seedPresets.isPending}>
              {seedPresets.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Carregar Eventos Pré-configurados
            </Button>
          )}
          {!wizardOpen && (
            <Button onClick={openCreate} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Criar Evento
            </Button>
          )}
        </div>
      </AnimatedContainer>

      {/* Wizard */}
      {wizardOpen && (
        <AnimatedContainer delay={0.04}>
          <Card className="p-5 border-primary/20 space-y-4">
            {/* Step indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {[1, 2].map(s => (
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
                  {editingId ? "Editando evento" : "Novo evento"}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeWizard}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Step content */}
            {wizardStep === 1 && (
              <WizardStep1 data={wizardData} onChange={d => setWizardData(prev => ({ ...prev, ...d }))} />
            )}
            {wizardStep === 2 && (
              <WizardStep2 data={wizardData} onChange={d => setWizardData(prev => ({ ...prev, ...d }))} />
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              {wizardStep > 1 ? (
                <Button size="sm" variant="outline" onClick={() => setWizardStep(s => s - 1)} className="gap-1 text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={closeWizard} className="text-xs">Cancelar</Button>
              )}
              {wizardStep < 2 ? (
                <Button size="sm" onClick={() => setWizardStep(s => s + 1)} className="gap-1 text-xs">
                  Próximo <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs" disabled={createEvent.isPending || updateEvent.isPending}>
                  {(createEvent.isPending || updateEvent.isPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {editingId ? "Salvar Alterações" : "Criar Evento"}
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

      {/* Events list */}
      {!isLoading && events.length > 0 && (
        <AnimatedContainer delay={0.06}>
          <div className="space-y-2">
            {events.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                loading={toggleEvent.isPending || deleteEvent.isPending}
                onEdit={() => openEdit(ev)}
                onToggle={async () => {
                  try {
                    await toggleEvent.mutateAsync({ id: ev.id, enabled: !ev.enabled });
                    toast.success(ev.enabled ? `"${ev.display_name}" desativado` : `"${ev.display_name}" ativado`);
                  } catch { toast.error("Erro ao alterar evento"); }
                }}
                onDelete={async () => {
                  try {
                    await deleteEvent.mutateAsync(ev.id);
                    toast.success("Evento removido");
                  } catch { toast.error("Erro ao remover"); }
                }}
              />
            ))}
          </div>
        </AnimatedContainer>
      )}

      {/* How it works */}
      <AnimatedContainer delay={0.08}>
        <Card className="p-5 space-y-3 border-muted">
          <h4 className="text-sm font-bold font-display flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Como Funciona
          </h4>
          <div className="text-xs text-muted-foreground space-y-2">
            <p><strong>1.</strong> O Pixel Rankito (já instalado no site) busca automaticamente a lista de eventos ativos deste projeto.</p>
            <p><strong>2.</strong> Para cada evento ativo, o pixel registra o listener correspondente (clique, scroll, visibilidade, etc.).</p>
            <p><strong>3.</strong> Quando o trigger dispara, o evento é enviado como <code className="bg-muted px-1 rounded">tracking_event</code> e aparece nas abas Eventos, Sessões e Jornada.</p>
            <p><strong>4.</strong> Basta ativar/desativar aqui — <strong>sem alterar nada no site</strong>.</p>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
