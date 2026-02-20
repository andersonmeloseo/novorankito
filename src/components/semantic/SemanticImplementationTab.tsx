import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  FileCode, Globe, ArrowRight, Sparkles, Loader2, Copy, Check,
  Link2, ChevronDown, ChevronUp, Code2, Layers,
  Wand2, CheckCircle2, AlertCircle, Layout, Target, Zap,
  TrendingUp, Shield, Star, BookOpen, ExternalLink, Award,
  Lightbulb, BarChart3, Network,
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

function buildPagePlan(entities: Entity[], relations: Relation[]): PagePlan[] {
  const pages: PagePlan[] = [];
  const mainEntity = entities.find((e) => e.entity_type === "empresa");
  const homeEntities = entities.filter((e) => ["empresa", "gbp", "avaliacao"].includes(e.entity_type));

  if (mainEntity) {
    pages.push({
      slug: "/", title: `Página Inicial — ${mainEntity.name}`,
      entityIds: homeEntities.map((e) => e.id),
      schemas: [...new Set(homeEntities.map((e) => e.schema_type).filter(Boolean))] as string[],
      linkedPages: [], description: "Página principal com Organization/LocalBusiness",
    });
  }

  const people = entities.filter((e) => e.entity_type === "pessoa");
  if (people.length > 0) {
    pages.push({
      slug: "/sobre", title: "Sobre / Equipe",
      entityIds: people.map((e) => e.id),
      schemas: ["Person", ...(mainEntity ? [mainEntity.schema_type || "Organization"] : [])].filter(Boolean) as string[],
      linkedPages: ["/"], description: "E-E-A-T e credenciais",
    });
  }

  const services = entities.filter((e) => e.entity_type === "servico");
  if (services.length > 0) {
    pages.push({
      slug: "/servicos", title: "Serviços",
      entityIds: services.map((e) => e.id),
      schemas: ["Service", "BreadcrumbList", "FAQPage"],
      linkedPages: ["/", "/contato"], description: "Listagem de serviços",
    });
    services.forEach((s) => {
      pages.push({
        slug: suggestSlug(s), title: s.name,
        entityIds: [s.id], schemas: [s.schema_type || "Service", "BreadcrumbList"],
        linkedPages: ["/servicos", "/contato"], description: `Página do serviço "${s.name}"`,
      });
    });
  }

  const products = entities.filter((e) => e.entity_type === "produto");
  if (products.length > 0) {
    pages.push({
      slug: "/produtos", title: "Produtos",
      entityIds: products.map((e) => e.id),
      schemas: ["Product", "Offer", "BreadcrumbList"],
      linkedPages: ["/"], description: "Produtos com Schema Product",
    });
  }

  const locations = entities.filter((e) => e.entity_type === "local");
  if (locations.length > 0) {
    pages.push({
      slug: "/contato", title: "Contato / Localização",
      entityIds: locations.map((e) => e.id),
      schemas: ["PostalAddress", "ContactPage", "LocalBusiness"],
      linkedPages: ["/"], description: "Contato com endereço e mapa",
    });
  }

  const content = entities.filter((e) => e.entity_type === "conteudo");
  if (content.length > 0) {
    pages.push({
      slug: "/blog", title: "Blog / Conteúdo",
      entityIds: content.map((e) => e.id),
      schemas: ["Article", "BlogPosting", "BreadcrumbList"],
      linkedPages: ["/", "/sobre"], description: "Hub de conteúdo",
    });
  }

  // Cross-links
  const slugByEntity = new Map<string, string>();
  pages.forEach((p) => p.entityIds.forEach((eid) => slugByEntity.set(eid, p.slug)));
  relations.forEach((r) => {
    const fromSlug = slugByEntity.get(r.subject_id);
    const toSlug = slugByEntity.get(r.object_id);
    if (fromSlug && toSlug && fromSlug !== toSlug) {
      const page = pages.find((p) => p.slug === fromSlug);
      if (page && !page.linkedPages.includes(toSlug)) page.linkedPages.push(toSlug);
    }
  });

  return pages;
}

// ========== AI Plan types ==========
interface AiSchemaDetail {
  type: string;
  id_value: string;
  connects_to: string[];
  required_properties: Record<string, any>;
  missing_properties: string[];
  notes: string;
}

interface AiPagePlan {
  slug: string;
  title: string;
  meta_description: string;
  h1: string;
  schemas: AiSchemaDetail[];
  schemas_required?: string[]; // legacy compat
  full_jsonld: string;
  content_brief: string;
  internal_links: Array<{ to: string; anchor_text: string; context: string }>;
  priority: string;
  estimated_impact?: string;
  seo_tips: string[];
}

interface IdConnection {
  from_id: string;
  to_id: string;
  via_property: string;
  on_page: string;
}

interface AiPlan {
  verdict: {
    score: number;
    level: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    opportunities?: string[];
    gaps?: string[];
  };
  pages: AiPagePlan[];
  id_graph?: {
    description: string;
    connections: IdConnection[];
  };
  knowledge_panel_strategy: {
    steps: string[];
    entity_home: string;
    required_signals: string[];
    estimated_timeline: string;
  };
  internal_linking_map?: {
    hub_pages: Array<{ slug: string; spoke_pages: string[] }>;
    strategy: string;
  };
  quick_wins: Array<{ action: string; impact: string; effort: string; description: string }>;
  advanced_recommendations?: Array<{ title: string; description: string; priority: string }>;
}

interface Props {
  semanticProjectId: string;
  projectId: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/30",
  high: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  medium: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  low: "text-muted-foreground bg-muted/50 border-muted",
};

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : score >= 40 ? "text-orange-500" : "text-red-500";

export function SemanticImplementationTab({ semanticProjectId, projectId }: Props) {
  const { user } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [copiedSchema, setCopiedSchema] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["verdict", "pages"]));

  // Load entities, relations, and saved plan
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase.from("semantic_entities")
        .select("id, name, entity_type, schema_type, description, schema_properties")
        .eq("project_id", projectId).eq("goal_project_id", semanticProjectId),
      supabase.from("semantic_relations")
        .select("id, subject_id, object_id, predicate")
        .eq("project_id", projectId).eq("goal_project_id", semanticProjectId),
      supabase.from("semantic_implementation_plans" as any)
        .select("plan")
        .eq("project_id", projectId)
        .eq("goal_project_id", semanticProjectId)
        .maybeSingle(),
    ]).then(([entRes, relRes, planRes]) => {
      setEntities((entRes.data || []).map((e: any) => ({
        ...e, schema_properties: e.schema_properties as Record<string, string> | null,
      })));
      setRelations(relRes.data || []);
      if ((planRes.data as any)?.plan) {
        setAiPlan((planRes.data as any).plan as AiPlan);
        setExpandedSections(new Set(["verdict", "pages", "knowledge", "quickwins"]));
      }
      setLoading(false);
    });
  }, [user, projectId, semanticProjectId]);

  const pages = useMemo(() => buildPagePlan(entities, relations), [entities, relations]);

  const filledCount = entities.filter((e) => {
    if (!e.schema_properties || !e.schema_type) return false;
    const props = getSchemaProperties(e.schema_type);
    const filled = props.filter((p) => String(e.schema_properties?.[p.name] ?? "").trim());
    return filled.length >= Math.min(3, props.length);
  }).length;
  const fillPercent = entities.length > 0 ? Math.round((filledCount / entities.length) * 100) : 0;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePage = (slug: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

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

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  // Generate AI implementation plan
  const handleGeneratePlan = async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      const relationsForAi = relations.map((r) => {
        const subj = entities.find((e) => e.id === r.subject_id);
        const obj = entities.find((e) => e.id === r.object_id);
        return { subject: subj?.name || "", predicate: r.predicate, object: obj?.name || "" };
      });

      const entitiesForAi = entities.map((e) => ({
        name: e.name,
        entity_type: e.entity_type,
        schema_type: e.schema_type,
        description: e.description,
        schema_properties: e.schema_properties || {},
      }));

      const pagesForAi = pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        schemas: p.schemas,
        linkedPages: p.linkedPages,
      }));

      const mainEntity = entities.find((e) => e.entity_type === "empresa");
      const domain = mainEntity?.schema_properties?.url || mainEntity?.schema_properties?.sameAs || "";

      const { data, error } = await supabase.functions.invoke("semantic-implementation-plan", {
        body: { entities: entitiesForAi, relations: relationsForAi, pages: pagesForAi, domain },
      });

      if (error) throw error;

      if (data?.plan) {
        setAiPlan(data.plan);
        setExpandedSections(new Set(["verdict", "pages", "knowledge", "quickwins"]));
        
        // Save plan to database
        await supabase.from("semantic_implementation_plans" as any).upsert({
          project_id: projectId,
          goal_project_id: semanticProjectId,
          owner_id: user.id,
          plan: data.plan,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "project_id,goal_project_id" });
        
        toast({ title: "✨ Plano gerado e salvo!", description: "O plano ficará salvo mesmo ao trocar de aba" });
      } else {
        toast({ title: "IA não retornou o plano", description: "Tente novamente", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("AI plan error:", err);
      toast({ title: "Erro ao gerar plano", description: err.message || "Tente novamente", variant: "destructive" });
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
      {/* Header */}
      <Card className="p-4 border-primary/20 bg-accent/30">
        <div className="flex gap-3 items-start">
          <Layout className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Plano de Implementação Profissional</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gere uma análise completa com <strong>veredito de especialista</strong>, páginas a criar,
              briefings de conteúdo, estratégia de Knowledge Panel e mapa de links internos.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{pages.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Páginas</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{entities.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entidades</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{relations.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Relações</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Progress value={fillPercent} className="h-2 w-16" />
            <span className="text-sm font-bold">{fillPercent}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Schema Preenchido</p>
        </Card>
      </div>

      {/* Generate button */}
      <Button onClick={handleGeneratePlan} disabled={aiLoading} className="w-full gap-2" size="lg">
        {aiLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Gerando plano profissional...</>
        ) : (
          <><Wand2 className="h-4 w-4" /> {aiPlan ? "Regenerar" : "Gerar"} Plano de Implementação com IA</>
        )}
      </Button>

      {/* AI Plan results */}
      {aiPlan && (
        <div className="space-y-3">
          {/* VERDICT */}
          <Collapsible open={expandedSections.has("verdict")} onOpenChange={() => toggleSection("verdict")}>
            <Card className="overflow-hidden border-primary/30">
              <CollapsibleTrigger asChild>
                <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Veredito do Especialista</h3>
                        <p className="text-xs text-muted-foreground">Análise de maturidade semântica</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-2xl font-black ${SCORE_COLOR(aiPlan.verdict.score)}`}>
                          {aiPlan.verdict.score}/100
                        </p>
                        <Badge variant="outline" className="text-[9px]">{aiPlan.verdict.level}</Badge>
                      </div>
                      {expandedSections.has("verdict") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator />
                <div className="p-4 space-y-4">
                  <p className="text-sm text-foreground leading-relaxed">{aiPlan.verdict.summary}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Card className="p-3 border-green-500/20 bg-green-500/5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-bold text-green-600">Pontos Fortes</span>
                      </div>
                      <ul className="space-y-1">
                        {aiPlan.verdict.strengths.map((s, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-3 border-red-500/20 bg-red-500/5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs font-bold text-red-600">Pontos Fracos</span>
                      </div>
                      <ul className="space-y-1">
                        {aiPlan.verdict.weaknesses.map((w, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground">• {w}</li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-3 border-blue-500/20 bg-blue-500/5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-blue-600">{aiPlan.verdict.gaps?.length ? "Gaps Técnicos" : "Oportunidades"}</span>
                      </div>
                      <ul className="space-y-1">
                        {(aiPlan.verdict.gaps || aiPlan.verdict.opportunities || []).map((o, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground">• {o}</li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* QUICK WINS */}
          {aiPlan.quick_wins?.length > 0 && (
            <Collapsible open={expandedSections.has("quickwins")} onOpenChange={() => toggleSection("quickwins")}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Quick Wins</h3>
                          <p className="text-[10px] text-muted-foreground">{aiPlan.quick_wins.length} ações de resultado rápido</p>
                        </div>
                      </div>
                      {expandedSections.has("quickwins") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-2">
                    {aiPlan.quick_wins.map((qw, i) => (
                      <Card key={i} className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-amber-600">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold">{qw.action}</span>
                              <Badge variant="outline" className="text-[9px]">Impacto: {qw.impact}</Badge>
                              <Badge variant="secondary" className="text-[9px]">Esforço: {qw.effort}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">{qw.description}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* PAGES PLAN */}
          <Collapsible open={expandedSections.has("pages")} onOpenChange={() => toggleSection("pages")}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Plano de Páginas</h3>
                        <p className="text-[10px] text-muted-foreground">{aiPlan.pages?.length || 0} páginas com briefing completo</p>
                      </div>
                    </div>
                    {expandedSections.has("pages") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator />
                <div className="p-4 space-y-3">
                  {(aiPlan.pages || []).map((page, idx) => (
                    <Collapsible key={idx} open={expandedPages.has(page.slug)} onOpenChange={() => togglePage(page.slug)}>
                      <Card className="overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="p-3 cursor-pointer hover:bg-accent/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge className={`text-[9px] ${PRIORITY_COLORS[page.priority] || ""}`}>
                                  {page.priority}
                                </Badge>
                                <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                  {page.slug}
                                </code>
                                <span className="text-xs font-medium truncate">{page.title}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                                  e.stopPropagation();
                                  copyText(
                                    `PÁGINA: ${page.slug}\nTítulo SEO: ${page.title}\nH1: ${page.h1}\nMeta: ${page.meta_description}\nSchemas: ${page.schemas_required.join(", ")}\nConteúdo: ${page.content_brief}\nDicas: ${page.seo_tips.join("; ")}`,
                                    "Briefing da página"
                                  );
                                }}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                                {expandedPages.has(page.slug) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Separator />
                          <div className="p-3 space-y-3 text-xs">
                            {/* SEO tags */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Target className="h-3 w-3 text-primary" />
                                <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">SEO Tags</span>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2.5 space-y-1 font-mono text-[11px]">
                                <p><span className="text-muted-foreground">title:</span> {page.title}</p>
                                <p><span className="text-muted-foreground">h1:</span> {page.h1}</p>
                                <p><span className="text-muted-foreground">meta:</span> {page.meta_description}</p>
                              </div>
                            </div>

                            {/* Schemas with @id details */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Code2 className="h-3 w-3 text-primary" />
                                <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Schemas ({(page.schemas || page.schemas_required || []).length})
                                </span>
                              </div>
                              {page.schemas?.length > 0 ? (
                                <div className="space-y-2">
                                  {page.schemas.map((schema, si) => (
                                    <Card key={si} className="p-2.5 border-l-2 border-l-primary/50">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">{schema.type}</Badge>
                                          <code className="text-[9px] text-muted-foreground font-mono">{schema.id_value}</code>
                                        </div>
                                      </div>
                                      {schema.connects_to?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-1.5">
                                          <span className="text-[9px] text-muted-foreground">Conecta com:</span>
                                          {schema.connects_to.map((cid, ci) => (
                                            <Badge key={ci} variant="outline" className="text-[8px] font-mono">{cid.split("#")[1] || cid}</Badge>
                                          ))}
                                        </div>
                                      )}
                                      {schema.missing_properties?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-1.5">
                                          <span className="text-[9px] text-red-500 font-semibold">Faltando:</span>
                                          {schema.missing_properties.map((mp, mi) => (
                                            <Badge key={mi} variant="destructive" className="text-[8px]">{mp}</Badge>
                                          ))}
                                        </div>
                                      )}
                                      {schema.notes && (
                                        <p className="text-[10px] text-muted-foreground italic">{schema.notes}</p>
                                      )}
                                    </Card>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {(page.schemas_required || []).map((s) => (
                                    <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Full JSON-LD code */}
                            {page.full_jsonld && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <FileCode className="h-3 w-3 text-green-500" />
                                    <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">JSON-LD Pronto</span>
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" onClick={(e) => {
                                    e.stopPropagation();
                                    copyText(page.full_jsonld, "JSON-LD");
                                  }}>
                                    <Copy className="h-3 w-3" /> Copiar
                                  </Button>
                                </div>
                                <pre className="bg-muted rounded-lg p-3 text-[10px] font-mono text-foreground/80 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
                                  {page.full_jsonld}
                                </pre>
                              </div>
                            )}

                            {/* Content brief */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="h-3 w-3 text-primary" />
                                <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Briefing de Conteúdo</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-2.5">
                                {page.content_brief}
                              </p>
                            </div>

                            {/* Internal links */}
                            {page.internal_links?.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Link2 className="h-3 w-3 text-primary" />
                                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Links Internos</span>
                                </div>
                                <div className="space-y-1">
                                  {page.internal_links.map((link, li) => (
                                    <div key={li} className="flex items-start gap-2 text-[11px]">
                                      <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                                      <div>
                                        <code className="text-primary">{link.to}</code>
                                        <span className="text-muted-foreground"> — âncora: "{link.anchor_text}"</span>
                                        {link.context && <p className="text-muted-foreground/70 text-[10px]">{link.context}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* SEO tips */}
                            {page.seo_tips?.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3 text-amber-500" />
                                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Dicas SEO</span>
                                </div>
                                <ul className="space-y-1">
                                  {page.seo_tips.map((tip, ti) => (
                                    <li key={ti} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                      <span className="text-amber-500 shrink-0">💡</span> {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Impact */}
                            {page.estimated_impact && (
                              <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="h-3 w-3 text-primary" />
                                  <span className="text-[10px] font-bold text-primary">Impacto Estimado</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{page.estimated_impact}</p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* KNOWLEDGE PANEL STRATEGY */}
          {aiPlan.knowledge_panel_strategy && (
            <Collapsible open={expandedSections.has("knowledge")} onOpenChange={() => toggleSection("knowledge")}>
              <Card className="overflow-hidden border-amber-500/20">
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Star className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Estratégia Knowledge Panel</h3>
                          <p className="text-[10px] text-muted-foreground">
                            Prazo estimado: {aiPlan.knowledge_panel_strategy.estimated_timeline}
                          </p>
                        </div>
                      </div>
                      {expandedSections.has("knowledge") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Entity Home Page
                      </p>
                      <code className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                        {aiPlan.knowledge_panel_strategy.entity_home}
                      </code>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Passos para Conquistar
                      </p>
                      <ol className="space-y-1.5">
                        {aiPlan.knowledge_panel_strategy.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px]">
                            <span className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-amber-600">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Sinais Necessários
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {aiPlan.knowledge_panel_strategy.required_signals.map((sig, i) => (
                          <Badge key={i} variant="outline" className="text-[9px]">{sig}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* @ID GRAPH MAP */}
          {aiPlan.id_graph?.connections?.length > 0 && (
            <Collapsible open={expandedSections.has("idgraph")} onOpenChange={() => toggleSection("idgraph")}>
              <Card className="overflow-hidden border-green-500/20">
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Layers className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Mapa de Conexões @id</h3>
                          <p className="text-[10px] text-muted-foreground">{aiPlan.id_graph.connections.length} conexões entre schemas</p>
                        </div>
                      </div>
                      {expandedSections.has("idgraph") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-2">
                    {aiPlan.id_graph.description && (
                      <p className="text-[11px] text-muted-foreground mb-2">{aiPlan.id_graph.description}</p>
                    )}
                    <div className="bg-muted/50 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-1 p-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                        <span>De (@id)</span>
                        <span></span>
                        <span>Para (@id)</span>
                        <span>Propriedade</span>
                        <span>Página</span>
                      </div>
                      {aiPlan.id_graph.connections.map((conn, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-1 p-2 text-[10px] font-mono border-b border-border/50 last:border-0 items-center">
                          <code className="text-primary truncate">{conn.from_id.split("#")[1] || conn.from_id}</code>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <code className="text-green-600 truncate">{conn.to_id.split("#")[1] || conn.to_id}</code>
                          <Badge variant="outline" className="text-[8px]">{conn.via_property}</Badge>
                          <code className="text-[9px] text-muted-foreground">{conn.on_page}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* INTERNAL LINKING MAP */}
          {aiPlan.internal_linking_map && (
            <Collapsible open={expandedSections.has("linking")} onOpenChange={() => toggleSection("linking")}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Network className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Mapa de Links Internos</h3>
                          <p className="text-[10px] text-muted-foreground">Arquitetura hub & spoke</p>
                        </div>
                      </div>
                      {expandedSections.has("linking") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-3">
                    <p className="text-[11px] text-muted-foreground">{aiPlan.internal_linking_map.strategy}</p>
                    {aiPlan.internal_linking_map.hub_pages?.map((hub, i) => (
                      <Card key={i} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-3.5 w-3.5 text-blue-500" />
                          <code className="text-xs font-bold text-primary">{hub.slug}</code>
                          <Badge variant="secondary" className="text-[9px]">Hub</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {hub.spoke_pages?.map((sp, si) => (
                            <Badge key={si} variant="outline" className="text-[9px] gap-1">
                              <ArrowRight className="h-2 w-2" /> {sp}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* ADVANCED RECOMMENDATIONS */}
          {aiPlan.advanced_recommendations?.length > 0 && (
            <Collapsible open={expandedSections.has("advanced")} onOpenChange={() => toggleSection("advanced")}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Recomendações Avançadas</h3>
                          <p className="text-[10px] text-muted-foreground">{aiPlan.advanced_recommendations.length} recomendações</p>
                        </div>
                      </div>
                      {expandedSections.has("advanced") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-2">
                    {aiPlan.advanced_recommendations.map((rec, i) => (
                      <Card key={i} className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold">{rec.title}</span>
                          <Badge variant="outline" className="text-[9px]">{rec.priority}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{rec.description}</p>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Copy all button */}
          <Button variant="outline" className="w-full gap-2" onClick={() => {
            const text = JSON.stringify(aiPlan, null, 2);
            navigator.clipboard.writeText(text);
            toast({ title: "Plano completo copiado!", description: "JSON copiado para a área de transferência" });
          }}>
            <Copy className="h-4 w-4" />
            Copiar Plano Completo (JSON)
          </Button>
        </div>
      )}

      {/* Fallback: Original page plans (shown when no AI plan) */}
      {!aiPlan && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Clique em "Gerar Plano de Implementação com IA" para receber uma análise profissional completa.
          </p>
          {pages.map((page) => {
            const isExpanded = expandedPages.has(page.slug);
            const pageEntities = page.entityIds.map((id) => entities.find((e) => e.id === id)).filter(Boolean) as Entity[];

            return (
              <Collapsible key={page.slug} open={isExpanded} onOpenChange={() => togglePage(page.slug)}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="p-3 cursor-pointer hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="h-4 w-4 text-primary shrink-0" />
                          <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{page.slug}</code>
                          <span className="text-xs truncate">{page.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[9px]">{pageEntities.length} schemas</Badge>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Separator />
                    <div className="p-3 space-y-3">
                      <p className="text-[11px] text-muted-foreground">{page.description}</p>
                      {pageEntities.map((entity) => {
                        const Icon = ENTITY_ICONS[entity.entity_type] || Code2;
                        const color = ENTITY_COLORS[entity.entity_type] || "hsl(0 0% 50%)";
                        return (
                          <Card key={entity.id} className="p-2.5 border-l-2" style={{ borderLeftColor: color }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5" style={{ color }} />
                                <span className="text-xs font-semibold">{entity.name}</span>
                                <Badge variant="outline" className="text-[9px]">{entity.schema_type}</Badge>
                              </div>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyJsonLd(entity)}>
                                {copiedSchema === entity.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                      {page.linkedPages.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {page.linkedPages.map((link) => (
                            <Badge key={link} variant="outline" className="text-[9px] gap-1">
                              <ArrowRight className="h-2 w-2" /> <code>{link}</code>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
