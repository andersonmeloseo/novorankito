import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Trash2, Copy, Check, MousePointerClick, FormInput, Eye, Scroll,
  Timer, Play, Pause, Code, Zap, GripVertical, Settings, ArrowRight,
  Hash, Type, ToggleLeft, Globe
} from "lucide-react";
import { toast } from "sonner";

interface CustomEvent {
  id: string;
  name: string;
  displayName: string;
  trigger: "click" | "submit" | "visible" | "scroll" | "timer";
  selector: string;
  conditions: { field: string; operator: string; value: string }[];
  metadata: { key: string; value: string }[];
  enabled: boolean;
  fires: number;
}

const TRIGGER_OPTIONS = [
  { value: "click", label: "Clique", icon: MousePointerClick, desc: "Dispara quando o elemento é clicado" },
  { value: "submit", label: "Formulário", icon: FormInput, desc: "Dispara quando o formulário é enviado" },
  { value: "visible", label: "Visibilidade", icon: Eye, desc: "Dispara quando o elemento entra na viewport" },
  { value: "scroll", label: "Scroll", icon: Scroll, desc: "Dispara em uma profundidade de scroll específica" },
  { value: "timer", label: "Tempo", icon: Timer, desc: "Dispara após X segundos na página" },
];

const INITIAL_EVENTS: CustomEvent[] = [
  {
    id: "ev1", name: "cta_hero_click", displayName: "Clique CTA Hero",
    trigger: "click", selector: "#hero-cta, .btn-hero", conditions: [],
    metadata: [{ key: "section", value: "hero" }], enabled: true, fires: 1247,
  },
  {
    id: "ev2", name: "newsletter_submit", displayName: "Newsletter Enviado",
    trigger: "submit", selector: "#newsletter-form, .newsletter-form",
    conditions: [{ field: "page_url", operator: "contains", value: "/blog" }],
    metadata: [{ key: "source", value: "blog_sidebar" }], enabled: true, fires: 342,
  },
  {
    id: "ev3", name: "pricing_view", displayName: "Seção Preços Visível",
    trigger: "visible", selector: "#pricing, .pricing-section", conditions: [],
    metadata: [{ key: "section", value: "pricing" }], enabled: true, fires: 890,
  },
  {
    id: "ev4", name: "deep_scroll", displayName: "Scroll Profundo (75%)",
    trigger: "scroll", selector: "75", conditions: [],
    metadata: [{ key: "threshold", value: "75%" }], enabled: false, fires: 0,
  },
  {
    id: "ev5", name: "engaged_user", displayName: "Usuário Engajado (30s)",
    trigger: "timer", selector: "30", conditions: [],
    metadata: [{ key: "threshold_seconds", value: "30" }], enabled: true, fires: 567,
  },
];

function EventCard({ event, onToggle, onDelete, onEdit }: { event: CustomEvent; onToggle: () => void; onDelete: () => void; onEdit: () => void }) {
  const triggerInfo = TRIGGER_OPTIONS.find(t => t.value === event.trigger);
  const TriggerIcon = triggerInfo?.icon || Zap;

  return (
    <Card className={`p-4 transition-all ${event.enabled ? "border-primary/20" : "border-border opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${event.enabled ? "bg-primary/10" : "bg-muted/30"}`}>
          <TriggerIcon className={`h-4 w-4 ${event.enabled ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold font-display truncate">{event.displayName}</h4>
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
            <Badge variant="outline" className="text-[9px] font-mono">{event.selector}</Badge>
            {event.conditions.length > 0 && (
              <Badge variant="outline" className="text-[9px] gap-1">
                <Settings className="h-2.5 w-2.5" /> {event.conditions.length} condição(ões)
              </Badge>
            )}
            {event.fires > 0 && (
              <span className="text-[9px] text-muted-foreground">{event.fires.toLocaleString("pt-BR")} disparos</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Switch checked={event.enabled} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function EventBuilderTab() {
  const [events, setEvents] = useState<CustomEvent[]>(INITIAL_EVENTS);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "", displayName: "", trigger: "click" as CustomEvent["trigger"],
    selector: "", metaKey: "", metaValue: "",
  });

  const activeCount = events.filter(e => e.enabled).length;
  const totalFires = events.reduce((s, e) => s + e.fires, 0);

  const handleCreate = () => {
    if (!newEvent.name.trim() || !newEvent.selector.trim()) {
      toast.error("Preencha o nome e o seletor.");
      return;
    }
    const ev: CustomEvent = {
      id: "ev_" + Date.now(),
      name: newEvent.name.replace(/\s+/g, "_").toLowerCase(),
      displayName: newEvent.displayName || newEvent.name,
      trigger: newEvent.trigger,
      selector: newEvent.selector,
      conditions: [],
      metadata: newEvent.metaKey ? [{ key: newEvent.metaKey, value: newEvent.metaValue }] : [],
      enabled: true,
      fires: 0,
    };
    setEvents(prev => [ev, ...prev]);
    setCreating(false);
    setNewEvent({ name: "", displayName: "", trigger: "click", selector: "", metaKey: "", metaValue: "" });
    toast.success(`Evento "${ev.displayName}" criado!`);
  };

  const generatedCode = useMemo(() => {
    const activeEvents = events.filter(e => e.enabled);
    if (activeEvents.length === 0) return "// Nenhum evento ativo";

    let code = `// Rankito Custom Events — Gerado automaticamente\n`;
    code += `// Cole este snippet APÓS o script principal do Pixel Rankito\n`;
    code += `<script>\n(function(){\n  var rk = window.rankitoTrack;\n  if(!rk) return;\n\n`;

    activeEvents.forEach(ev => {
      const meta = ev.metadata.length > 0
        ? `, { ${ev.metadata.map(m => `${m.key}: '${m.value}'`).join(", ")} }`
        : "";

      if (ev.trigger === "click") {
        code += `  // ${ev.displayName}\n`;
        code += `  document.querySelectorAll('${ev.selector}').forEach(function(el){\n`;
        code += `    el.addEventListener('click', function(){ rk('${ev.name}'${meta}); });\n`;
        code += `  });\n\n`;
      } else if (ev.trigger === "submit") {
        code += `  // ${ev.displayName}\n`;
        code += `  document.querySelectorAll('${ev.selector}').forEach(function(form){\n`;
        code += `    form.addEventListener('submit', function(){ rk('${ev.name}'${meta}); });\n`;
        code += `  });\n\n`;
      } else if (ev.trigger === "visible") {
        code += `  // ${ev.displayName}\n`;
        code += `  var obs = new IntersectionObserver(function(entries){\n`;
        code += `    entries.forEach(function(e){ if(e.isIntersecting){ rk('${ev.name}'${meta}); obs.unobserve(e.target); }});\n`;
        code += `  }, {threshold:0.5});\n`;
        code += `  document.querySelectorAll('${ev.selector}').forEach(function(el){ obs.observe(el); });\n\n`;
      } else if (ev.trigger === "scroll") {
        code += `  // ${ev.displayName}\n`;
        code += `  var fired_${ev.name}=false;\n`;
        code += `  window.addEventListener('scroll',function(){\n`;
        code += `    if(fired_${ev.name})return;\n`;
        code += `    var pct=Math.round((window.scrollY/(document.documentElement.scrollHeight-window.innerHeight))*100);\n`;
        code += `    if(pct>=${ev.selector}){fired_${ev.name}=true;rk('${ev.name}'${meta});}\n`;
        code += `  },{passive:true});\n\n`;
      } else if (ev.trigger === "timer") {
        code += `  // ${ev.displayName}\n`;
        code += `  setTimeout(function(){ rk('${ev.name}'${meta}); }, ${parseInt(ev.selector) * 1000});\n\n`;
      }
    });

    code += `})();\n</script>`;
    return code;
  }, [events]);

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

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
              <h3 className="text-base font-bold font-display">Event Builder Visual</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Crie eventos customizados <strong>sem escrever código</strong>. Selecione o trigger, defina o seletor CSS e o script é gerado automaticamente.
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

      {/* Create new event */}
      <AnimatedContainer delay={0.04}>
        {!creating ? (
          <Button onClick={() => setCreating(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Criar Evento Customizado
          </Button>
        ) : (
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
              <Button size="sm" onClick={handleCreate} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Criar</Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)} className="text-xs">Cancelar</Button>
            </div>
          </Card>
        )}
      </AnimatedContainer>

      {/* Events list */}
      <AnimatedContainer delay={0.06}>
        <div className="space-y-2">
          {events.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              onToggle={() => setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, enabled: !e.enabled } : e))}
              onDelete={() => { setEvents(prev => prev.filter(e => e.id !== ev.id)); toast.success("Evento removido"); }}
              onEdit={() => {}}
            />
          ))}
        </div>
      </AnimatedContainer>

      {/* Generated code */}
      <AnimatedContainer delay={0.08}>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold font-display flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" /> Código Gerado
            </h4>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar Código"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole este snippet <strong>após</strong> o script principal do Pixel Rankito. Os eventos serão disparados automaticamente.
          </p>
          <div className="relative bg-muted/50 border border-border rounded-lg overflow-hidden">
            <pre className="p-4 text-xs text-foreground overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap break-all max-h-[400px]">
              {generatedCode}
            </pre>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
