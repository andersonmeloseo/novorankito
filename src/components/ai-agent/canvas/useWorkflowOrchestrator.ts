import { useCallback, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { CanvasNodeData, AgentData, ActionData, ConditionData, DelayData, ReportData } from "./types";
import { streamChatToCompletion } from "@/lib/stream-chat";
import { supabase } from "@/integrations/supabase/client";

type UpdateNodeFn = (nodeId: string, partial: Partial<CanvasNodeData>) => void;

export function useWorkflowOrchestrator(projectId?: string) {
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);
  const contextRef = useRef<Record<string, string>>({});

  const executeWorkflow = useCallback(async (
    nodes: Node[],
    edges: Edge[],
    updateNode: UpdateNodeFn,
  ) => {
    if (isRunning) return;
    setIsRunning(true);
    abortRef.current = false;
    contextRef.current = {};

    for (const n of nodes) {
      updateNode(n.id, { executionStatus: "idle", executionResult: undefined });
    }

    const triggerNode = nodes.find(n => (n.data as unknown as CanvasNodeData).nodeType === "trigger");
    if (!triggerNode) { setIsRunning(false); return; }

    const visited = new Set<string>();

    updateNode(triggerNode.id, { executionStatus: "success" });
    visited.add(triggerNode.id);

    const getOutgoing = (nodeId: string, handleId?: string) =>
      edges.filter(e => e.source === nodeId && (!handleId || e.sourceHandle === handleId));

    const getNode = (id: string) => nodes.find(n => n.id === id);

    const processNext = async (nodeIds: string[]) => {
      for (const nextId of nodeIds) {
        if (abortRef.current || visited.has(nextId)) continue;
        visited.add(nextId);

        const node = getNode(nextId);
        if (!node) continue;

        const nodeData = node.data as unknown as CanvasNodeData;
        updateNode(nextId, { executionStatus: "running" });

        try {
          const result = await executeNode(nodeData, contextRef.current, projectId);
          contextRef.current[nextId] = result;
          updateNode(nextId, { executionStatus: "success", executionResult: result });

          if (nodeData.nodeType === "condition") {
            const condResult = evaluateCondition(nodeData.config as ConditionData, result, contextRef.current);
            const handleId = condResult ? "true" : "false";
            const nextEdges = getOutgoing(nextId, handleId);
            await processNext(nextEdges.map(e => e.target));
          } else if (nodeData.nodeType === "split") {
            const nextEdges = getOutgoing(nextId);
            const branchPromises = nextEdges.map(e => processNext([e.target]));
            await Promise.all(branchPromises);
          } else {
            const nextEdges = getOutgoing(nextId);
            await processNext(nextEdges.map(e => e.target));
          }
        } catch (err: any) {
          updateNode(nextId, { executionStatus: "error", executionResult: err.message });
        }
      }
    };

    const startEdges = getOutgoing(triggerNode.id);
    await processNext(startEdges.map(e => e.target));

    setIsRunning(false);
  }, [isRunning, projectId]);

  const abort = useCallback(() => { abortRef.current = true; }, []);

  return { executeWorkflow, isRunning, abort };
}

async function executeNode(
  data: CanvasNodeData,
  context: Record<string, string>,
  projectId?: string,
): Promise<string> {
  switch (data.nodeType) {
    case "trigger":
      return "Workflow iniciado";

    case "agent": {
      const cfg = data.config as AgentData;
      const prevContext = Object.values(context).join("\n\n---\n\n");
      const fullPrompt = prevContext
        ? `CONTEXTO DOS PASSOS ANTERIORES:\n\n${prevContext}\n\n---\n\nSUA TAREFA AGORA:\n${cfg.prompt}`
        : cfg.prompt;

      return await streamChatToCompletion({
        prompt: fullPrompt,
        agentName: cfg.agentName,
        agentInstructions: cfg.agentInstructions,
        projectId,
      });
    }

    case "action": {
      const cfg = data.config as ActionData;
      const lastResult = Object.values(context).pop() || "";
      const content = (cfg.template || "{{resultado}}").replace("{{resultado}}", lastResult);

      if (cfg.actionType === "email" || cfg.actionType === "whatsapp") {
        await supabase.functions.invoke("send-workflow-notification", {
          body: {
            email: cfg.actionType === "email" ? cfg.destination : undefined,
            phone: cfg.actionType === "whatsapp" ? cfg.destination : undefined,
            content,
            workflow_name: data.label,
          },
        });
        return `${cfg.actionType === "email" ? "Email" : "WhatsApp"} enviado para ${cfg.destination}`;
      }

      if (cfg.actionType === "webhook" && cfg.destination) {
        await fetch(cfg.destination, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, timestamp: new Date().toISOString() }),
        });
        return `Webhook disparado para ${cfg.destination}`;
      }

      return `Ação ${cfg.actionType} executada`;
    }

    case "report": {
      const cfg = data.config as ReportData;
      const allContext = Object.values(context).join("\n\n---\n\n");
      const content = (cfg.template || "{{resultado}}").replace("{{resultado}}", allContext);
      const results: string[] = [];

      for (const recipient of (cfg.recipients || [])) {
        if (cfg.channels?.includes("email") && recipient.email) {
          await supabase.functions.invoke("send-workflow-notification", {
            body: {
              email: recipient.email,
              content,
              workflow_name: cfg.reportName || data.label,
              recipient_name: recipient.name,
            },
          });
          results.push(`Email → ${recipient.name} (${recipient.email})`);
        }
        if (cfg.channels?.includes("whatsapp") && recipient.phone) {
          await supabase.functions.invoke("send-workflow-notification", {
            body: {
              phone: recipient.phone,
              content,
              workflow_name: cfg.reportName || data.label,
              recipient_name: recipient.name,
            },
          });
          results.push(`WhatsApp → ${recipient.name} (${recipient.phone})`);
        }
      }

      return results.length > 0 ? `Relatório enviado:\n${results.join("\n")}` : "Nenhum destinatário configurado";
    }

    case "condition":
      return Object.values(context).pop() || "";

    case "delay": {
      const cfg = data.config as DelayData;
      const ms = cfg.delaySeconds * (cfg.delayUnit === "minutes" ? 60000 : cfg.delayUnit === "hours" ? 3600000 : 1000);
      await new Promise(r => setTimeout(r, Math.min(ms, 30000)));
      return `Aguardou ${cfg.delaySeconds} ${cfg.delayUnit}`;
    }

    case "split":
      return Object.values(context).pop() || "";

    case "merge":
      return Object.values(context).join("\n\n---\n\n");

    default:
      return "";
  }
}

function evaluateCondition(
  cfg: ConditionData,
  lastResult: string,
  context: Record<string, string>,
): boolean {
  const target = lastResult.toLowerCase();
  const val = (cfg.value || "").toLowerCase();

  switch (cfg.operator) {
    case "contains": return target.includes(val);
    case "not_contains": return !target.includes(val);
    case "equals": return target === val;
    case "gt": return parseFloat(target) > parseFloat(val);
    case "lt": return parseFloat(target) < parseFloat(val);
    case "exists": return target.length > 0;
    default: return true;
  }
}
