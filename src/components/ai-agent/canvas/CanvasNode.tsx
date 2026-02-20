import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  Zap, Bot, Mail, MessageCircle, Webhook, Bell,
  GitBranch, Timer, Split, Merge, FileText,
  Loader2, CheckCircle2, XCircle, SkipForward,
  Clock, ArrowDown,
} from "lucide-react";
import type { CanvasNodeData, CanvasNodeType } from "./types";

const NODE_CONFIG: Record<CanvasNodeType, {
  icon: any; color: string; bgClass: string; borderClass: string; glowClass: string;
}> = {
  trigger: { icon: Zap, color: "text-yellow-400", bgClass: "bg-yellow-500/10", borderClass: "border-yellow-500/50", glowClass: "shadow-yellow-500/20" },
  agent: { icon: Bot, color: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/50", glowClass: "shadow-blue-500/20" },
  action: { icon: Bell, color: "text-pink-400", bgClass: "bg-pink-500/10", borderClass: "border-pink-500/50", glowClass: "shadow-pink-500/20" },
  condition: { icon: GitBranch, color: "text-orange-400", bgClass: "bg-orange-500/10", borderClass: "border-orange-500/50", glowClass: "shadow-orange-500/20" },
  delay: { icon: Timer, color: "text-cyan-400", bgClass: "bg-cyan-500/10", borderClass: "border-cyan-500/50", glowClass: "shadow-cyan-500/20" },
  split: { icon: Split, color: "text-violet-400", bgClass: "bg-violet-500/10", borderClass: "border-violet-500/50", glowClass: "shadow-violet-500/20" },
  merge: { icon: Merge, color: "text-emerald-400", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/50", glowClass: "shadow-emerald-500/20" },
  report: { icon: FileText, color: "text-purple-400", bgClass: "bg-purple-500/10", borderClass: "border-purple-500/50", glowClass: "shadow-purple-500/20" },
};

const STATUS_ICONS: Record<string, { icon: any; className: string; label: string }> = {
  idle: { icon: Clock, className: "text-muted-foreground", label: "Aguardando" },
  waiting: { icon: Clock, className: "text-amber-400 animate-pulse", label: "Na fila" },
  running: { icon: Loader2, className: "text-blue-400 animate-spin", label: "Executando..." },
  success: { icon: CheckCircle2, className: "text-emerald-400", label: "Concluído" },
  error: { icon: XCircle, className: "text-red-400", label: "Erro" },
  skipped: { icon: SkipForward, className: "text-muted-foreground", label: "Pulado" },
};

function getActionIcon(actionType?: string) {
  switch (actionType) {
    case "email": return Mail;
    case "whatsapp": return MessageCircle;
    case "webhook": return Webhook;
    default: return Bell;
  }
}

function getSubtitle(data: CanvasNodeData): string {
  const cfg = data.config as any;
  switch (data.nodeType) {
    case "trigger":
      return cfg.triggerType === "manual" ? "Execução manual" :
        cfg.triggerType === "schedule" ? `Agendado: ${cfg.cronExpression || "?"}` :
        cfg.triggerType === "webhook" ? "Via Webhook" : cfg.eventName || "Evento";
    case "agent":
      return cfg.agentName || "Agente";
    case "action":
      return cfg.actionType === "email" ? `Email → ${cfg.destination || "..."}` :
        cfg.actionType === "whatsapp" ? `WhatsApp → ${cfg.destination || "..."}` :
        cfg.actionType === "webhook" ? "Webhook" : "Notificação";
    case "condition":
      return `Se ${cfg.field || "?"} ${cfg.operator || "?"} ${cfg.value || "?"}`;
    case "delay":
      return `Aguardar ${cfg.delaySeconds || 0} ${cfg.delayUnit || "s"}`;
    case "split": return cfg.splitType === "parallel" ? "Paralelo" : "Round Robin";
    case "merge": return cfg.mergeType === "wait_all" ? "Esperar todos" : "Esperar qualquer";
    case "report": {
      const channels = cfg.channels?.join(", ") || "—";
      const recipientCount = cfg.recipients?.length || 0;
      return `${channels} → ${recipientCount} destinatário${recipientCount !== 1 ? "s" : ""}`;
    }
    default: return "";
  }
}

export const CanvasNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as CanvasNodeData;
  const cfg = NODE_CONFIG[nodeData.nodeType] || NODE_CONFIG.agent;
  const Icon = nodeData.nodeType === "action" ? getActionIcon((nodeData.config as any).actionType) : cfg.icon;
  const status = nodeData.executionStatus;
  const StatusInfo = status ? STATUS_ICONS[status] : null;
  const hasConditionOutputs = nodeData.nodeType === "condition";
  const messagePreview = nodeData.executionResult;
  const hierarchyDepth = (nodeData as any).hierarchyDepth;

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 px-4 py-3 min-w-[220px] max-w-[280px] transition-all duration-300",
        cfg.borderClass, cfg.bgClass,
        selected && "ring-2 ring-primary shadow-lg",
        status === "running" && `shadow-xl ${cfg.glowClass} animate-pulse`,
        status === "success" && "border-emerald-500/60 shadow-emerald-500/10 shadow-lg",
        status === "error" && "border-red-500/60 shadow-red-500/10 shadow-lg",
        status === "waiting" && "border-amber-500/40 opacity-80",
        "backdrop-blur-sm"
      )}
    >
      {/* Pulsing ring for running state */}
      {status === "running" && (
        <div className="absolute inset-0 rounded-xl border-2 border-blue-400/30 animate-ping pointer-events-none" />
      )}

      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground/60 !border-2 !border-background" />

      <div className="flex items-start gap-2.5">
        <div className={cn("mt-0.5 p-1.5 rounded-lg relative", cfg.bgClass)}>
          <Icon className={cn("h-4 w-4", cfg.color)} />
          {/* Hierarchy depth badge */}
          {hierarchyDepth !== undefined && hierarchyDepth >= 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">
              {hierarchyDepth}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">{nodeData.label}</span>
            {StatusInfo && (
              <StatusInfo.icon className={cn("h-3.5 w-3.5 shrink-0", StatusInfo.className)} />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{getSubtitle(nodeData)}</p>
          
          {/* Status label */}
          {StatusInfo && status !== "idle" && (
            <span className={cn(
              "text-[9px] font-medium mt-0.5 inline-block",
              status === "running" && "text-blue-400",
              status === "success" && "text-emerald-400",
              status === "error" && "text-red-400",
              status === "waiting" && "text-amber-400",
            )}>
              {StatusInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Message preview - shows snippet of what the agent produced */}
      {messagePreview && status === "success" && (
        <div className="mt-2 p-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-1 mb-0.5">
            <ArrowDown className="h-2.5 w-2.5 text-emerald-400" />
            <span className="text-[8px] font-semibold text-emerald-400 uppercase">Output</span>
          </div>
          <p className="text-[9px] text-foreground/70 line-clamp-3 leading-tight">{messagePreview}</p>
        </div>
      )}

      {/* Error message */}
      {messagePreview && status === "error" && (
        <p className="text-[9px] text-red-400 mt-1.5 line-clamp-2">{messagePreview}</p>
      )}

      {hasConditionOutputs ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: "30%" }} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background" />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: "70%" }} className="!w-3 !h-3 !bg-red-500 !border-2 !border-background" />
          <div className="flex justify-between px-2 mt-1">
            <span className="text-[8px] text-emerald-400">Sim</span>
            <span className="text-[8px] text-red-400">Não</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-muted-foreground/60 !border-2 !border-background" />
      )}
    </div>
  );
});

CanvasNode.displayName = "CanvasNode";
