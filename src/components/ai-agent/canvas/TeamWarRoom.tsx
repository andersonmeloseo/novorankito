import { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
  MarkerType,
  BackgroundVariant,
  Panel,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2, XCircle, Loader2, MessageSquare,
  X, Maximize2, Minimize2, Send, Zap, Users, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────── */
interface AgentNodeData {
  roleId: string;
  title: string;
  emoji: string;
  department: string;
  status: "idle" | "waiting" | "running" | "success" | "error";
  result?: string;
  isRunning?: boolean; // overall run is active
}

interface ConvoMessage {
  id: string;
  fromId: string;
  fromEmoji: string;
  fromTitle: string;
  toId?: string;
  toEmoji?: string;
  toTitle?: string;
  content: string;
  type: "message" | "report" | "error";
  ts: number;
}

/* ─── Status helpers ───────────────────────────────────────── */
const STATUS_RING: Record<string, string> = {
  idle: "border-border",
  waiting: "border-amber-400/60 animate-pulse",
  running: "border-blue-400 shadow-blue-400/40 shadow-lg",
  success: "border-emerald-500 shadow-emerald-500/30 shadow-md",
  error: "border-destructive shadow-destructive/30 shadow-md",
};

const STATUS_DOT: Record<string, string> = {
  idle: "bg-muted-foreground/40",
  waiting: "bg-amber-400 animate-pulse",
  running: "bg-blue-400",
  success: "bg-emerald-500",
  error: "bg-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "standby",
  waiting: "aguardando…",
  running: "executando…",
  success: "✓ concluído",
  error: "✗ falhou",
};

const STATUS_LABEL_COLOR: Record<string, string> = {
  idle: "text-muted-foreground",
  waiting: "text-amber-400",
  running: "text-blue-400",
  success: "text-emerald-400",
  error: "text-destructive",
};

/* ─── Agent Node ───────────────────────────────────────────── */
const AgentNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as AgentNodeData;
  const status = d.status || "idle";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 px-3 py-3 rounded-2xl border-2 bg-card min-w-[110px] max-w-[130px] cursor-grab active:cursor-grabbing transition-all duration-300",
        STATUS_RING[status],
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {/* Pulsing glow ring for running */}
      {status === "running" && (
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/40 animate-ping pointer-events-none" />
      )}

      {/* TOP HANDLE */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-2 !border-background"
      />
      {/* LEFT HANDLE */}
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-2 !border-background"
      />
      {/* RIGHT SOURCE */}
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-primary/70 !border-2 !border-background"
      />

      {/* Avatar circle */}
      <div className={cn(
        "relative h-12 w-12 rounded-full border-2 flex items-center justify-center text-2xl transition-all duration-300 bg-card",
        STATUS_RING[status],
      )}>
        {d.emoji}
        {/* Status dot */}
        <span className={cn(
          "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background transition-colors",
          STATUS_DOT[status],
        )} />
        {/* Spinner overlay */}
        {status === "running" && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-blue-500/10">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-center space-y-0.5">
        <p className="text-[10px] font-bold leading-tight line-clamp-2">{d.title}</p>
        <p className="text-[8px] text-muted-foreground">{d.department}</p>
        <p className={cn("text-[9px] font-semibold", STATUS_LABEL_COLOR[status])}>
          {STATUS_LABEL[status]}
        </p>
      </div>

      {/* Result preview */}
      {d.result && status === "success" && (
        <div className="w-full mt-1 px-1.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-[7px] text-emerald-400 line-clamp-3 leading-relaxed">{d.result}</p>
        </div>
      )}
      {d.result && status === "error" && (
        <div className="w-full mt-1 px-1.5 py-1 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-[7px] text-destructive line-clamp-2">{d.result.slice(0, 80)}</p>
        </div>
      )}

      {/* BOTTOM SOURCE */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-primary/70 !border-2 !border-background"
      />
    </div>
  );
});
AgentNode.displayName = "AgentNode";

const nodeTypes = { agentNode: AgentNode };

/* ─── Layout builder ───────────────────────────────────────── */
const H_GAP = 200;
const V_GAP = 160;

function buildNodesAndEdges(
  roles: any[],
  hierarchy: Record<string, string>,
  agentResults: Record<string, any>,
  lastRun: any,
) {
  const getDepth = (id: string, d = 0): number => {
    if (id === "ceo" || d > 8) return d;
    const p = hierarchy[id];
    return p ? getDepth(p, d + 1) : d;
  };

  // Group by depth
  const depthMap = new Map<number, any[]>();
  roles.forEach(r => {
    const d = getDepth(r.id);
    if (!depthMap.has(d)) depthMap.set(d, []);
    depthMap.get(d)!.push(r);
  });

  const nodePositions = new Map<string, { x: number; y: number }>();
  Array.from(depthMap.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([depth, dRoles]) => {
      const totalW = dRoles.length * H_GAP;
      dRoles.forEach((r, i) => {
        nodePositions.set(r.id, {
          x: i * H_GAP - totalW / 2 + H_GAP / 2,
          y: depth * V_GAP,
        });
      });
    });

  const getStatus = (roleId: string): AgentNodeData["status"] => {
    if (!lastRun) return "idle";
    const ar = agentResults[roleId];
    if (!ar) return lastRun.status === "running" ? "waiting" : "idle";
    if (ar.status === "success") return "success";
    if (ar.status === "error") return "error";
    return "running";
  };

  const rfNodes = roles.map(r => ({
    id: r.id,
    type: "agentNode",
    position: nodePositions.get(r.id) || { x: 0, y: 0 },
    data: {
      roleId: r.id,
      title: r.title,
      emoji: r.emoji,
      department: r.department || "",
      status: getStatus(r.id),
      result: agentResults[r.id]?.result
        ? String(agentResults[r.id].result).slice(0, 120)
        : undefined,
    } as unknown as Record<string, unknown>,
    draggable: true,
  }));

  // Build edges from hierarchy
  const rfEdges = roles
    .filter(r => r.id !== "ceo")
    .map(r => {
      const parentId = hierarchy[r.id] || "ceo";
      const childStatus = getStatus(r.id);
      const isActive = childStatus === "running" || (lastRun?.status === "running");
      const isSuccess = childStatus === "success";

      return {
        id: `e-${parentId}-${r.id}`,
        source: parentId,
        target: r.id,
        animated: isActive || isSuccess,
        type: "smoothstep",
        style: {
          stroke: isSuccess
            ? "hsl(142, 71%, 45%)"
            : isActive
              ? "hsl(217, 91%, 60%)"
              : "hsl(var(--border))",
          strokeWidth: isSuccess || isActive ? 2.5 : 1.5,
          strokeDasharray: isActive ? undefined : "4 3",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSuccess
            ? "hsl(142, 71%, 45%)"
            : isActive
              ? "hsl(217, 91%, 60%)"
              : "hsl(var(--muted-foreground))",
          width: 16,
          height: 16,
        },
        label: isSuccess ? "✓ relatório enviado" : undefined,
        labelStyle: {
          fontSize: 8,
          fill: "hsl(142, 71%, 45%)",
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: "hsl(var(--card))",
          fillOpacity: 0.9,
        },
      };
    });

  return { rfNodes, rfEdges };
}

/* ─── Message builder ──────────────────────────────────────── */
function buildMessages(
  depRuns: any[],
  roles: any[],
  hierarchy: Record<string, string>,
): ConvoMessage[] {
  const msgs: ConvoMessage[] = [];
  const lastRun = depRuns[0];
  if (!lastRun) return msgs;

  const roleMap = new Map(roles.map(r => [r.id, r]));
  const results: any[] = (lastRun.agent_results as any[]) || [];

  results.forEach((ar, i) => {
    const parentId = hierarchy[ar.role_id];
    const parent = parentId ? roleMap.get(parentId) : undefined;

    if (ar.status === "success" && ar.result) {
      msgs.push({
        id: `m-${i}`,
        fromId: ar.role_id,
        fromEmoji: ar.emoji || "🤖",
        fromTitle: ar.role_title,
        toId: parentId,
        toEmoji: parent?.emoji,
        toTitle: parent?.title,
        content: String(ar.result).slice(0, 200),
        type: "message",
        ts: new Date(lastRun.started_at).getTime() + i * 1000,
      });
    } else if (ar.status === "error") {
      msgs.push({
        id: `err-${i}`,
        fromId: ar.role_id,
        fromEmoji: ar.emoji || "🤖",
        fromTitle: ar.role_title,
        content: `Falha: ${ar.result || "erro desconhecido"}`,
        type: "error",
        ts: new Date(lastRun.started_at).getTime() + i * 1000,
      });
    }
  });

  if (lastRun.summary && !lastRun.summary.includes("AI error")) {
    msgs.push({
      id: `ceo-sum`,
      fromId: "ceo",
      fromEmoji: "👔",
      fromTitle: "CEO / Diretor",
      content: String(lastRun.summary).slice(0, 400),
      type: "report",
      ts: lastRun.completed_at
        ? new Date(lastRun.completed_at).getTime()
        : Date.now(),
    });
  }

  return msgs.sort((a, b) => a.ts - b.ts);
}

/* ─── Reorganize Button (needs ReactFlow context) ──────────── */
function ReorganizeButton({
  roles, hierarchy, agentResults, lastRun, setNodes,
}: {
  roles: any[];
  hierarchy: Record<string, string>;
  agentResults: Record<string, any>;
  lastRun: any;
  setNodes: (nodes: any[]) => void;
}) {
  const { fitView } = useReactFlow();

  const handleReorganize = useCallback(() => {
    const { rfNodes } = buildNodesAndEdges(roles, hierarchy, agentResults, lastRun);
    setNodes(rfNodes);
    setTimeout(() => fitView({ padding: 0.25, duration: 500 }), 50);
  }, [roles, hierarchy, agentResults, lastRun, setNodes, fitView]);

  return (
    <Button
      variant="outline"
      size="sm"
      className="absolute top-3 right-3 z-10 h-7 text-[10px] gap-1.5 px-2 bg-card/90 backdrop-blur-sm"
      onClick={handleReorganize}
      title="Reorganizar por hierarquia"
    >
      <LayoutDashboard className="h-3 w-3" />
      Reorganizar
    </Button>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
interface TeamWarRoomProps {
  deployment: any;
  runs: any[];
  onClose: () => void;
  onRunNow?: () => void;
  isRunning?: boolean;
}

export function TeamWarRoom({ deployment, runs, onClose, onRunNow, isRunning }: TeamWarRoomProps) {
  const [expanded, setExpanded] = useState(false);

  const roles: any[] = useMemo(() => (deployment.roles as any[]) || [], [deployment.roles]);
  const hierarchy: Record<string, string> = useMemo(
    () => (deployment.hierarchy as Record<string, string>) || {},
    [deployment.hierarchy],
  );

  const depRuns = useMemo(() => runs.filter(r => r.deployment_id === deployment.id), [runs, deployment.id]);
  const lastRun = depRuns[0];

  const agentResults = useMemo(() => {
    const map: Record<string, any> = {};
    if (lastRun) {
      ((lastRun.agent_results as any[]) || []).forEach((ar: any) => {
        map[ar.role_id] = ar;
      });
    }
    return map;
  }, [lastRun]);

  const { rfNodes: initialNodes, rfEdges: initialEdges } = useMemo(
    () => buildNodesAndEdges(roles, hierarchy, agentResults, lastRun),
    [roles, hierarchy, agentResults, lastRun],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes/edges when run data changes
  useEffect(() => {
    const { rfNodes, rfEdges } = buildNodesAndEdges(roles, hierarchy, agentResults, lastRun);
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [roles, hierarchy, agentResults, lastRun]);

  const messages = useMemo(
    () => buildMessages(depRuns, roles, hierarchy),
    [depRuns, roles, hierarchy],
  );

  const successCount = Object.values(agentResults).filter((a: any) => a.status === "success").length;
  const totalAgents = roles.length;
  const runStatus = lastRun?.status;

  return (
    <div
      className={cn(
        "mt-3 rounded-xl border border-border overflow-hidden transition-all duration-300 bg-background",
        expanded ? "fixed inset-3 z-50 border-primary/40 shadow-2xl flex flex-col" : "flex flex-col",
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
            runStatus === "running"
              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
              : runStatus === "completed"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-muted/30 text-muted-foreground border-border",
          )}>
            {runStatus === "running" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            {runStatus === "completed" && <Zap className="h-2.5 w-2.5" />}
            {!lastRun && <Users className="h-2.5 w-2.5" />}
            {runStatus === "running" ? "Em execução" : runStatus === "completed" ? "Concluído" : "Standby"}
          </div>
          <span className="text-xs font-bold">🏢 {deployment.name}</span>
          {lastRun && (
            <Badge variant="outline" className="text-[9px]">
              {successCount}/{totalAgents} agentes ✓
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {onRunNow && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={onRunNow} disabled={isRunning}>
              {isRunning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
              Executar agora
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

      {/* ── Body: Canvas + Feed ── */}
      <div className={cn(
        "grid flex-1 min-h-0",
        expanded ? "grid-cols-[1fr_360px] h-[calc(100%-48px)]" : "grid-cols-1",
      )}>

        {/* ReactFlow Canvas */}
        <div className={cn(
          "relative",
          expanded ? "h-full" : "h-[620px]",
        )}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.3}
            maxZoom={2}
            className="!bg-background"
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="hsl(var(--border))"
            />
            <Controls className="!bg-card !border-border !shadow-lg" showInteractive={false} />
            {/* Reorganize button inside ReactFlow context */}
            <Panel position="top-right">
              <ReorganizeButton
                roles={roles}
                hierarchy={hierarchy}
                agentResults={agentResults}
                lastRun={lastRun}
                setNodes={setNodes}
              />
            </Panel>
            {expanded && (
              <MiniMap
                className="!bg-card !border-border"
                nodeColor={(n) => {
                  const d = n.data as unknown as AgentNodeData;
                  const m: Record<string, string> = {
                    success: "#22c55e",
                    error: "#ef4444",
                    running: "#3b82f6",
                    waiting: "#f59e0b",
                    idle: "#6b7280",
                  };
                  return m[d?.status] || "#6b7280";
                }}
              />
            )}

            {/* Running overlay banner */}
            {runStatus === "running" && (
              <Panel position="top-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm">
                  <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                  <span className="text-[11px] font-semibold text-blue-400">Equipe em reunião — processando…</span>
                  <div className="flex gap-0.5 ml-1">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </Panel>
            )}

            {runStatus === "completed" && (
              <Panel position="top-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-400">
                    Execução concluída — {successCount}/{totalAgents} agentes bem-sucedidos
                  </span>
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-card/90 border border-border backdrop-blur-sm">
            {[
              { label: "Standby", color: "bg-muted-foreground/40" },
              { label: "Executando", color: "bg-blue-400" },
              { label: "Concluído", color: "bg-emerald-500" },
              { label: "Falhou", color: "bg-destructive" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={cn("h-2 w-2 rounded-full", l.color)} />
                <span className="text-[9px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation feed — only shown when expanded */}
        {expanded && (
          <div className="flex flex-col border-l border-border h-full">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50 shrink-0">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                Chat da Equipe
              </p>
              {messages.length > 0 && (
                <Badge variant="secondary" className="text-[8px]">{messages.length}</Badge>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2.5">
                {messages.length === 0 && (
                  <div className="py-10 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">
                      {runStatus === "running"
                        ? "Agentes processando… as mensagens aparecerão aqui."
                        : "Execute a equipe para ver os agentes em ação."}
                    </p>
                  </div>
                )}

                {runStatus === "running" && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold text-blue-400">Equipe em reunião…</p>
                      <p className="text-[9px] text-muted-foreground">Análise em andamento</p>
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-xl border p-2.5 space-y-1.5",
                      msg.type === "report" ? "bg-primary/5 border-primary/20" :
                        msg.type === "error" ? "bg-destructive/5 border-destructive/20" :
                          "bg-card/60 border-border",
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm leading-none">{msg.fromEmoji}</span>
                      <span className="text-[10px] font-bold">{msg.fromTitle}</span>
                      {msg.toId && msg.toTitle && (
                        <>
                          <span className="text-[9px] text-muted-foreground">→</span>
                          <span className="text-sm leading-none">{msg.toEmoji}</span>
                          <span className="text-[10px] text-muted-foreground">{msg.toTitle}</span>
                        </>
                      )}
                      {msg.type === "report" && (
                        <Badge variant="secondary" className="text-[7px] ml-auto">📝 CEO</Badge>
                      )}
                      {msg.type === "error" && (
                        <XCircle className="h-3 w-3 text-destructive ml-auto" />
                      )}
                    </div>
                    {/* Content */}
                    <p className="text-[10px] text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-6">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Collapsed: show mini feed below canvas */}
      {!expanded && messages.length > 0 && (
        <div className="border-t border-border bg-card/40">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
              Últimas mensagens da equipe
            </p>
          </div>
          <ScrollArea className="max-h-44">
            <div className="p-2.5 space-y-1.5">
              {messages.slice(-5).map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2 items-start rounded-lg border px-2.5 py-1.5",
                    msg.type === "report" ? "bg-primary/5 border-primary/20" :
                      msg.type === "error" ? "bg-destructive/5 border-destructive/20" :
                        "bg-card/50 border-border/60",
                  )}
                >
                  <span className="text-base leading-none mt-0.5 shrink-0">{msg.fromEmoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[9px] font-bold">{msg.fromTitle}</span>
                      {msg.toTitle && (
                        <span className="text-[9px] text-muted-foreground">→ {msg.toEmoji} {msg.toTitle}</span>
                      )}
                    </div>
                    <p className="text-[9px] text-foreground/70 line-clamp-2 leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
