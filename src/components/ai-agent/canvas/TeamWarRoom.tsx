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
  addEdge,
  type Connection,
  type OnConnectEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, Loader2, MessageSquare, X, Maximize2, Minimize2,
  Send, Zap, Users, LayoutDashboard, UserPlus, TrendingUp,
  FileText, Target, Lightbulb, HelpCircle, ListChecks, Plus, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TeamHubTab } from "./TeamHubTab";

/* ─── Role suggestions by hierarchy depth ─────────────────── */
const ROLE_SUGGESTIONS: Record<number, Array<{ title: string; emoji: string; department: string; instructions: string }>> = {
  0: [
    { title: "Gerente de SEO", emoji: "🔍", department: "SEO", instructions: "Você é o Gerente de SEO. Coordene estratégias de SEO, analise dados do Search Console e reporte diretamente ao CEO com insights estratégicos e resultados de posicionamento." },
    { title: "Gerente de Analytics", emoji: "📊", department: "Analytics", instructions: "Você é o Gerente de Analytics. Analise dados de desempenho do projeto no GA4, identifique tendências e apresente relatórios detalhados ao CEO." },
    { title: "Gerente de Conteúdo", emoji: "✍️", department: "Conteúdo", instructions: "Você é o Gerente de Conteúdo. Planeje e analise estratégia de conteúdo. Reporte ao CEO com métricas de engajamento e sugestões de melhoria." },
    { title: "Gerente de Growth", emoji: "🚀", department: "Growth", instructions: "Você é o Gerente de Growth. Identifique oportunidades de crescimento, analise dados de aquisição e reporte estratégias de crescimento ao CEO." },
    { title: "Gerente de Performance", emoji: "⚡", department: "Performance", instructions: "Você é o Gerente de Performance. Monitore métricas de performance do site, identifique gargalos e reporte ações de melhoria ao CEO." },
  ],
  1: [
    { title: "Especialista SEO On-Page", emoji: "📝", department: "SEO", instructions: "Você é o Especialista em SEO On-Page. Analise títulos, meta descriptions, headings e conteúdo. Reporte ao seu gerente com oportunidades de otimização." },
    { title: "Especialista Link Building", emoji: "🔗", department: "SEO", instructions: "Você é o Especialista em Link Building. Analise perfil de backlinks, identifique oportunidades e riscos. Reporte estratégias ao seu gerente." },
    { title: "Analista de Dados", emoji: "📈", department: "Analytics", instructions: "Você é o Analista de Dados. Analise profundamente os dados do projeto, identifique padrões e anomalias. Reporte insights ao seu gerente." },
    { title: "Especialista GA4", emoji: "📉", department: "Analytics", instructions: "Você é o Especialista em GA4. Monitore dados do Google Analytics 4, analise eventos e metas. Reporte métricas-chave ao seu gerente." },
    { title: "Copywriter Estratégico", emoji: "✏️", department: "Conteúdo", instructions: "Você é o Copywriter Estratégico. Analise o conteúdo existente, identifique oportunidades de melhoria de copy e CTAs. Reporte sugestões ao seu gerente." },
    { title: "Especialista CRO", emoji: "🎯", department: "CRO", instructions: "Você é o Especialista em CRO. Analise taxas de conversão, identifique pontos de fricção e sugira testes A/B. Reporte ao seu gerente com hipóteses." },
    { title: "Especialista em Ads", emoji: "📣", department: "Ads", instructions: "Você é o Especialista em Ads. Analise campanhas pagas, ROAS e métricas. Reporte otimizações ao seu gerente." },
    { title: "Especialista E-commerce", emoji: "🛒", department: "E-commerce", instructions: "Você é o Especialista em E-commerce. Analise métricas de vendas e abandono de carrinho. Reporte insights ao seu gerente." },
  ],
  2: [
    { title: "Analista Junior", emoji: "🎓", department: "Geral", instructions: "Você é um Analista Junior. Execute análises básicas, colete dados e reporte ao seu superior com findings organizados." },
    { title: "Assistente de Conteúdo", emoji: "📋", department: "Conteúdo", instructions: "Você é o Assistente de Conteúdo. Auxilie com análise de conteúdo e pesquisa de palavras-chave. Reporte ao seu superior." },
    { title: "Monitor de SEO", emoji: "🔎", department: "SEO", instructions: "Você é o Monitor de SEO. Acompanhe rankings e alertas de erros técnicos. Reporte irregularidades ao seu superior." },
  ],
};

/* ─── Types ────────────────────────────────────────────────── */
interface AgentNodeData {
  roleId: string;
  title: string;
  emoji: string;
  department: string;
  status: "idle" | "waiting" | "running" | "success" | "error";
  result?: string;
  onDelete?: (id: string) => void;
  onPromote?: (id: string) => void;
  isEditable?: boolean;
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
  const [hovered, setHovered] = useState(false);
  const status = d.status || "idle";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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

      {/* Delete button (hover, not CEO) */}
      {hovered && d.isEditable && d.onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); d.onDelete!(d.roleId); }}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center z-10 hover:scale-110 transition-transform shadow-sm"
          title="Demitir membro"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Promote button (hover) */}
      {hovered && d.isEditable && d.onPromote && (
        <button
          onClick={(e) => { e.stopPropagation(); d.onPromote!(d.roleId); }}
          className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center z-10 hover:scale-110 transition-transform shadow-sm"
          title="Promover membro (subir na hierarquia)"
        >
          <Star className="h-2.5 w-2.5" />
        </button>
      )}

      {/* TOP HANDLE */}
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-2 !border-background" />
      <Handle type="target" id="left" position={Position.Left} className="!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-2 !border-background" />
      <Handle type="source" id="right" position={Position.Right} className="!w-2.5 !h-2.5 !bg-primary/70 !border-2 !border-background" />

      {/* Avatar circle */}
      <div className={cn(
        "relative h-12 w-12 rounded-full border-2 flex items-center justify-center text-2xl transition-all duration-300 bg-card",
        STATUS_RING[status],
      )}>
        {d.emoji}
        <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background transition-colors", STATUS_DOT[status])} />
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
        <p className={cn("text-[9px] font-semibold", STATUS_LABEL_COLOR[status])}>{STATUS_LABEL[status]}</p>
      </div>

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

      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-primary/70 !border-2 !border-background" />
    </div>
  );
});
AgentNode.displayName = "AgentNode";

const nodeTypes = { agentNode: AgentNode };

/* ─── Hire Dialog ──────────────────────────────────────────── */
interface HireDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parentRole: any;
  parentDepth: number;
  onHire: (roleData: { title: string; emoji: string; department: string; instructions: string }, parentId: string) => Promise<void>;
}

function HireDialog({ open, onOpenChange, parentRole, parentDepth, onHire }: HireDialogProps) {
  const [selected, setSelected] = useState<any>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customEmoji, setCustomEmoji] = useState("🤖");
  const [customDept, setCustomDept] = useState("Geral");
  const [customInstructions, setCustomInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = ROLE_SUGGESTIONS[Math.min(parentDepth + 1, 2)] || ROLE_SUGGESTIONS[2];

  const handleConfirm = async () => {
    if (!parentRole) return;
    const roleData = customMode
      ? { title: customTitle, emoji: customEmoji, department: customDept, instructions: customInstructions }
      : selected;
    if (!roleData?.title) { toast.error("Selecione ou crie um papel"); return; }
    setLoading(true);
    try {
      await onHire(roleData, parentRole.id);
      onOpenChange(false);
      setSelected(null);
      setCustomMode(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Contratar Novo Membro
          </DialogTitle>
          {parentRole && (
            <DialogDescription>
              Reportará a: <span className="font-semibold text-foreground">{parentRole.emoji} {parentRole.title}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {!customMode ? (
            <>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Sugestões para este nível</p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => setSelected(s)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all hover:border-primary/60",
                      selected?.title === s.title
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card/60"
                    )}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <div>
                      <p className="text-[10px] font-semibold leading-tight">{s.title}</p>
                      <p className="text-[9px] text-muted-foreground">{s.department}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCustomMode(true)}
                className="text-xs text-primary hover:underline w-full text-center"
              >
                + Criar papel personalizado
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Papel personalizado</p>
              <div className="flex gap-2">
                <Input
                  value={customEmoji}
                  onChange={e => setCustomEmoji(e.target.value)}
                  className="w-16 text-center text-lg"
                  placeholder="🤖"
                />
                <Input
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Título do cargo"
                  className="flex-1"
                />
              </div>
              <Input
                value={customDept}
                onChange={e => setCustomDept(e.target.value)}
                placeholder="Departamento"
              />
              <Textarea
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                placeholder="Instruções para o agente (o que ele deve analisar e reportar)…"
                className="text-xs"
                rows={3}
              />
              <button
                onClick={() => setCustomMode(false)}
                className="text-xs text-muted-foreground hover:underline"
              >
                ← Voltar para sugestões
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">Cancelar</Button>
          <Button onClick={handleConfirm} size="sm" disabled={loading || (!customMode && !selected)}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
            Contratar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Reorganize Button ────────────────────────────────────── */
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
      className="h-7 text-[10px] gap-1.5 px-2.5 bg-card/90 backdrop-blur-sm"
      onClick={handleReorganize}
    >
      <LayoutDashboard className="h-3 w-3" />
      Reorganizar
    </Button>
  );
}

/* ─── Layout builder ───────────────────────────────────────── */
const H_GAP = 200;
const V_GAP = 160;

function buildNodesAndEdges(
  roles: any[],
  hierarchy: Record<string, string>,
  agentResults: Record<string, any>,
  lastRun: any,
  onDeleteNode?: (id: string) => void,
  onPromoteNode?: (id: string) => void,
) {
  const getDepth = (id: string, d = 0): number => {
    if (id === "ceo" || d > 8) return d;
    const p = hierarchy[id];
    return p ? getDepth(p, d + 1) : d;
  };

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

  const rfNodes = roles.map(r => {
    const isCeo = r.id === "ceo" || getDepth(r.id) === 0;
    return {
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
        onDelete: !isCeo ? onDeleteNode : undefined,
        onPromote: !isCeo ? onPromoteNode : undefined,
        isEditable: true,
      } as unknown as Record<string, unknown>,
      draggable: true,
    };
  });

  const rfEdges = roles
    .filter(r => r.id !== "ceo" && hierarchy[r.id])
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
          color: isSuccess ? "hsl(142, 71%, 45%)" : isActive ? "hsl(217, 91%, 60%)" : "hsl(var(--muted-foreground))",
          width: 16, height: 16,
        },
        label: isSuccess ? "✓ relatório enviado" : undefined,
        labelStyle: { fontSize: 8, fill: "hsl(142, 71%, 45%)", fontWeight: 600 },
        labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.9 },
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
        id: `m-${i}`, fromId: ar.role_id, fromEmoji: ar.emoji || "🤖", fromTitle: ar.role_title,
        toId: parentId, toEmoji: parent?.emoji, toTitle: parent?.title,
        content: String(ar.result).slice(0, 200), type: "message",
        ts: new Date(lastRun.started_at).getTime() + i * 1000,
      });
    } else if (ar.status === "error") {
      msgs.push({
        id: `err-${i}`, fromId: ar.role_id, fromEmoji: ar.emoji || "🤖", fromTitle: ar.role_title,
        content: `Falha: ${ar.result || "erro desconhecido"}`, type: "error",
        ts: new Date(lastRun.started_at).getTime() + i * 1000,
      });
    }
  });

  if (lastRun.summary && !lastRun.summary.includes("AI error")) {
    msgs.push({
      id: `ceo-sum`, fromId: "ceo", fromEmoji: "👔", fromTitle: "CEO / Diretor",
      content: String(lastRun.summary).slice(0, 400), type: "report",
      ts: lastRun.completed_at ? new Date(lastRun.completed_at).getTime() : Date.now(),
    });
  }

  return msgs.sort((a, b) => a.ts - b.ts);
}

/* ─── Main Component ───────────────────────────────────────── */
interface TeamWarRoomProps {
  deployment: any;
  runs: any[];
  onClose: () => void;
  onRunNow?: () => void;
  isRunning?: boolean;
  onRefresh?: () => void;
  projectId?: string;
}

export function TeamWarRoom({ deployment, runs, onClose, onRunNow, isRunning, onRefresh, projectId }: TeamWarRoomProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"canvas" | "hub">("canvas");
  const [hireOpen, setHireOpen] = useState(false);
  const [hireParentRole, setHireParentRole] = useState<any>(null);
  const [hireParentDepth, setHireParentDepth] = useState(0);

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
      ((lastRun.agent_results as any[]) || []).forEach((ar: any) => { map[ar.role_id] = ar; });
    }
    return map;
  }, [lastRun]);

  /* ── Hire/fire helpers ── */
  const getDepth = useCallback((id: string, d = 0): number => {
    if (id === "ceo" || d > 8) return d;
    const p = hierarchy[id];
    return p ? getDepth(p, d + 1) : d;
  }, [hierarchy]);

  const handleFireMember = useCallback(async (roleId: string) => {
    const updatedRoles = roles.filter(r => r.id !== roleId);
    const updatedHierarchy = { ...hierarchy };
    const firedParent = updatedHierarchy[roleId];
    delete updatedHierarchy[roleId];
    // Reassign children to grandparent
    Object.keys(updatedHierarchy).forEach(childId => {
      if (updatedHierarchy[childId] === roleId) {
        updatedHierarchy[childId] = firedParent || "ceo";
      }
    });
    const { error } = await supabase
      .from("orchestrator_deployments")
      .update({ roles: updatedRoles as any, hierarchy: updatedHierarchy as any })
      .eq("id", deployment.id);
    if (error) { toast.error(error.message); return; }
    const fired = roles.find(r => r.id === roleId);
    toast.success(`${fired?.emoji || ""} ${fired?.title || "Membro"} removido da equipe`);
    onRefresh?.();
  }, [roles, hierarchy, deployment.id, onRefresh]);

  const handleHireMember = useCallback(async (
    roleData: { title: string; emoji: string; department: string; instructions: string },
    parentId: string,
  ) => {
    const newRole = {
      id: `role-${Date.now()}`,
      title: roleData.title,
      emoji: roleData.emoji,
      department: roleData.department,
      instructions: roleData.instructions,
      routine: { frequency: "daily", at: "08:00" },
    };
    const updatedRoles = [...roles, newRole];
    const updatedHierarchy = { ...hierarchy, [newRole.id]: parentId };
    const { error } = await supabase
      .from("orchestrator_deployments")
      .update({ roles: updatedRoles as any, hierarchy: updatedHierarchy as any })
      .eq("id", deployment.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${roleData.emoji} ${roleData.title} contratado! Na próxima execução receberá o briefing completo.`);
    onRefresh?.();
    // Auto-trigger run for briefing
    setTimeout(() => onRunNow?.(), 500);
  }, [roles, hierarchy, deployment.id, onRefresh, onRunNow]);

  const handlePromoteMember = useCallback(async (roleId: string) => {
    const currentParentId = hierarchy[roleId];
    if (!currentParentId) return;
    const grandParentId = hierarchy[currentParentId];
    if (!grandParentId) { toast("Já está no nível mais alto possível"); return; }
    const updatedHierarchy = { ...hierarchy, [roleId]: grandParentId };
    await supabase
      .from("orchestrator_deployments")
      .update({ hierarchy: updatedHierarchy as any })
      .eq("id", deployment.id);
    const promoted = roles.find(r => r.id === roleId);
    toast.success(`⬆️ ${promoted?.emoji || ""} ${promoted?.title} promovido!`);
    onRefresh?.();
  }, [hierarchy, roles, deployment.id, onRefresh]);

  /* ── Build nodes/edges ── */
  const { rfNodes: initialNodes, rfEdges: initialEdges } = useMemo(
    () => buildNodesAndEdges(roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember),
    [roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { rfNodes, rfEdges } = buildNodesAndEdges(roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember);
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember]);

  const messages = useMemo(() => buildMessages(depRuns, roles, hierarchy), [depRuns, roles, hierarchy]);

  const successCount = Object.values(agentResults).filter((a: any) => a.status === "success").length;
  const totalAgents = roles.length;
  const runStatus = lastRun?.status;

  /* ── onConnect: update hierarchy ── */
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      const updatedHierarchy = { ...hierarchy, [connection.target]: connection.source };
      supabase
        .from("orchestrator_deployments")
        .update({ hierarchy: updatedHierarchy as any })
        .eq("id", deployment.id)
        .then(({ error }) => {
          if (!error) {
            toast.success("Hierarquia atualizada");
            onRefresh?.();
          }
        });
    }
    setEdges(eds => addEdge(connection, eds));
  }, [hierarchy, deployment.id, onRefresh, setEdges]);

  /* ── onConnectEnd: drag to empty = hire ── */
  const onConnectEnd: OnConnectEnd = useCallback((_, connectionState) => {
    if (!connectionState.isValid) {
      const sourceId = (connectionState as any).fromNode?.id;
      if (sourceId) {
        const sourceRole = roles.find(r => r.id === sourceId);
        const depth = getDepth(sourceId);
        setHireParentRole(sourceRole || null);
        setHireParentDepth(depth);
        setHireOpen(true);
      }
    }
  }, [roles, getDepth]);

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
            <Badge variant="outline" className="text-[9px]">{successCount}/{totalAgents} ✓</Badge>
          )}
          <Badge variant="outline" className="text-[9px] gap-1">
            <Users className="h-2.5 w-2.5" />
            {roles.length} membros
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {onRunNow && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={onRunNow} disabled={isRunning}>
              {isRunning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
              Executar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] gap-1 px-2"
            onClick={() => { setHireParentRole(roles[0] || null); setHireParentDepth(0); setHireOpen(true); }}
          >
            <UserPlus className="h-2.5 w-2.5" />
            Contratar
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(e => !e)}>
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "canvas" | "hub")} className="flex flex-col flex-1 min-h-0">
        <div className="px-4 pt-2 border-b border-border bg-card/40 shrink-0">
          <TabsList className="h-7 gap-1 bg-transparent p-0">
            <TabsTrigger value="canvas" className="h-6 text-[10px] px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              🖥️ Canvas
            </TabsTrigger>
            <TabsTrigger value="hub" className="h-6 text-[10px] px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              📋 Team Hub
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Canvas Tab ── */}
        <TabsContent value="canvas" className="flex-1 min-h-0 m-0">
          <div className={cn(
            "grid flex-1 min-h-0",
            expanded ? "grid-cols-[1fr_360px] h-[calc(100%-0px)]" : "grid-cols-1",
          )}>
            {/* ReactFlow Canvas */}
            <div className={cn("relative", expanded ? "h-full" : "h-[640px]")}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                minZoom={0.3}
                maxZoom={2}
                className="!bg-background"
                deleteKeyCode={null}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
                <Controls className="!bg-card !border-border !shadow-lg" showInteractive={false} />

                <Panel position="top-right">
                  <div className="flex flex-col gap-1.5">
                    <ReorganizeButton
                      roles={roles}
                      hierarchy={hierarchy}
                      agentResults={agentResults}
                      lastRun={lastRun}
                      setNodes={setNodes}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1.5 px-2.5 bg-card/90 backdrop-blur-sm"
                      onClick={() => { setHireParentRole(roles[0] || null); setHireParentDepth(0); setHireOpen(true); }}
                    >
                      <UserPlus className="h-3 w-3" />
                      Contratar membro
                    </Button>
                  </div>
                </Panel>

                {expanded && (
                  <MiniMap
                    className="!bg-card !border-border"
                    nodeColor={(n) => {
                      const d = n.data as unknown as AgentNodeData;
                      const m: Record<string, string> = { success: "#22c55e", error: "#ef4444", running: "#3b82f6", waiting: "#f59e0b", idle: "#6b7280" };
                      return m[d?.status] || "#6b7280";
                    }}
                  />
                )}

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
                <div className="border-l border-border pl-3 text-[9px] text-muted-foreground">
                  💡 Arraste de um nó para contratar subordinado
                </div>
              </div>
            </div>

            {/* Conversation feed — expanded only */}
            {expanded && (
              <div className="flex flex-col border-l border-border h-full">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50 shrink-0">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">Chat da Equipe</p>
                  {messages.length > 0 && <Badge variant="secondary" className="text-[8px]">{messages.length}</Badge>}
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2.5">
                    {messages.length === 0 && (
                      <div className="py-10 text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                        <p className="text-xs text-muted-foreground">
                          {runStatus === "running" ? "Processando…" : "Execute a equipe para ver os agentes em ação."}
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
                      <div key={msg.id} className={cn(
                        "rounded-xl border p-2.5 space-y-1.5",
                        msg.type === "report" ? "bg-primary/5 border-primary/20" :
                          msg.type === "error" ? "bg-destructive/5 border-destructive/20" :
                            "bg-card/60 border-border",
                      )}>
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
                          {msg.type === "report" && <Badge variant="secondary" className="text-[7px] ml-auto">📝 CEO</Badge>}
                          {msg.type === "error" && <XCircle className="h-3 w-3 text-destructive ml-auto" />}
                        </div>
                        <p className="text-[10px] text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-6">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Collapsed: mini feed */}
          {!expanded && messages.length > 0 && (
            <div className="border-t border-border bg-card/40">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Últimas mensagens</p>
              </div>
              <ScrollArea className="max-h-44">
                <div className="p-2.5 space-y-1.5">
                  {messages.slice(-5).map(msg => (
                    <div key={msg.id} className={cn(
                      "flex gap-2 items-start rounded-lg border px-2.5 py-1.5",
                      msg.type === "report" ? "bg-primary/5 border-primary/20" :
                        msg.type === "error" ? "bg-destructive/5 border-destructive/20" :
                          "bg-card/50 border-border/60",
                    )}>
                      <span className="text-base leading-none mt-0.5 shrink-0">{msg.fromEmoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[9px] font-bold">{msg.fromTitle}</span>
                          {msg.toTitle && <span className="text-[9px] text-muted-foreground">→ {msg.toEmoji} {msg.toTitle}</span>}
                        </div>
                        <p className="text-[9px] text-foreground/70 line-clamp-2 leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* ── Team Hub Tab ── */}
        <TabsContent value="hub" className="flex-1 min-h-0 m-0">
          <div className={cn("h-full", expanded ? "h-full" : "h-[640px]")}>
            <TeamHubTab
              deploymentId={deployment.id}
              projectId={projectId}
              deploymentName={deployment.name}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Hire Dialog ── */}
      <HireDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        parentRole={hireParentRole}
        parentDepth={hireParentDepth}
        onHire={handleHireMember}
      />
    </div>
  );
}
