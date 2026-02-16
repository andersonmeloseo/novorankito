import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Search, Globe, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface SchemaResult {
  url: string;
  domain: string;
  schemas: Array<{ type: string; properties: Record<string, unknown> }>;
  error?: string;
}

// Domain color palette
const DOMAIN_COLORS = [
  { bg: "hsl(var(--primary))", text: "hsl(var(--primary-foreground))" },
  { bg: "hsl(var(--accent))", text: "hsl(var(--accent-foreground))" },
  { bg: "hsl(210, 80%, 55%)", text: "#fff" },
  { bg: "hsl(340, 70%, 55%)", text: "#fff" },
  { bg: "hsl(160, 60%, 45%)", text: "#fff" },
  { bg: "hsl(45, 80%, 50%)", text: "#000" },
  { bg: "hsl(270, 60%, 55%)", text: "#fff" },
  { bg: "hsl(20, 75%, 55%)", text: "#fff" },
  { bg: "hsl(190, 70%, 45%)", text: "#fff" },
  { bg: "hsl(300, 50%, 50%)", text: "#fff" },
];

function getDomainColor(index: number) {
  return DOMAIN_COLORS[index % DOMAIN_COLORS.length];
}

export function CompetitorAnalysisTab() {
  const [urls, setUrls] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SchemaResult[]>([]);

  const addUrl = () => {
    if (urls.length >= 10) return;
    setUrls((prev) => [...prev, ""]);
  };

  const removeUrl = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  };

  const analyze = useCallback(async () => {
    const validUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (validUrls.length === 0) {
      toast({ title: "Adicione pelo menos uma URL", variant: "destructive" });
      return;
    }

    // Basic URL validation
    for (const u of validUrls) {
      try {
        new URL(u);
      } catch {
        toast({ title: `URL inválida: ${u}`, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
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

  // Build domain map for colors
  const domainMap = useMemo(() => {
    const map = new Map<string, number>();
    results.forEach((r) => {
      if (!map.has(r.domain)) map.set(r.domain, map.size);
    });
    return map;
  }, [results]);

  // Build comparative graph
  const { graphNodes, graphEdges } = useMemo(() => {
    if (results.length === 0) return { graphNodes: [], graphEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const schemaTypeMap = new Map<string, { domains: string[]; nodeId: string }>();
    let nodeIndex = 0;

    // Create domain center nodes
    const domainNodes = new Map<string, string>();
    results.forEach((r) => {
      if (domainNodes.has(r.domain)) return;
      const domainIdx = domainMap.get(r.domain) ?? 0;
      const color = getDomainColor(domainIdx);
      const angle = (2 * Math.PI * domainIdx) / Math.max(results.length, 1);
      const cx = 500 + 350 * Math.cos(angle);
      const cy = 400 + 350 * Math.sin(angle);
      const id = `domain-${nodeIndex++}`;
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
          padding: "12px 18px",
          fontWeight: 700,
          fontSize: "13px",
          boxShadow: `0 0 20px ${color.bg}40`,
        },
      });

      // Create schema type nodes for this domain
      r.schemas.forEach((schema) => {
        const typeKey = schema.type;
        if (schemaTypeMap.has(typeKey)) {
          // Schema exists, just add edge
          const existing = schemaTypeMap.get(typeKey)!;
          if (!existing.domains.includes(r.domain)) {
            existing.domains.push(r.domain);
            edges.push({
              id: `edge-${nodeIndex++}`,
              source: id,
              target: existing.nodeId,
              animated: true,
              style: { stroke: color.bg, strokeWidth: 2, opacity: 0.7 },
            });
          }
        } else {
          // New schema type node
          const schemaId = `schema-${nodeIndex++}`;
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
              border: `2px solid ${color.bg}80`,
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 500,
            },
          });

          schemaTypeMap.set(typeKey, { domains: [r.domain], nodeId: schemaId });

          edges.push({
            id: `edge-${nodeIndex++}`,
            source: id,
            target: schemaId,
            animated: true,
            style: { stroke: color.bg, strokeWidth: 2, opacity: 0.7 },
          });
        }
      });
    });

    // Highlight shared schemas (connected to multiple domains) 
    schemaTypeMap.forEach((info) => {
      if (info.domains.length > 1) {
        const node = nodes.find((n) => n.id === info.nodeId);
        if (node) {
          node.style = {
            ...node.style,
            background: "hsl(var(--primary) / 0.15)",
            border: "2px solid hsl(var(--primary))",
            boxShadow: "0 0 12px hsl(var(--primary) / 0.3)",
            fontWeight: 700,
          };
        }
      }
    });

    return { graphNodes: nodes, graphEdges: edges };
  }, [results, domainMap]);

  // Stats
  const stats = useMemo(() => {
    const allTypes = new Set<string>();
    const domainTypes = new Map<string, Set<string>>();

    results.forEach((r) => {
      if (!domainTypes.has(r.domain)) domainTypes.set(r.domain, new Set());
      r.schemas.forEach((s) => {
        allTypes.add(s.type);
        domainTypes.get(r.domain)!.add(s.type);
      });
    });

    // Shared schemas
    const shared = [...allTypes].filter((t) => {
      let count = 0;
      domainTypes.forEach((types) => { if (types.has(t)) count++; });
      return count > 1;
    });

    // Exclusive schemas per domain
    const exclusive = new Map<string, string[]>();
    domainTypes.forEach((types, domain) => {
      const exc = [...types].filter((t) => {
        let count = 0;
        domainTypes.forEach((ot) => { if (ot.has(t)) count++; });
        return count === 1;
      });
      if (exc.length > 0) exclusive.set(domain, exc);
    });

    return { totalTypes: allTypes.size, shared, exclusive, domainTypes };
  }, [results]);

  return (
    <div className="space-y-6">
      {/* URL Input Section */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              URLs dos Concorrentes
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione até 10 URLs para analisar os Schema.org dos concorrentes
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={addUrl} disabled={urls.length >= 10}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                placeholder="https://concorrente.com.br"
                className="text-xs"
              />
              {urls.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeUrl(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button onClick={analyze} disabled={loading} className="w-full">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
          ) : (
            <><Search className="h-4 w-4 mr-2" /> Analisar Schemas</>
          )}
        </Button>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground font-display">{results.length}</div>
              <div className="text-[11px] text-muted-foreground">URLs Analisadas</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground font-display">{stats.totalTypes}</div>
              <div className="text-[11px] text-muted-foreground">Tipos de Schema</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-primary font-display">{stats.shared.length}</div>
              <div className="text-[11px] text-muted-foreground">Schemas Compartilhados</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground font-display">
                {results.filter((r) => r.error).length}
              </div>
              <div className="text-[11px] text-muted-foreground">Erros</div>
            </Card>
          </div>

          {/* Domain Legend */}
          <Card className="p-4">
            <Label className="text-xs font-semibold mb-2 block">Legenda dos Domínios</Label>
            <div className="flex flex-wrap gap-2">
              {[...domainMap.entries()].map(([domain, idx]) => {
                const color = getDomainColor(idx);
                const types = stats.domainTypes.get(domain);
                return (
                  <Badge
                    key={domain}
                    className="text-xs px-3 py-1"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {domain} ({types?.size ?? 0} schemas)
                  </Badge>
                );
              })}
            </div>
          </Card>

          {/* Errors */}
          {results.some((r) => r.error) && (
            <Card className="p-4 border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-1">
                  {results.filter((r) => r.error).map((r) => (
                    <div key={r.url} className="text-xs text-destructive">
                      <span className="font-medium">{r.domain}:</span> {r.error}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Comparative Graph */}
          <Card className="overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Grafo Comparativo de Schemas</h3>
              <p className="text-[11px] text-muted-foreground">
                Nodes com borda brilhante = schemas compartilhados entre domínios
              </p>
            </div>
            <div className="h-[550px]">
              <ReactFlow
                nodes={graphNodes}
                edges={graphEdges}
                fitView
                proOptions={{ hideAttribution: true }}
                nodesDraggable
                nodesConnectable={false}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-30" />
                <Controls className="!bg-card !border-border !rounded-lg" />
                <MiniMap className="!bg-card !border-border !rounded-lg" />
              </ReactFlow>
            </div>
          </Card>

          {/* Shared schemas detail */}
          {stats.shared.length > 0 && (
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Schemas Compartilhados</h3>
              <p className="text-xs text-muted-foreground">
                Schemas usados por mais de um concorrente — oportunidades de paridade competitiva
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.shared.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Exclusive schemas */}
          {stats.exclusive.size > 0 && (
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Schemas Exclusivos</h3>
              <p className="text-xs text-muted-foreground">
                Schemas usados por apenas um concorrente — diferenciais competitivos
              </p>
              <div className="space-y-2">
                {[...stats.exclusive.entries()].map(([domain, types]) => {
                  const idx = domainMap.get(domain) ?? 0;
                  const color = getDomainColor(idx);
                  return (
                    <div key={domain} className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className="text-[10px]"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {domain}
                      </Badge>
                      {types.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Raw detail per domain */}
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Detalhe por URL</h3>
            <div className="space-y-4">
              {results.filter((r) => !r.error).map((r) => {
                const idx = domainMap.get(r.domain) ?? 0;
                const color = getDomainColor(idx);
                return (
                  <div key={r.url} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: color.bg }}
                      />
                      <span className="text-xs font-medium text-foreground truncate">{r.url}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {r.schemas.length} schemas
                      </Badge>
                    </div>
                    <div className="ml-5 space-y-1">
                      {r.schemas.map((s, si) => (
                        <div key={si} className="text-[11px] text-muted-foreground">
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
