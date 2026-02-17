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
  position_x: number | null;
  position_y: number | null;
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
  sourceEntityType?: string;
  action: string;
  icon: React.ElementType;
}

const PRIORITY_CONFIG = {
  high: { label: "Alta", color: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Média", color: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Baixa", color: "bg-info/10 text-info border-info/20" },
};

// Full entity catalog with Schema.org mapping, descriptions, and ontological relations
interface EntityBlueprint {
  type: string;
  name: string;
  reason: string;
  description: string;
  schema_type: string;
}

const ENTITY_SUGGESTIONS: Record<string, EntityBlueprint[]> = {
  empresa: [
    { type: "produto", name: "Produto/Serviço principal", reason: "Toda empresa deve declarar o que oferece", description: "Principal produto ou serviço oferecido pela empresa ao mercado.", schema_type: "Product" },
    { type: "local", name: "Endereço comercial", reason: "Localização fortalece SEO local", description: "Endereço físico e localização geográfica da empresa.", schema_type: "Place" },
    { type: "pessoa", name: "Fundador/CEO", reason: "Autoridade pessoal reforça E-E-A-T", description: "Fundador, CEO ou principal responsável pela empresa.", schema_type: "Person" },
    { type: "gbp", name: "Google Business Profile", reason: "Presença no Google Maps", description: "Perfil da empresa no Google Business para SEO local.", schema_type: "LocalBusiness" },
    { type: "site", name: "Website oficial", reason: "Ancora digital da marca", description: "Website principal da empresa na internet.", schema_type: "WebSite" },
    { type: "evento", name: "Evento corporativo", reason: "Eventos geram rich snippets e engajamento", description: "Evento organizado ou patrocinado pela empresa.", schema_type: "Event" },
    { type: "faq", name: "FAQ do negócio", reason: "FAQs geram rich snippets no Google", description: "Perguntas frequentes sobre produtos, serviços ou a empresa.", schema_type: "FAQPage" },
    { type: "artigo", name: "Blog/Conteúdo", reason: "Conteúdo autoral reforça autoridade temática", description: "Artigos e publicações do blog corporativo.", schema_type: "Article" },
  ],
  produto: [
    { type: "avaliacao", name: "Avaliações do produto", reason: "Reviews geram rich snippets de estrelas", description: "Avaliações e reviews dos clientes sobre o produto.", schema_type: "Review" },
    { type: "oferta", name: "Oferta/Preço", reason: "Preço estruturado aparece nos resultados de busca", description: "Oferta comercial com preço e disponibilidade do produto.", schema_type: "Offer" },
    { type: "marca", name: "Marca do produto", reason: "Marca é sinal de confiança para o Google", description: "Marca ou fabricante responsável pelo produto.", schema_type: "Brand" },
    { type: "categoria", name: "Categoria do produto", reason: "Categorização ajuda na taxonomia semântica", description: "Categoria ou classificação na qual o produto se encaixa.", schema_type: "Thing" },
    { type: "imagem", name: "Imagem do produto", reason: "Imagens estruturadas aparecem no Google Images", description: "Imagem principal ou galeria de imagens do produto.", schema_type: "ImageObject" },
  ],
  servico: [
    { type: "local", name: "Área de atendimento", reason: "Define alcance geográfico do serviço", description: "Região geográfica onde o serviço é prestado.", schema_type: "Place" },
    { type: "avaliacao", name: "Depoimentos", reason: "Prova social melhora conversão e SEO", description: "Depoimentos e avaliações de clientes sobre o serviço.", schema_type: "Review" },
    { type: "oferta", name: "Pacote/Preço", reason: "Preço estruturado gera visibilidade", description: "Pacotes e preços oferecidos para o serviço.", schema_type: "Offer" },
    { type: "pessoa", name: "Profissional responsável", reason: "Credencial profissional reforça E-E-A-T", description: "Profissional qualificado que presta o serviço.", schema_type: "Person" },
    { type: "faq", name: "FAQ do serviço", reason: "Perguntas frequentes geram rich snippets", description: "Dúvidas comuns sobre o serviço prestado.", schema_type: "FAQPage" },
  ],
  local: [
    { type: "empresa", name: "Negócio no local", reason: "Vincular local à entidade comercial", description: "Empresa ou negócio que opera nesta localização.", schema_type: "Organization" },
    { type: "endereco", name: "Endereço postal", reason: "Endereço estruturado melhora SEO local", description: "Endereço postal completo com rua, cidade, CEP e país.", schema_type: "PostalAddress" },
    { type: "horario", name: "Horário de funcionamento", reason: "Horários aparecem no Knowledge Panel", description: "Horários de abertura e fechamento do estabelecimento.", schema_type: "OpeningHoursSpecification" },
    { type: "geo", name: "Coordenadas geográficas", reason: "Geolocalização precisa para mapas", description: "Latitude e longitude do local no mapa.", schema_type: "GeoCoordinates" },
  ],
  pessoa: [
    { type: "site", name: "Página/Perfil profissional", reason: "Link para autoridade online da pessoa", description: "Website pessoal ou perfil profissional online.", schema_type: "WebPage" },
    { type: "credencial", name: "Credenciais/Formação", reason: "Formação acadêmica valida expertise E-E-A-T", description: "Diplomas, certificações e qualificações profissionais.", schema_type: "EducationalOccupationalCredential" },
    { type: "artigo", name: "Publicações do autor", reason: "Autoria de conteúdo fortalece autoridade", description: "Artigos e publicações escritas por esta pessoa.", schema_type: "Article" },
    { type: "organizacao", name: "Organização afiliada", reason: "Afiliações institucionais reforçam credibilidade", description: "Organização, associação ou instituição à qual a pessoa pertence.", schema_type: "Organization" },
  ],
  avaliacao: [
    { type: "pessoa", name: "Autor da avaliação", reason: "Autor identificado aumenta confiança", description: "Pessoa que escreveu a avaliação ou depoimento.", schema_type: "Person" },
    { type: "rating", name: "Nota/Rating", reason: "Rating estruturado gera estrelas nos resultados", description: "Pontuação numérica atribuída na avaliação.", schema_type: "Rating" },
  ],
  site: [
    { type: "pagina", name: "Página principal", reason: "Cada página importante deve ser uma entidade", description: "Página principal ou landing page do website.", schema_type: "WebPage" },
    { type: "busca", name: "Caixa de busca", reason: "Sitelinks searchbox no Google", description: "Funcionalidade de busca interna do site.", schema_type: "SearchAction" },
  ],
  faq: [
    { type: "pergunta", name: "Pergunta frequente", reason: "Cada Q&A pode virar rich snippet", description: "Pergunta individual com resposta estruturada.", schema_type: "Question" },
  ],
  artigo: [
    { type: "pessoa", name: "Autor do artigo", reason: "Autoria é fator E-E-A-T essencial", description: "Autor responsável pela criação do conteúdo.", schema_type: "Person" },
    { type: "imagem", name: "Imagem do artigo", reason: "Imagem destacada melhora CTR", description: "Imagem de capa ou destaque do artigo.", schema_type: "ImageObject" },
  ],
  evento: [
    { type: "local", name: "Local do evento", reason: "Localização do evento no Google", description: "Local onde o evento será realizado.", schema_type: "Place" },
    { type: "pessoa", name: "Organizador", reason: "Organizador reforça autoridade", description: "Pessoa ou entidade responsável pela organização do evento.", schema_type: "Person" },
    { type: "oferta", name: "Ingresso/Inscrição", reason: "Preço do evento gera rich snippet", description: "Valor e condições para participação no evento.", schema_type: "Offer" },
  ],
  gbp: [
    { type: "local", name: "Endereço do GBP", reason: "Endereço é obrigatório no perfil", description: "Endereço cadastrado no Google Business Profile.", schema_type: "Place" },
    { type: "avaliacao", name: "Reviews do Google", reason: "Reviews do GBP são fator de ranking local", description: "Avaliações dos clientes no Google Maps.", schema_type: "Review" },
    { type: "horario", name: "Horário no GBP", reason: "Horários visíveis no Knowledge Panel", description: "Horários de funcionamento cadastrados no perfil.", schema_type: "OpeningHoursSpecification" },
  ],
};

// Complete ontological relation map
const RELATION_SUGGESTIONS: Array<{ subjectType: string; objectType: string; predicate: string; reason: string }> = [
  // Empresa relations
  { subjectType: "empresa", objectType: "produto", predicate: "oferece", reason: "Declara a oferta principal" },
  { subjectType: "empresa", objectType: "servico", predicate: "presta", reason: "Declara serviço oferecido" },
  { subjectType: "empresa", objectType: "local", predicate: "localizado_em", reason: "Ancora o negócio geograficamente" },
  { subjectType: "empresa", objectType: "pessoa", predicate: "fundado_por", reason: "Vincula autoridade pessoal" },
  { subjectType: "empresa", objectType: "gbp", predicate: "listado_em", reason: "Conecta ao Google Business" },
  { subjectType: "empresa", objectType: "site", predicate: "possui_website", reason: "Ancora digital da marca" },
  { subjectType: "empresa", objectType: "evento", predicate: "organiza", reason: "Eventos aumentam visibilidade" },
  { subjectType: "empresa", objectType: "faq", predicate: "responde_em", reason: "FAQs geram rich snippets" },
  { subjectType: "empresa", objectType: "artigo", predicate: "publica", reason: "Conteúdo reforça autoridade" },
  { subjectType: "empresa", objectType: "marca", predicate: "possui_marca", reason: "Marca é identidade" },
  // Pessoa relations
  { subjectType: "pessoa", objectType: "empresa", predicate: "trabalha_em", reason: "Reforça credenciais E-E-A-T" },
  { subjectType: "pessoa", objectType: "site", predicate: "possui_perfil", reason: "Perfil online do autor" },
  { subjectType: "pessoa", objectType: "credencial", predicate: "possui_credencial", reason: "Valida expertise" },
  { subjectType: "pessoa", objectType: "artigo", predicate: "é_autor_de", reason: "Autoria é E-E-A-T" },
  { subjectType: "pessoa", objectType: "organizacao", predicate: "afiliado_a", reason: "Afiliação institucional" },
  // Produto relations
  { subjectType: "produto", objectType: "avaliacao", predicate: "avaliado_por", reason: "Habilita rich snippets de reviews" },
  { subjectType: "produto", objectType: "oferta", predicate: "disponível_em", reason: "Preço estruturado" },
  { subjectType: "produto", objectType: "marca", predicate: "pertence_a", reason: "Marca do produto" },
  { subjectType: "produto", objectType: "categoria", predicate: "categorizado_em", reason: "Taxonomia semântica" },
  { subjectType: "produto", objectType: "imagem", predicate: "ilustrado_por", reason: "Imagem do produto" },
  // Serviço relations
  { subjectType: "servico", objectType: "local", predicate: "atende_em", reason: "Define área de atuação" },
  { subjectType: "servico", objectType: "avaliacao", predicate: "avaliado_por", reason: "Depoimentos do serviço" },
  { subjectType: "servico", objectType: "oferta", predicate: "disponível_em", reason: "Preço do serviço" },
  { subjectType: "servico", objectType: "pessoa", predicate: "prestado_por", reason: "Profissional responsável" },
  { subjectType: "servico", objectType: "faq", predicate: "responde_em", reason: "FAQ do serviço" },
  // Local relations
  { subjectType: "local", objectType: "endereco", predicate: "tem_endereço", reason: "Endereço postal" },
  { subjectType: "local", objectType: "horario", predicate: "funciona_em", reason: "Horário de funcionamento" },
  { subjectType: "local", objectType: "geo", predicate: "posicionado_em", reason: "Coordenadas geográficas" },
  // GBP relations
  { subjectType: "gbp", objectType: "local", predicate: "localizado_em", reason: "Endereço do GBP" },
  { subjectType: "gbp", objectType: "avaliacao", predicate: "avaliado_por", reason: "Reviews do Google" },
  { subjectType: "gbp", objectType: "horario", predicate: "funciona_em", reason: "Horários no GBP" },
  // Evento relations
  { subjectType: "evento", objectType: "local", predicate: "realizado_em", reason: "Local do evento" },
  { subjectType: "evento", objectType: "pessoa", predicate: "organizado_por", reason: "Organizador" },
  { subjectType: "evento", objectType: "oferta", predicate: "tem_ingresso", reason: "Ingresso do evento" },
  // Avaliação relations
  { subjectType: "avaliacao", objectType: "pessoa", predicate: "escrita_por", reason: "Autor da review" },
  { subjectType: "avaliacao", objectType: "rating", predicate: "tem_nota", reason: "Pontuação da review" },
  // Artigo relations
  { subjectType: "artigo", objectType: "pessoa", predicate: "escrito_por", reason: "Autor do conteúdo" },
  { subjectType: "artigo", objectType: "imagem", predicate: "ilustrado_por", reason: "Imagem do artigo" },
  // Site relations
  { subjectType: "site", objectType: "pagina", predicate: "contém", reason: "Página do site" },
  { subjectType: "site", objectType: "busca", predicate: "possui_busca", reason: "Busca interna" },
  // FAQ relations
  { subjectType: "faq", objectType: "pergunta", predicate: "contém", reason: "Pergunta individual" },
];

export function SemanticRecommendationsTab({ semanticProjectId }: { semanticProjectId?: string } = {}) {
  const projectId = localStorage.getItem("rankito_current_project");
  const { user } = useAuth();
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    if (!projectId) return;
    setLoading(true);
    let entQuery = supabase.from("semantic_entities").select("id, name, entity_type, schema_type, description, position_x, position_y").eq("project_id", projectId);
    let relQuery = supabase.from("semantic_relations").select("id, subject_id, object_id, predicate").eq("project_id", projectId);
    if (semanticProjectId) {
      entQuery = entQuery.eq("goal_project_id", semanticProjectId);
      relQuery = relQuery.eq("goal_project_id", semanticProjectId);
    }
    const [entRes, relRes] = await Promise.all([entQuery, relQuery]);
    setEntities(entRes.data || []);
    setRelations(relRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [projectId, semanticProjectId]);

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
        // === RECURSIVE FULL GRAPH EXPANSION ===
        // Collect all entity types to create recursively
        const existingTypes = new Set(entities.map((e) => e.entity_type));
        const typesToCreate: Array<{ type: string; name: string; parentType: string; description: string; schema_type: string }> = [];
        const visited = new Set<string>(existingTypes);

        // Build a flat lookup for blueprint data
        const blueprintLookup: Record<string, EntityBlueprint> = {};
        Object.values(ENTITY_SUGGESTIONS).flat().forEach((b) => { if (!blueprintLookup[b.type]) blueprintLookup[b.type] = b; });

        // First, add the direct suggestion that was clicked
        if (rec.entityType && !existingTypes.has(rec.entityType)) {
          const bp = blueprintLookup[rec.entityType];
          typesToCreate.push({
            type: rec.entityType,
            name: bp?.name || rec.title.replace("Criar entidade: ", ""),
            parentType: rec.sourceEntityType || "",
            description: bp?.description || "",
            schema_type: bp?.schema_type || "",
          });
          visited.add(rec.entityType);
        }
        // Then expand from all known + new types
        const expandQueue = [...Array.from(existingTypes), ...(rec.entityType ? [rec.entityType] : [])];
        while (expandQueue.length > 0) {
          const currentType = expandQueue.shift()!;
          const suggestions = ENTITY_SUGGESTIONS[currentType] || [];
          for (const s of suggestions) {
            if (!visited.has(s.type)) {
              visited.add(s.type);
              typesToCreate.push({ type: s.type, name: s.name, parentType: currentType, description: s.description, schema_type: s.schema_type });
              expandQueue.push(s.type);
            }
          }
        }

        if (typesToCreate.length === 0) {
          toast({ title: "Nada a criar", description: "Todas as entidades sugeridas já existem no grafo." });
          setActionLoading(null);
          return;
        }

        // Tree horizontal layout
        const sourceEntity = entities.find((e) => e.entity_type === rec.sourceEntityType);
        const rootX = sourceEntity?.position_x ?? 300;
        const rootY = sourceEntity?.position_y ?? 300;

        const typeToDepth: Record<string, number> = {};
        const typeToParent: Record<string, string> = {};
        for (const t of typesToCreate) {
          typeToParent[t.type] = t.parentType;
          let depth = 1;
          let parent = t.parentType;
          while (typeToParent[parent]) { depth++; parent = typeToParent[parent]; }
          typeToDepth[t.type] = depth;
        }

        const depthGroups: Record<number, typeof typesToCreate> = {};
        for (const t of typesToCreate) {
          const d = typeToDepth[t.type];
          if (!depthGroups[d]) depthGroups[d] = [];
          depthGroups[d].push(t);
        }

        const createdEntities: Record<string, string> = {};
        const existingByType: Record<string, string> = {};
        entities.forEach((e) => { existingByType[e.entity_type] = e.id; });

        const allInserts: any[] = [];

        for (const [depthStr, group] of Object.entries(depthGroups)) {
          const depth = parseInt(depthStr);
          const totalInGroup = group.length;
          const startY = rootY - ((totalInGroup - 1) * 150) / 2;

          group.forEach((t, idx) => {
            allInserts.push({
              name: t.name,
              entity_type: t.type,
              description: t.description,
              schema_type: t.schema_type,
              project_id: projectId,
              owner_id: user.id,
              position_x: rootX + depth * 280,
              position_y: startY + idx * 150,
              goal_project_id: semanticProjectId || null,
            });
          });
        }

        // Batch insert all entities
        const { data: insertedEntities, error } = await supabase
          .from("semantic_entities")
          .insert(allInserts)
          .select("id, entity_type");
        if (error) throw error;

        // Map created entities
        (insertedEntities || []).forEach((e) => { createdEntities[e.entity_type] = e.id; });

        // Create all relations between parent → child
        const relationInserts: any[] = [];

        for (const t of typesToCreate) {
          const parentId = existingByType[t.parentType] || createdEntities[t.parentType];
          const childId = createdEntities[t.type];
          if (!parentId || !childId) continue;

          // Find best predicate from RELATION_SUGGESTIONS
          const relSuggestion = RELATION_SUGGESTIONS.find(
            (rs) => rs.subjectType === t.parentType && rs.objectType === t.type
          ) || RELATION_SUGGESTIONS.find(
            (rs) => rs.objectType === t.parentType && rs.subjectType === t.type
          );

          const isReverse = relSuggestion?.subjectType === t.type;
          relationInserts.push({
            subject_id: isReverse ? childId : parentId,
            object_id: isReverse ? parentId : childId,
            predicate: relSuggestion?.predicate || "relacionado_a",
            project_id: projectId,
            owner_id: user.id,
            goal_project_id: semanticProjectId || null,
          });
        }

        if (relationInserts.length > 0) {
          const { error: relError } = await supabase.from("semantic_relations").insert(relationInserts);
          if (relError) throw relError;
        }

        toast({
          title: `Grafo expandido! 🚀`,
          description: `${typesToCreate.length} entidades e ${relationInserts.length} relações criadas automaticamente.`,
        });
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
            goal_project_id: semanticProjectId || null,
          } as any);
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
              sourceEntityType: type,
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
                        {rec.type === "suggested_entity" ? "Expandir grafo completo" :
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
