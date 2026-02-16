import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Plus, Trash2, Search, Globe, AlertTriangle, X, Code2,
  Save, History, Clock, ChevronRight, Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { format } from "date-fns";

interface SchemaResult {
  url: string;
  domain: string;
  schemas: Array<{ type: string; properties: Record<string, unknown> }>;
  error?: string;
}

interface SchemaNodeMeta {
  type: string;
  domain: string;
  url: string;
  properties: Record<string, unknown>;
  isDomain?: boolean;
}

interface SavedAnalysis {
  id: string;
  name: string;
  urls: string[];
  results: SchemaResult[];
  schemas_count: number;
  created_at: string;
}

const DOMAIN_COLORS = [
  { bg: "hsl(var(--primary))", text: "hsl(var(--primary-foreground))", raw: "var(--primary)" },
  { bg: "hsl(210, 80%, 55%)", text: "#fff", raw: "210, 80%, 55%" },
  { bg: "hsl(340, 70%, 55%)", text: "#fff", raw: "340, 70%, 55%" },
  { bg: "hsl(160, 60%, 45%)", text: "#fff", raw: "160, 60%, 45%" },
  { bg: "hsl(45, 80%, 50%)", text: "#000", raw: "45, 80%, 50%" },
  { bg: "hsl(270, 60%, 55%)", text: "#fff", raw: "270, 60%, 55%" },
  { bg: "hsl(20, 75%, 55%)", text: "#fff", raw: "20, 75%, 55%" },
  { bg: "hsl(190, 70%, 45%)", text: "#fff", raw: "190, 70%, 45%" },
  { bg: "hsl(300, 50%, 50%)", text: "#fff", raw: "300, 50%, 50%" },
  { bg: "hsl(120, 50%, 40%)", text: "#fff", raw: "120, 50%, 40%" },
];

function getDomainColor(index: number) {
  return DOMAIN_COLORS[index % DOMAIN_COLORS.length];
}

/* ── Inner Graph component (uses hooks that need ReactFlowProvider) ── */
function GraphCanvas({
  initialNodes,
  initialEdges,
  nodeMetaMap,
  onNodeClick,
  selectedNodeId,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  nodeMetaMap: Map<string, SchemaNodeMeta>;
  onNodeClick: (meta: SchemaNodeMeta) => void;
  selectedNodeId: string | null;
}) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      const meta = nodeMetaMap.get(node.id);
      if (meta) onNodeClick(meta);
    },
    [nodeMetaMap, onNodeClick],
  );

  // Highlight selected node
  const styledNodes = useMemo(() =>
    nodes.map((n) => ({
      ...n,
      style: {
        ...n.style,
        ...(selectedNodeId === n.id
          ? { boxShadow: "0 0 0 3px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 0.4)" }
          : {}),
      },
    })),
    [nodes, selectedNodeId],
  );

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      className="competitor-graph"
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="hsl(var(--muted-foreground) / 0.15)" />
      <Controls
        className="!bg-card/90 !backdrop-blur-sm !border-border !rounded-xl !shadow-lg"
        showInteractive={false}
      />
      <MiniMap
        className="!bg-card/80 !backdrop-blur-sm !border-border !rounded-xl !shadow-lg"
        nodeColor={(n) => {
          const meta = nodeMetaMap.get(n.id);
          if (meta?.isDomain) return String(n.style?.background || "hsl(var(--primary))");
          return "hsl(var(--muted))";
        }}
        maskColor="hsl(var(--background) / 0.7)"
      />
      <Panel position="top-right" className="flex gap-1.5">
        <Badge variant="outline" className="text-[10px] bg-card/80 backdrop-blur-sm border-border">
          <Sparkles className="h-3 w-3 mr-1 text-primary" />
          Arraste para reorganizar
        </Badge>
      </Panel>
    </ReactFlow>
  );
}

/* ── Main Component ── */
export function CompetitorAnalysisTab() {
  const { user } = useAuth();
  const projectId = localStorage.getItem("rankito_current_project");

  const [urls, setUrls] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SchemaResult[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<SchemaNodeMeta | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const [analysisName, setAnalysisName] = useState("");

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load history
  const fetchHistory = useCallback(async () => {
    if (!projectId || !user) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from("competitor_analyses")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data as unknown as SavedAnalysis[] | null) || []);
    setLoadingHistory(false);
  }, [projectId, user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addUrl = () => {
    if (urls.length >= 10) return;
    setUrls((prev) => [...prev, ""]);
  };

  const removeUrl = (index: number) => setUrls((prev) => prev.filter((_, i) => i !== index));
  const updateUrl = (index: number, value: string) => setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));

  const handleNodeClick = useCallback((meta: SchemaNodeMeta) => {
    setSelectedSchema(meta);
    // Find node id from meta
    const key = meta.isDomain ? `domain-${meta.domain}` : `schema-${meta.type}-${meta.domain}`;
    setSelectedNodeId(key);
  }, []);

  const analyze = useCallback(async () => {
    const validUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (validUrls.length === 0) {
      toast({ title: "Adicione pelo menos uma URL", variant: "destructive" });
      return;
    }

    for (const u of validUrls) {
      try { new URL(u); } catch {
        toast({ title: `URL inválida: ${u}`, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    setSelectedSchema(null);
    setSelectedNodeId(null);
    try {
      const { data, error } = await supabase.functions.invoke("extract-competitor-schema", {
        body: { urls: validUrls },
      });

      if (error) throw error;
      if (!data?.results) throw new Error("No results");

      setResults(data.results);
      const totalSchemas = data.results.reduce((acc: number, r: SchemaResult) => acc + r.schemas.length, 0);
      toast({
        title: "Análise concluída",
        description: `${totalSchemas} schemas encontrados em ${data.results.length} URLs`,
      });
    } catch (e: any) {
      toast({ title: "Erro na análise", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [urls]);

  // Save analysis
  const saveAnalysis = useCallback(async () => {
    if (!projectId || !user || results.length === 0) return;
    setSavingHistory(true);
    const totalSchemas = results.reduce((acc, r) => acc + r.schemas.length, 0);
    const name = analysisName.trim() || `Análise ${format(new Date(), "dd/MM HH:mm")}`;

    const { error } = await supabase.from("competitor_analyses").insert({
      project_id: projectId,
      owner_id: user.id,
      name,
      urls: urls.filter((u) => u.trim()),
      results: results as any,
      schemas_count: totalSchemas,
    });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Análise salva!", description: name });
      setAnalysisName("");
      fetchHistory();
    }
    setSavingHistory(false);
  }, [projectId, user, results, urls, analysisName, fetchHistory]);

  // Load from history
  const loadAnalysis = useCallback((analysis: SavedAnalysis) => {
    setUrls(analysis.urls.length > 0 ? analysis.urls : [""]);
    setResults(analysis.results);
    setSelectedSchema(null);
    setSelectedNodeId(null);
    setShowHistory(false);
    toast({ title: "Análise carregada", description: analysis.name });
  }, []);

  // Delete from history
  const deleteAnalysis = useCallback(async (id: string) => {
    await supabase.from("competitor_analyses").delete().eq("id", id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
    toast({ title: "Análise removida" });
  }, []);

  // Build domain map
  const domainMap = useMemo(() => {
    const map = new Map<string, number>();
    results.forEach((r) => {
      if (!map.has(r.domain)) map.set(r.domain, map.size);
    });
    return map;
  }, [results]);

  // Build graph + meta
  const { graphNodes, graphEdges, nodeMetaMap } = useMemo(() => {
    if (results.length === 0) return { graphNodes: [], graphEdges: [], nodeMetaMap: new Map<string, SchemaNodeMeta>() };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const metaMap = new Map<string, SchemaNodeMeta>();
    const schemaTypeMap = new Map<string, { domains: string[]; nodeId: string; urls: string[] }>();
    let edgeIdx = 0;

    const domainNodes = new Map<string, string>();
    results.forEach((r) => {
      if (domainNodes.has(r.domain)) return;
      const domainIdx = domainMap.get(r.domain) ?? 0;
      const color = getDomainColor(domainIdx);
      const angle = (2 * Math.PI * domainIdx) / Math.max(domainMap.size, 1);
      const cx = 500 + 350 * Math.cos(angle);
      const cy = 400 + 350 * Math.sin(angle);
      const id = `domain-${r.domain}`;
      domainNodes.set(r.domain, id);

      nodes.push({
        id,
        position: { x: cx, y: cy },
        data: { label: r.domain },
        style: {
          background: color.bg,
          color: color.text,
          border: `2px solid ${color.bg}`,
          borderRadius: "12px",
          padding: "10px 16px",
          fontWeight: 700,
          fontSize: "12px",
          boxShadow: `0 4px 20px ${color.bg}30`,
          cursor: "pointer",
          transition: "box-shadow 0.2s",
        },
      });

      metaMap.set(id, {
        type: r.domain,
        domain: r.domain,
        url: r.url,
        properties: { schemas_count: r.schemas.length, url: r.url },
        isDomain: true,
      });

      r.schemas.forEach((schema) => {
        const typeKey = schema.type;
        if (schemaTypeMap.has(typeKey)) {
          const existing = schemaTypeMap.get(typeKey)!;
          if (!existing.domains.includes(r.domain)) {
            existing.domains.push(r.domain);
            existing.urls.push(r.url);
            edges.push({
              id: `edge-${edgeIdx++}`,
              source: id,
              target: existing.nodeId,
              animated: true,
              style: { stroke: color.bg, strokeWidth: 2, opacity: 0.6 },
            });
          }
        } else {
          const schemaId = `schema-${typeKey}-${r.domain}`;
          const schemaAngle = angle + (Math.random() - 0.5) * 1.2;
          const schemaRadius = 150 + Math.random() * 100;

          nodes.push({
            id: schemaId,
            position: {
              x: Number(cx) + schemaRadius * Math.cos(schemaAngle),
              y: Number(cy) + schemaRadius * Math.sin(schemaAngle),
            },
            data: { label: typeKey },
            style: {
              background: "hsl(var(--card))",
              color: "hsl(var(--card-foreground))",
              border: `2px solid ${color.bg}50`,
              borderRadius: "8px",
              padding: "5px 10px",
              fontSize: "10px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "box-shadow 0.2s, border-color 0.2s",
            },
          });

          metaMap.set(schemaId, { type: typeKey, domain: r.domain, url: r.url, properties: schema.properties });
          schemaTypeMap.set(typeKey, { domains: [r.domain], nodeId: schemaId, urls: [r.url] });

          edges.push({
            id: `edge-${edgeIdx++}`,
            source: id,
            target: schemaId,
            animated: true,
            style: { stroke: color.bg, strokeWidth: 2, opacity: 0.6 },
          });
        }
      });
    });

    schemaTypeMap.forEach((info) => {
      if (info.domains.length > 1) {
        const node = nodes.find((n) => n.id === info.nodeId);
        if (node) {
          node.style = {
            ...node.style,
            background: "hsl(var(--primary) / 0.12)",
            border: "2px solid hsl(var(--primary))",
            boxShadow: "0 0 16px hsl(var(--primary) / 0.25)",
            fontWeight: 700,
          };
          const existingMeta = metaMap.get(info.nodeId);
          if (existingMeta) {
            existingMeta.properties = {
              ...existingMeta.properties,
              shared_between: info.domains.join(", "),
              source_urls: info.urls.join(", "),
            };
          }
        }
      }
    });

    return { graphNodes: nodes, graphEdges: edges, nodeMetaMap: metaMap };
  }, [results, domainMap]);

  // Stats
  const stats = useMemo(() => {
    const allTypes = new Set<string>();
    const domainTypes = new Map<string, Set<string>>();
    results.forEach((r) => {
      if (!domainTypes.has(r.domain)) domainTypes.set(r.domain, new Set());
      r.schemas.forEach((s) => { allTypes.add(s.type); domainTypes.get(r.domain)!.add(s.type); });
    });
    const shared = [...allTypes].filter((t) => {
      let c = 0; domainTypes.forEach((types) => { if (types.has(t)) c++; }); return c > 1;
    });
    const exclusive = new Map<string, string[]>();
    domainTypes.forEach((types, domain) => {
      const exc = [...types].filter((t) => {
        let c = 0; domainTypes.forEach((ot) => { if (ot.has(t)) c++; }); return c === 1;
      });
      if (exc.length > 0) exclusive.set(domain, exc);
    });
    return { totalTypes: allTypes.size, shared, exclusive, domainTypes };
  }, [results]);

  const renderValue = (val: unknown): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "string") return val.length > 120 ? val.slice(0, 120) + "…" : val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
    return JSON.stringify(val);
  };

  return (
    <div className="space-y-5">
      {/* Header row: Input + History toggle */}
      <div className="flex gap-3 items-start">
        {/* URL Input */}
        <Card className="p-4 space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                URLs dos Concorrentes
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Até 10 URLs — analisamos o Schema.org (JSON-LD) de cada página
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory(); }}
                className="text-xs"
              >
                <History className="h-3.5 w-3.5 mr-1" />
                Histórico{history.length > 0 && ` (${history.length})`}
              </Button>
              <Button size="sm" variant="outline" onClick={addUrl} disabled={urls.length >= 10}>
                <Plus className="h-3.5 w-3.5 mr-1" /> URL
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {urls.map((url, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  value={url}
                  onChange={(e) => updateUrl(i, e.target.value)}
                  placeholder="https://concorrente.com.br"
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === "Enter" && analyze()}
                />
                {urls.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeUrl(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button onClick={analyze} disabled={loading} size="sm" className="w-full">
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analisando...</>
            ) : (
              <><Search className="h-3.5 w-3.5 mr-1.5" /> Analisar Schemas</>
            )}
          </Button>
        </Card>
      </div>

      {/* History Panel */}
      {showHistory && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Análises Salvas
            </h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma análise salva ainda.</p>
          ) : (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors"
                  onClick={() => loadAnalysis(h)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{h.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {h.urls.length} URLs • {h.schemas_count} schemas • {format(new Date(h.created_at), "dd/MM/yy HH:mm")}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); deleteAnalysis(h.id); }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Stats + Save Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3 text-center card-hover">
              <div className="text-xl font-bold text-foreground font-display">{results.length}</div>
              <div className="text-[10px] text-muted-foreground">URLs</div>
            </Card>
            <Card className="p-3 text-center card-hover">
              <div className="text-xl font-bold text-foreground font-display">{stats.totalTypes}</div>
              <div className="text-[10px] text-muted-foreground">Schemas</div>
            </Card>
            <Card className="p-3 text-center card-hover">
              <div className="text-xl font-bold text-primary font-display">{stats.shared.length}</div>
              <div className="text-[10px] text-muted-foreground">Compartilhados</div>
            </Card>
            <Card className="p-3 text-center card-hover">
              <div className="text-xl font-bold text-foreground font-display">
                {results.filter((r) => r.error).length}
              </div>
              <div className="text-[10px] text-muted-foreground">Erros</div>
            </Card>
            <Card className="p-3 flex items-center gap-1.5">
              <Input
                value={analysisName}
                onChange={(e) => setAnalysisName(e.target.value)}
                placeholder="Nome da análise..."
                className="text-[11px] h-7 flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 shrink-0"
                onClick={saveAnalysis}
                disabled={savingHistory}
                title="Salvar análise"
              >
                {savingHistory ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
            </Card>
          </div>

          {/* Domain Legend */}
          <div className="flex flex-wrap gap-1.5">
            {[...domainMap.entries()].map(([domain, idx]) => {
              const color = getDomainColor(idx);
              const types = stats.domainTypes.get(domain);
              return (
                <Badge
                  key={domain}
                  className="text-[10px] px-2.5 py-0.5"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {domain} ({types?.size ?? 0})
                </Badge>
              );
            })}
          </div>

          {/* Errors */}
          {results.some((r) => r.error) && (
            <Card className="p-3 border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  {results.filter((r) => r.error).map((r) => (
                    <div key={r.url} className="text-[11px] text-destructive">
                      <span className="font-medium">{r.domain}:</span> {r.error}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ═══ Comparative Graph + Detail Panel ═══ */}
          <Card className="overflow-hidden rounded-xl border-border">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Grafo Comparativo</h3>
                <p className="text-[10px] text-muted-foreground">
                  Clique em um node para inspecionar • Nodes brilhantes = compartilhados
                </p>
              </div>
              {selectedSchema && (
                <Badge variant="secondary" className="text-[10px]">
                  <Code2 className="h-3 w-3 mr-1" />
                  {selectedSchema.type}
                </Badge>
              )}
            </div>

            <div className="flex" style={{ height: 580 }}>
              {/* Graph */}
              <div className={`transition-all duration-300 ease-in-out ${selectedSchema ? "w-[58%]" : "w-full"}`}>
                <div className="h-full">
                  <ReactFlowProvider>
                    <GraphCanvas
                      initialNodes={graphNodes}
                      initialEdges={graphEdges}
                      nodeMetaMap={nodeMetaMap}
                      onNodeClick={handleNodeClick}
                      selectedNodeId={selectedNodeId}
                    />
                  </ReactFlowProvider>
                </div>
              </div>

              {/* Detail Panel */}
              {selectedSchema && (
                <div className="w-[42%] border-l border-border bg-card/50 backdrop-blur-sm flex flex-col">
                  <div className="px-3 py-2.5 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Code2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {selectedSchema.type}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => { setSelectedSchema(null); setSelectedNodeId(null); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-3">
                      {/* Source */}
                      <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Fonte</Label>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: getDomainColor(domainMap.get(selectedSchema.domain) ?? 0).bg }}
                          />
                          <span className="text-[11px] font-medium text-foreground">{selectedSchema.domain}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate" title={selectedSchema.url}>
                          {selectedSchema.url}
                        </div>
                      </div>

                      {selectedSchema.isDomain ? (
                        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                          <p className="text-[11px] text-muted-foreground">
                            Node de domínio. Clique em um schema conectado para ver as propriedades.
                          </p>
                          <div className="text-xs">
                            <span className="font-medium text-foreground">{String(selectedSchema.properties.schemas_count)}</span>
                            <span className="text-muted-foreground"> schemas encontrados</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Properties */}
                          <div className="space-y-1.5">
                            <Label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                              Propriedades ({Object.keys(selectedSchema.properties).length})
                            </Label>
                            <div className="rounded-lg border border-border overflow-hidden">
                              <table className="w-full text-[10px]">
                                <thead>
                                  <tr className="bg-muted/50">
                                    <th className="text-left px-2 py-1 font-medium text-muted-foreground">Campo</th>
                                    <th className="text-left px-2 py-1 font-medium text-muted-foreground">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(selectedSchema.properties).map(([key, val]) => (
                                    <tr key={key} className="border-t border-border hover:bg-muted/30 transition-colors">
                                      <td className="px-2 py-1 font-medium text-foreground align-top whitespace-nowrap">
                                        {key}
                                      </td>
                                      <td
                                        className="px-2 py-1 text-muted-foreground break-all"
                                        title={typeof val === "string" ? val : undefined}
                                      >
                                        {renderValue(val)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* JSON-LD */}
                          <div className="space-y-1.5">
                            <Label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">JSON-LD</Label>
                            <pre className="bg-muted/40 rounded-lg p-2 text-[9px] text-foreground overflow-x-auto whitespace-pre-wrap font-mono border border-border leading-relaxed">
{JSON.stringify(
  { "@context": "https://schema.org", "@type": selectedSchema.type, ...selectedSchema.properties },
  null,
  2,
)}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </Card>

          {/* Shared schemas */}
          {stats.shared.length > 0 && (
            <Card className="p-4 space-y-2">
              <h3 className="text-xs font-semibold text-foreground">Schemas Compartilhados</h3>
              <p className="text-[10px] text-muted-foreground">
                Usados por mais de um concorrente — oportunidades de paridade competitiva
              </p>
              <div className="flex flex-wrap gap-1.5">
                {stats.shared.map((type) => (
                  <Badge key={type} variant="secondary" className="text-[10px]">{type}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Exclusive schemas */}
          {stats.exclusive.size > 0 && (
            <Card className="p-4 space-y-2">
              <h3 className="text-xs font-semibold text-foreground">Schemas Exclusivos</h3>
              <p className="text-[10px] text-muted-foreground">
                Usados por apenas um concorrente — diferenciais competitivos
              </p>
              <div className="space-y-1.5">
                {[...stats.exclusive.entries()].map(([domain, types]) => {
                  const idx = domainMap.get(domain) ?? 0;
                  const color = getDomainColor(idx);
                  return (
                    <div key={domain} className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="text-[9px]" style={{ backgroundColor: color.bg, color: color.text }}>
                        {domain}
                      </Badge>
                      {types.map((t) => (
                        <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Detail per URL */}
          <Card className="p-4 space-y-2">
            <h3 className="text-xs font-semibold text-foreground">Detalhe por URL</h3>
            <div className="space-y-3">
              {results.filter((r) => !r.error).map((r) => {
                const idx = domainMap.get(r.domain) ?? 0;
                const color = getDomainColor(idx);
                return (
                  <div key={r.url} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color.bg }} />
                      <span className="text-[11px] font-medium text-foreground truncate">{r.url}</span>
                      <Badge variant="secondary" className="text-[9px] shrink-0">{r.schemas.length}</Badge>
                    </div>
                    <div className="ml-4 space-y-0.5">
                      {r.schemas.map((s, si) => (
                        <div key={si} className="text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">{s.type}</span>
                          {" — "}
                          {Object.keys(s.properties).slice(0, 5).join(", ")}
                          {Object.keys(s.properties).length > 5 && ` +${Object.keys(s.properties).length - 5}`}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
