import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Calendar, CheckCircle2, Circle, Clock, TrendingUp,
  Target, Wrench, BarChart3, Link2, Megaphone,
  FileText, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Sparkles, Play, Zap, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isTomorrow, parseISO, isBefore } from "date-fns";
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
  bg: string; border: string;
}> = {
  seo:        { label: "SEO",        icon: TrendingUp,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  conteudo:   { label: "Conteúdo",   icon: FileText,    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  links:      { label: "Links",      icon: Link2,       color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/25" },
  ads:        { label: "Ads",        icon: Megaphone,   color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/25" },
  tecnico:    { label: "Técnico",    icon: Wrench,      color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/25" },
  analytics:  { label: "Analytics",  icon: BarChart3,   color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25" },
  estrategia: { label: "Estratégia", icon: Target,      color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/25" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  urgente: { label: "Urgente", color: "text-red-400",            bg: "bg-red-500/10",    border: "border-red-500/30",    dot: "bg-red-500" },
  alta:    { label: "Alta",    color: "text-orange-400",         bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  normal:  { label: "Normal",  color: "text-blue-400",           bg: "bg-blue-500/10",   border: "border-blue-500/30",   dot: "bg-blue-500" },
  baixa:   { label: "Baixa",   color: "text-muted-foreground",   bg: "bg-muted/20",      border: "border-border",        dot: "bg-muted-foreground/50" },
};

// ─── ActionItem ───────────────────────────────────────────────────────────────

function ActionItem({
  action, actionIndex, dayDate, onStatusChange,
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

  const handleStatusCycle = () => {
    const next = isDone ? "pending" : isInProgress ? "done" : "in_progress";
    onStatusChange(dayDate, actionIndex, next);
  };

  return (
    <div className={cn(
      "group relative rounded-xl border transition-all duration-200 overflow-hidden",
      isDone
        ? "bg-muted/10 border-border opacity-60"
        : isInProgress
        ? "bg-card border-primary/30 ring-1 ring-primary/20 shadow-sm shadow-primary/10"
        : "bg-card/60 border-border hover:border-border/80 hover:bg-card",
    )}>
      {/* Left accent */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl",
        isDone ? "bg-emerald-500/30" : isInProgress ? "bg-primary" : area.color.replace("text-", "bg-"),
      )} />

      <div className="pl-4 pr-3 pt-3 pb-2.5 space-y-0">
        {/* Header row */}
        <div className="flex items-start gap-2.5">
          <button onClick={handleStatusCycle} className="mt-0.5 shrink-0 transition-all hover:scale-110">
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : isInProgress ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              {action.time && (
                <span className="text-[9px] font-mono font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border">
                  {action.time}
                </span>
              )}
              <span className={cn("flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border", area.bg, area.border, area.color)}>
                <AreaIcon className="h-2.5 w-2.5" />
                {area.label}
              </span>
              <span className={cn("flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border", prio.bg, prio.border, prio.color)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", prio.dot)} />
                {prio.label}
              </span>
              {action.duration_min > 0 && (
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />{action.duration_min}min
                </span>
              )}
            </div>

            {/* Title */}
            <p className={cn("text-xs font-semibold leading-snug", isDone && "line-through text-muted-foreground")}>
              {action.title}
            </p>
            {action.responsible && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                👤 {action.responsible}
              </p>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground transition-colors mt-0.5"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="ml-6 mt-2.5 space-y-2 border-t border-border/50 pt-2.5">
            {action.description && (
              <p className="text-[11px] text-foreground/70 leading-relaxed">{action.description}</p>
            )}
            {action.success_metric && (
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/15">
                <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">{action.success_metric}</p>
              </div>
            )}
            {action.tools && action.tools.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <Wrench className="h-3 w-3 text-muted-foreground/50" />
                {action.tools.map(tool => (
                  <span key={tool} className="text-[9px] bg-muted/40 border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick action */}
        {!isDone && (
          <div className="flex items-center gap-1.5 mt-2 ml-6">
            {!isInProgress ? (
              <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2 gap-0.5 text-primary hover:bg-primary/10"
                onClick={() => onStatusChange(dayDate, actionIndex, "in_progress")}>
                <Play className="h-2.5 w-2.5" /> Iniciar
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2 gap-0.5 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => onStatusChange(dayDate, actionIndex, "done")}>
                <CheckCircle2 className="h-2.5 w-2.5" /> Concluir
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DayTab ───────────────────────────────────────────────────────────────────

function DayTab({ day, isSelected, onClick }: {
  day: DailyPlanDay; isSelected: boolean; onClick: () => void;
}) {
  const date = parseISO(day.date);
  const doneCount = day.actions.filter(a => a.status === "done").length;
  const total = day.actions.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isCurrentDay = isToday(date);
  const isTomorrowDay = isTomorrow(date);
  const isPast = isBefore(date, new Date()) && !isCurrentDay;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all duration-200 min-w-[68px] shrink-0",
        isSelected
          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
          : isCurrentDay
          ? "bg-primary/10 border-primary/40 text-foreground"
          : isPast
          ? "bg-muted/20 border-border text-muted-foreground opacity-60"
          : "bg-card/50 border-border hover:border-primary/30 hover:bg-primary/5 text-foreground",
      )}
    >
      {isCurrentDay && !isSelected && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">
          Hoje
        </span>
      )}
      {isTomorrowDay && !isCurrentDay && !isSelected && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
          Amanhã
        </span>
      )}

      <p className={cn("text-[9px] font-bold uppercase mt-0.5", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {format(date, "EEE", { locale: ptBR })}
      </p>
      <p className="text-sm font-black leading-none">
        {format(date, "dd")}
      </p>

      {/* Area dots */}
      <div className="flex gap-0.5 justify-center flex-wrap max-w-[48px]">
        {[...new Set(day.actions.map(a => a.area))].slice(0, 4).map(a => {
          const cfg = AREA_CONFIG[a];
          if (!cfg) return null;
          return <span key={a} className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-primary-foreground/60" : cfg.color.replace("text-", "bg-"))} />;
        })}
      </div>

      {/* Progress ring */}
      <div className="w-full space-y-0.5">
        <div className={cn("h-1 rounded-full overflow-hidden", isSelected ? "bg-primary-foreground/20" : "bg-muted/50")}>
          <div
            className={cn("h-full rounded-full transition-all", isSelected ? "bg-primary-foreground" : "bg-emerald-500")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={cn("text-[8px] text-center font-medium", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {doneCount}/{total}
        </p>
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string>("all");

  // Primary: fetch daily_plan from runs delivery_status
  const { data: runData, isLoading: isLoadingRun, refetch } = useQuery({
    queryKey: ["daily-plan", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orchestrator_runs")
        .select("delivery_status, created_at, status")
        .eq("deployment_id", deploymentId)
        .in("status", ["completed", "partial"])
        .order("created_at", { ascending: false })
        .limit(10); // check more runs in case earlier ones had the plan
      // Return the most recent run that has a daily_plan
      return (data || []).find(r => (r.delivery_status as any)?.daily_plan?.length > 0) || null;
    },
    enabled: !!deploymentId,
    refetchInterval: 30000,
  });

  // Fallback: if no delivery_status plan found, build plan from orchestrator_tasks with source=daily_plan
  const { data: dailyTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["daily-plan-tasks-fallback", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orchestrator_tasks")
        .select("*")
        .eq("deployment_id", deploymentId)
        .filter("metadata->>source", "eq", "daily_plan")
        .order("due_date", { ascending: true })
        .order("metadata->>scheduled_time", { ascending: true });
      return data || [];
    },
    enabled: !!deploymentId,
    refetchInterval: 30000,
  });

  const isLoading = isLoadingRun || isLoadingTasks;

  const [localPlan, setLocalPlan] = useState<DailyPlanDay[] | null>(null);

  useEffect(() => {
    const remote = (runData?.delivery_status as any)?.daily_plan as DailyPlanDay[];
    if (remote?.length > 0 && !localPlan) setLocalPlan(remote);
  }, [runData]); // eslint-disable-line

  // Build plan from tasks if delivery_status doesn't have it
  const planFromTasks = useMemo((): DailyPlanDay[] => {
    if (!dailyTasks.length) return [];
    const grouped: Record<string, DailyPlanDay> = {};
    for (const task of dailyTasks) {
      const date = task.due_date || new Date().toISOString().split("T")[0];
      const meta = (task.metadata as any) || {};
      if (!grouped[date]) {
        grouped[date] = {
          date,
          day_name: meta.day_name || new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" }),
          theme: meta.day_theme || "",
          actions: [],
          kpi_targets: [],
          areas_covered: [],
        };
      }
      grouped[date].actions.push({
        time: meta.scheduled_time || "09:00",
        title: task.title,
        description: task.description || "",
        area: meta.area || task.category || "seo",
        priority: task.priority as any || "normal",
        duration_min: meta.duration_min || 30,
        responsible: task.assigned_role || "Equipe",
        success_metric: task.success_metric || "",
        status: task.status === "done" ? "done" : task.status === "in_progress" ? "in_progress" : "scheduled",
        tools: meta.tools || [],
      });
      if (!grouped[date].areas_covered.includes(meta.area || task.category)) {
        grouped[date].areas_covered.push(meta.area || task.category);
      }
    }
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyTasks]);

  const activePlan: DailyPlanDay[] = useMemo(() => {
    const remote = (runData?.delivery_status as any)?.daily_plan as DailyPlanDay[];
    return localPlan || remote || planFromTasks;
  }, [runData, localPlan, planFromTasks]);

  useEffect(() => {
    if (activePlan.length > 0 && !selectedDate) {
      const today = new Date().toISOString().split("T")[0];
      const dateToSelect = activePlan.find(d => d.date === today)?.date || activePlan[0]?.date;
      if (dateToSelect) setSelectedDate(dateToSelect);
    }
  }, [activePlan, selectedDate]);

  const selectedDay = activePlan.find(d => d.date === selectedDate) || activePlan[0];

  const filteredActions = useMemo(() => {
    if (!selectedDay) return [];
    if (filterArea === "all") return selectedDay.actions;
    return selectedDay.actions.filter(a => a.area === filterArea);
  }, [selectedDay, filterArea]);

  const totalActions = activePlan.reduce((s, d) => s + d.actions.length, 0);
  const doneActions = activePlan.reduce((s, d) => s + d.actions.filter(a => a.status === "done").length, 0);
  const todayDay = activePlan.find(d => d.date === new Date().toISOString().split("T")[0]);
  const todayProgress = todayDay
    ? Math.round((todayDay.actions.filter(a => a.status === "done").length / Math.max(todayDay.actions.length, 1)) * 100)
    : 0;
  const weekProgress = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0;

  const urgentCount = activePlan.reduce((s, d) => s + d.actions.filter(a => a.priority === "urgente" && a.status !== "done").length, 0);

  const handleStatusChange = (dayDate: string, actionIdx: number, newStatus: string) => {
    setLocalPlan(prev => {
      const plan = prev || activePlan;
      return plan.map(day => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          actions: day.actions.map((a, i) => i !== actionIdx ? a : { ...a, status: newStatus as any }),
        };
      });
    });
    const labels: Record<string, string> = { done: "concluída ✅", in_progress: "iniciada ▶", pending: "reaberta" };
    toast.success(`Ação ${labels[newStatus] || newStatus}`);
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
          <p className="text-sm font-bold">Plano diário não gerado ainda</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Execute o orquestrador para gerar ações diárias por área (SEO, conteúdo, links, ads) para os próximos 5 dias com base nos dados reais do projeto.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs mt-2" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" /> Verificar novamente
        </Button>
      </div>
    );
  }

  const dayAreas = selectedDay ? [...new Set(selectedDay.actions.map(a => a.area))] : [];

  return (
    <div className="space-y-4">

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card/50 p-3 text-center">
          <p className="text-xl font-black">{totalActions}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Total</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-xl font-black text-emerald-400">{doneActions}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Concluídas</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-xl font-black text-primary">{todayProgress}%</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Hoje</p>
        </div>
        <div className={cn(
          "rounded-xl border p-3 text-center",
          urgentCount > 0 ? "border-red-500/20 bg-red-500/5" : "border-border bg-card/50"
        )}>
          <p className={cn("text-xl font-black", urgentCount > 0 ? "text-red-400" : "text-muted-foreground")}>{urgentCount}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Urgentes</p>
        </div>
      </div>

      {/* ── Week progress ── */}
      <div className="space-y-1.5 px-0.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> Progresso da semana
          </span>
          <span className="font-bold text-foreground">{weekProgress}%</span>
        </div>
        <Progress value={weekProgress} className="h-2" />
        {todayDay?.theme && (
          <p className="text-[10px] text-muted-foreground/70 italic">🎯 Foco de hoje: {todayDay.theme}</p>
        )}
      </div>

      {/* ── Urgent alert ── */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 font-medium">
            {urgentCount} ação{urgentCount > 1 ? "ões" : ""} urgente{urgentCount > 1 ? "s" : ""} pendente{urgentCount > 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* ── Day selector ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 pt-2 -mx-0.5 px-0.5 scrollbar-none">
        {activePlan.map(day => (
          <DayTab
            key={day.date}
            day={day}
            isSelected={selectedDate === day.date}
            onClick={() => { setSelectedDate(day.date); setFilterArea("all"); }}
          />
        ))}
      </div>

      {/* ── Selected day ── */}
      {selectedDay && (
        <div className="space-y-3">
          {/* Day header card */}
          <div className="rounded-xl border border-border bg-gradient-to-r from-card to-muted/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" />
                    {selectedDay.day_name}
                    {isToday(parseISO(selectedDay.date)) && (
                      <Badge className="text-[8px] h-4 px-1.5 bg-primary text-primary-foreground">HOJE</Badge>
                    )}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(selectedDay.date), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                {selectedDay.theme && (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">"{selectedDay.theme}"</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-foreground">
                  {selectedDay.actions.filter(a => a.status === "done").length}/{selectedDay.actions.length}
                </p>
                <p className="text-[9px] text-muted-foreground">concluídas</p>
              </div>
            </div>

            {/* Area filter pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <button
                onClick={() => setFilterArea("all")}
                className={cn(
                  "text-[9px] font-bold px-2 py-1 rounded-lg border transition-all",
                  filterArea === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/20 border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                Todas
              </button>
              {dayAreas.map(a => {
                const cfg = AREA_CONFIG[a];
                if (!cfg) return null;
                const AreaIcon = cfg.icon;
                const total = selectedDay.actions.filter(ac => ac.area === a).length;
                const done = selectedDay.actions.filter(ac => ac.area === a && ac.status === "done").length;
                return (
                  <button
                    key={a}
                    onClick={() => setFilterArea(filterArea === a ? "all" : a)}
                    className={cn(
                      "flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg border transition-all",
                      filterArea === a
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ring-current`
                        : "bg-muted/10 border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <AreaIcon className="h-2.5 w-2.5" />
                    {cfg.label}
                    <span className={cn("opacity-60", filterArea === a && "opacity-100")}>
                      {done}/{total}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* KPI targets */}
            {selectedDay.kpi_targets?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-border/40">
                {selectedDay.kpi_targets.map((kpi, i) => {
                  const cfg = AREA_CONFIG[kpi.area];
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg border",
                      cfg ? `${cfg.bg} ${cfg.border}` : "bg-muted/20 border-border"
                    )}>
                      <Target className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{kpi.metric}:</span>
                      <span className="font-bold">{kpi.target}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions list */}
          <ScrollArea className="max-h-[480px] pr-1">
            <div className="space-y-2 pb-2">
              {filteredActions.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  Nenhuma ação para esta área neste dia.
                </div>
              ) : (
                filteredActions.map((action, idx) => {
                  const realIdx = selectedDay.actions.findIndex(
                    (a, i) => a.title === action.title && a.time === action.time && i >= idx
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
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ── Week overview by area ── */}
      <div className="rounded-xl border border-border bg-card/30 p-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3" /> Progresso por Área — Semana
        </p>
        <div className="space-y-2">
          {Object.entries(AREA_CONFIG).map(([areaKey, cfg]) => {
            const AreaIcon = cfg.icon;
            const all = activePlan.flatMap(d => d.actions.filter(a => a.area === areaKey));
            if (all.length === 0) return null;
            const done = all.filter(a => a.status === "done").length;
            const pct = Math.round((done / all.length) * 100);
            return (
              <div key={areaKey} className="flex items-center gap-2">
                <div className={cn("flex items-center gap-1 text-[9px] font-bold w-20 shrink-0", cfg.color)}>
                  <AreaIcon className="h-3 w-3" />
                  {cfg.label}
                </div>
                <div className="flex-1">
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", cfg.color.replace("text-", "bg-"))}
                      style={{ width: `${pct}%`, opacity: 0.7 }}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground w-10 text-right shrink-0 font-medium">
                  {done}/{all.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {runData?.created_at && (
        <p className="text-[9px] text-muted-foreground/60 text-center">
          Plano gerado em {format(parseISO(runData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          {" · "}
          <button onClick={() => refetch()} className="underline hover:text-foreground transition-colors">
            Atualizar
          </button>
        </p>
      )}
    </div>
  );
}
