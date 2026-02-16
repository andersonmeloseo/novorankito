import { useCallback, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ZoomIn } from "lucide-react";
import EntityNode, { type EntityNodeData } from "./EntityNode";
import RelationEdge from "./RelationEdge";
import { CreateEntityDialog } from "./CreateEntityDialog";
import { toast } from "@/hooks/use-toast";

const PREDICATES = [
  "é_dono_de", "oferece", "localizado_em", "trabalha_em",
  "avalia", "relacionado_a", "parte_de", "criou",
];

export function GraphBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);

  const nodeTypes = useMemo(() => ({ entity: EntityNode }), []);
  const edgeTypes = useMemo(() => ({ relation: RelationEdge }), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const predicate = PREDICATES[Math.floor(Math.random() * PREDICATES.length)];
      const edge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}`,
        type: "relation",
        data: { predicate },
        animated: true,
      } as Edge;
      setEdges((eds) => addEdge(edge, eds));
      toast({ title: "Relação criada", description: `${predicate}` });
    },
    [setEdges],
  );

  const handleCreateEntity = useCallback(
    (entity: { name: string; entityType: string; schemaType: string; description: string }) => {
      const id = `node-${Date.now()}`;
      const newNode: Node = {
        id,
        type: "entity",
        position: {
          x: 200 + Math.random() * 400,
          y: 100 + Math.random() * 300,
        },
        data: {
          label: entity.name,
          entityType: entity.entityType,
          schemaType: entity.schemaType,
          description: entity.description,
        } satisfies EntityNodeData,
      };
      setNodes((nds) => [...nds, newNode]);
      toast({ title: "Entidade criada", description: entity.name });
    },
    [setNodes],
  );

  const handleDelete = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
    toast({ title: "Elementos removidos" });
  }, [setNodes, setEdges]);

  const hasSelection = nodes.some((n) => n.selected) || edges.some((e) => e.selected);

  return (
    <div className="h-[600px] w-full rounded-xl border bg-card overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: "relation", animated: true }}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="!bg-muted/30"
        />
        <Controls
          showInteractive={false}
          className="!bg-card !border !border-border !shadow-md !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted"
        />
        <MiniMap
          nodeColor="hsl(250 85% 60%)"
          maskColor="hsl(225 15% 94% / 0.7)"
          className="!bg-card !border !border-border !rounded-lg !shadow-md"
        />
        <Panel position="top-left" className="flex gap-2">
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Entidade
          </Button>
          {hasSelection && (
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remover
            </Button>
          )}
        </Panel>
        {nodes.length === 0 && (
          <Panel position="top-center" className="mt-32">
            <div className="text-center space-y-3 p-6 rounded-xl bg-card/80 backdrop-blur border shadow-lg max-w-xs">
              <ZoomIn className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Comece criando sua primeira entidade clicando em <strong>"+ Entidade"</strong>
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
      <CreateEntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateEntity}
      />
    </div>
  );
}
