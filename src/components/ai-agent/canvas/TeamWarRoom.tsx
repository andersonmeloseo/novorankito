import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, Loader2, MessageSquare,
  ArrowRight, X, Maximize2, Minimize2, Users,
  Send, Clock, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentResult {
  role_id: string;
  role_title: string;
  emoji: string;
  status: "success" | "error" | "running" | "waiting";
  result?: string;
}

interface OrchestratorRun {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  agent_results: AgentResult[];
  summary?: string;
  deployment_id: string;
}

interface RoleConfig {
  id: string;
  title: string;
  emoji: string;
}

interface TeamWarRoomProps {
  deployment: any;
  runs: any[];
  onClose: () => void;
  onRunNow?: () => void;
  isRunning?: boolean;
}

interface Message {
  id: string;
  from: string;
  fromEmoji: string;
  to?: string;
  toEmoji?: string;
  content: string;
  timestamp: Date;
  type: "message" | "result" | "report";
}

const STATUS_ICON_MAP: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />,
  waiting: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  idle: <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 bg-muted/20" />,
};

const STATUS_COLOR: Record<string, string> = {
  success: "border-emerald-500/40 bg-emerald-500/5",
  error: "border-destructive/40 bg-destructive/5",
  running: "border-blue-500/40 bg-blue-500/5 animate-pulse",
  waiting: "border-muted-foreground/20 bg-muted/10",
  idle: "border-border bg-card/50",
};

const RING_COLOR: Record<string, string> = {
  success: "ring-emerald-500/50",
  error: "ring-destructive/50",
  running: "ring-blue-400/70",
  waiting: "ring-muted-foreground/20",
  idle: "ring-border/30",
};

/** Pull conversation-style messages from agent_results */
function buildMessages(runs: any[], roles: RoleConfig[], hierarchy: Record<string, string>): Message[] {
  const msgs: Message[] = [];
  const lastRun = runs[0];
  if (!lastRun) return msgs;

  const results: AgentResult[] = (lastRun.agent_results as any[]) || [];
  const roleMap = new Map(roles.map(r => [r.id, r]));

  // Simulate conversation flow based on hierarchy
  results.forEach((ar, i) => {
    const parentId = hierarchy[ar.role_id];
    const parent = parentId ? roleMap.get(parentId) : null;

    // Agent reports up to parent
    if (parent && ar.status === "success" && ar.result) {
      msgs.push({
        id: `msg-${ar.role_id}-${i}`,
        from: ar.role_title,
        fromEmoji: ar.emoji,
        to: parent.title,
        toEmoji: parent.emoji,
        content: ar.result.length > 180 ? ar.result.slice(0, 180) + "…" : ar.result,
        timestamp: new Date(lastRun.started_at),
        type: "message",
      });
    } else if (ar.status === "error") {
      msgs.push({
        id: `err-${ar.role_id}-${i}`,
        from: ar.role_title,
        fromEmoji: ar.emoji,
        content: `⚠️ Falha na execução: ${ar.result || "Erro desconhecido"}`,
        timestamp: new Date(lastRun.started_at),
        type: "result",
      });
    }
  });

  // CEO summary
  if (lastRun.summary && !lastRun.summary.includes("AI error")) {
    msgs.push({
      id: `summary-${lastRun.id}`,
      from: "CEO / Diretor",
      fromEmoji: "👔",
      content: lastRun.summary.length > 300 ? lastRun.summary.slice(0, 300) + "…" : lastRun.summary,
      timestamp: lastRun.completed_at ? new Date(lastRun.completed_at) : new Date(),
      type: "report",
    });
  }

  return msgs;
}

export function TeamWarRoom({ deployment, runs, onClose, onRunNow, isRunning }: TeamWarRoomProps) {
  const [expanded, setExpanded] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const roles: RoleConfig[] = (deployment.roles as any[]) || [];
  const hierarchy: Record<string, string> = (deployment.hierarchy as Record<string, string>) || {};
  const lastRun = runs.filter(r => r.deployment_id === deployment.id)[0];
  const depRuns = runs.filter(r => r.deployment_id === deployment.id);

  // Build agent statuses from last run
  const agentResults: Record<string, AgentResult & { status: string }> = {};
  if (lastRun) {
    ((lastRun.agent_results as any[]) || []).forEach((ar: any) => {
      agentResults[ar.role_id] = ar;
    });
  }

  const getStatus = (roleId: string): string => {
    if (!lastRun) return "idle";
    const ar = agentResults[roleId];
    if (!ar) return lastRun.status === "running" ? "waiting" : "idle";
    return ar.status || "idle";
  };

  // Build conversation messages
  const messages = buildMessages(depRuns, roles, hierarchy);

  // Group roles by depth for layout
  const getDepth = (roleId: string, depth = 0): number => {
    if (roleId === "ceo" || depth > 5) return depth;
    const parentId = hierarchy[roleId];
    if (!parentId) return depth;
    return getDepth(parentId, depth + 1);
  };

  const depthGroups: Map<number, RoleConfig[]> = new Map();
  roles.forEach(role => {
    const d = getDepth(role.id);
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(role);
  });
  const maxDepth = Math.max(...Array.from(depthGroups.keys()));

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages.length]);

  const successCount = Object.values(agentResults).filter(a => a.status === "success").length;
  const totalAgents = roles.length;

  return (
    <div className={cn(
      "mt-3 rounded-xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden transition-all duration-300",
      expanded ? "fixed inset-4 z-50 border-primary/30 shadow-2xl" : ""
    )}>
      {/* War room header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/60">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold",
            lastRun?.status === "running"
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              : lastRun?.status === "completed"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-muted/30 text-muted-foreground border border-border"
          )}>
            {lastRun?.status === "running" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            {lastRun?.status === "completed" && <Zap className="h-2.5 w-2.5" />}
            {!lastRun && <Users className="h-2.5 w-2.5" />}
            {lastRun?.status === "running" ? "Em execução" : lastRun?.status === "completed" ? "Concluído" : "Em standby"}
          </div>
          <span className="text-xs font-semibold text-foreground">🏢 War Room — {deployment.name}</span>
          {lastRun && (
            <Badge variant="outline" className="text-[9px]">
              {successCount}/{totalAgents} agentes ✓
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {onRunNow && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1 px-2"
              onClick={onRunNow}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
              Executar
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(e => !e)}>
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className={cn("grid", expanded ? "grid-cols-2 h-[calc(100%-53px)]" : "grid-cols-1")}>
        {/* Agent nodes visualization */}
        <div className={cn("p-4 overflow-auto", expanded ? "border-r border-border" : "")}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Hierarquia de Agentes
          </p>
          <div className="space-y-4">
            {Array.from(depthGroups.entries())
              .sort(([a], [b]) => a - b)
              .map(([depth, depthRoles]) => (
                <div key={depth}>
                  {/* Depth connector line */}
                  {depth > 0 && (
                    <div className="flex items-center gap-2 mb-2 ml-4">
                      <div className="h-4 w-px bg-border ml-3" />
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                      <span className="text-[9px] text-muted-foreground">
                        {depth === 1 ? "Reporta ao CEO" : `Nível ${depth + 1}`}
                      </span>
                    </div>
                  )}
                  <div className={cn(
                    "flex flex-wrap gap-2",
                    depth > 0 ? "pl-6" : ""
                  )}>
                    {depthRoles.map(role => {
                      const status = getStatus(role.id);
                      const ar = agentResults[role.id];
                      const isCurrentlyRunning = lastRun?.status === "running" && !ar;

                      return (
                        <div
                          key={role.id}
                          className={cn(
                            "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center min-w-[90px] max-w-[110px] transition-all duration-500",
                            STATUS_COLOR[status] || STATUS_COLOR.idle,
                            isCurrentlyRunning && "border-blue-500/40 bg-blue-500/5"
                          )}
                        >
                          {/* Animated ring for running status */}
                          {(status === "running" || isCurrentlyRunning) && (
                            <div className={cn(
                              "absolute inset-0 rounded-xl ring-2 ring-blue-400/50 animate-pulse"
                            )} />
                          )}

                          {/* Agent avatar */}
                          <div className={cn(
                            "relative h-10 w-10 rounded-full border-2 flex items-center justify-center text-xl ring-2",
                            status === "success" ? "border-emerald-500/50" : status === "error" ? "border-destructive/50" : status === "running" || isCurrentlyRunning ? "border-blue-400/50" : "border-border",
                            RING_COLOR[status] || RING_COLOR.idle
                          )}>
                            {role.emoji}
                            {/* Status indicator dot */}
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card flex items-center justify-center",
                              status === "success" ? "bg-emerald-500" : status === "error" ? "bg-destructive" : status === "running" || isCurrentlyRunning ? "bg-blue-400" : "bg-muted-foreground/30"
                            )}>
                              {(status === "running" || isCurrentlyRunning) && (
                                <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              )}
                            </div>
                          </div>

                          {/* Name & status */}
                          <div>
                            <p className="text-[9px] font-semibold leading-tight line-clamp-2">{role.title}</p>
                            <p className={cn(
                              "text-[8px] mt-0.5 font-medium",
                              status === "success" ? "text-emerald-400" :
                                status === "error" ? "text-destructive" :
                                  (status === "running" || isCurrentlyRunning) ? "text-blue-400" :
                                    "text-muted-foreground"
                            )}>
                              {isCurrentlyRunning ? "aguardando…" :
                                status === "success" ? "✓ concluído" :
                                  status === "error" ? "✗ falhou" :
                                    status === "running" ? "executando…" : "standby"}
                            </p>
                          </div>

                          {/* Quick result preview */}
                          {ar?.result && ar.status === "success" && (
                            <div className="w-full mt-1 px-1.5 py-1 rounded bg-emerald-500/10 text-[7px] text-emerald-400 leading-tight line-clamp-2">
                              {ar.result.slice(0, 60)}…
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          {/* Run stats */}
          {depRuns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Últimas Execuções
              </p>
              <div className="space-y-1">
                {depRuns.slice(0, 5).map((run: any) => {
                  const results = (run.agent_results as any[]) || [];
                  const ok = results.filter((r: any) => r.status === "success").length;
                  return (
                    <div key={run.id} className="flex items-center gap-2 text-[10px]">
                      {run.status === "running" ? (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-400 shrink-0" />
                      ) : run.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      <span className="text-muted-foreground">
                        {new Date(run.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Badge variant="outline" className="text-[8px] ml-auto">
                        {ok}/{results.length} ✓
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Conversation feed */}
        <div className={cn("flex flex-col", expanded ? "" : "border-t border-border")}>
          <div className="px-4 py-2.5 border-b border-border bg-background/40 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Feed de Atividade
            </p>
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-[8px] ml-auto">
                {messages.length} mensagens
              </Badge>
            )}
          </div>

          <ScrollArea className={cn("flex-1", expanded ? "h-[calc(100%-36px)]" : "max-h-72")}>
            <div ref={feedRef} className="p-3 space-y-2.5">
              {messages.length === 0 && (
                <div className="py-8 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">
                    {lastRun?.status === "running"
                      ? "Agentes executando... as mensagens aparecerão aqui."
                      : "Execute a equipe para ver os agentes em ação."}
                  </p>
                </div>
              )}

              {/* Running indicator */}
              {lastRun?.status === "running" && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-blue-400">Equipe em reunião…</p>
                    <p className="text-[9px] text-muted-foreground">Os agentes estão processando e trocando informações</p>
                  </div>
                  <div className="flex gap-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-lg border p-2.5 transition-all",
                    msg.type === "report"
                      ? "bg-primary/5 border-primary/20"
                      : msg.type === "result"
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-card/50 border-border"
                  )}
                >
                  {/* Message header */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">{msg.fromEmoji}</span>
                    <span className="text-[10px] font-semibold">{msg.from}</span>
                    {msg.to && (
                      <>
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-sm">{msg.toEmoji}</span>
                        <span className="text-[10px] text-muted-foreground">{msg.to}</span>
                      </>
                    )}
                    {msg.type === "report" && (
                      <Badge variant="secondary" className="text-[7px] ml-auto">📝 Relatório Executivo</Badge>
                    )}
                  </div>

                  {/* Message content */}
                  <p className="text-[10px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
