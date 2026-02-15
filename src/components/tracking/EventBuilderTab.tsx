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
  Timer, Play, Pause, Zap, Settings, Hash, Loader2, Sparkles, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useCustomEvents, TRIGGER_OPTIONS, CustomEventConfig } from "@/hooks/use-custom-events";
import { supabase } from "@/integrations/supabase/client";

const TRIGGER_ICONS = {
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

function EventCard({ event, onToggle, onDelete, loading }: {
  event: CustomEventConfig;
  onToggle: () => void;
  onDelete: () => void;
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
          <Switch checked={event.enabled} onCheckedChange={onToggle} disabled={loading} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} disabled={loading}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function EventBuilderTab() {
  const { projectId, userId } = useProjectAndUser();
  const { data: events = [], isLoading, createEvent, toggleEvent, deleteEvent, seedPresets } = useCustomEvents(projectId);

  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "", displayName: "", trigger: "click" as CustomEventConfig["trigger_type"],
    selector: "", metaKey: "", metaValue: "",
  });

  const activeCount = events.filter(e => e.enabled).length;
  const totalFires = events.reduce((s, e) => s + e.fires_count, 0);

  const handleSeedPresets = async () => {
    if (!projectId || !userId) {
      toast.error("Projeto ou usuário não encontrado.");
      return;
    }
    try {
      await seedPresets.mutateAsync({ projectId, ownerId: userId });
      toast.success("Eventos pré-configurados adicionados! Ative os que desejar.");
    } catch (err: any) {
      toast.error("Erro ao adicionar presets: " + (err.message || ""));
    }
  };

  const handleCreate = async () => {
    if (!newEvent.name.trim() || !newEvent.selector.trim()) {
      toast.error("Preencha o nome e o seletor.");
      return;
    }
    if (!projectId || !userId) {
      toast.error("Projeto ou usuário não encontrado.");
      return;
    }
    try {
      await createEvent.mutateAsync({
        project_id: projectId,
        owner_id: userId,
        name: newEvent.name.replace(/\s+/g, "_").toLowerCase(),
        display_name: newEvent.displayName || newEvent.name,
        trigger_type: newEvent.trigger,
        selector: newEvent.selector,
        conditions: [],
        metadata: newEvent.metaKey ? [{ key: newEvent.metaKey, value: newEvent.metaValue }] : [],
        enabled: true,
      });
      setCreating(false);
      setNewEvent({ name: "", displayName: "", trigger: "click", selector: "", metaKey: "", metaValue: "" });
      toast.success("Evento criado!");
    } catch (err: any) {
      toast.error("Erro ao criar evento: " + (err.message || ""));
    }
  };

  if (!projectId) {
    return (
      <AnimatedContainer>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
          <h3 className="text-sm font-bold font-display">Selecione um Projeto</h3>
          <p className="text-xs text-muted-foreground mt-1">Escolha um projeto na sidebar para gerenciar eventos customizados.</p>
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
              <h3 className="text-base font-bold font-display">Event Builder</h3>
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

      {/* Seed presets or create */}
      <AnimatedContainer delay={0.04}>
        <div className="flex flex-wrap gap-2">
          {events.length === 0 && (
            <Button onClick={handleSeedPresets} variant="outline" className="gap-1.5 text-xs" disabled={seedPresets.isPending}>
              {seedPresets.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Carregar Eventos Pré-configurados
            </Button>
          )}
          {!creating && (
            <Button onClick={() => setCreating(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Criar Evento Customizado
            </Button>
          )}
        </div>
      </AnimatedContainer>

      {/* Create form */}
      {creating && (
        <AnimatedContainer delay={0.04}>
          <Card className="p-5 border-primary/20 space-y-4">
            <h4 className="text-sm font-bold font-display">Novo Evento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome do Evento</label>
                <Input value={newEvent.name} onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))} className="h-9 text-xs" placeholder="ex: cta_footer_click" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Label (exibição)</label>
                <Input value={newEvent.displayName} onChange={e => setNewEvent(p => ({ ...p, displayName: e.target.value }))} className="h-9 text-xs" placeholder="ex: Clique CTA Footer" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Trigger</label>
                <Select value={newEvent.trigger} onValueChange={(v: any) => setNewEvent(p => ({ ...p, trigger: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">{t.label} — {t.desc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {newEvent.trigger === "scroll" ? "Profundidade (%)" : newEvent.trigger === "timer" ? "Segundos" : "Seletor CSS"}
                </label>
                <Input
                  value={newEvent.selector}
                  onChange={e => setNewEvent(p => ({ ...p, selector: e.target.value }))}
                  className="h-9 text-xs font-mono"
                  placeholder={newEvent.trigger === "scroll" ? "75" : newEvent.trigger === "timer" ? "30" : "#meu-botao, .minha-classe"}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Metadata Key (opcional)</label>
                <Input value={newEvent.metaKey} onChange={e => setNewEvent(p => ({ ...p, metaKey: e.target.value }))} className="h-9 text-xs" placeholder="ex: section" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Metadata Value (opcional)</label>
                <Input value={newEvent.metaValue} onChange={e => setNewEvent(p => ({ ...p, metaValue: e.target.value }))} className="h-9 text-xs" placeholder="ex: footer" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} className="gap-1.5 text-xs" disabled={createEvent.isPending}>
                {createEvent.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Criar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)} className="text-xs">Cancelar</Button>
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* Loading state */}
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
            <p>
              <strong>1.</strong> O Pixel Rankito (já instalado no site) busca automaticamente a lista de eventos ativos deste projeto.
            </p>
            <p>
              <strong>2.</strong> Para cada evento ativo, o pixel registra o listener correspondente (clique, scroll, visibilidade, etc.).
            </p>
            <p>
              <strong>3.</strong> Quando o trigger dispara, o evento é enviado como <code className="bg-muted px-1 rounded">tracking_event</code> e aparece nas abas Eventos, Sessões e Jornada.
            </p>
            <p>
              <strong>4.</strong> Basta ativar/desativar aqui — <strong>sem alterar nada no site</strong>.
            </p>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
