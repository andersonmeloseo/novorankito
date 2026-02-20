import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Loader2, Wand2, LayoutGrid, Network, Trash2, Layout, Sparkles } from "lucide-react";
import EntityNode, { type EntityNodeData } from "./EntityNode";
import RelationEdge from "./RelationEdge";
import { CreateEntityDialog, type EntityFormData } from "./CreateEntityDialog";
import { NicheGraphWizard, type NicheTemplate } from "./NicheGraphWizard";
import { EntityDetailPanel } from "./EntityDetailPanel";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSchemaProperties } from "./schema-properties";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

const PREDICATES = [
  "oferece", "presta", "localizado_em", "fundado_por", "listado_em",
  "possui_website", "organiza", "responde_em", "publica", "possui_marca",
  "trabalha_em", "possui_perfil", "possui_credencial", "é_autor_de", "afiliado_a",
  "avaliado_por", "disponível_em", "pertence_a", "categorizado_em", "ilustrado_por",
  "atende_em", "prestado_por", "tem_endereço", "funciona_em", "posicionado_em",
  "realizado_em", "organizado_por", "tem_ingresso", "escrita_por", "tem_nota",
  "escrito_por", "contém", "possui_busca", "relacionado_a", "parte_de", "criou",
];

function GraphBuilderInner({ semanticProjectId }: { semanticProjectId?: string }) {
  const { user } = useAuth();
  const projectId = localStorage.getItem("rankito_current_project");
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EntityFormData | null>(null);
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardGenerating, setWizardGenerating] = useState(false);
  const [aiFillingAll, setAiFillingAll] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail panel state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);

  // Connection predicate dialog
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [connectionPredicate, setConnectionPredicate] = useState(PREDICATES[0]);

  // "Create from handle" state: when user drags from a handle to empty space
  const [createFromHandle, setCreateFromHandle] = useState<{
    sourceNodeId: string;
    position: { x: number; y: number };
  } | null>(null);
  const [createFromPredicate, setCreateFromPredicate] = useState(PREDICATES[0]);
  const connectingNodeId = useRef<string | null>(null);

  const nodeTypes = useMemo(() => ({ entity: EntityNode }), []);
  const edgeTypes = useMemo(() => ({ relation: RelationEdge }), []);

  // ── Load from DB ──
  useEffect(() => {
    if (!projectId || !user) return;
    (async () => {
      setLoading(true);
      let entQuery = supabase.from("semantic_entities").select("*").eq("project_id", projectId);
      let relQuery = supabase.from("semantic_relations").select("*").eq("project_id", projectId);
      if (semanticProjectId) {
        entQuery = entQuery.eq("goal_project_id", semanticProjectId);
        relQuery = relQuery.eq("goal_project_id", semanticProjectId);
      }
      const [entRes, relRes] = await Promise.all([entQuery, relQuery]);
      const entities = entRes.data || [];
      const relations = relRes.data || [];

      const loadedNodes: Node[] = entities.map((e) => ({
        id: e.id,
        type: "entity",
        position: { x: e.position_x ?? 200 + Math.random() * 400, y: e.position_y ?? 100 + Math.random() * 300 },
        data: {
          label: e.name,
          entityType: e.entity_type,
          schemaType: e.schema_type || "",
          description: e.description || "",
          dbId: e.id,
        } satisfies EntityNodeData,
      }));

      const loadedEdges: Edge[] = relations.map((r) => ({
        id: r.id,
        source: r.subject_id,
        target: r.object_id,
        type: "relation",
        data: { predicate: r.predicate, confidence: r.confidence },
        animated: true,
      }));

      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setLoading(false);
    })();
  }, [projectId, user, semanticProjectId]);

  // ── Inject callbacks into node data ──
  const handleEdit = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const d = node.data as EntityNodeData;
    setEditData({ name: d.label, entityType: d.entityType, schemaType: d.schemaType || "", description: d.description || "" });
    setEditNodeId(nodeId);
    setDialogOpen(true);
  }, [nodes]);

  const handleDeletePrompt = useCallback((nodeId: string) => {
    setDeleteNodeId(nodeId);
  }, []);

  // Delete an edge (relation)
  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    setSaving(true);
    await supabase.from("semantic_relations").delete().eq("id", edgeId);
    setSaving(false);
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    toast({ title: "Relação removida" });
  }, [setEdges]);

  // Inject callbacks
  const nodesWithCallbacks = useMemo(() =>
    nodes.map((n) => ({
      ...n,
      data: { ...n.data, onEdit: handleEdit, onDelete: handleDeletePrompt },
    })),
    [nodes, handleEdit, handleDeletePrompt],
  );

  const edgesWithCallbacks = useMemo(() =>
    edges.map((e) => ({
      ...e,
      data: { ...e.data, onDeleteEdge: handleDeleteEdge },
    })),
    [edges, handleDeleteEdge],
  );

  // Handle node click → open detail panel
  const handleNodeClick = useCallback((_: any, node: Node) => {
    setDetailNodeId(node.id);
    setDetailOpen(true);
  }, []);

  // Get detail data for selected node
  const detailEntityData = useMemo(() => {
    if (!detailNodeId) return null;
    const node = nodes.find((n) => n.id === detailNodeId);
    return node ? (node.data as EntityNodeData) : null;
  }, [detailNodeId, nodes]);

  const detailAllNodes = useMemo(() =>
    nodes.map((n) => ({ id: n.id, data: n.data as EntityNodeData })),
    [nodes],
  );

  const detailAllEdges = useMemo(() =>
    edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: e.data as { predicate?: string } | undefined,
    })),
    [edges],
  );

  // ── Auto-save position on drag end ──
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    const positionChanges = changes.filter((c) => c.type === "position" && !("dragging" in c && (c as any).dragging));
    if (positionChanges.length > 0) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        positionChanges.forEach(async (c) => {
          if (c.type === "position" && c.position) {
            await supabase
              .from("semantic_entities")
              .update({ position_x: c.position.x, position_y: c.position.y })
              .eq("id", c.id);
          }
        });
      }, 500);
    }
  }, [onNodesChange]);

  // ── Create entity (standalone) ──
  const handleCreateEntity = useCallback(
    async (entity: EntityFormData) => {
      if (!projectId || !user) return;
      setSaving(true);
      const posX = createFromHandle?.position.x ?? 200 + Math.random() * 400;
      const posY = createFromHandle?.position.y ?? 100 + Math.random() * 300;

      const { data, error } = await supabase.from("semantic_entities").insert({
        project_id: projectId,
        owner_id: user.id,
        name: entity.name,
        entity_type: entity.entityType,
        schema_type: entity.schemaType || null,
        description: entity.description || null,
        position_x: posX,
        position_y: posY,
        goal_project_id: semanticProjectId || null,
      } as any).select().single();

      if (error || !data) {
        setSaving(false);
        toast({ title: "Erro ao criar entidade", variant: "destructive" });
        return;
      }

      const newNode: Node = {
        id: data.id,
        type: "entity",
        position: { x: data.position_x ?? 300, y: data.position_y ?? 200 },
        data: {
          label: data.name,
          entityType: data.entity_type,
          schemaType: data.schema_type || "",
          description: data.description || "",
          dbId: data.id,
        } satisfies EntityNodeData,
      };
      setNodes((nds) => [...nds, newNode]);

      // If created from handle drag, also create the relation
      if (createFromHandle) {
        const { data: relData, error: relError } = await supabase.from("semantic_relations").insert({
          project_id: projectId,
          owner_id: user.id,
          subject_id: createFromHandle.sourceNodeId,
          object_id: data.id,
          predicate: createFromPredicate,
          goal_project_id: semanticProjectId || null,
        } as any).select().single();

        if (!relError && relData) {
          const edge: Edge = {
            id: relData.id,
            source: relData.subject_id,
            target: relData.object_id,
            type: "relation",
            data: { predicate: relData.predicate },
            animated: true,
          };
          setEdges((eds) => addEdge(edge, eds));
          toast({ title: "Entidade e relação criadas", description: `${entity.name} — ${createFromPredicate}` });
        } else {
          toast({ title: "Entidade criada (erro na relação)", variant: "destructive" });
        }
        setCreateFromHandle(null);
        setCreateFromPredicate(PREDICATES[0]);
      } else {
        toast({ title: "Entidade criada", description: entity.name });
      }
      setSaving(false);
    },
    [projectId, user, setNodes, setEdges, createFromHandle, createFromPredicate, semanticProjectId],
  );

  // ── Edit entity ──
  const handleEditSubmit = useCallback(
    async (entity: EntityFormData) => {
      if (!editNodeId) return;
      setSaving(true);
      await supabase.from("semantic_entities").update({
        name: entity.name,
        entity_type: entity.entityType,
        schema_type: entity.schemaType || null,
        description: entity.description || null,
      }).eq("id", editNodeId);
      setSaving(false);

      setNodes((nds) =>
        nds.map((n) =>
          n.id === editNodeId
            ? { ...n, data: { ...n.data, label: entity.name, entityType: entity.entityType, schemaType: entity.schemaType, description: entity.description } }
            : n,
        ),
      );
      setEditNodeId(null);
      setEditData(null);
      toast({ title: "Entidade atualizada" });
    },
    [editNodeId, setNodes],
  );

  // ── Delete entity ──
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteNodeId) return;
    setSaving(true);
    await supabase.from("semantic_relations").delete().or(`subject_id.eq.${deleteNodeId},object_id.eq.${deleteNodeId}`);
    await supabase.from("semantic_entities").delete().eq("id", deleteNodeId);
    setSaving(false);

    setNodes((nds) => nds.filter((n) => n.id !== deleteNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== deleteNodeId && e.target !== deleteNodeId));
    setDeleteNodeId(null);
    toast({ title: "Entidade excluída" });
  }, [deleteNodeId, setNodes, setEdges]);

  // ── Delete ALL entities ──
  const handleConfirmDeleteAll = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    let relQuery = supabase.from("semantic_relations").delete().eq("project_id", projectId);
    let entQuery_del = supabase.from("semantic_entities").delete().eq("project_id", projectId);
    if (semanticProjectId) {
      relQuery = relQuery.eq("goal_project_id", semanticProjectId);
      entQuery_del = entQuery_del.eq("goal_project_id", semanticProjectId);
    }
    await relQuery;
    await entQuery_del;
    setSaving(false);
    setNodes([]);
    setEdges([]);
    setDeleteAllOpen(false);
    toast({ title: "Todos os nós excluídos", description: "O grafo foi limpo completamente." });
  }, [projectId, semanticProjectId, setNodes, setEdges]);


  const onConnectStart = useCallback((_: any, params: any) => {
    connectingNodeId.current = params.nodeId;
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    connectingNodeId.current = null;
    setPendingConnection(connection);
    setConnectionPredicate(PREDICATES[0]);
  }, []);

  // ── Connect end: if dropped on empty pane, open "create from handle" flow ──
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (!connectingNodeId.current) return;

    const target = event.target as HTMLElement;
    // Check if dropped on the pane (not on another node)
    const targetIsPane = target.classList.contains("react-flow__pane");
    if (!targetIsPane) {
      connectingNodeId.current = null;
      return;
    }

    // Get position
    const clientX = "changedTouches" in event ? event.changedTouches[0].clientX : (event as MouseEvent).clientX;
    const clientY = "changedTouches" in event ? event.changedTouches[0].clientY : (event as MouseEvent).clientY;
    const position = screenToFlowPosition({ x: clientX, y: clientY });

    setCreateFromHandle({
      sourceNodeId: connectingNodeId.current,
      position,
    });
    setCreateFromPredicate(PREDICATES[0]);
    connectingNodeId.current = null;
  }, [screenToFlowPosition]);

  // Handle the "create from handle" predicate dialog → opens entity dialog
  const handleConfirmCreateFromHandle = useCallback(() => {
    // createFromHandle is already set, now open the entity dialog
    setEditNodeId(null);
    setEditData(null);
    setDialogOpen(true);
  }, []);

  const handleCancelCreateFromHandle = useCallback(() => {
    setCreateFromHandle(null);
    setCreateFromPredicate(PREDICATES[0]);
  }, []);

  const handleConfirmConnection = useCallback(async () => {
    if (!pendingConnection || !projectId || !user) return;
    setSaving(true);
    const { data, error } = await supabase.from("semantic_relations").insert({
      project_id: projectId,
      owner_id: user.id,
      subject_id: pendingConnection.source,
      object_id: pendingConnection.target,
      predicate: connectionPredicate,
      goal_project_id: semanticProjectId || null,
    } as any).select().single();
    setSaving(false);

    if (error || !data) {
      toast({ title: "Erro ao criar relação", variant: "destructive" });
      setPendingConnection(null);
      return;
    }

    const edge: Edge = {
      id: data.id,
      source: data.subject_id,
      target: data.object_id,
      type: "relation",
      data: { predicate: data.predicate },
      animated: true,
    };
    setEdges((eds) => addEdge(edge, eds));
    setPendingConnection(null);
    toast({ title: "Relação criada", description: connectionPredicate });
  }, [pendingConnection, connectionPredicate, projectId, user, setEdges]);

  // ── Wizard ──
  const handleWizardGenerate = useCallback(async (
    template: NicheTemplate, businessName: string, locationName: string,
  ) => {
    if (!projectId || !user) return;
    setWizardGenerating(true);

    const cx = 500, cy = 350, radius = 280;
    const angleStep = (2 * Math.PI) / template.entities.length;

    const entityRows = template.entities.map((e, i) => {
      const angle = angleStep * i - Math.PI / 2;
      let name = e.name;
      if (i === 0) name = businessName;
      if (e.type === "local" && !e.name) name = locationName || "Endereço";
      return {
        project_id: projectId,
        owner_id: user!.id,
        name,
        entity_type: e.type,
        schema_type: e.schema,
        description: e.description,
        position_x: Math.round(cx + radius * Math.cos(angle)),
        position_y: Math.round(cy + radius * Math.sin(angle)),
        goal_project_id: semanticProjectId || null,
      };
    });

    const { data: insertedEntities, error: entError } = await supabase
      .from("semantic_entities")
      .insert(entityRows as any)
      .select();

    if (entError || !insertedEntities) {
      toast({ title: "Erro ao gerar entidades", variant: "destructive" });
      setWizardGenerating(false);
      return;
    }

    const relationRows = template.relations.map((r) => ({
      project_id: projectId,
      owner_id: user!.id,
      subject_id: insertedEntities[r.subjectIndex].id,
      object_id: insertedEntities[r.objectIndex].id,
      predicate: r.predicate,
      goal_project_id: semanticProjectId || null,
    }));

    const { data: insertedRelations, error: relError } = await supabase
      .from("semantic_relations")
      .insert(relationRows as any)
      .select();

    if (relError) {
      toast({ title: "Entidades criadas, mas houve erro nas relações", variant: "destructive" });
    }

    const newNodes: Node[] = insertedEntities.map((e) => ({
      id: e.id,
      type: "entity",
      position: { x: e.position_x ?? 300, y: e.position_y ?? 200 },
      data: {
        label: e.name,
        entityType: e.entity_type,
        schemaType: e.schema_type || "",
        description: e.description || "",
        dbId: e.id,
      } satisfies EntityNodeData,
    }));

    const newEdges: Edge[] = (insertedRelations || []).map((r) => ({
      id: r.id,
      source: r.subject_id,
      target: r.object_id,
      type: "relation",
      data: { predicate: r.predicate },
      animated: true,
    }));

    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);
    setWizardGenerating(false);
    setWizardOpen(false);
    toast({
      title: "Grafo gerado com sucesso!",
      description: `${insertedEntities.length} entidades e ${insertedRelations?.length ?? 0} relações criadas.`,
    });
  }, [projectId, user, setNodes, setEdges, semanticProjectId]);

  // ── Reorganize nodes in a tree/hierarchical layout to minimize crossings ──
  const handleReorganize = useCallback(async () => {
    if (nodes.length === 0) return;

    // Build adjacency: for each node, which nodes are connected?
    const adjacency = new Map<string, Set<string>>();
    nodes.forEach((n) => adjacency.set(n.id, new Set()));
    edges.forEach((e) => {
      adjacency.get(e.source)?.add(e.target);
      adjacency.get(e.target)?.add(e.source);
    });

    // BFS layering from root nodes (nodes with most connections, or no incoming edges)
    const targetIds = new Set(edges.map((e) => e.target));
    let roots = nodes.filter((n) => !targetIds.has(n.id));
    if (roots.length === 0) {
      // pick node with most connections as root
      roots = [...nodes].sort((a, b) => (adjacency.get(b.id)?.size || 0) - (adjacency.get(a.id)?.size || 0)).slice(0, 1);
    }

    const layers: string[][] = [];
    const visited = new Set<string>();
    let currentLayer = roots.map((r) => r.id);
    currentLayer.forEach((id) => visited.add(id));

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      const nextLayer: string[] = [];
      for (const nodeId of currentLayer) {
        const neighbors = adjacency.get(nodeId) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            nextLayer.push(neighbor);
          }
        }
      }
      currentLayer = nextLayer;
    }

    // Add any disconnected nodes as their own layer
    const disconnected = nodes.filter((n) => !visited.has(n.id)).map((n) => n.id);
    if (disconnected.length > 0) layers.push(disconnected);

    // Position: each layer is a row, nodes spread horizontally with generous spacing
    const spacingY = 250;
    const spacingX = 350;
    const positionMap = new Map<string, { x: number; y: number }>();

    layers.forEach((layer, layerIdx) => {
      const totalWidth = (layer.length - 1) * spacingX;
      const startX = -totalWidth / 2 + 400;
      layer.forEach((nodeId, nodeIdx) => {
        positionMap.set(nodeId, {
          x: startX + nodeIdx * spacingX,
          y: layerIdx * spacingY + 100,
        });
      });
    });

    const updated = nodes.map((node) => ({
      ...node,
      position: positionMap.get(node.id) || node.position,
    }));

    setNodes(updated);

    // Save positions to DB
    setSaving(true);
    await Promise.all(
      updated.map((n) =>
        supabase
          .from("semantic_entities")
          .update({ position_x: n.position.x, position_y: n.position.y })
          .eq("id", n.id)
      )
    );
    setSaving(false);
    toast({ title: "Layout reorganizado", description: `${layers.length} camadas, ${nodes.length} entidades distribuídas.` });
  }, [nodes, edges, setNodes]);

  // ── AI fill all entities directly from graph ──
  const handleAiFillAll = useCallback(async () => {
    if (!projectId || !user || nodes.length === 0) return;
    setAiFillingAll(true);
    try {
      // Load full entity data from DB
      let entQuery = supabase.from("semantic_entities").select("id, name, entity_type, schema_type, description, schema_properties").eq("project_id", projectId);
      let relQuery = supabase.from("semantic_relations").select("id, subject_id, object_id, predicate").eq("project_id", projectId);
      if (semanticProjectId) {
        entQuery = entQuery.eq("goal_project_id", semanticProjectId);
        relQuery = relQuery.eq("goal_project_id", semanticProjectId);
      }
      const [entRes, relRes] = await Promise.all([entQuery, relQuery]);
      const entities = entRes.data || [];
      const relations = relRes.data || [];

      const entitiesForAi = entities.map((e: any) => ({
        id: e.id,
        name: e.name,
        entity_type: e.entity_type,
        schema_type: e.schema_type,
        description: e.description,
        properties: getSchemaProperties(e.schema_type || "").map((p) => ({
          name: p.name,
          description: p.description,
          example: p.example,
          required: p.required,
        })),
        current_values: e.schema_properties || {},
      }));

      const relationsForAi = relations.map((r: any) => {
        const subj = entities.find((e: any) => e.id === r.subject_id);
        const obj = entities.find((e: any) => e.id === r.object_id);
        return {
          subject: subj?.name || r.subject_id,
          predicate: r.predicate,
          object: obj?.name || r.object_id,
        };
      });

      const { data, error } = await supabase.functions.invoke("semantic-ai-fill", {
        body: { entities: entitiesForAi, relations: relationsForAi, projectId },
      });

      if (error) throw error;

      const filled = data?.filled as Array<{ id: string; properties: Record<string, string> }>;
      if (!filled?.length) {
        toast({ title: "IA não retornou dados", description: "Tente novamente", variant: "destructive" });
        return;
      }

      let savedCount = 0;
      for (const item of filled) {
        const existing = entities.find((e: any) => e.id === item.id);
        if (!existing) continue;
        const merged = { ...((existing.schema_properties as Record<string, string>) || {}), ...item.properties };
        const { error: updateError } = await supabase
          .from("semantic_entities")
          .update({ schema_properties: merged as any })
          .eq("id", item.id);
        if (!updateError) savedCount++;
      }

      toast({
        title: `✨ IA preencheu ${savedCount} entidades`,
        description: "Clique em qualquer entidade para ver as propriedades preenchidas na aba Schema.",
      });
    } catch (err: any) {
      console.error("AI fill error:", err);
      toast({
        title: "Erro ao preencher com IA",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setAiFillingAll(false);
    }
  }, [projectId, user, nodes, semanticProjectId]);

  if (!projectId) {
    return (
      <div className="h-[600px] flex items-center justify-center text-muted-foreground">
        Selecione um projeto para usar o Grafo Semântico.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-4 border-primary/20 bg-accent/30">
        <div className="flex gap-3 items-start">
          <Network className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Construtor de Grafo Semântico</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Monte visualmente o <strong>ecossistema de entidades</strong> do seu negócio. Cada nó representa uma entidade (empresa, produto, pessoa, local) e cada conexão é uma <strong>relação semântica</strong> que o Google usa para compreender seu negócio.
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              💡 <strong>Como usar:</strong> Clique em <em>Entidade</em> para criar um nó, ou use o <em>Wizard por Nicho</em> para gerar um grafo completo automaticamente. Arraste de um handle para o espaço vazio para criar e conectar uma nova entidade. Use <em>Reorganizar</em> para distribuir os nós de forma hierárquica.
            </p>
          </div>
        </div>
      </Card>
    <div className="h-[calc(100vh-340px)] min-h-[500px] w-full rounded-xl border bg-card overflow-hidden relative">
      {saving && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-card/90 border rounded-lg px-3 py-1.5 text-xs text-muted-foreground shadow">
          <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
        </div>
      )}
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edgesWithCallbacks}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: "relation", animated: true }}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-muted/30" />
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
          <Button size="sm" onClick={() => { setEditNodeId(null); setEditData(null); setCreateFromHandle(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Entidade
          </Button>
          <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)}>
            <Wand2 className="h-3.5 w-3.5 mr-1" />
            Wizard por Nicho
          </Button>
          {nodes.length > 1 && (
            <Button size="sm" variant="outline" onClick={handleReorganize}>
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              Reorganizar
            </Button>
          )}
          {nodes.length > 0 && (
            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteAllOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Excluir Todos
            </Button>
          )}
          {nodes.length > 0 && (
            <Button size="sm" variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20" onClick={handleAiFillAll} disabled={aiFillingAll}>
              {aiFillingAll ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              {aiFillingAll ? "Preenchendo..." : "Preencher com IA"}
            </Button>
          )}
          {nodes.length > 0 && (
            <Button size="sm" variant="default" className="bg-primary/90 hover:bg-primary" onClick={() => {
              console.log("Dispatching switch-semantic-tab: implementation");
              window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: "implementation" }));
              toast({ title: "Implementação ativada", description: "Navegando para a aba de implementação..." });
            }}>
              <Layout className="h-3.5 w-3.5 mr-1" />
              Implementar
            </Button>
          )}
        </Panel>
        {nodes.length === 0 && (
          <Panel position="top-center" className="mt-24">
            <div className="text-center space-y-4 p-6 rounded-xl bg-card/80 backdrop-blur border shadow-lg max-w-sm">
              <Wand2 className="h-10 w-10 mx-auto text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Grafo vazio</p>
                <p className="text-xs text-muted-foreground">
                  Crie entidades manualmente ou use o <strong>Wizard por Nicho</strong> para gerar um grafo completo automaticamente.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => { setEditNodeId(null); setEditData(null); setDialogOpen(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Manual
                </Button>
                <Button size="sm" onClick={() => setWizardOpen(true)}>
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                  Wizard
                </Button>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Create / Edit dialog */}
      <CreateEntityDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setEditNodeId(null);
            setEditData(null);
            // If canceling create-from-handle, clear that state too
            if (createFromHandle) {
              setCreateFromHandle(null);
              setCreateFromPredicate(PREDICATES[0]);
            }
          }
        }}
        onSubmit={editNodeId ? handleEditSubmit : handleCreateEntity}
        initialData={editData}
        mode={editNodeId ? "edit" : "create"}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteNodeId} onOpenChange={(o) => { if (!o) setDeleteNodeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a entidade e todas as suas relações permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete ALL confirmation */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir TODOS os nós?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>todas as {nodes.length} entidades</strong> e suas relações permanentemente. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Todos ({nodes.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Predicate picker on node-to-node connection */}
      <Dialog open={!!pendingConnection} onOpenChange={(o) => { if (!o) setPendingConnection(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tipo de Relação</DialogTitle>
            <DialogDescription>Escolha o predicado para esta conexão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Predicado</Label>
            <Select value={connectionPredicate} onValueChange={setConnectionPredicate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PREDICATES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingConnection(null)}>Cancelar</Button>
            <Button onClick={handleConfirmConnection}>Conectar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Predicate picker when dragging handle to empty space → create new node */}
      <Dialog open={!!createFromHandle && !dialogOpen} onOpenChange={(o) => { if (!o) handleCancelCreateFromHandle(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar Entidade Conectada</DialogTitle>
            <DialogDescription>
              Escolha o tipo de relação e depois defina a nova entidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Predicado da conexão</Label>
            <Select value={createFromPredicate} onValueChange={setCreateFromPredicate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PREDICATES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCreateFromHandle}>Cancelar</Button>
            <Button onClick={handleConfirmCreateFromHandle}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Criar Entidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Niche Graph Wizard */}
      <NicheGraphWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onGenerate={handleWizardGenerate}
        generating={wizardGenerating}
      />

      {/* Entity Detail Panel */}
      <EntityDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        entityId={detailNodeId}
        entityData={detailEntityData}
        projectId={projectId || ""}
        allNodes={detailAllNodes}
        allEdges={detailAllEdges}
      />
    </div>
    </div>
  );
}

export function GraphBuilder({ semanticProjectId }: { semanticProjectId?: string } = {}) {
  return (
    <ReactFlowProvider>
      <GraphBuilderInner semanticProjectId={semanticProjectId} />
    </ReactFlowProvider>
  );
}
