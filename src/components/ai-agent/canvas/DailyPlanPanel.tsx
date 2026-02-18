import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Calendar, CheckCircle2, Circle, Clock, Zap, AlertTriangle,
  TrendingUp, Target, Wrench, BarChart3, Link2, Megaphone,
  FileText, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Sparkles, Play, ArrowRight, Star,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isTomorrow, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DailyAction {
  time: string;
  title: string;
  description: string;
  area: string;
  priority: "urgente" | "alta" | "normal" | "baixa";
  duration_min: number;
  responsible: string;
  success_metric: string;
  status: "pending" | "in_progress" | "done" | "scheduled";
  tools?: string[];
}

interface DailyPlanDay {
  date: string;
  day_name: string;
  theme: string;
  actions: DailyAction[];
  kpi_targets: { metric: string; target: string; area: string }[];
  areas_covered: string[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

const AREA_CONFIG: Record<string, {
  label: string; icon: React.ElementType; color: string;
  bg: string; border: string; glow: string;
}> = {
  seo:        { label: "SEO",       icon: TrendingUp,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
  conteudo:   { label: "Conteúdo",  icon: FileText,    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30",    glow: "shadow-blue-500/20" },
  links:      { label: "Links",     icon: Link2,       color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30",  glow: "shadow-purple-500/20" },
  ads:        { label: "Ads",       icon: Megaphone,   color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  glow: "shadow-yellow-500/20" },
  tecnico:    { label: "Técnico",   icon: Wrench,      color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  glow: "shadow-orange-500/20" },
  analytics:  { label: "Analytics", icon: BarChart3,   color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    glow: "shadow-cyan-500/20" },
  estrategia: { label: "Estratégia",icon: Target,      color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    glow: "shadow-rose-500/20" },
};

const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  urgente: { label: "Urgente", dot: "bg-red-500" },
  alta:    { label: "Alta",    dot: "bg-orange-500" },
  normal:  { label: "Normal",  dot: "bg-blue-500" },
  baixa:   { label: "Baixa",   dot: "bg-muted-foreground" },
};

// ─── ActionItem ───────────────────────────────────────────────────────────────

function ActionItem({
  action, actionIndex, dayDate,
  onStatusChange,
}: {
  action: DailyAction;
  actionIndex: number;
  dayDate: string;
  onStatusChange: (dayDate: string, idx: number, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const area = AREA_CONFIG[action.area] || AREA_CONFIG.seo;
  const AreaIcon = area.icon;
  const prio = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.normal;
  const isDone = action.status === "done";
  const isInProgress = action.status === "in_progress";

  return (
    <div className={cn(
      "group relative rounded-xl border transition-all duration-200",
      area.bg, area.border,
      isDone ? "opacity-50" : "hover:shadow-md hover:shadow-black/20 hover:-translate-y-0.5",
      isInProgress && "ring-1 ring-primary/40",
    )}>
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-2 bottom-2 w-0.5 rounded-full", area.color.replace("text-", "bg-"), isDone && "opacity-30")} />

      <div className="pl-4 pr-3 pt-3 pb-2.5">
        {/* Time + Title row */}
        <div className="flex items-start gap-2.5">
          {/* Status toggle */}
          <button
            onClick={() => {
              const next = isDone ? "pending" : isInProgress ? "done" : "in_progress";
              onStatusChange(dayDate, actionIndex, next);
            }}
            className="mt-0.5 shrink-0 transition-transform hover:scale-110"
          >
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : isInProgress ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/50 hover:text-primary transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* Time + area badge */}
            <div className="flex items-center gap-1.5 mb-0.5">
              {action.time && (
                <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                  {action.time}
                </span>
              )}
              <span className={cn("flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border", area.bg, area.border, area.color)}>
                <AreaIcon className="h-2.5 w-2.5" />
                {area.label}
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className={cn("h-1.5 w-1.5 rounded-full", prio.dot)} />
                {prio.label}
              </span>
              {action.duration_min && (
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />{action.duration_min}min
                </span>
              )}
            </div>

            {/* Title */}
            <p className={cn("text-xs font-semibold leading-snug", isDone && "line-through text-muted-foreground")}>
              {action.title}
            </p>

            {/* Responsible */}
            {action.responsible && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                👤 {action.responsible}
              </p>
            )}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-white/5 pt-2.5 ml-6">
            {action.description && (
              <p className="text-[11px] text-foreground/70 leading-relaxed">{action.description}</p>
            )}
            {action.success_metric && (
              <div className="flex items-start gap-1.5">
                <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">{action.success_metric}</p>
              </div>
            )}
            {action.tools && action.tools.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                {action.tools.map(tool => (
                  <span key={tool} className="text-[9px] bg-muted/40 border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick action buttons */}
        {!isDone && (
          <div className="flex items-center gap-1.5 mt-2 ml-6">
            {!isInProgress && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 text-[9px] px-2 gap-0.5 text-primary hover:bg-primary/10"
                onClick={() => onStatusChange(dayDate, actionIndex, "in_progress")}
              >
                <Play className="h-2.5 w-2.5" /> Iniciar
              </Button>
            )}
            {isInProgress && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 text-[9px] px-2 gap-0.5 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => onStatusChange(dayDate, actionIndex, "done")}
              >
                <CheckCircle2 className="h-2.5 w-2.5" /> Concluir
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DayCard ──────────────────────────────────────────────────────────────────

function DayCard({
  day, isSelected, onClick,
}: {
  day: DailyPlanDay;
  isSelected: boolean;
  onClick: () => void;
}) {
  const date = parseISO(day.date);
  const doneCount = day.actions.filter(a => a.status === "done").length;
  const total = day.actions.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isCurrentDay = isToday(date);
  const isTomorrowDay = isTomorrow(date);
  const isPast = isBefore(date, new Date()) && !isCurrentDay;

  const areaSet = [...new Set(day.actions.map(a => a.area))];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all duration-200 min-w-[72px] flex-shrink-0",
        isSelected
          ? "bg-primary/15 border-primary/50 shadow-lg shadow-primary/10"
          : "bg-card/50 border-border hover:border-primary/30 hover:bg-primary/5",
        isCurrentDay && !isSelected && "border-primary/30 bg-primary/5",
        isPast && "opacity-60",
      )}
    >
      {isCurrentDay && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
          HOJE
        </span>
      )}
      {isTomorrowDay && !isCurrentDay && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
          AMANHÃ
        </span>
      )}

      <p className="text-[9px] font-bold uppercase text-muted-foreground mt-1">
        {format(date, "EEE", { locale: ptBR })}
      </p>
      <p className={cn("text-base font-black", isSelected ? "text-primary" : "text-foreground")}>
        {format(date, "dd")}
      </p>

      {/* Area dots */}
      <div className="flex gap-0.5 flex-wrap justify-center max-w-[52px]">
        {areaSet.slice(0, 4).map(a => {
          const cfg = AREA_CONFIG[a];
          if (!cfg) return null;
          return (
            <span key={a} className={cn("h-1.5 w-1.5 rounded-full", cfg.color.replace("text-", "bg-"))} />
          );
        })}
      </div>

      {/* Progress */}
      <div className="w-full space-y-0.5">
        <Progress value={progress} className="h-1" />
        <p className="text-[8px] text-muted-foreground text-center">{doneCount}/{total}</p>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DailyPlanPanelProps {
  deploymentId: string;
  projectId?: string;
}

export function DailyPlanPanel({ deploymentId, projectId }: DailyPlanPanelProps) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string>("all");

  // Fetch the latest completed run that has a daily_plan
  const { data: runData, isLoading, refetch } = useQuery({
    queryKey: ["daily-plan", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orchestrator_runs")
        .select("delivery_status, created_at, status")
        .eq("deployment_id", deploymentId)
        .in("status", ["completed", "partial"])
        .order("created_at", { ascending: false })
        .limit(5);

      // Find the most recent run that has a daily_plan
      const runWithPlan = (data || []).find(
        r => (r.delivery_status as any)?.daily_plan?.length > 0
      );
      return runWithPlan || null;
    },
    enabled: !!deploymentId,
    refetchInterval: 30000,
  });

  // Local state for plan (with optimistic status updates)
  const [localPlan, setLocalPlan] = useState<DailyPlanDay[] | null>(null);

  // Sync local from remote when remote changes
  useEffect(() => {
    const remote = (runData?.delivery_status as any)?.daily_plan as DailyPlanDay[];
    if (remote?.length > 0 && !localPlan) {
      setLocalPlan(remote);
    }
  }, [runData]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePlan: DailyPlanDay[] = useMemo(() => {
    const remote = (runData?.delivery_status as any)?.daily_plan as DailyPlanDay[];
    return localPlan || remote || [];
  }, [runData, localPlan]);

  // Default: select today or first day
  useEffect(() => {
    if (activePlan.length > 0 && !selectedDate) {
      const today = new Date().toISOString().split("T")[0];
      const dateToSelect = activePlan.find(d => d.date === today)?.date || activePlan[0]?.date;
      if (dateToSelect) setSelectedDate(dateToSelect);
    }
  }, [activePlan, selectedDate]);

  const selectedDay = activePlan.find(d => d.date === selectedDate) || activePlan[0];

  // Filter actions by area
  const filteredActions = useMemo(() => {
    if (!selectedDay) return [];
    if (filterArea === "all") return selectedDay.actions;
    return selectedDay.actions.filter(a => a.area === filterArea);
  }, [selectedDay, filterArea]);

  // Stats across all days
  const totalActions = activePlan.reduce((s, d) => s + d.actions.length, 0);
  const doneActions = activePlan.reduce((s, d) => s + d.actions.filter(a => a.status === "done").length, 0);
  const todayDay = activePlan.find(d => d.date === new Date().toISOString().split("T")[0]);
  const todayProgress = todayDay 
    ? Math.round((todayDay.actions.filter(a => a.status === "done").length / Math.max(todayDay.actions.length, 1)) * 100)
    : 0;

  // Handle status change (optimistic update)
  const handleStatusChange = (dayDate: string, actionIdx: number, newStatus: string) => {
    setLocalPlan(prev => {
      const plan = prev || activePlan;
      return plan.map(day => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          actions: day.actions.map((a, i) => {
            if (i !== actionIdx) return a;
            return { ...a, status: newStatus as any };
          }),
        };
      });
    });

    const labels: Record<string, string> = { done: "concluída", in_progress: "iniciada", pending: "reaberta" };
    toast.success(`✅ Ação ${labels[newStatus] || newStatus}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando plano diário...</p>
      </div>
    );
  }

  if (!activePlan.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 px-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Calendar className="h-8 w-8 text-primary/60" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Plano diário não gerado ainda</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Execute o orquestrador para gerar automaticamente ações diárias por área (SEO, conteúdo, links, ads) para os próximos 5 dias.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs mt-2"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3 w-3" /> Verificar novamente
        </Button>
      </div>
    );
  }

  // Areas present in selected day
  const dayAreas = selectedDay ? [...new Set(selectedDay.actions.map(a => a.area))] : [];

  return (
    <div className="space-y-4">
      {/* ── Top Stats Bar ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card/50 p-3 text-center">
          <p className="text-2xl font-black text-foreground">{totalActions}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Ações Totais</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-2xl font-black text-emerald-400">{doneActions}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Concluídas</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-2xl font-black text-primary">{todayProgress}%</p>
          <p className="text-[10px] text-muted-foreground font-medium">Progresso Hoje</p>
        </div>
      </div>

      {/* ── Today's progress bar ── */}
      {todayDay && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Progresso de Hoje
            </span>
            <span>{todayDay.actions.filter(a => a.status === "done").length}/{todayDay.actions.length} ações</span>
          </div>
          <Progress value={todayProgress} className="h-2" />
          {todayDay.theme && (
            <p className="text-[10px] text-muted-foreground italic">🎯 Tema: {todayDay.theme}</p>
          )}
        </div>
      )}

      {/* ── Day Selector ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 pt-1 -mx-1 px-1">
        {activePlan.map(day => (
          <DayCard
            key={day.date}
            day={day}
            isSelected={selectedDate === day.date}
            onClick={() => setSelectedDate(day.date)}
          />
        ))}
      </div>

      {/* ── Selected Day Detail ── */}
      {selectedDay && (
        <div className="space-y-3">
          {/* Day header */}
          <div className="rounded-xl border border-border bg-gradient-to-r from-card to-card/50 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {selectedDay.day_name} — {format(parseISO(selectedDay.date), "dd 'de' MMMM", { locale: ptBR })}
                  {isToday(parseISO(selectedDay.date)) && (
                    <Badge className="text-[8px] h-4 px-1.5 bg-primary/20 text-primary border-primary/30">HOJE</Badge>
                  )}
                </p>
                {selectedDay.theme && (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">"{selectedDay.theme}"</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1">
                <span className="text-[10px] font-bold text-foreground">
                  {selectedDay.actions.filter(a => a.status === "done").length}/{selectedDay.actions.length}
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>

            {/* Area pills for this day */}
            {dayAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {dayAreas.map(a => {
                  const cfg = AREA_CONFIG[a];
                  if (!cfg) return null;
                  const AreaIcon = cfg.icon;
                  const count = selectedDay.actions.filter(ac => ac.area === a).length;
                  const doneCount = selectedDay.actions.filter(ac => ac.area === a && ac.status === "done").length;
                  return (
                    <button
                      key={a}
                      onClick={() => setFilterArea(filterArea === a ? "all" : a)}
                      className={cn(
                        "flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg border transition-all",
                        cfg.bg, cfg.border, cfg.color,
                        filterArea === a && "ring-1 ring-current",
                      )}
                    >
                      <AreaIcon className="h-2.5 w-2.5" />
                      {cfg.label}
                      <span className="opacity-70">{doneCount}/{count}</span>
                    </button>
                  );
                })}
                {filterArea !== "all" && (
                  <button
                    onClick={() => setFilterArea("all")}
                    className="text-[9px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ✕ Limpar
                  </button>
                )}
              </div>
            )}

            {/* KPI Targets */}
            {selectedDay.kpi_targets?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
                {selectedDay.kpi_targets.map((kpi, i) => {
                  const cfg = AREA_CONFIG[kpi.area];
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-1.5 text-[9px] px-2 py-1 rounded-lg border",
                      cfg ? `${cfg.bg} ${cfg.border}` : "bg-muted/20 border-border",
                    )}>
                      <Target className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{kpi.metric}:</span>
                      <span className="font-bold text-foreground">{kpi.target}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Actions list ── */}
          <ScrollArea className="max-h-[520px] pr-1">
            <div className="space-y-2 pb-2">
              {filteredActions.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma ação para esta área neste dia.
                </div>
              )}
              {filteredActions.map((action, idx) => {
                // Find real index in the unfiltered list
                const realIdx = selectedDay.actions.findIndex(
                  (a, i) => a === action || (a.title === action.title && a.time === action.time && i >= idx)
                );
                return (
                  <ActionItem
                    key={`${selectedDay.date}-${idx}`}
                    action={action}
                    actionIndex={realIdx >= 0 ? realIdx : idx}
                    dayDate={selectedDay.date}
                    onStatusChange={handleStatusChange}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ── Week Overview ── */}
      <div className="rounded-xl border border-border bg-card/30 p-3.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3" /> Visão Geral da Semana por Área
        </p>
        <div className="space-y-2">
          {Object.entries(AREA_CONFIG).map(([areaKey, cfg]) => {
            const AreaIcon = cfg.icon;
            const allActionsForArea = activePlan.flatMap(d => d.actions.filter(a => a.area === areaKey));
            if (allActionsForArea.length === 0) return null;
            const doneCnt = allActionsForArea.filter(a => a.status === "done").length;
            const pct = Math.round((doneCnt / allActionsForArea.length) * 100);
            return (
              <div key={areaKey} className="flex items-center gap-2">
                <div className={cn("flex items-center gap-1 text-[9px] font-bold w-20 shrink-0", cfg.color)}>
                  <AreaIcon className="h-3 w-3" />
                  {cfg.label}
                </div>
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-[9px] text-muted-foreground w-8 text-right shrink-0">
                  {doneCnt}/{allActionsForArea.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: generation info */}
      {runData?.created_at && (
        <p className="text-[9px] text-muted-foreground text-center">
          Plano gerado em {format(parseISO(runData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          {" · "}
          <button onClick={() => refetch()} className="underline hover:text-foreground transition-colors">
            Verificar atualização
          </button>
        </p>
      )}
    </div>
  );
}
