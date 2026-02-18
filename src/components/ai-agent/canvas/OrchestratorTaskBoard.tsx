import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, Clock, Zap, AlertTriangle,
  TrendingUp, Target, ArrowRight, RefreshCw, Filter,
  ChevronDown, ChevronUp, Kanban, ListChecks, Loader2,
  CalendarDays, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  assigned_role: string;
  assigned_role_emoji: string;
  assigned_to_human: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  success_metric: string | null;
  estimated_impact: string | null;
  created_at: string;
  metadata?: {
    source?: string;
    scheduled_time?: string;
    day_name?: string;
    day_theme?: string;
    duration_min?: number;
    tools?: string[];
    area?: string;
  };
}

// ─── Config ──────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  seo:        { label: "SEO",        color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  conteudo:   { label: "Conteúdo",   color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  links:      { label: "Links",      color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/25" },
  ads:        { label: "Ads",        color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/25" },
  tecnico:    { label: "Técnico",    color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/25" },
  estrategia: { label: "Estratégia", color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/25" },
  analytics:  { label: "Analytics",  color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25" },
  geral:      { label: "Geral",      color: "text-muted-foreground", bg: "bg-muted/20",  border: "border-border" },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  urgente: { label: "Urgente", icon: <AlertTriangle className="h-3 w-3" />, color: "text-red-400",          bg: "bg-red-500/10",    border: "border-red-500/30" },
  alta:    { label: "Alta",    icon: <Zap className="h-3 w-3" />,           color: "text-orange-400",       bg: "bg-orange-500/10", border: "border-orange-500/30" },
  normal:  { label: "Normal",  icon: <ArrowRight className="h-3 w-3" />,    color: "text-blue-400",         bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  baixa:   { label: "Baixa",   icon: <ChevronDown className="h-3 w-3" />,   color: "text-muted-foreground", bg: "bg-muted/20",      border: "border-border" },
};

const STATUS_COLUMNS = [
  { key: "pending",     label: "Pendente",     emoji: "📋", color: "border-border",          headerBg: "bg-muted/30" },
  { key: "in_progress", label: "Em Progresso", emoji: "⚡", color: "border-primary/30",      headerBg: "bg-primary/5" },
  { key: "done",        label: "Concluído",    emoji: "✅", color: "border-emerald-500/30",  headerBg: "bg-emerald-500/5" },
];

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onStatusChange }: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.geral;
  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
  const isDone = task.status === "done";
  const isInProgress = task.status === "in_progress";
  const nextStatus = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "done" : null;
  const prevStatus = task.status === "done" ? "in_progress" : task.status === "in_progress" ? "pending" : null;
  const isOverdue = task.due_date && task.status !== "done" && new Date(task.due_date + "T23:59:59") < new Date();
  const isDailyPlan = task.metadata?.source === "daily_plan";
  const scheduledTime = task.metadata?.scheduled_time;
  const dayName = task.metadata?.day_name;

  return (
    <div className={cn(
      "group rounded-xl border bg-card/70 p-3 space-y-0 transition-all duration-200",
      isDone && "opacity-55",
      isInProgress && "border-primary/25 ring-1 ring-primary/15 shadow-sm shadow-primary/10",
      isOverdue && !isDone && "border-red-500/30",
      isDailyPlan && "border-l-[3px] border-l-primary/50",
      !isDone && !isInProgress && !isOverdue && "hover:border-border/80 hover:shadow-sm",
    )}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => nextStatus && onStatusChange(task.id, nextStatus)}
          className="mt-0.5 shrink-0 transition-all hover:scale-110"
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : isInProgress ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Source tag + time */}
          {(isDailyPlan || scheduledTime) && (
            <div className="flex items-center gap-1 mb-1 flex-wrap">
              {isDailyPlan && (
                <span className="text-[8px] font-bold text-primary/80 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <CalendarDays className="h-2 w-2" /> Plano Diário
                </span>
              )}
              {scheduledTime && (
                <span className="text-[8px] font-mono font-bold text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border">
                  {scheduledTime}
                </span>
              )}
            </div>
          )}

          <p className={cn("text-xs font-semibold leading-snug", isDone && "line-through text-muted-foreground")}>
            {task.title}
          </p>

          {/* Badges */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border", cat.bg, cat.border, cat.color)}>
              {cat.label}
            </span>
            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-0.5", prio.bg, prio.border, prio.color)}>
              {prio.icon}{prio.label}
            </span>
            {task.assigned_role_emoji && (
              <span className="text-[9px] text-muted-foreground">{task.assigned_role_emoji} {task.assigned_role}</span>
            )}
          </div>
        </div>

        <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground transition-colors mt-0.5">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Due date */}
      {task.due_date && (
        <div className={cn("flex items-center gap-1 text-[9px] mt-1.5", isOverdue && !isDone ? "text-red-400" : "text-muted-foreground")}>
          <Clock className="h-3 w-3" />
          {isOverdue && !isDone ? "⚠️ Atrasada · " : ""}
          {dayName ? `${dayName}, ` : ""}
          {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
          {scheduledTime && ` às ${scheduledTime}`}
        </div>
      )}

      {/* Impact */}
      {task.estimated_impact && (
        <div className="flex items-center gap-1 text-[9px] text-emerald-400 mt-1">
          <TrendingUp className="h-3 w-3" />
          {task.estimated_impact}
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="pt-2 space-y-2 border-t border-border/50 mt-2">
          {task.description && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{task.description}</p>
          )}
          {task.success_metric && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/15">
              <Target className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground">{task.success_metric}</p>
            </div>
          )}
          {task.metadata?.tools && task.metadata.tools.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[9px] text-muted-foreground">Ferramentas:</span>
              {task.metadata.tools.map((t, i) => (
                <span key={i} className="text-[9px] bg-muted/40 border border-border px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
          {task.metadata?.day_theme && (
            <p className="text-[9px] text-primary/70">🎯 Tema: {task.metadata.day_theme}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2">
        {nextStatus && (
          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 flex-1 gap-1"
            onClick={() => onStatusChange(task.id, nextStatus)}>
            {nextStatus === "in_progress" ? <><Zap className="h-2.5 w-2.5" /> Iniciar</> : <><CheckCircle2 className="h-2.5 w-2.5" /> Concluir</>}
          </Button>
        )}
        {prevStatus && (
          <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 text-muted-foreground"
            onClick={() => onStatusChange(task.id, prevStatus)}>
            ↩ Voltar
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface OrchestratorTaskBoardProps {
  deploymentId: string;
  projectId?: string;
}

export function OrchestratorTaskBoard({ deploymentId, projectId }: OrchestratorTaskBoardProps) {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | "agent" | "daily">("all");

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["orchestrator-tasks", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orchestrator_tasks")
        .select("*")
        .eq("deployment_id", deploymentId)
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: false });
      return (data || []) as Task[];
    },
    enabled: !!deploymentId,
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orchestrator_tasks")
        .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["orchestrator-tasks", deploymentId] });
      if (status === "done") toast.success("✅ Tarefa concluída!");
      else if (status === "in_progress") toast.success("▶ Tarefa iniciada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = tasks.filter(t => {
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterSource === "agent" && (t.metadata as any)?.source === "daily_plan") return false;
    if (filterSource === "daily" && (t.metadata as any)?.source !== "daily_plan") return false;
    return true;
  });

  const pendingCount  = filtered.filter(t => t.status === "pending").length;
  const inProgressCount = filtered.filter(t => t.status === "in_progress").length;
  const doneCount     = filtered.filter(t => t.status === "done").length;
  const urgentCount   = filtered.filter(t => t.priority === "urgente" && t.status !== "done").length;
  const dailyCount    = tasks.filter(t => (t.metadata as any)?.source === "daily_plan").length;
  const agentCount    = tasks.filter(t => (t.metadata as any)?.source !== "daily_plan").length;
  const completionPct = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100) : 0;

  const usedCategories = [...new Set(tasks.map(t => t.category))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-14 space-y-2">
        <ListChecks className="h-10 w-10 mx-auto text-muted-foreground/20" />
        <p className="text-sm font-semibold text-muted-foreground">Nenhuma tarefa ainda</p>
        <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
          Execute o orquestrador para gerar tarefas automáticas baseadas nos dados reais do projeto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card/50 p-3 text-center">
          <p className="text-lg font-black">{tasks.length}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
          <p className="text-lg font-black">{pendingCount}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Pendentes</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-lg font-black text-primary">{inProgressCount}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Em Progresso</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-lg font-black text-emerald-400">{doneCount}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Concluídas</p>
        </div>
      </div>

      {/* ── Global progress ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <ClipboardCheck className="h-3 w-3" /> Conclusão geral
          </span>
          <span className="font-bold text-foreground">{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-1.5" />
      </div>

      {/* ── Source chips ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "agent", "daily"] as const).map(src => (
          <button
            key={src}
            onClick={() => setFilterSource(src)}
            className={cn(
              "text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-all",
              filterSource === src
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/20 border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {src === "all" ? `🔀 Todas (${tasks.length})` : src === "agent" ? `🤖 Agentes (${agentCount})` : `📅 Plano Diário (${dailyCount})`}
          </button>
        ))}
      </div>

      {/* ── Urgent alert ── */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 font-medium">
            {urgentCount} tarefa{urgentCount > 1 ? "s" : ""} urgente{urgentCount > 1 ? "s" : ""} aguardando ação imediata
          </p>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/20 rounded-lg p-1 border border-border">
          <Button size="sm" variant={viewMode === "kanban" ? "default" : "ghost"}
            className="h-6 text-[10px] px-2 gap-1" onClick={() => setViewMode("kanban")}>
            <Kanban className="h-3 w-3" /> Kanban
          </Button>
          <Button size="sm" variant={viewMode === "list" ? "default" : "ghost"}
            className="h-6 text-[10px] px-2 gap-1" onClick={() => setViewMode("list")}>
            <ListChecks className="h-3 w-3" /> Lista
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-[10px] bg-card border border-border rounded-lg px-2 py-1 text-foreground"
          >
            <option value="all">Todas as áreas</option>
            {usedCategories.map(c => (
              <option key={c} value={c}>{CATEGORY_CONFIG[c]?.label || c}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-[10px] bg-card border border-border rounded-lg px-2 py-1 text-foreground"
          >
            <option value="all">Todas as prioridades</option>
            <option value="urgente">🔴 Urgente</option>
            <option value="alta">🟠 Alta</option>
            <option value="normal">🔵 Normal</option>
            <option value="baixa">⚪ Baixa</option>
          </select>
        </div>

        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 ml-auto gap-1"
          onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" /> Atualizar
        </Button>
      </div>

      {/* ── Kanban ── */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STATUS_COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className={cn("rounded-xl border-2 border-dashed p-3 space-y-2 min-h-[180px]", col.color)}>
                <div className={cn("flex items-center justify-between mb-2 px-1 py-1.5 rounded-lg", col.headerBg)}>
                  <p className="text-xs font-bold flex items-center gap-1">
                    <span>{col.emoji}</span> {col.label}
                  </p>
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">{colTasks.length}</Badge>
                </div>
                <ScrollArea className="max-h-[460px] pr-1">
                  <div className="space-y-2">
                    {colTasks.map(task => (
                      <TaskCard key={task.id} task={task}
                        onStatusChange={(id, status) => updateStatus.mutate({ id, status })} />
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/30 text-center py-8">Nenhuma tarefa aqui</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List ── */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {STATUS_COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            if (colTasks.length === 0) return null;
            return (
              <div key={col.key} className="space-y-1.5">
                <p className={cn("text-[9px] font-bold uppercase tracking-wider px-1 flex items-center gap-1")}>
                  {col.emoji} {col.label}
                  <span className="text-muted-foreground font-normal">({colTasks.length})</span>
                </p>
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task}
                    onStatusChange={(id, status) => updateStatus.mutate({ id, status })} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
