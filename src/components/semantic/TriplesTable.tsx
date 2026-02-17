import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GitBranch, Search, ArrowRight, Trash2, Filter, Loader2, Network, Plus,
} from "lucide-react";
import { ExportMenu } from "@/components/ui/export-menu";
import { exportCSV, exportXML } from "@/lib/export-utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ENTITY_ICONS, ENTITY_COLORS } from "./EntityNode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EntityRow {
  id: string;
  name: string;
  entity_type: string;
  schema_type: string | null;
}

interface RelationRow {
  id: string;
  subject_id: string;
  object_id: string;
  predicate: string;
  confidence: number | null;
}

interface TripleDisplay {
  id: string;
  subjectName: string;
  subjectType: string;
  predicate: string;
  objectName: string;
  objectType: string;
  confidence: number | null;
}

export function TriplesTable({ semanticProjectId }: { semanticProjectId?: string } = {}) {
  const projectId = localStorage.getItem("rankito_current_project");
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [predicateFilter, setPredicateFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      let entQuery = supabase.from("semantic_entities").select("id, name, entity_type, schema_type").eq("project_id", projectId);
      let relQuery = supabase.from("semantic_relations").select("id, subject_id, object_id, predicate, confidence").eq("project_id", projectId);
      if (semanticProjectId) {
        entQuery = entQuery.eq("goal_project_id", semanticProjectId);
        relQuery = relQuery.eq("goal_project_id", semanticProjectId);
      }
      const [entRes, relRes] = await Promise.all([entQuery, relQuery]);
      setEntities(entRes.data || []);
      setRelations(relRes.data || []);
      setLoading(false);
    })();
  }, [projectId, semanticProjectId]);

  const entityMap = useMemo(() => {
    const map: Record<string, EntityRow> = {};
    entities.forEach((e) => { map[e.id] = e; });
    return map;
  }, [entities]);

  const triples: TripleDisplay[] = useMemo(() =>
    relations.map((r) => {
      const subject = entityMap[r.subject_id];
      const object = entityMap[r.object_id];
      return {
        id: r.id,
        subjectName: subject?.name || "—",
        subjectType: subject?.entity_type || "site",
        predicate: r.predicate,
        objectName: object?.name || "—",
        objectType: object?.entity_type || "site",
        confidence: r.confidence,
      };
    }),
    [relations, entityMap],
  );

  const predicates = useMemo(() => {
    const set = new Set(relations.map((r) => r.predicate));
    return Array.from(set).sort();
  }, [relations]);

  const filtered = useMemo(() => {
    let result = triples;
    if (predicateFilter !== "all") {
      result = result.filter((t) => t.predicate === predicateFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.subjectName.toLowerCase().includes(q) ||
          t.objectName.toLowerCase().includes(q) ||
          t.predicate.toLowerCase().includes(q),
      );
    }
    return result;
  }, [triples, predicateFilter, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("semantic_relations").delete().eq("id", deleteId);
    setRelations((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
    toast({ title: "Relação excluída" });
  };

  if (!projectId) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Network className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Selecione um projeto para ver os triples.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Descrição da funcionalidade */}
      <Card className="p-4 border-primary/20 bg-accent/30">
        <div className="flex gap-3 items-start">
          <GitBranch className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">O que são Triples (Triplas Semânticas)?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Triples são a base do <strong>SEO Semântico</strong>. Cada triple é uma declaração no formato{" "}
              <strong>Sujeito → Predicado → Objeto</strong> (ex: &quot;Padaria Artesanal <em>oferece</em> Pão Sourdough&quot;).
              São essas relações que o Google usa para entender <strong>quem você é</strong>, <strong>o que oferece</strong> e{" "}
              <strong>como se conecta</strong> ao seu nicho. Quanto mais triples bem definidos, maior sua{" "}
              <strong>Autoridade Semântica</strong> — e melhor seu posicionamento orgânico.
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              💡 <strong>Como usar:</strong> Crie relações no <em>Construtor de Grafo</em> e elas aparecerão automaticamente aqui.
              Use esta tabela para auditar, filtrar por predicado, exportar em CSV/XML e garantir que seu grafo está completo.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{entities.length}</p>
          <p className="text-xs text-muted-foreground">Entidades</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{relations.length}</p>
          <p className="text-xs text-muted-foreground">Relações</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{predicates.length}</p>
          <p className="text-xs text-muted-foreground">Predicados</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: "graph" }))}>
          <Plus className="h-3.5 w-3.5" />
          Novo Triple
        </Button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar entidades ou predicados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={predicateFilter} onValueChange={setPredicateFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Filtrar predicado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os predicados</SelectItem>
            {predicates.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportMenu
          onExportCSV={() => exportCSV(filtered.map(t => ({ Sujeito: t.subjectName, Tipo_Sujeito: t.subjectType, Predicado: t.predicate, Objeto: t.objectName, Tipo_Objeto: t.objectType, Confiança: t.confidence ?? "" })), "triples")}
          onExportXML={() => exportXML(filtered.map(t => ({ Sujeito: t.subjectName, Tipo_Sujeito: t.subjectType, Predicado: t.predicate, Objeto: t.objectName, Tipo_Objeto: t.objectType, Confiança: t.confidence ?? "" })), "triples", "triples", "triple")}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
          <GitBranch className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Nenhum triple encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {relations.length === 0
              ? "Crie relações entre entidades no Construtor de Grafo para vê-las aqui."
              : "Nenhum resultado para os filtros selecionados."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ScrollArea className="h-[calc(100vh-480px)] min-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Sujeito</TableHead>
                  <TableHead className="text-xs text-center">Predicado</TableHead>
                  <TableHead className="text-xs">Objeto</TableHead>
                  <TableHead className="text-xs w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const SubIcon = ENTITY_ICONS[t.subjectType] || ENTITY_ICONS.site;
                  const ObjIcon = ENTITY_ICONS[t.objectType] || ENTITY_ICONS.site;
                  const subColor = ENTITY_COLORS[t.subjectType] || "hsl(250 85% 60%)";
                  const objColor = ENTITY_COLORS[t.objectType] || "hsl(250 85% 60%)";
                  return (
                    <TableRow key={t.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: subColor + "22", color: subColor }}>
                            <SubIcon className="h-3 w-3" />
                          </div>
                          <span className="text-xs font-medium truncate max-w-[150px]">{t.subjectName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px]">{t.predicate}</Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: objColor + "22", color: objColor }}>
                            <ObjIcon className="h-3 w-3" />
                          </div>
                          <span className="text-xs font-medium truncate max-w-[150px]">{t.objectName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
