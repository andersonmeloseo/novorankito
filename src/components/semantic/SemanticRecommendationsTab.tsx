import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb, Network, GitBranch, Code2, AlertTriangle, Loader2,
  ArrowRight, Zap, Link2, FileText, Plus, CheckCircle2, Target,
  TrendingUp, Users, Globe, Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ENTITY_ICONS, ENTITY_COLORS } from "./EntityNode";

interface EntityRow {
  id: string;
  name: string;
  entity_type: string;
  schema_type: string | null;
  description: string | null;
}

interface RelationRow {
  id: string;
  subject_id: string;
  object_id: string;
  predicate: string;
}

interface Recommendation {
  id: string;
  type: "missing_schema" | "disconnected" | "missing_description" | "low_relations" | "suggested_entity" | "suggested_relation";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  action: string;
  icon: React.ElementType;
}

const PRIORITY_CONFIG = {
  high: { label: "Alta", color: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Média", color: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Baixa", color: "bg-info/10 text-info border-info/20" },
};

// Suggested entity types based on existing ones
const ENTITY_SUGGESTIONS: Record<string, Array<{ type: string; name: string; reason: string }>> = {
  empresa: [
    { type: "produto", name: "Produto/Serviço principal", reason: "Toda empresa deve declarar o que oferece" },
    { type: "local", name: "Endereço comercial", reason: "Localização fortalece SEO local" },
    { type: "pessoa", name: "Fundador/CEO", reason: "Autoridade pessoal reforça E-E-A-T" },
    { type: "gbp", name: "Google Business Profile", reason: "Presença no Google Maps" },
  ],
  produto: [
    { type: "avaliacao", name: "Avaliações do produto", reason: "Reviews geram rich snippets de estrelas" },
    { type: "empresa", name: "Fabricante/Marca", reason: "Associar ao fabricante reforça confiança" },
  ],
  servico: [
    { type: "local", name: "Área de atendimento", reason: "Define alcance geográfico do serviço" },
    { type: "avaliacao", name: "Depoimentos", reason: "Prova social melhora conversão e SEO" },
  ],
  local: [
    { type: "empresa", name: "Negócio no local", reason: "Vincular local à entidade comercial" },
  ],
  pessoa: [
    { type: "site", name: "Página/Perfil profissional", reason: "Link para autoridade online da pessoa" },
  ],
};

// Suggested relations based on entity types present
const RELATION_SUGGESTIONS: Array<{ subjectType: string; objectType: string; predicate: string; reason: string }> = [
  { subjectType: "empresa", objectType: "produto", predicate: "oferece", reason: "Declara a oferta principal" },
  { subjectType: "empresa", objectType: "local", predicate: "localizado_em", reason: "Ancora o negócio geograficamente" },
  { subjectType: "empresa", objectType: "pessoa", predicate: "é_dono_de", reason: "Vincula autoridade pessoal" },
  { subjectType: "pessoa", objectType: "empresa", predicate: "trabalha_em", reason: "Reforça credenciais E-E-A-T" },
  { subjectType: "produto", objectType: "avaliacao", predicate: "avalia", reason: "Habilita rich snippets de reviews" },
  { subjectType: "empresa", objectType: "gbp", predicate: "relacionado_a", reason: "Conecta ao Google Business" },
  { subjectType: "servico", objectType: "local", predicate: "localizado_em", reason: "Define área de atuação" },
];

export function SemanticRecommendationsTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const { user } = useAuth();
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    if (!projectId) return;
    setLoading(true);
    const [entRes, relRes] = await Promise.all([
      supabase.from("semantic_entities").select("id, name, entity_type, schema_type, description").eq("project_id", projectId),
      supabase.from("semantic_relations").select("id, subject_id, object_id, predicate").eq("project_id", projectId),
    ]);
    setEntities(entRes.data || []);
    setRelations(relRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const handleAction = async (rec: Recommendation) => {
    if (!projectId || !user) return;
    setActionLoading(rec.id);

    try {
      // Actions that navigate to another tab
      if (rec.type === "disconnected" || rec.type === "low_relations") {
        window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: "graph" }));
        toast({ title: "Navegando para o Construtor de Grafo", description: `Conecte "${rec.entityName}" a outras entidades.` });
      } else if (rec.type === "missing_schema") {
        window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: "schema" }));
        toast({ title: "Navegando para Schema.org", description: `Atribua um tipo Schema para "${rec.entityName}".` });
      } else if (rec.type === "missing_description") {
        window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: "graph" }));
        toast({ title: "Navegando para o Construtor de Grafo", description: `Clique em "${rec.entityName}" para editar a descrição.` });
      } else if (rec.type === "suggested_entity") {
        // Auto-create the suggested entity
        const { error } = await supabase.from("semantic_entities").insert({
          name: rec.title.replace("Criar entidade: ", ""),
          entity_type: rec.entityType || "outro",
          project_id: projectId,
          owner_id: user.id,
          position_x: Math.random() * 400 + 100,
          position_y: Math.random() * 400 + 100,
        });
        if (error) throw error;
        toast({ title: "Entidade criada!", description: `"${rec.entityType}" adicionada ao grafo.` });
        await fetchData();
      } else if (rec.type === "suggested_relation") {
        // Find matching entities for the relation
        const subjectType = rec.title.split(" → ")[0]?.replace("Conectar ", "");
        const objectType = rec.title.split(" → ")[2];
        const predicate = rec.title.split(" → ")[1];
        const subject = entities.find((e) => e.entity_type === subjectType);
        const object = entities.find((e) => e.entity_type === objectType);
        if (subject && object && predicate) {
          const { error } = await supabase.from("semantic_relations").insert({
            subject_id: subject.id,
            object_id: object.id,
            predicate,
            project_id: projectId,
            owner_id: user.id,
          });
          if (error) throw error;
          toast({ title: "Relação criada!", description: `${subjectType} → ${predicate} → ${objectType}` });
          await fetchData();
        }
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao executar ação", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];
    let idCounter = 0;

    // Connected nodes
    const connectedIds = new Set<string>();
    relations.forEach((r) => {
      connectedIds.add(r.subject_id);
      connectedIds.add(r.object_id);
    });

    // Relations per entity
    const relCount: Record<string, number> = {};
    relations.forEach((r) => {
      relCount[r.subject_id] = (relCount[r.subject_id] || 0) + 1;
      relCount[r.object_id] = (relCount[r.object_id] || 0) + 1;
    });

    // Existing entity types
    const existingTypes = new Set(entities.map((e) => e.entity_type));

    // Existing relation pairs (type-to-type)
    const existingRelPairs = new Set<string>();
    relations.forEach((r) => {
      const sub = entities.find((e) => e.id === r.subject_id);
      const obj = entities.find((e) => e.id === r.object_id);
      if (sub && obj) {
        existingRelPairs.add(`${sub.entity_type}-${obj.entity_type}-${r.predicate}`);
      }
    });

    // 1. Disconnected entities
    entities.forEach((e) => {
      if (!connectedIds.has(e.id)) {
        recs.push({
          id: `rec-${idCounter++}`,
          type: "disconnected",
          priority: "high",
          title: `"${e.name}" está isolada no grafo`,
          description: "Entidades sem conexões não contribuem para a rede semântica. Conecte-a a outras entidades.",
          entityId: e.id,
          entityName: e.name,
          entityType: e.entity_type,
          action: "Abra o Construtor de Grafo e arraste um handle desta entidade para outra",
          icon: Link2,
        });
      }
    });

    // 2. Missing Schema.org
    entities.forEach((e) => {
      if (!e.schema_type) {
        recs.push({
          id: `rec-${idCounter++}`,
          type: "missing_schema",
          priority: "high",
          title: `"${e.name}" sem tipo Schema.org`,
          description: "Sem marcação Schema, o Google não pode classificar esta entidade corretamente nos resultados de busca.",
          entityId: e.id,
          entityName: e.name,
          entityType: e.entity_type,
          action: "Edite a entidade e atribua um tipo Schema.org na aba Schema.org",
          icon: Code2,
        });
      }
    });

    // 3. Missing description
    entities.forEach((e) => {
      if (!e.description?.trim()) {
        recs.push({
          id: `rec-${idCounter++}`,
          type: "missing_description",
          priority: "medium",
          title: `"${e.name}" sem descrição`,
          description: "Descrições ajudam na geração de conteúdo e contexto semântico para o Google.",
          entityId: e.id,
          entityName: e.name,
          entityType: e.entity_type,
          action: "Edite a entidade e adicione uma descrição explicativa",
          icon: FileText,
        });
      }
    });

    // 4. Low relations (1 or less)
    entities.forEach((e) => {
      const count = relCount[e.id] || 0;
      if (count === 1 && connectedIds.has(e.id)) {
        recs.push({
          id: `rec-${idCounter++}`,
          type: "low_relations",
          priority: "low",
          title: `"${e.name}" tem apenas 1 conexão`,
          description: "Entidades com poucas conexões têm menos peso semântico. Adicione mais relações para fortalecer sua posição no grafo.",
          entityId: e.id,
          entityName: e.name,
          entityType: e.entity_type,
          action: "Conecte esta entidade a mais entidades relevantes",
          icon: GitBranch,
        });
      }
    });

    // 5. Suggested new entities based on existing types
    existingTypes.forEach((type) => {
      const suggestions = ENTITY_SUGGESTIONS[type] || [];
      suggestions.forEach((s) => {
        if (!existingTypes.has(s.type)) {
          // Only suggest if not already present
          if (!recs.some((r) => r.type === "suggested_entity" && r.entityType === s.type)) {
            recs.push({
              id: `rec-${idCounter++}`,
              type: "suggested_entity",
              priority: "medium",
              title: `Criar entidade: ${s.name}`,
              description: s.reason,
              entityType: s.type,
              action: `Crie uma entidade do tipo "${s.type}" no Construtor de Grafo`,
              icon: Plus,
            });
          }
        }
      });
    });

    // 6. Suggested relations
    RELATION_SUGGESTIONS.forEach((s) => {
      if (existingTypes.has(s.subjectType) && existingTypes.has(s.objectType)) {
        const pairKey = `${s.subjectType}-${s.objectType}-${s.predicate}`;
        if (!existingRelPairs.has(pairKey)) {
          recs.push({
            id: `rec-${idCounter++}`,
            type: "suggested_relation",
            priority: "low",
            title: `Conectar ${s.subjectType} → ${s.predicate} → ${s.objectType}`,
            description: s.reason,
            action: "Crie esta conexão no Construtor de Grafo arrastando entre as entidades",
            icon: ArrowRight,
          });
        }
      }
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [entities, relations]);

  const stats = useMemo(() => ({
    high: recommendations.filter((r) => r.priority === "high").length,
    medium: recommendations.filter((r) => r.priority === "medium").length,
    low: recommendations.filter((r) => r.priority === "low").length,
  }), [recommendations]);

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </Card>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-4 border-primary/20 bg-accent/30">
          <div className="flex gap-3 items-start">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Recomendador de Conteúdo Semântico</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Crie entidades no Construtor de Grafo para receber recomendações inteligentes de melhorias.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
          <Lightbulb className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-base font-semibold">Sem dados para análise</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Crie entidades e relações para que o motor de recomendações identifique oportunidades.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      <Card className="p-4 border-primary/20 bg-accent/30">
        <div className="flex gap-3 items-start">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Recomendador de Conteúdo Semântico</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O motor analisa seu grafo e identifica <strong>lacunas</strong>, <strong>entidades desconectadas</strong>, <strong>schemas ausentes</strong> e <strong>relações estratégicas</strong> que fortaleceriam sua autoridade semântica.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center border-destructive/20">
          <p className="text-2xl font-bold text-destructive">{stats.high}</p>
          <p className="text-xs text-muted-foreground">Prioridade Alta</p>
        </Card>
        <Card className="p-4 text-center border-warning/20">
          <p className="text-2xl font-bold text-warning">{stats.medium}</p>
          <p className="text-xs text-muted-foreground">Prioridade Média</p>
        </Card>
        <Card className="p-4 text-center border-info/20">
          <p className="text-2xl font-bold text-info">{stats.low}</p>
          <p className="text-xs text-muted-foreground">Prioridade Baixa</p>
        </Card>
      </div>

      {recommendations.length === 0 ? (
        <Card className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <h3 className="text-base font-semibold text-foreground">Grafo completo! 🎉</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Seu grafo semântico está bem configurado. Continue monitorando e expandindo conforme seu negócio cresce.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {recommendations.map((rec) => {
            const priorityConfig = PRIORITY_CONFIG[rec.priority];
            const Icon = rec.icon;
            const EntityIcon = rec.entityType ? (ENTITY_ICONS[rec.entityType] || Network) : Network;
            const entityColor = rec.entityType ? (ENTITY_COLORS[rec.entityType] || "hsl(250 85% 60%)") : undefined;

            return (
              <Card key={rec.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-semibold text-foreground">{rec.title}</h4>
                      <Badge variant="outline" className={`text-[9px] ${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </Badge>
                      {rec.entityType && (
                        <Badge variant="outline" className="text-[9px] gap-1">
                          <EntityIcon className="h-2.5 w-2.5" />
                          {rec.entityType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{rec.description}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-primary/80">
                      <Zap className="h-3 w-3" />
                      <span>{rec.action}</span>
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant={rec.type === "suggested_entity" || rec.type === "suggested_relation" ? "default" : "outline"}
                        className="h-7 text-[11px] gap-1.5"
                        disabled={actionLoading === rec.id}
                        onClick={() => handleAction(rec)}
                      >
                        {actionLoading === rec.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {rec.type === "suggested_entity" ? "Criar agora" :
                         rec.type === "suggested_relation" ? "Conectar agora" :
                         "Ir para correção"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
