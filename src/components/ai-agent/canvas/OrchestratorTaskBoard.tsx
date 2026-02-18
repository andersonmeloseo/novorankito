import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2, Circle, Clock, Zap, AlertTriangle,
  TrendingUp, Target, ArrowRight, RefreshCw, Filter,
  ChevronDown, ChevronUp, Kanban, ListChecks, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  seo:        { label: "SEO",       color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  conteudo:   { label: "Conteúdo",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  links:      { label: "Links",     color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
  ads:        { label: "Ads",       color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" },
  tecnico:    { label: "Técnico",   color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20" },
  estrategia: { label: "Estratégia",color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20" },
  analytics:  { label: "Analytics", color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  geral:      { label: "Geral",     color: "text-muted-foreground", bg: "bg-muted/30 border-border" },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
  urgente: { label: "Urgente", icon: <AlertTriangle className="h-3 w-3" />, class: "text-red-400 border-red-500/40 bg-red-500/10" },
  alta:    { label: "Alta",    icon: <Zap className="h-3 w-3" />,           class: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  normal:  { label: "Normal",  icon: <ArrowRight className="h-3 w-3" />,    class: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
  baixa:   { label: "Baixa",   icon: <ChevronDown className="h-3 w-3" />,   class: "text-muted-foreground border-border bg-muted/20" },
};

const STATUS_COLUMNS = [
  { key: "pending",     label: "📋 Pendente",       color: "border-muted" },
  { key: "in_progress", label: "⚡ Em Progresso",    color: "border-blue-500/40" },
  { key: "done",        label: "✅ Concluído",       color: "border-emerald-500/40" },
];

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.geral;
  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;

  const nextStatus = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "done" : null;
  const prevStatus = task.status === "done" ? "in_progress" : task.status === "in_progress" ? "pending" : null;

  const isOverdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();

  return (
    <div className={cn(
      "rounded-lg border bg-card/60 backdrop-blur-sm p-3 space-y-2 transition-all hover:shadow-md hover:-translate-y-0.5",
      task.status === "done" && "opacity-60",
      isOverdue && "border-red-500/30",
    )}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => nextStatus && onStatusChange(task.id, nextStatus)}
          className="mt-0.5 shrink-0 transition-colors"
        >
          {task.status === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : task.status === "in_progress" ? (
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-semibold leading-tight", task.status === "done" && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border", cat.bg, cat.color)}>
              {cat.label}
            </span>
            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-0.5", prio.class)}>
              {prio.icon}{prio.label}
            </span>
            {task.assigned_role_emoji && (
              <span className="text-[9px] text-muted-foreground">{task.assigned_role_emoji} {task.assigned_role}</span>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Due date */}
      {task.due_date && (
        <div className={cn("flex items-center gap-1 text-[10px]", isOverdue ? "text-red-400" : "text-muted-foreground")}>
          <Clock className="h-3 w-3" />
          {isOverdue ? "⚠️ " : ""}Prazo: {new Date(task.due_date).toLocaleDateString("pt-BR")}
        </div>
      )}

      {/* Impact pill */}
      {task.estimated_impact && (
        <div className="flex items-center gap-1 text-[10px] text-emerald-400">
          <TrendingUp className="h-3 w-3" />
          {task.estimated_impact}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="pt-1 space-y-2 border-t border-border mt-2">
          {task.description && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{task.description}</p>
          )}
          {task.success_metric && (
            <div className="flex items-start gap-1.5">
              <Target className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground">{task.success_metric}</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 pt-1">
        {nextStatus && (
          <Button
            size="sm"
            variant="outline"
            className="h-5 text-[9px] px-2 flex-1"
            onClick={() => onStatusChange(task.id, nextStatus)}
          >
            {nextStatus === "in_progress" ? "▶ Iniciar" : "✓ Concluir"}
          </Button>
        )}
        {prevStatus && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 text-[9px] px-2 text-muted-foreground"
            onClick={() => onStatusChange(task.id, prevStatus)}
          >
            ↩ Voltar
          </Button>
        )}
      </div>
    </div>
  );
}

interface OrchestratorTaskBoardProps {
  deploymentId: string;
  projectId?: string;
}

export function OrchestratorTaskBoard({ deploymentId, projectId }: OrchestratorTaskBoardProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["orchestrator-tasks", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orchestrator_tasks")
        .select("*")
        .eq("deployment_id", deploymentId)
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
        .update({ 
          status,
          completed_at: status === "done" ? new Date().toISOString() : null,
        })
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
    return true;
  });

  const pendingCount = filtered.filter(t => t.status === "pending").length;
  const inProgressCount = filtered.filter(t => t.status === "in_progress").length;
  const doneCount = filtered.filter(t => t.status === "done").length;
  const urgentCount = filtered.filter(t => t.priority === "urgente" && t.status !== "done").length;

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
      <div className="text-center py-12 space-y-2">
        <ListChecks className="h-10 w-10 mx-auto text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa ainda</p>
        <p className="text-xs text-muted-foreground/60">Execute o orquestrador para gerar tarefas automáticas para o time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-muted/30 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold">{tasks.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-orange-400">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pendentes</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-blue-400">{inProgressCount}</p>
          <p className="text-[10px] text-muted-foreground">Em Progresso</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-400">{doneCount}</p>
          <p className="text-[10px] text-muted-foreground">Concluídas</p>
        </div>
      </div>

      {/* Urgent alert */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 font-medium">
            {urgentCount} tarefa{urgentCount > 1 ? "s" : ""} urgente{urgentCount > 1 ? "s" : ""} aguardando ação imediata
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "default" : "ghost"}
            className="h-6 text-[10px] px-2 gap-1"
            onClick={() => setViewMode("kanban")}
          >
            <Kanban className="h-3 w-3" /> Kanban
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            className="h-6 text-[10px] px-2 gap-1"
            onClick={() => setViewMode("list")}
          >
            <ListChecks className="h-3 w-3" /> Lista
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-[10px] bg-muted/30 border border-border rounded px-1.5 py-0.5 text-foreground"
          >
            <option value="all">Todas áreas</option>
            {usedCategories.map(c => (
              <option key={c} value={c}>{CATEGORY_CONFIG[c]?.label || c}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-[10px] bg-muted/30 border border-border rounded px-1.5 py-0.5 text-foreground"
          >
            <option value="all">Todas prioridades</option>
            <option value="urgente">🔴 Urgente</option>
            <option value="alta">🟠 Alta</option>
            <option value="normal">🔵 Normal</option>
            <option value="baixa">⚪ Baixa</option>
          </select>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px] px-2 ml-auto gap-1"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3 w-3" /> Atualizar
        </Button>
      </div>

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className={cn("rounded-xl border-2 border-dashed p-3 space-y-2 min-h-[200px]", col.color, "bg-card/20")}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold">{col.label}</p>
                  <Badge variant="outline" className="text-[9px] h-4">{colTasks.length}</Badge>
                </div>
                <ScrollArea className="max-h-[500px] pr-1">
                  <div className="space-y-2">
                    {colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/40 text-center py-6">Nenhuma tarefa aqui</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
