import { useState, useEffect, useMemo } from "react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Target, Trophy, TrendingUp, DollarSign,
  Loader2, AlertTriangle, Pencil, X, Check, Flag,
  Eye, Zap, ChevronRight, ChevronLeft, Globe, Search,
  MousePointerClick, Link, ArrowDown, Clock, Layers,
  ExternalLink, Hash
} from "lucide-react";
import { toast } from "sonner";
import { useTrackingGoals, GOAL_TYPES, SCROLL_THRESHOLDS, TIME_PRESETS, TrackingGoal, GoalConfig } from "@/hooks/use-tracking-goals";
import { useTrackingEvents, EVENT_LABELS, PLUGIN_EVENT_TYPES } from "@/hooks/use-tracking-events";
import { supabase } from "@/integrations/supabase/client";
import { GoalProjectSelector } from "./GoalProjectSelector";

/* ─── Helpers ─── */
function useProjectAndUser() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("rankito_current_project");
    if (stored) setProjectId(stored);
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
    const h = () => { const s = localStorage.getItem("rankito_current_project"); if (s) setProjectId(s); };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);
  return { projectId, userId };
}

const GOAL_ICONS: Record<string, any> = {
  cta_click: MousePointerClick,
  page_destination: Globe,
  url_pattern: Link,
  scroll_depth: ArrowDown,
  time_on_page: Clock,
  combined: Layers,
  pages_visited: Globe,
  event_count: Zap,
  page_value: DollarSign,
};

/* ─── Auto-detect CTAs from events ─── */
function useDetectedCTAs(events: any[]) {
  return useMemo(() => {
    const ctaMap = new Map<string, { text: string; selector: string; count: number; lastSeen: string }>();
    events.forEach(e => {
      if ((e.event_type === "click" || e.event_type === "button_click" || e.event_type === "whatsapp_click" || e.event_type === "phone_click" || e.event_type === "email_click") && e.cta_text) {
        const key = (e.cta_selector || "") + "|" + e.cta_text.substring(0, 80);
        const existing = ctaMap.get(key);
        if (existing) {
          existing.count++;
          if (e.created_at > existing.lastSeen) existing.lastSeen = e.created_at;
        } else {
          ctaMap.set(key, {
            text: e.cta_text.substring(0, 80),
            selector: e.cta_selector || "",
            count: 1,
            lastSeen: e.created_at,
          });
        }
      }
    });
    return Array.from(ctaMap.values()).sort((a, b) => b.count - a.count);
  }, [events]);
}

/* ─── Goal Progress Calculator ─── */
function calcGoalProgress(goal: TrackingGoal, events: any[]) {
  if (!events.length) return { current: 0, percentage: 0, completed: false };

  const cfg = goal.config || {};
  let current = 0;

  switch (goal.goal_type) {
    case "cta_click": {
      const patterns = cfg.cta_text_patterns || [];
      const selectors = cfg.cta_selectors || [];
      const mode = cfg.cta_match_mode || "partial";
      events.forEach(e => {
        if (!e.cta_text && !e.cta_selector) return;
        const txt = (e.cta_text || "").toLowerCase();
        const sel = (e.cta_selector || "").toLowerCase();
        const matchText = patterns.some((p: string) =>
          mode === "exact" ? txt === p.toLowerCase() : txt.includes(p.toLowerCase())
        );
        const matchSel = selectors.some((s: string) => sel.includes(s.toLowerCase()));
        if (matchText || matchSel) current++;
      });
      break;
    }
    case "page_destination": {
      const urls = cfg.destination_urls || goal.target_urls || [];
      const mode = cfg.url_match_mode || "contains";
      const visited = new Set<string>();
      events.forEach(e => {
        if (e.event_type !== "page_view" || !e.page_url) return;
        const normalized = e.page_url.replace(/\/$/, "").toLowerCase();
        urls.forEach((u: string) => {
          const nu = u.replace(/\/$/, "").toLowerCase();
          const match = mode === "exact" ? normalized === nu
            : mode === "pattern" ? normalized.includes(nu)
            : normalized.includes(nu) || nu.includes(normalized);
          if (match) visited.add(nu);
        });
      });
      current = visited.size;
      break;
    }
    case "url_pattern": {
      const patterns = cfg.link_url_patterns || [];
      const textPatterns = cfg.link_text_patterns || [];
      events.forEach(e => {
        if (!e.cta_text && !e.metadata?.href) return;
        const href = (e.metadata?.href || "").toLowerCase();
        const txt = (e.cta_text || "").toLowerCase();
        const matchUrl = patterns.some((p: string) => href.includes(p.toLowerCase()));
        const matchTxt = textPatterns.some((p: string) => txt.includes(p.toLowerCase()));
        if (matchUrl || matchTxt) current++;
      });
      break;
    }
    case "scroll_depth": {
      const threshold = cfg.scroll_threshold || 75;
      events.forEach(e => {
        if (e.event_type === "page_exit" && e.scroll_depth != null && e.scroll_depth >= threshold) {
          current++;
        }
      });
      break;
    }
    case "time_on_page": {
      const minSec = cfg.min_seconds || 60;
      events.forEach(e => {
        if (e.event_type === "page_exit" && e.time_on_page != null && e.time_on_page >= minSec) {
          current++;
        }
      });
      break;
    }
    case "combined": {
      const conditions = cfg.conditions || [];
      if (conditions.length === 0) break;
      // Each event must match ALL conditions to count
      events.forEach(e => {
        const allMatch = conditions.every((cond: any) => {
          const c = cond.config || {};
          switch (cond.type) {
            case "cta_click": {
              const txt = (e.cta_text || "").toLowerCase();
              return (c.cta_text_patterns || []).some((p: string) =>
                (c.cta_match_mode === "exact") ? txt === p.toLowerCase() : txt.includes(p.toLowerCase())
              );
            }
            case "page_destination": {
              if (e.event_type !== "page_view" || !e.page_url) return false;
              return (c.destination_urls || []).some((u: string) =>
                e.page_url.toLowerCase().includes(u.toLowerCase())
              );
            }
            case "scroll_depth":
              return e.event_type === "page_exit" && e.scroll_depth != null && e.scroll_depth >= (c.scroll_threshold || 75);
            case "time_on_page":
              return e.event_type === "page_exit" && e.time_on_page != null && e.time_on_page >= (c.min_seconds || 60);
            case "url_pattern": {
              const href = (e.metadata?.href || "").toLowerCase();
              return (c.link_url_patterns || []).some((p: string) => href.includes(p.toLowerCase()));
            }
            default: return false;
          }
        });
        if (allMatch) current++;
      });
      break;
    }
    // Legacy types
    case "pages_visited": {
      const visited = new Set<string>();
      events.forEach(e => {
        if (e.event_type === "page_view" && e.page_url) {
          const n = e.page_url.replace(/\/$/, "").toLowerCase();
          goal.target_urls.forEach(t => {
            if (n.includes(t.replace(/\/$/, "").toLowerCase())) visited.add(t);
          });
        }
      });
      current = visited.size;
      break;
    }
    case "event_count":
      events.forEach(e => { if (goal.target_events.includes(e.event_type)) current++; });
      break;
    case "page_value":
      events.forEach(e => {
        if (e.event_type === "page_view" && e.page_url) {
          const n = e.page_url.replace(/\/$/, "").toLowerCase();
          if (goal.target_urls.some(t => n.includes(t.replace(/\/$/, "").toLowerCase()))) current++;
        }
      });
      break;
  }

  const target = Math.max(goal.target_value, 1);
  const percentage = Math.min(100, Math.round((current / target) * 100));
  return { current, percentage, completed: current >= target };
}

/* ─── Goal Card ─── */
function GoalCard({ goal, events, onToggle, onDelete, onEdit, loading }: {
  goal: TrackingGoal; events: any[]; onToggle: () => void; onDelete: () => void; onEdit: () => void; loading: boolean;
}) {
  const progress = useMemo(() => calcGoalProgress(goal, events), [goal, events]);
  const typeInfo = GOAL_TYPES.find(t => t.value === goal.goal_type);
  const GoalIcon = GOAL_ICONS[goal.goal_type] || Target;
  const cfg = goal.config || {};

  const descParts: string[] = [];
  if (goal.goal_type === "cta_click") {
    const patterns = cfg.cta_text_patterns || [];
    if (patterns.length) descParts.push(`CTAs: ${patterns.slice(0, 3).join(", ")}${patterns.length > 3 ? "..." : ""}`);
  } else if (goal.goal_type === "page_destination") {
    const urls = cfg.destination_urls || [];
    if (urls.length) descParts.push(`URLs: ${urls.slice(0, 2).join(", ")}${urls.length > 2 ? "..." : ""}`);
  } else if (goal.goal_type === "scroll_depth") {
    descParts.push(`${cfg.scroll_threshold || 75}% profundidade`);
  } else if (goal.goal_type === "time_on_page") {
    const s = cfg.min_seconds || 60;
    descParts.push(s >= 60 ? `${Math.floor(s / 60)}min ${s % 60 ? s % 60 + "s" : ""}` : `${s}s`);
  } else if (goal.goal_type === "combined") {
    descParts.push(`${(cfg.conditions || []).length} critérios combinados`);
  }

  return (
    <Card className={`p-4 transition-all ${goal.enabled ? progress.completed ? "border-success/40 bg-success/5" : "border-primary/20" : "border-border opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${progress.completed ? "bg-success/10" : goal.enabled ? "bg-primary/10" : "bg-muted/30"}`}>
          {progress.completed ? <Trophy className="h-5 w-5 text-success" /> : <GoalIcon className={`h-5 w-5 ${goal.enabled ? "text-primary" : "text-muted-foreground"}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold font-display truncate">{goal.name}</h4>
            {progress.completed ? (
              <Badge className="text-[9px] bg-success/10 text-success border-success/20 gap-0.5"><Check className="h-2.5 w-2.5" /> Concluída</Badge>
            ) : goal.enabled ? (
              <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-primary/20">Em andamento</Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px]">Pausada</Badge>
            )}
          </div>
          {goal.description && <p className="text-[11px] text-muted-foreground mb-1 line-clamp-1">{goal.description}</p>}
          {descParts.length > 0 && <p className="text-[10px] text-muted-foreground mb-2 font-mono">{descParts.join(" • ")}</p>}

          <div className="space-y-1.5 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground">
                {progress.current} / {goal.target_value} conversões
              </span>
              <span className={`text-xs font-bold ${progress.completed ? "text-success" : "text-primary"}`}>{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className={`h-2 ${progress.completed ? "[&>div]:bg-success" : ""}`} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[9px] gap-1">
              <GoalIcon className="h-2.5 w-2.5" /> {typeInfo?.label || goal.goal_type}
            </Badge>
            {goal.currency_value > 0 && (
              <Badge variant="outline" className="text-[9px] gap-1 text-success border-success/20">
                <DollarSign className="h-2.5 w-2.5" /> R$ {goal.currency_value.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} disabled={loading}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
          <Switch checked={goal.enabled} onCheckedChange={onToggle} disabled={loading} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} disabled={loading}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Wizard Types ─── */
type WizardData = {
  name: string;
  description: string;
  goalType: TrackingGoal["goal_type"];
  targetValue: string;
  currencyValue: string;
  config: GoalConfig;
};

const EMPTY_WIZARD: WizardData = {
  name: "", description: "", goalType: "cta_click",
  targetValue: "1", currencyValue: "0",
  config: { cta_text_patterns: [], cta_selectors: [], cta_match_mode: "partial", destination_urls: [], url_match_mode: "contains", link_url_patterns: [], link_text_patterns: [], scroll_threshold: 75, min_seconds: 60, conditions: [] },
};

/* ─── Wizard Step 1 — Type Selection ─── */
function WizardStep1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h4 className="text-sm font-bold font-display">Passo 1 — Tipo de Conversão</h4>
        <p className="text-xs text-muted-foreground mt-1">Defina quando um evento será contado como conversão.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {GOAL_TYPES.map(t => {
          const Icon = GOAL_ICONS[t.value] || Target;
          const selected = data.goalType === t.value;
          return (
            <button key={t.value} type="button" onClick={() => onChange({ goalType: t.value })}
              className={`p-4 rounded-lg border text-left transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/30"}`}>
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

/* ─── Wizard Step 2 — Configuration ─── */
function WizardStep2({ data, onChange, detectedCTAs }: {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  detectedCTAs: { text: string; selector: string; count: number; lastSeen: string }[];
}) {
  const cfg = data.config;
  const updateCfg = (partial: Partial<GoalConfig>) => onChange({ config: { ...cfg, ...partial } });

  const [ctaInput, setCtaInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [linkPatternInput, setLinkPatternInput] = useState("");
  const [linkTextInput, setLinkTextInput] = useState("");
  const [ctaSearch, setCtaSearch] = useState("");
  const [condType, setCondType] = useState<string>("cta_click");
  const [condInput, setCondInput] = useState("");

  const addToList = (key: keyof GoalConfig, value: string) => {
    if (!value.trim()) return;
    const list = (cfg[key] as string[]) || [];
    if (!list.includes(value.trim())) updateCfg({ [key]: [...list, value.trim()] });
  };
  const removeFromList = (key: keyof GoalConfig, value: string) => {
    const list = (cfg[key] as string[]) || [];
    updateCfg({ [key]: list.filter(v => v !== value) });
  };

  const filteredCTAs = detectedCTAs.filter(c =>
    c.text.toLowerCase().includes(ctaSearch.toLowerCase()) ||
    c.selector.toLowerCase().includes(ctaSearch.toLowerCase())
  );

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return ""; }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h4 className="text-sm font-bold font-display">Passo 2 — Configurar Regras</h4>
        <p className="text-xs text-muted-foreground mt-1">Defina os critérios específicos para esta conversão.</p>
      </div>

      {/* CTA Click */}
      {data.goalType === "cta_click" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Modo de Match</label>
            <Select value={cfg.cta_match_mode || "partial"} onValueChange={v => updateCfg({ cta_match_mode: v as any })}>
              <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="partial">Match Parcial</SelectItem>
                <SelectItem value="exact">Match Exato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Manual CTA text input */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Textos de CTA (manual)</label>
            <div className="flex gap-2">
              <Input value={ctaInput} onChange={e => setCtaInput(e.target.value)} className="h-8 text-xs" placeholder="Ex: Solicitar Orçamento, Fale Conosco"
                onKeyDown={e => { if (e.key === "Enter") { addToList("cta_text_patterns", ctaInput); setCtaInput(""); } }} />
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => { addToList("cta_text_patterns", ctaInput); setCtaInput(""); }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {(cfg.cta_text_patterns || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(cfg.cta_text_patterns || []).map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => removeFromList("cta_text_patterns", p)}>
                    {p} <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Auto-detected CTAs */}
          {detectedCTAs.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">CTAs Detectados Automaticamente</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={ctaSearch} onChange={e => setCtaSearch(e.target.value)} className="h-8 text-xs pl-8" placeholder="Buscar CTAs detectados..." />
              </div>
              <ScrollArea className="h-[180px] rounded-lg border border-border">
                <div className="p-2 space-y-0.5">
                  {filteredCTAs.slice(0, 50).map((cta, i) => {
                    const isSelected = (cfg.cta_text_patterns || []).some(p => p.toLowerCase() === cta.text.toLowerCase());
                    return (
                      <label key={i} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                        <Checkbox checked={isSelected} onCheckedChange={() => {
                          if (isSelected) removeFromList("cta_text_patterns", (cfg.cta_text_patterns || []).find(p => p.toLowerCase() === cta.text.toLowerCase()) || cta.text);
                          else addToList("cta_text_patterns", cta.text);
                        }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium truncate block">{cta.text}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{cta.selector}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-primary">{cta.count} cliques</span>
                          <span className="text-[9px] text-muted-foreground block">Último: {formatDate(cta.lastSeen)}</span>
                        </div>
                      </label>
                    );
                  })}
                  {filteredCTAs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum CTA encontrado.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Page Destination */}
      {data.goalType === "page_destination" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Modo de Match</label>
            <Select value={cfg.url_match_mode || "contains"} onValueChange={v => updateCfg({ url_match_mode: v as any })}>
              <SelectTrigger className="h-8 text-xs w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contém (path relativo)</SelectItem>
                <SelectItem value="exact">URL Completa (exato)</SelectItem>
                <SelectItem value="pattern">Padrão de URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">URLs de Destino</label>
            <div className="flex gap-2">
              <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} className="h-8 text-xs font-mono" placeholder="Ex: /obrigado, /confirmacao, https://site.com/thanks"
                onKeyDown={e => { if (e.key === "Enter") { addToList("destination_urls", urlInput); setUrlInput(""); } }} />
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => { addToList("destination_urls", urlInput); setUrlInput(""); }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground">Uma URL por linha. Pode ser path relativo (/obrigado) ou URL completa.</p>
            {(cfg.destination_urls || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(cfg.destination_urls || []).map((u, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] gap-1 font-mono cursor-pointer hover:bg-destructive/10" onClick={() => removeFromList("destination_urls", u)}>
                    {u} <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* URL Pattern */}
      {data.goalType === "url_pattern" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Padrões de URL (links clicados)</label>
            <div className="flex gap-2">
              <Input value={linkPatternInput} onChange={e => setLinkPatternInput(e.target.value)} className="h-8 text-xs font-mono" placeholder="Ex: wa.me, tel:, mailto:"
                onKeyDown={e => { if (e.key === "Enter") { addToList("link_url_patterns", linkPatternInput); setLinkPatternInput(""); } }} />
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => { addToList("link_url_patterns", linkPatternInput); setLinkPatternInput(""); }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {(cfg.link_url_patterns || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(cfg.link_url_patterns || []).map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] gap-1 font-mono cursor-pointer hover:bg-destructive/10" onClick={() => removeFromList("link_url_patterns", p)}>
                    {p} <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Textos de link (opcional)</label>
            <div className="flex gap-2">
              <Input value={linkTextInput} onChange={e => setLinkTextInput(e.target.value)} className="h-8 text-xs" placeholder="Detecta cliques em links que contenham esse texto"
                onKeyDown={e => { if (e.key === "Enter") { addToList("link_text_patterns", linkTextInput); setLinkTextInput(""); } }} />
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => { addToList("link_text_patterns", linkTextInput); setLinkTextInput(""); }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {(cfg.link_text_patterns || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(cfg.link_text_patterns || []).map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => removeFromList("link_text_patterns", p)}>
                    {p} <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scroll Depth */}
      {data.goalType === "scroll_depth" && (
        <div className="space-y-3">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Profundidade Mínima de Scroll</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SCROLL_THRESHOLDS.map(t => {
              const selected = cfg.scroll_threshold === t.value;
              return (
                <button key={t.value} type="button" onClick={() => updateCfg({ scroll_threshold: t.value })}
                  className={`p-3 rounded-lg border text-center transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/30"}`}>
                  <span className={`text-xl font-bold font-display block ${selected ? "text-primary" : "text-foreground"}`}>{t.value}%</span>
                  <span className="text-[9px] text-muted-foreground">{t.label.split("—")[1]?.trim()}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground">Recomendado: 50% para metade, 75% para maior parte, 100% para conteúdo completo.</p>
        </div>
      )}

      {/* Time on Page */}
      {data.goalType === "time_on_page" && (
        <div className="space-y-3">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tempo Mínimo na Página</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIME_PRESETS.map(t => {
              const selected = cfg.min_seconds === t.value;
              return (
                <button key={t.value} type="button" onClick={() => updateCfg({ min_seconds: t.value })}
                  className={`p-3 rounded-lg border text-center transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/30"}`}>
                  <span className={`text-lg font-bold font-display block ${selected ? "text-primary" : "text-foreground"}`}>{t.label.split("—")[0].trim()}</span>
                  <span className="text-[9px] text-muted-foreground">{t.label.split("—")[1]?.trim()}</span>
                </button>
              );
            })}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ou defina um valor personalizado (segundos)</label>
            <Input type="number" min="1" value={cfg.min_seconds || 60} onChange={e => updateCfg({ min_seconds: Number(e.target.value) || 60 })} className="h-8 text-xs w-32" />
          </div>
          <p className="text-[9px] text-muted-foreground">Recomendado: 60-120s para artigos, 30-60s para landing pages.</p>
        </div>
      )}

      {/* Combined */}
      {data.goalType === "combined" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Combine múltiplos critérios. A conversão será contada se QUALQUER uma das condições for atendida.</p>
          
          {(cfg.conditions || []).map((cond, i) => {
            const CondIcon = GOAL_ICONS[cond.type] || Target;
            const condTypeInfo = GOAL_TYPES.find(t => t.value === cond.type);
            return (
              <Card key={i} className="p-3 border-border">
                <div className="flex items-center gap-2">
                  <CondIcon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium flex-1">{condTypeInfo?.label || cond.type}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {cond.type === "cta_click" && (cond.config.cta_text_patterns || []).join(", ")}
                    {cond.type === "page_destination" && (cond.config.destination_urls || []).join(", ")}
                    {cond.type === "scroll_depth" && `${cond.config.scroll_threshold}%`}
                    {cond.type === "time_on_page" && `${cond.config.min_seconds}s`}
                    {cond.type === "url_pattern" && (cond.config.link_url_patterns || []).join(", ")}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    const conditions = [...(cfg.conditions || [])];
                    conditions.splice(i, 1);
                    updateCfg({ conditions });
                  }}><X className="h-3 w-3" /></Button>
                </div>
              </Card>
            );
          })}

          <div className="flex gap-2">
            <Select value={condType} onValueChange={setCondType}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.filter(t => t.value !== "combined").map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={condInput} onChange={e => setCondInput(e.target.value)} className="h-8 text-xs flex-1" placeholder="Valor (texto CTA, URL, 75, 60...)" />
            <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => {
              if (!condInput.trim()) return;
              const newCond: any = { type: condType, config: {} };
              if (condType === "cta_click") newCond.config = { cta_text_patterns: [condInput], cta_match_mode: "partial" };
              else if (condType === "page_destination") newCond.config = { destination_urls: [condInput], url_match_mode: "contains" };
              else if (condType === "scroll_depth") newCond.config = { scroll_threshold: Number(condInput) || 75 };
              else if (condType === "time_on_page") newCond.config = { min_seconds: Number(condInput) || 60 };
              else if (condType === "url_pattern") newCond.config = { link_url_patterns: [condInput] };
              updateCfg({ conditions: [...(cfg.conditions || []), newCond] });
              setCondInput("");
            }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Wizard Step 3 — Identity & Value ─── */
function WizardStep3({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h4 className="text-sm font-bold font-display">Passo 3 — Nome e Valor</h4>
        <p className="text-xs text-muted-foreground mt-1">Identifique a meta e atribua um valor de conversão.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome da Meta</label>
          <Input value={data.name} onChange={e => onChange({ name: e.target.value })} className="h-9 text-xs" placeholder="Ex: Lead WhatsApp, Página de Obrigado, Leitura Completa" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descrição (opcional)</label>
          <Textarea value={data.description} onChange={e => onChange({ description: e.target.value })} className="text-xs min-h-[50px]" placeholder="Descreva o objetivo desta meta..." />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversões alvo</label>
          <Input type="number" min="1" value={data.targetValue} onChange={e => onChange({ targetValue: e.target.value })} className="h-9 text-xs" />
          <p className="text-[9px] text-muted-foreground">Quantas conversões para considerar a meta concluída.</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Valor por Conversão (R$)</label>
          <Input type="number" min="0" step="0.01" value={data.currencyValue} onChange={e => onChange({ currencyValue: e.target.value })} className="h-9 text-xs" placeholder="0.00" />
          <p className="text-[9px] text-muted-foreground">Cada conversão terá esse valor monetário atribuído.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function GoalsTab() {
  const { projectId, userId } = useProjectAndUser();
  const { data: allGoals = [], isLoading, createGoal, updateGoal, deleteGoal, toggleGoal } = useTrackingGoals(projectId);
  const { data: events = [] } = useTrackingEvents(projectId);
  const detectedCTAs = useDetectedCTAs(events);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(EMPTY_WIZARD);
  const [editingId, setEditingId] = useState<string | null>(null);

  const goals = useMemo(() => {
    if (!selectedProject) return allGoals;
    return allGoals.filter(g => (g as any).goal_project_id === selectedProject);
  }, [allGoals, selectedProject]);

  const completedGoals = goals.filter(g => g.enabled && calcGoalProgress(g, events).completed);
  const totalValue = goals.reduce((sum, g) => {
    if (!g.enabled || g.currency_value <= 0) return sum;
    const progress = calcGoalProgress(g, events);
    return sum + (progress.current * g.currency_value);
  }, 0);

  const openCreate = () => { setEditingId(null); setWizardData(EMPTY_WIZARD); setWizardStep(1); setWizardOpen(true); };
  const openEdit = (g: TrackingGoal) => {
    setEditingId(g.id);
    setWizardData({
      name: g.name, description: g.description || "", goalType: g.goal_type,
      targetValue: String(g.target_value), currencyValue: String(g.currency_value),
      config: { ...EMPTY_WIZARD.config, ...g.config },
    });
    setWizardStep(1); setWizardOpen(true);
  };
  const closeWizard = () => { setWizardOpen(false); setEditingId(null); };

  const handleSave = async () => {
    if (!wizardData.name.trim()) { toast.error("Preencha o nome da meta."); return; }
    if (!projectId || !userId) { toast.error("Projeto ou usuário não encontrado."); return; }

    const payload: any = {
      project_id: projectId, owner_id: userId,
      name: wizardData.name, description: wizardData.description || null,
      goal_type: wizardData.goalType,
      target_value: Number(wizardData.targetValue) || 1,
      target_urls: wizardData.config.destination_urls || [],
      target_events: [],
      currency_value: Number(wizardData.currencyValue) || 0,
      config: wizardData.config, enabled: true,
      goal_project_id: selectedProject || null,
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
    } catch (err: any) { toast.error("Erro: " + (err.message || "")); }
  };

  if (!projectId) {
    return (
      <AnimatedContainer>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
          <h3 className="text-sm font-bold font-display">Selecione um Projeto</h3>
          <p className="text-xs text-muted-foreground mt-1">Escolha um projeto na sidebar para gerenciar metas personalizadas.</p>
        </Card>
      </AnimatedContainer>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <FeatureBanner
        icon={Target}
        title="Metas Personalizadas"
        description={<>Defina conversões por <strong>CTA</strong>, <strong>página de destino</strong>, <strong>padrão de URL</strong>, <strong>scroll</strong>, <strong>tempo na página</strong> ou <strong>combine múltiplos critérios</strong>. Cada conversão tem um valor monetário.</>}
      />

      {/* Goal Projects */}
      <GoalProjectSelector projectId={projectId} module="goals" selected={selectedProject} onSelect={setSelectedProject} />

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

      {/* Detected CTAs summary */}
      {detectedCTAs.length > 0 && !wizardOpen && (
        <AnimatedContainer delay={0.03}>
          <Card className="p-4 border-info/20 bg-info/5">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="h-4 w-4 text-info" />
              <span className="text-xs font-bold font-display">{detectedCTAs.length} CTAs Detectados Automaticamente</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {detectedCTAs.slice(0, 8).map((cta, i) => (
                <Badge key={i} variant="outline" className="text-[9px] gap-1">
                  {cta.text.substring(0, 30)}{cta.text.length > 30 ? "..." : ""} <span className="text-primary font-bold">{cta.count}</span>
                </Badge>
              ))}
              {detectedCTAs.length > 8 && <Badge variant="outline" className="text-[9px]">+{detectedCTAs.length - 8} mais</Badge>}
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* Create button */}
      <AnimatedContainer delay={0.04}>
        {!wizardOpen && (
          <Button onClick={openCreate} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Criar Meta Personalizada
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
                  <button key={s} type="button" onClick={() => setWizardStep(s)}
                    className={`h-7 w-7 rounded-full text-xs font-bold transition-all ${wizardStep === s ? "bg-primary text-primary-foreground" : wizardStep > s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {s}
                  </button>
                ))}
                <span className="text-xs text-muted-foreground ml-1">{editingId ? "Editando meta" : "Nova meta"}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeWizard}><X className="h-4 w-4" /></Button>
            </div>

            {wizardStep === 1 && <WizardStep1 data={wizardData} onChange={d => setWizardData(prev => ({ ...prev, ...d }))} />}
            {wizardStep === 2 && <WizardStep2 data={wizardData} onChange={d => setWizardData(prev => ({ ...prev, ...d }))} detectedCTAs={detectedCTAs} />}
            {wizardStep === 3 && <WizardStep3 data={wizardData} onChange={d => setWizardData(prev => ({ ...prev, ...d }))} />}

            <div className="flex justify-between pt-2">
              {wizardStep > 1 ? (
                <Button size="sm" variant="outline" onClick={() => setWizardStep(s => s - 1)} className="gap-1 text-xs"><ChevronLeft className="h-3.5 w-3.5" /> Voltar</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={closeWizard} className="text-xs">Cancelar</Button>
              )}
              {wizardStep < 3 ? (
                <Button size="sm" onClick={() => setWizardStep(s => s + 1)} className="gap-1 text-xs">Próximo <ChevronRight className="h-3.5 w-3.5" /></Button>
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
      {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {/* Goals list */}
      {!isLoading && goals.length > 0 && (
        <AnimatedContainer delay={0.06}>
          <div className="space-y-2">
            {goals.map(g => (
              <GoalCard key={g.id} goal={g} events={events}
                loading={toggleGoal.isPending || deleteGoal.isPending}
                onEdit={() => openEdit(g)}
                onToggle={() => toggleGoal.mutateAsync({ id: g.id, enabled: !g.enabled })}
                onDelete={() => { if (confirm("Excluir esta meta?")) { deleteGoal.mutateAsync(g.id).then(() => toast.success("Meta excluída!")).catch(() => toast.error("Erro ao excluir.")); } }}
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
            <h3 className="text-sm font-bold font-display">Nenhuma meta personalizada</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Crie metas para acompanhar conversões: clique em CTAs, páginas de destino, scroll, tempo na página e mais. Cada conversão tem um valor monetário.
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
