import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Target, AlertTriangle, TrendingUp, Calendar, Loader2, CheckCircle2,
  Circle, Clock, Zap, ChevronDown, ChevronUp, ClipboardCheck,
  BarChart3, Users, ListChecks, RefreshCw, Send, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, isToday, startOfWeek, endOfWeek, isWithinInterval, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  assigned_role: string | null;
  assigned_role_emoji: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  success_metric: string | null;
  estimated_impact: string | null;
  created_at: string;
  metadata: any;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui", sexta: "Sex",
};

const DAY_COLORS = [
  "bg-violet-500/10 border-violet-500/20 text-violet-400",
  "bg-blue-500/10 border-blue-500/20 text-blue-400",
  "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  "bg-amber-500/10 border-amber-500/20 text-amber-400",
];

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  urgente: { label: "Urgente", dot: "bg-red-500", badge: "text-red-400 border-red-500/40 bg-red-500/10" },
  alta:    { label: "Alta",    dot: "bg-orange-500", badge: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  normal:  { label: "Normal",  dot: "bg-blue-500", badge: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
  baixa:   { label: "Baixa",   dot: "bg-muted-foreground", badge: "text-muted-foreground border-border bg-muted/20" },
};

// ─── WeekTaskRow ──────────────────────────────────────────────────────────────

function WeekTaskRow({ task, onStatusChange, onCheck }: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  onCheck: (id: string, checked: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
  const isDone = task.status === "done";
  const isInProgress = task.status === "in_progress";
  const isOverdue = task.due_date && task.status !== "done" && task.due_date < new Date().toISOString().split("T")[0];
  const isGpChecked = task.metadata?.gp_checked === true;

  return (
    <div className={cn(
      "rounded-xl border bg-card/50 p-3 transition-all",
      isDone && "opacity-60",
      isOverdue && "border-red-500/30",
      isGpChecked && !isOverdue && "border-emerald-500/20",
    )}>
      <div className="flex items-start gap-2">
        {/* Status toggle */}
        <button
          onClick={() => {
            const next = isDone ? "pending" : isInProgress ? "done" : "in_progress";
            onStatusChange(task.id, next);
          }}
          className="mt-0.5 shrink-0 transition-transform hover:scale-110"
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : isInProgress ? (
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/50 hover:text-primary transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", prio.dot)} />
            {task.assigned_role_emoji && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {task.assigned_role_emoji}
              </span>
            )}
            <p className={cn("text-xs font-medium leading-snug flex-1", isDone && "line-through text-muted-foreground")}>
              {task.title}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border", prio.badge)}>
              {prio.label}
            </span>
            {task.due_date && (
              <span className={cn("flex items-center gap-0.5 text-[9px]", isOverdue ? "text-red-400" : "text-muted-foreground")}>
                <Clock className="h-2.5 w-2.5" />
                {isOverdue ? "⚠️ " : ""}
                {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
            {task.assigned_role && (
              <span className="text-[9px] text-muted-foreground">{task.assigned_role}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* GP Check button */}
          <button
            onClick={() => onCheck(task.id, !isGpChecked)}
            title={isGpChecked ? "Verificado pelo GP" : "Marcar como verificado pelo GP"}
            className={cn(
              "h-6 w-6 rounded-md border flex items-center justify-center transition-all",
              isGpChecked
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-muted/20 border-border text-muted-foreground/30 hover:border-primary/40 hover:text-primary/60"
            )}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
          </button>

          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground/40 hover:text-muted-foreground">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && task.description && (
        <div className="mt-2 ml-6 text-[11px] text-muted-foreground/80 leading-relaxed border-t border-border pt-2">
          {task.description}
          {task.estimated_impact && (
            <p className="text-[10px] text-emerald-400 mt-1">📈 {task.estimated_impact}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface StrategicPlanPanelProps {
  deploymentId: string;
  projectId?: string;
}

export function StrategicPlanPanel({ deploymentId, projectId }: StrategicPlanPanelProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeView, setActiveView] = useState<"tasks" | "strategy">("tasks");
  const [sendingReport, setSendingReport] = useState(false);

  // Fetch tasks for this deployment
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["orchestrator-tasks-weekly", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orchestrator_tasks")
        .select("*")
        .eq("deployment_id", deploymentId)
        .order("due_date", { ascending: true });
      return (data || []) as Task[];
    },
    enabled: !!deploymentId,
    refetchInterval: 30000,
  });

  // Fetch last run for strategic plan
  const { data: lastRun, isLoading: planLoading } = useQuery({
    queryKey: ["orchestrator-last-run-plan", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orchestrator_runs")
        .select("delivery_status, created_at, status, summary")
        .eq("deployment_id", deploymentId)
        .in("status", ["completed", "partial"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!deploymentId,
  });

  const plan = (lastRun?.delivery_status as any)?.strategic_plan;

  // Weekly task stats
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

  const weeklyTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.due_date) return true; // Include tasks with no due date
      try {
        const d = parseISO(t.due_date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch { return false; }
    });
  }, [tasks]);

  const done = weeklyTasks.filter(t => t.status === "done");
  const inProgress = weeklyTasks.filter(t => t.status === "in_progress");
  const pending = weeklyTasks.filter(t => t.status === "pending");
  const overdue = weeklyTasks.filter(t =>
    t.status !== "done" && t.due_date && t.due_date < today.toISOString().split("T")[0]
  );
  const gpChecked = weeklyTasks.filter(t => t.metadata?.gp_checked === true);
  const completionRate = weeklyTasks.length > 0
    ? Math.round((done.length / weeklyTasks.length) * 100)
    : 0;

  const isFriday = today.getDay() === 5;

  // Update task status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orchestrator_tasks")
        .update({
          status,
          completed_at: status === "done" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orchestrator-tasks-weekly", deploymentId] }),
    onError: (err: any) => toast.error(err.message),
  });

  // GP check toggle
  const updateGpCheck = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const task = tasks.find(t => t.id === id);
      const currentMeta = task?.metadata || {};
      const { error } = await supabase
        .from("orchestrator_tasks")
        .update({
          metadata: {
            ...currentMeta,
            gp_checked: checked,
            gp_checked_at: checked ? new Date().toISOString() : null,
          },
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { checked }) => {
      qc.invalidateQueries({ queryKey: ["orchestrator-tasks-weekly", deploymentId] });
      if (checked) toast.success("✅ Tarefa verificada pelo Gestor de Projetos");
      else toast.success("↩ Verificação removida");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Manual send weekly report via WhatsApp
  const handleSendWeeklyReport = async () => {
    setSendingReport(true);
    try {
      const { data: dep } = await supabase
        .from("orchestrator_deployments")
        .select("roles, hierarchy, name")
        .eq("id", deploymentId)
        .single();

      if (!dep) throw new Error("Deployment not found");

      const hierarchy = (dep.hierarchy as Record<string, string>) || {};
      const rootRole = (dep.roles as any[]).find((r: any) => !hierarchy[r.id]);

      if (!rootRole?.whatsapp) {
        toast.error("Configure o WhatsApp do CEO no War Room para enviar o relatório.");
        return;
      }

      const report = `📊 *Relatório Semanal — ${dep.name || "Equipe"}*
📅 Semana: ${format(weekStart, "dd/MM", { locale: ptBR })} – ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}

📈 *Resumo:*
✅ Concluídas: ${done.length}/${weeklyTasks.length} (${completionRate}%)
⚡ Em progresso: ${inProgress.length}
📋 Pendentes: ${pending.length}
🚨 Atrasadas: ${overdue.length}
🔍 Verificadas pelo GP: ${gpChecked.length}/${weeklyTasks.length}

${overdue.length > 0 ? `⚠️ *Atenção — Tarefas atrasadas:*\n${overdue.map(t => `• ${t.assigned_role_emoji || "📋"} ${t.title}`).join("\n")}\n` : ""}
${done.length > 0 ? `✅ *Concluídas esta semana:*\n${done.map(t => `• ${t.title}`).join("\n")}\n` : ""}

— Gestor de Projetos | Rankito 🚀`;

      await supabase.functions.invoke("send-workflow-notification", {
        body: {
          workflow_name: `📊 Relatório Semanal — ${dep.name}`,
          report,
          recipient_name: rootRole.title || "CEO",
          direct_send: { phones: [rootRole.whatsapp] },
        },
      });

      toast.success("📊 Relatório semanal enviado via WhatsApp!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar relatório");
    } finally {
      setSendingReport(false);
    }
  };

  const isLoading = tasksLoading || planLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── View Toggle ── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted/30 rounded-lg p-1 gap-1">
          <Button
            size="sm"
            variant={activeView === "tasks" ? "default" : "ghost"}
            className="h-6 text-[10px] px-3 gap-1"
            onClick={() => setActiveView("tasks")}
          >
            <ListChecks className="h-3 w-3" /> Tarefas da Semana
          </Button>
          <Button
            size="sm"
            variant={activeView === "strategy" ? "default" : "ghost"}
            className="h-6 text-[10px] px-3 gap-1"
            onClick={() => setActiveView("strategy")}
          >
            <Target className="h-3 w-3" /> Estratégia
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 ml-auto"
          onClick={() => refetchTasks()}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* ── TASKS VIEW ── */}
      {activeView === "tasks" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
              <p className="text-base font-black text-emerald-400">{done.length}</p>
              <p className="text-[9px] text-muted-foreground">Concluídas</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-center">
              <p className="text-base font-black text-blue-400">{inProgress.length}</p>
              <p className="text-[9px] text-muted-foreground">Em Progresso</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-2 text-center">
              <p className="text-base font-black">{pending.length}</p>
              <p className="text-[9px] text-muted-foreground">Pendentes</p>
            </div>
            <div className={cn("rounded-lg p-2 text-center border", overdue.length > 0 ? "bg-red-500/10 border-red-500/20" : "bg-muted/20 border-border")}>
              <p className={cn("text-base font-black", overdue.length > 0 ? "text-red-400" : "text-muted-foreground")}>
                {overdue.length}
              </p>
              <p className="text-[9px] text-muted-foreground">Atrasadas</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Progresso da semana</span>
              <span className="text-[10px] font-bold text-primary">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
              <span>GP verificou {gpChecked.length}/{weeklyTasks.length} tarefas</span>
              <span>{format(weekStart, "dd/MM", { locale: ptBR })} – {format(weekEnd, "dd/MM", { locale: ptBR })}</span>
            </div>
          </div>

          {/* Overdue alert */}
          {overdue.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400">
                  {overdue.length} tarefa{overdue.length > 1 ? "s" : ""} com prazo vencido
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  O CEO será alertado automaticamente via WhatsApp.
                </p>
              </div>
            </div>
          )}

          {/* GP Legend */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border">
            <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <span className="text-emerald-400 font-semibold">Botão verde</span> = Gestor de Projetos conferiu a tarefa. Clique para marcar/desmarcar.
            </p>
          </div>

          {/* Task list */}
          {weeklyTasks.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <ListChecks className="h-10 w-10 mx-auto text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa esta semana</p>
              <p className="text-xs text-muted-foreground/60">Execute o orquestrador para gerar tarefas automáticas.</p>
            </div>
          ) : (
            <ScrollArea className="h-[320px] pr-1">
              <div className="space-y-2">
                {/* Group: Overdue */}
                {overdue.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider px-1">🚨 Atrasadas</p>
                    {overdue.map(task => (
                      <WeekTaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                        onCheck={(id, checked) => updateGpCheck.mutate({ id, checked })}
                      />
                    ))}
                  </div>
                )}

                {/* Group: In Progress */}
                {inProgress.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider px-1">⚡ Em Progresso</p>
                    {inProgress.filter(t => !overdue.includes(t)).map(task => (
                      <WeekTaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                        onCheck={(id, checked) => updateGpCheck.mutate({ id, checked })}
                      />
                    ))}
                  </div>
                )}

                {/* Group: Pending */}
                {pending.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1">📋 Pendentes</p>
                    {pending.filter(t => !overdue.includes(t)).map(task => (
                      <WeekTaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                        onCheck={(id, checked) => updateGpCheck.mutate({ id, checked })}
                      />
                    ))}
                  </div>
                )}

                {/* Group: Done */}
                {done.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider px-1">✅ Concluídas</p>
                    {done.map(task => (
                      <WeekTaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                        onCheck={(id, checked) => updateGpCheck.mutate({ id, checked })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Friday / Weekly Report button */}
          <div className={cn(
            "p-3 rounded-xl border flex items-center gap-3",
            isFriday
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-muted/20 border-border"
          )}>
            <FileText className={cn("h-5 w-5 shrink-0", isFriday ? "text-amber-400" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              {isFriday ? (
                <>
                  <p className="text-xs font-bold text-amber-400">📅 Hoje é sexta-feira!</p>
                  <p className="text-[10px] text-muted-foreground">Envie o relatório de fechamento de semana para o CEO.</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium">Relatório Semanal</p>
                  <p className="text-[10px] text-muted-foreground">Enviado automaticamente toda sexta-feira via WhatsApp.</p>
                </>
              )}
            </div>
            <Button
              size="sm"
              variant={isFriday ? "default" : "outline"}
              className="h-7 text-[10px] gap-1.5 shrink-0"
              onClick={handleSendWeeklyReport}
              disabled={sendingReport}
            >
              {sendingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Enviar agora
            </Button>
          </div>
        </div>
      )}

      {/* ── STRATEGY VIEW ── */}
      {activeView === "strategy" && (
        <ScrollArea className="h-[500px] pr-2">
          {!plan ? (
            <div className="text-center py-10 space-y-2">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum planejamento estratégico ainda</p>
              <p className="text-xs text-muted-foreground/60">Execute o orquestrador para gerar o plano estratégico da semana.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {/* Week theme */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">🎯 Tema da Semana</p>
                <p className="text-sm font-bold">{plan.week_theme}</p>
                {lastRun?.created_at && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Gerado em {new Date(lastRun.created_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>

              {/* Top goals */}
              {plan.top_goals?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3 w-3" /> Metas Prioritárias
                  </p>
                  <div className="space-y-1.5">
                    {(plan.top_goals as string[]).map((goal, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                        <span className="text-xs font-bold text-primary shrink-0">{i + 1}.</span>
                        <p className="text-xs">{goal}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily focus */}
              {Object.keys(plan.daily_focus || {}).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Foco Diário
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(Object.entries(plan.daily_focus) as [string, string][]).map(([day, focus], i) => (
                      <div key={day} className={cn("p-2 rounded-lg border text-center", DAY_COLORS[i % DAY_COLORS.length].split(" text-")[0])}>
                        <p className={cn("text-[9px] font-bold uppercase mb-1", DAY_COLORS[i % DAY_COLORS.length].split(" ").pop())}>
                          {DAY_LABELS[day] || day}
                        </p>
                        <p className="text-[10px] leading-tight">{focus}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KPIs to watch */}
              {plan.kpis_to_watch?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3" /> KPIs para Monitorar
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {(plan.kpis_to_watch as any[]).map((kpi, i) => (
                      <div key={i} className="p-2.5 rounded-lg border border-border bg-card/50">
                        <p className="text-[9px] text-muted-foreground">{kpi.metric}</p>
                        <p className="text-xs font-bold text-primary mt-0.5">{kpi.target}</p>
                        {kpi.current && <p className="text-[9px] text-muted-foreground">Atual: {kpi.current}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk alert */}
              {plan.risk_alert && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-0.5">Alerta de Risco</p>
                    <p className="text-xs">{plan.risk_alert}</p>
                  </div>
                </div>
              )}

              {/* Quick wins */}
              {plan.quick_wins?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-yellow-400" /> Quick Wins (menos de 1h)
                  </p>
                  <div className="space-y-1.5">
                    {(plan.quick_wins as string[]).map((win, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                        <Zap className="h-3 w-3 text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-[11px]">{win}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CEO summary */}
              {lastRun?.summary && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">📋 Relatório Executivo CEO</p>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <ScrollArea className="max-h-48">
                      <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{lastRun.summary}</p>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
