import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  FileCode, Globe, ArrowRight, Sparkles, Loader2, Copy, Check,
  ExternalLink, Link2, ChevronDown, ChevronUp, Code2, Layers,
  FileJson, Wand2, CheckCircle2, AlertCircle, Layout,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ENTITY_ICONS, ENTITY_COLORS } from "./EntityNode";
import { getSchemaProperties } from "./schema-properties";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Entity {
  id: string;
  name: string;
  entity_type: string;
  schema_type: string | null;
  description: string | null;
  schema_properties: Record<string, string> | null;
}

interface Relation {
  id: string;
  subject_id: string;
  object_id: string;
  predicate: string;
}

interface PagePlan {
  slug: string;
  title: string;
  entityIds: string[];
  schemas: string[];
  linkedPages: string[];
  description: string;
}

// Map entity types to suggested page slugs
function suggestSlug(entity: Entity): string {
  const name = entity.name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const typeMap: Record<string, string> = {
    empresa: "/",
    servico: `/servicos/${name}`,
    produto: `/produtos/${name}`,
    pessoa: `/equipe/${name}`,
    local: "/contato",
    gbp: "/google-business",
    site: "/",
    conteudo: `/blog/${name}`,
    avaliacao: "/depoimentos",
    especialidade: `/especialidades/${name}`,
    ferramenta: `/ferramentas/${name}`,
    curso: `/cursos/${name}`,
  };
  return typeMap[entity.entity_type] || `/${name}`;
}

// Group entities into logical pages
function buildPagePlan(entities: Entity[], relations: Relation[]): PagePlan[] {
  const pages: PagePlan[] = [];
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  // Group: main business = homepage
  const mainEntity = entities.find((e) => e.entity_type === "empresa");
  const homeEntities = entities.filter((e) =>
    ["empresa", "gbp", "avaliacao"].includes(e.entity_type)
  );

  if (mainEntity) {
    pages.push({
      slug: "/",
      title: `Página Inicial — ${mainEntity.name}`,
      entityIds: homeEntities.map((e) => e.id),
      schemas: [...new Set(homeEntities.map((e) => e.schema_type).filter(Boolean))] as string[],
      linkedPages: [],
      description: "Página principal com Organization/LocalBusiness, AggregateRating e breadcrumbs",
    });
  }

  // About page for people
  const people = entities.filter((e) => e.entity_type === "pessoa");
  if (people.length > 0) {
    pages.push({
      slug: "/sobre",
      title: "Sobre / Equipe",
      entityIds: people.map((e) => e.id),
      schemas: ["Person", ...(mainEntity ? [mainEntity.schema_type || "Organization"] : [])].filter(Boolean) as string[],
      linkedPages: ["/"],
      description: "Página sobre com dados de E-E-A-T, credenciais e sameAs dos autores/profissionais",
    });
  }

  // Service pages
  const services = entities.filter((e) => e.entity_type === "servico");
  if (services.length > 0) {
    pages.push({
      slug: "/servicos",
      title: "Página de Serviços",
      entityIds: services.map((e) => e.id),
      schemas: ["Service", "BreadcrumbList", "FAQPage"],
      linkedPages: ["/", "/contato"],
      description: "Listagem de serviços com Schema Service e FAQ",
    });
    services.forEach((s) => {
      pages.push({
        slug: suggestSlug(s),
        title: s.name,
        entityIds: [s.id],
        schemas: [s.schema_type || "Service", "BreadcrumbList"],
        linkedPages: ["/servicos", "/contato"],
        description: `Página dedicada ao serviço "${s.name}" com Schema detalhado`,
      });
    });
  }

  // Product pages
  const products = entities.filter((e) => e.entity_type === "produto");
  if (products.length > 0) {
    pages.push({
      slug: "/produtos",
      title: "Página de Produtos",
      entityIds: products.map((e) => e.id),
      schemas: ["Product", "Offer", "BreadcrumbList"],
      linkedPages: ["/"],
      description: "Listagem de produtos com Schema Product e Offer",
    });
  }

  // Contact page for locations
  const locations = entities.filter((e) => e.entity_type === "local");
  if (locations.length > 0) {
    pages.push({
      slug: "/contato",
      title: "Contato / Localização",
      entityIds: locations.map((e) => e.id),
      schemas: ["PostalAddress", "ContactPage", "LocalBusiness"],
      linkedPages: ["/"],
      description: "Página de contato com endereço, mapa e horários de funcionamento",
    });
  }

  // Content pages
  const content = entities.filter((e) => e.entity_type === "conteudo");
  if (content.length > 0) {
    pages.push({
      slug: "/blog",
      title: "Blog / Conteúdo",
      entityIds: content.map((e) => e.id),
      schemas: ["Article", "BlogPosting", "BreadcrumbList"],
      linkedPages: ["/", "/sobre"],
      description: "Hub de conteúdo com artigos estruturados e author markup",
    });
  }

  // Add cross-links based on relations
  const slugByEntity = new Map<string, string>();
  pages.forEach((p) => {
    p.entityIds.forEach((eid) => slugByEntity.set(eid, p.slug));
  });
  relations.forEach((r) => {
    const fromSlug = slugByEntity.get(r.subject_id);
    const toSlug = slugByEntity.get(r.object_id);
    if (fromSlug && toSlug && fromSlug !== toSlug) {
      const page = pages.find((p) => p.slug === fromSlug);
      if (page && !page.linkedPages.includes(toSlug)) {
        page.linkedPages.push(toSlug);
      }
    }
  });

  return pages;
}

interface Props {
  semanticProjectId: string;
  projectId: string;
}

export function SemanticImplementationTab({ semanticProjectId, projectId }: Props) {
  const { user } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [copiedSchema, setCopiedSchema] = useState<string | null>(null);

  // Load entities and relations
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("semantic_entities")
        .select("id, name, entity_type, schema_type, description, schema_properties")
        .eq("project_id", projectId)
        .eq("goal_project_id", semanticProjectId),
      supabase
        .from("semantic_relations")
        .select("id, subject_id, object_id, predicate")
        .eq("project_id", projectId)
        .eq("goal_project_id", semanticProjectId),
    ]).then(([entRes, relRes]) => {
      setEntities((entRes.data || []).map((e: any) => ({
        ...e,
        schema_properties: e.schema_properties as Record<string, string> | null,
      })));
      setRelations(relRes.data || []);
      setLoading(false);
    });
  }, [user, projectId, semanticProjectId]);

  const pages = useMemo(() => buildPagePlan(entities, relations), [entities, relations]);

  // Count how many entities have filled schema properties
  const filledCount = entities.filter((e) => {
    if (!e.schema_properties || !e.schema_type) return false;
    const props = getSchemaProperties(e.schema_type);
    const filled = props.filter((p) => e.schema_properties?.[p.name]?.trim());
    return filled.length >= Math.min(3, props.length);
  }).length;
  const fillPercent = entities.length > 0 ? Math.round((filledCount / entities.length) * 100) : 0;

  const togglePage = (slug: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  // Generate JSON-LD for an entity
  const generateJsonLd = (entity: Entity) => {
    const props = entity.schema_properties || {};
    const jsonLd: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": entity.schema_type || "Thing",
      name: entity.name,
      ...Object.fromEntries(
        Object.entries(props).filter(([k, v]) => v && k !== "@type" && k !== "name")
      ),
    };
    return JSON.stringify(jsonLd, null, 2);
  };

  const copyJsonLd = (entity: Entity) => {
    navigator.clipboard.writeText(generateJsonLd(entity));
    setCopiedSchema(entity.id);
    setTimeout(() => setCopiedSchema(null), 2000);
  };

  // AI auto-fill all entities
  const handleAiFill = async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      const entitiesForAi = entities.map((e) => ({
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

      const relationsForAi = relations.map((r) => {
        const subj = entities.find((e) => e.id === r.subject_id);
        const obj = entities.find((e) => e.id === r.object_id);
        return {
          subject: subj?.name || r.subject_id,
          predicate: r.predicate,
          object: obj?.name || r.object_id,
        };
      });

      const { data, error } = await supabase.functions.invoke("semantic-ai-fill", {
        body: {
          entities: entitiesForAi,
          relations: relationsForAi,
          projectId,
        },
      });

      if (error) throw error;

      const filled = data?.filled as Array<{ id: string; properties: Record<string, string> }>;
      if (!filled?.length) {
        toast({ title: "IA não retornou dados", description: "Tente novamente", variant: "destructive" });
        return;
      }

      // Save each entity's properties
      let savedCount = 0;
      for (const item of filled) {
        const existing = entities.find((e) => e.id === item.id);
        if (!existing) continue;
        const merged = { ...(existing.schema_properties || {}), ...item.properties };
        const { error: updateError } = await supabase
          .from("semantic_entities")
          .update({ schema_properties: merged as any })
          .eq("id", item.id);
        if (!updateError) savedCount++;
      }

      // Reload entities
      const { data: refreshed } = await supabase
        .from("semantic_entities")
        .select("id, name, entity_type, schema_type, description, schema_properties")
        .eq("project_id", projectId)
        .eq("goal_project_id", semanticProjectId);
      if (refreshed) {
        setEntities(refreshed.map((e: any) => ({
          ...e,
          schema_properties: e.schema_properties as Record<string, string> | null,
        })));
      }

      toast({
        title: `✨ IA preencheu ${savedCount} entidades`,
        description: "As propriedades Schema.org foram preenchidas automaticamente",
      });
    } catch (err: any) {
      console.error("AI fill error:", err);
      toast({
        title: "Erro ao preencher com IA",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
        <Layout className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Nenhuma entidade encontrada</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Crie entidades no Construtor de Grafo primeiro para gerar o plano de implementação.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="p-4 border-primary/20 bg-accent/30">
        <div className="flex gap-3 items-start">
          <Layout className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Plano de Implementação</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Baseado no seu grafo semântico, este plano mostra <strong>quais páginas criar</strong>,
              quais schemas implementar em cada uma, e como elas se conectam via links internos.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats + AI button */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{pages.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Páginas</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{entities.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Schemas</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{relations.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Links Internos</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Progress value={fillPercent} className="h-2 w-16" />
            <span className="text-sm font-bold">{fillPercent}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Preenchido</p>
        </Card>
      </div>

      {/* AI Fill button */}
      <Button
        onClick={handleAiFill}
        disabled={aiLoading}
        className="w-full gap-2"
        variant="premium"
        size="lg"
      >
        {aiLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            IA preenchendo propriedades...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" />
            Preencher Tudo com IA
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {entities.length} entidades
            </Badge>
          </>
        )}
      </Button>

      {/* Page plans */}
      <div className="space-y-2">
        {pages.map((page) => {
          const isExpanded = expandedPages.has(page.slug);
          const pageEntities = page.entityIds
            .map((id) => entities.find((e) => e.id === id))
            .filter(Boolean) as Entity[];

          return (
            <Collapsible key={page.slug} open={isExpanded} onOpenChange={() => togglePage(page.slug)}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {page.slug}
                            </code>
                            <span className="text-xs font-medium truncate">{page.title}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {page.schemas.join(" · ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {pageEntities.length} schemas
                        </Badge>
                        {page.linkedPages.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Link2 className="h-2.5 w-2.5 mr-0.5" />
                            {page.linkedPages.length} links
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-4">
                    <p className="text-xs text-muted-foreground">{page.description}</p>

                    {/* Schemas for this page */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Schemas nesta página
                      </p>
                      {pageEntities.map((entity) => {
                        const Icon = ENTITY_ICONS[entity.entity_type] || Code2;
                        const color = ENTITY_COLORS[entity.entity_type] || "hsl(0 0% 50%)";
                        const props = getSchemaProperties(entity.schema_type || "");
                        const filledProps = props.filter((p) => entity.schema_properties?.[p.name]?.trim());
                        const pct = props.length > 0 ? Math.round((filledProps.length / props.length) * 100) : 0;

                        return (
                          <Card key={entity.id} className="p-3 border-l-2" style={{ borderLeftColor: color }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5" style={{ color }} />
                                <span className="text-xs font-semibold">{entity.name}</span>
                                <Badge variant="outline" className="text-[9px]">
                                  {entity.schema_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {pct === 100 ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {filledProps.length}/{props.length}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyJsonLd(entity)}
                                >
                                  {copiedSchema === entity.id ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            {/* Show filled properties preview */}
                            {filledProps.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {filledProps.slice(0, 5).map((p) => (
                                  <Badge key={p.name} variant="secondary" className="text-[9px]">
                                    {p.name}: {(entity.schema_properties?.[p.name] || "").slice(0, 20)}
                                  </Badge>
                                ))}
                                {filledProps.length > 5 && (
                                  <Badge variant="secondary" className="text-[9px]">
                                    +{filledProps.length - 5} mais
                                  </Badge>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>

                    {/* Internal links */}
                    {page.linkedPages.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Links internos para
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {page.linkedPages.map((link) => (
                            <Badge key={link} variant="outline" className="text-[10px] gap-1">
                              <ArrowRight className="h-2.5 w-2.5" />
                              <code>{link}</code>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* JSON-LD preview */}
                    {pageEntities.some((e) => e.schema_properties && Object.keys(e.schema_properties).length > 1) && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          JSON-LD Preview
                        </p>
                        <pre className="bg-muted/50 rounded-lg p-3 text-[10px] font-mono overflow-x-auto max-h-48">
                          {`<script type="application/ld+json">\n${pageEntities.map((e) => generateJsonLd(e)).join(",\n")}\n</script>`}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
