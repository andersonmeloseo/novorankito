import { useState, useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Panel,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Bot, Mail, GitBranch, Timer, Split as SplitIcon,
  Merge as MergeIcon, Play, Square, Save, Trash2, Plus,
  Bell, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CanvasNode } from "./CanvasNode";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { useWorkflowOrchestrator } from "./useWorkflowOrchestrator";
import type { CanvasNodeData, CanvasNodeType } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const nodeTypes = { canvasNode: CanvasNode };

const NODE_PALETTE: { type: CanvasNodeType; label: string; icon: any; color: string }[] = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "text-yellow-400" },
  { type: "agent", label: "Agente IA", icon: Bot, color: "text-blue-400" },
  { type: "action", label: "Ação", icon: Bell, color: "text-pink-400" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "text-orange-400" },
  { type: "delay", label: "Delay", icon: Timer, color: "text-cyan-400" },
  { type: "split", label: "Split", icon: SplitIcon, color: "text-violet-400" },
  { type: "merge", label: "Merge", icon: MergeIcon, color: "text-emerald-400" },
];

function createDefaultData(type: CanvasNodeType): CanvasNodeData {
  const defaults: Record<CanvasNodeType, () => CanvasNodeData> = {
    trigger: () => ({ label: "Trigger", nodeType: "trigger", config: { triggerType: "manual" } }),
    agent: () => ({ label: "Agente IA", nodeType: "agent", config: { agentName: "", agentInstructions: "", prompt: "", emoji: "🤖" } }),
    action: () => ({ label: "Enviar", nodeType: "action", config: { actionType: "email", destination: "", template: "{{resultado}}" } }),
    condition: () => ({ label: "Condição", nodeType: "condition", config: { field: "resultado", operator: "contains", value: "" } }),
    delay: () => ({ label: "Delay", nodeType: "delay", config: { delaySeconds: 5, delayUnit: "seconds" } }),
    split: () => ({ label: "Split", nodeType: "split", config: { splitType: "parallel" } }),
    merge: () => ({ label: "Merge", nodeType: "merge", config: { mergeType: "wait_all" } }),
  };
  return defaults[type]();
}

const DEFAULT_NODES: Node[] = [
  {
    id: "trigger-1",
    type: "canvasNode",
    position: { x: 300, y: 50 },
    data: createDefaultData("trigger"),
  },
];

interface WorkflowCanvasTabProps {
  projectId?: string;
}

export function WorkflowCanvasTab({ projectId }: WorkflowCanvasTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState("Meu Workflow");
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const idCounter = useRef(10);

  const { executeWorkflow, isRunning, abort } = useWorkflowOrchestrator(projectId);

  // Saved workflows list
  const { data: savedWorkflows = [] } = useQuery({
    queryKey: ["canvas-workflows", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from("agent_workflows")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!projectId,
  });

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      animated: true,
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
    }, eds));
  }, []);

  const addNode = useCallback((type: CanvasNodeType) => {
    const id = `node-${Date.now()}-${idCounter.current++}`;
    const newNode: Node = {
      id,
      type: "canvasNode",
      position: { x: 200 + Math.random() * 200, y: 100 + nodes.length * 120 },
      data: createDefaultData(type),
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(id);
  }, [nodes.length]);

  const updateNodeData = useCallback((nodeId: string, partial: Partial<CanvasNodeData>) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const current = n.data as unknown as CanvasNodeData;
      return { ...n, data: { ...current, ...partial } as any };
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const handleRun = useCallback(async () => {
    if (!projectId) { toast.error("Selecione um projeto primeiro"); return; }
    await executeWorkflow(nodes, edges, updateNodeData);
    toast.success("Workflow concluído!");
  }, [nodes, edges, projectId, executeWorkflow, updateNodeData]);

  const handleSave = useCallback(async () => {
    if (!projectId || !user) { toast.error("Selecione um projeto"); return; }

    const payload = {
      name: workflowName,
      description: `Canvas workflow: ${nodes.length} nós`,
      project_id: projectId,
      owner_id: user.id,
      steps: { nodes: nodes.map(n => ({ ...n, data: n.data })), edges } as any,
      enabled: true,
    };

    if (currentWorkflowId) {
      const { error } = await supabase.from("agent_workflows").update(payload).eq("id", currentWorkflowId);
      if (error) { toast.error(error.message); return; }
      toast.success("Workflow atualizado!");
    } else {
      const { data, error } = await supabase.from("agent_workflows").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      setCurrentWorkflowId(data.id);
      toast.success("Workflow salvo!");
    }
    queryClient.invalidateQueries({ queryKey: ["canvas-workflows", projectId] });
  }, [nodes, edges, workflowName, projectId, user, currentWorkflowId]);

  const loadWorkflow = useCallback((wf: any) => {
    const steps = wf.steps as any;
    if (steps?.nodes && steps?.edges) {
      setNodes(steps.nodes);
      setEdges(steps.edges);
      setWorkflowName(wf.name);
      setCurrentWorkflowId(wf.id);
      setSelectedNodeId(null);
      toast.success(`"${wf.name}" carregado`);
    }
  }, []);

  const handleNew = useCallback(() => {
    setNodes(DEFAULT_NODES);
    setEdges([]);
    setWorkflowName("Novo Workflow");
    setCurrentWorkflowId(null);
    setSelectedNodeId(null);
  }, []);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  return (
    <div className="relative w-full h-[calc(100vh-260px)] min-h-[500px] rounded-xl border border-border overflow-hidden bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        className="!bg-background"
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
        <Controls className="!bg-card !border-border !shadow-lg" />
        <MiniMap
          className="!bg-card !border-border"
          nodeColor={(n) => {
            const d = n.data as unknown as CanvasNodeData;
            const colors: Record<string, string> = {
              trigger: "#eab308", agent: "#3b82f6", action: "#ec4899",
              condition: "#f97316", delay: "#06b6d4", split: "#8b5cf6", merge: "#10b981",
            };
            return colors[d?.nodeType] || "#888";
          }}
        />

        {/* Top toolbar */}
        <Panel position="top-left" className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-xs h-7 w-40 bg-transparent border-none focus-visible:ring-0"
          />
          <div className="w-px h-5 bg-border" />
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleSave} disabled={isRunning}>
            <Save className="h-3 w-3" /> Salvar
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleNew}>
            <Plus className="h-3 w-3" /> Novo
          </Button>
          <div className="w-px h-5 bg-border" />
          {isRunning ? (
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={abort}>
              <Square className="h-3 w-3" /> Parar
            </Button>
          ) : (
            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleRun}>
              <Play className="h-3 w-3" /> Executar
            </Button>
          )}
          {isRunning && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
        </Panel>

        {/* Node palette */}
        <Panel position="top-right" className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Adicionar Nó</p>
          {NODE_PALETTE.map(item => (
            <button
              key={item.type}
              onClick={() => addNode(item.type)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
            >
              <item.icon className={cn("h-3.5 w-3.5", item.color)} />
              <span className="text-xs text-foreground">{item.label}</span>
            </button>
          ))}
        </Panel>

        {/* Saved workflows list */}
        {savedWorkflows.length > 0 && (
          <Panel position="bottom-left" className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg max-h-40 overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Workflows Salvos</p>
            {savedWorkflows.map((wf: any) => (
              <button
                key={wf.id}
                onClick={() => loadWorkflow(wf)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1 rounded text-left hover:bg-muted/50 transition-colors",
                  currentWorkflowId === wf.id && "bg-primary/10"
                )}
              >
                <span className="text-xs truncate">{wf.name}</span>
                <Badge variant="outline" className="text-[8px] ml-auto shrink-0">
                  {(wf.steps as any)?.nodes?.length || 0} nós
                </Badge>
              </button>
            ))}
          </Panel>
        )}
      </ReactFlow>

      {/* Config panel */}
      {selectedNode && (
        <NodeConfigPanel
          nodeId={selectedNode.id}
          data={selectedNode.data as unknown as CanvasNodeData}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNodeId(null)}
          onDelete={deleteNode}
          projectId={projectId}
        />
      )}
    </div>
  );
}
