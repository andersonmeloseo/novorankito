import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Code2, GitBranch, Pencil, Save, ExternalLink, Check, Copy, ArrowRight,
  ChevronRight, Sparkles, X, CheckCircle2, AlertCircle, Info,
} from "lucide-react";
import { ENTITY_ICONS, ENTITY_COLORS, type EntityNodeData } from "./EntityNode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Schema.org property definitions per type
const SCHEMA_PROPERTIES: Record<string, { name: string; required: boolean; description: string; example: string }[]> = {
  Restaurant: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "Restaurant" },
    { name: "name", required: true, description: "Nome do restaurante", example: "Pizzaria do João" },
    { name: "image", required: true, description: "URL da imagem principal", example: "https://example.com/photo.jpg" },
    { name: "address", required: true, description: "Endereço completo", example: "Rua Principal, 123" },
    { name: "telephone", required: false, description: "Telefone de contato", example: "+55 11 99999-0000" },
    { name: "servesCuisine", required: false, description: "Tipo de culinária", example: "Italiana" },
    { name: "priceRange", required: false, description: "Faixa de preço", example: "$$" },
    { name: "openingHoursSpecification", required: false, description: "Horário de funcionamento", example: "Seg-Sex 11:00-23:00" },
    { name: "aggregateRating", required: false, description: "Avaliação agregada", example: "4.5" },
    { name: "acceptsReservations", required: false, description: "Aceita reservas", example: "True" },
    { name: "menu", required: false, description: "URL do cardápio", example: "https://example.com/menu" },
    { name: "geo", required: false, description: "Coordenadas geográficas", example: "-23.5505, -46.6333" },
  ],
  LocalBusiness: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "LocalBusiness" },
    { name: "name", required: true, description: "Nome do negócio", example: "Minha Empresa" },
    { name: "image", required: true, description: "URL da imagem", example: "https://example.com/photo.jpg" },
    { name: "address", required: true, description: "Endereço completo", example: "Av. Brasil, 456" },
    { name: "telephone", required: false, description: "Telefone", example: "+55 11 3333-4444" },
    { name: "priceRange", required: false, description: "Faixa de preço", example: "$$" },
    { name: "openingHoursSpecification", required: false, description: "Horário", example: "Seg-Sex 08:00-18:00" },
    { name: "aggregateRating", required: false, description: "Avaliação", example: "4.2" },
    { name: "geo", required: false, description: "Coordenadas", example: "-23.5505, -46.6333" },
    { name: "areaServed", required: false, description: "Área de atendimento", example: "São Paulo" },
  ],
  Organization: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "Organization" },
    { name: "name", required: true, description: "Nome da organização", example: "Minha Empresa SA" },
    { name: "url", required: true, description: "URL do site", example: "https://example.com" },
    { name: "logo", required: true, description: "URL do logo", example: "https://example.com/logo.png" },
    { name: "description", required: false, description: "Descrição", example: "Empresa de tecnologia..." },
    { name: "foundingDate", required: false, description: "Data de fundação", example: "2020-01-01" },
    { name: "sameAs", required: false, description: "Perfis sociais", example: "https://facebook.com/example" },
    { name: "contactPoint", required: false, description: "Contato", example: "+55 11 3333-4444" },
  ],
  Product: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "Product" },
    { name: "name", required: true, description: "Nome do produto", example: "Produto Premium" },
    { name: "image", required: true, description: "Imagem do produto", example: "https://example.com/prod.jpg" },
    { name: "description", required: true, description: "Descrição", example: "O melhor produto..." },
    { name: "sku", required: false, description: "SKU/Código", example: "PROD-001" },
    { name: "brand", required: false, description: "Marca", example: "MinhaMarca" },
    { name: "offers", required: false, description: "Preço/Oferta", example: "R$ 99,90" },
    { name: "aggregateRating", required: false, description: "Avaliação", example: "4.7" },
  ],
  Service: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "Service" },
    { name: "name", required: true, description: "Nome do serviço", example: "Consultoria SEO" },
    { name: "description", required: true, description: "Descrição", example: "Consultoria completa..." },
    { name: "provider", required: false, description: "Provedor", example: "Minha Empresa" },
    { name: "areaServed", required: false, description: "Área atendida", example: "Brasil" },
    { name: "serviceType", required: false, description: "Tipo de serviço", example: "Consultoria" },
    { name: "offers", required: false, description: "Preço", example: "A partir de R$ 500" },
  ],
  Person: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "Person" },
    { name: "name", required: true, description: "Nome completo", example: "João Silva" },
    { name: "jobTitle", required: false, description: "Cargo", example: "CEO" },
    { name: "worksFor", required: false, description: "Empresa", example: "Minha Empresa" },
    { name: "image", required: false, description: "Foto", example: "https://example.com/photo.jpg" },
    { name: "sameAs", required: false, description: "Perfis sociais", example: "https://linkedin.com/in/joao" },
    { name: "email", required: false, description: "E-mail", example: "joao@empresa.com" },
  ],
  WebSite: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "WebSite" },
    { name: "name", required: true, description: "Nome do site", example: "Meu Site" },
    { name: "url", required: true, description: "URL", example: "https://example.com" },
    { name: "potentialAction", required: false, description: "SearchAction", example: "Busca interna" },
    { name: "inLanguage", required: false, description: "Idioma", example: "pt-BR" },
  ],
  WebPage: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "WebPage" },
    { name: "name", required: true, description: "Título da página", example: "Blog" },
    { name: "url", required: true, description: "URL", example: "https://example.com/blog" },
    { name: "description", required: false, description: "Descrição da página", example: "Nosso blog..." },
  ],
  AggregateRating: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "AggregateRating" },
    { name: "ratingValue", required: true, description: "Nota média", example: "4.5" },
    { name: "reviewCount", required: true, description: "Número de avaliações", example: "142" },
    { name: "bestRating", required: false, description: "Nota máxima", example: "5" },
    { name: "worstRating", required: false, description: "Nota mínima", example: "1" },
  ],
  Menu: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "Menu" },
    { name: "name", required: true, description: "Nome do cardápio", example: "Cardápio Principal" },
    { name: "hasMenuSection", required: false, description: "Seções do cardápio", example: "Entradas, Pratos..." },
  ],
  PostalAddress: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "PostalAddress" },
    { name: "streetAddress", required: true, description: "Rua e número", example: "Rua Principal, 123" },
    { name: "addressLocality", required: true, description: "Cidade", example: "São Paulo" },
    { name: "addressRegion", required: true, description: "Estado", example: "SP" },
    { name: "postalCode", required: false, description: "CEP", example: "01234-567" },
    { name: "addressCountry", required: false, description: "País", example: "BR" },
  ],
  Place: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "Place" },
    { name: "name", required: true, description: "Nome do local", example: "Centro de SP" },
    { name: "address", required: false, description: "Endereço", example: "Av. Paulista, 1000" },
    { name: "geo", required: false, description: "Coordenadas", example: "-23.56, -46.65" },
  ],
  MedicalBusiness: [
    { name: "@type", required: true, description: "Tipo Schema.org", example: "MedicalBusiness" },
    { name: "name", required: true, description: "Nome da clínica", example: "Clínica Saúde" },
    { name: "medicalSpecialty", required: false, description: "Especialidade", example: "Cardiologia" },
    { name: "address", required: true, description: "Endereço", example: "Rua dos Médicos, 100" },
    { name: "telephone", required: false, description: "Telefone", example: "+55 11 3333-4444" },
    { name: "openingHoursSpecification", required: false, description: "Horário", example: "Seg-Sex 08:00-18:00" },
  ],
  LegalService: [
    { name: "@type", required: true, description: "Tipo", example: "LegalService" },
    { name: "name", required: true, description: "Nome do escritório", example: "Silva & Associados" },
    { name: "address", required: true, description: "Endereço", example: "Av. Justiça, 500" },
    { name: "telephone", required: false, description: "Telefone", example: "+55 11 2222-3333" },
    { name: "areaServed", required: false, description: "Área de atuação", example: "São Paulo" },
  ],
  ProfessionalService: [
    { name: "@type", required: true, description: "Tipo", example: "ProfessionalService" },
    { name: "name", required: true, description: "Nome", example: "Consultoria ABC" },
    { name: "address", required: true, description: "Endereço", example: "Rua Comercial, 200" },
    { name: "telephone", required: false, description: "Telefone", example: "+55 11 5555-6666" },
  ],
  Review: [
    { name: "@type", required: true, description: "Tipo", example: "Review" },
    { name: "reviewBody", required: true, description: "Texto da avaliação", example: "Excelente serviço!" },
    { name: "author", required: true, description: "Autor", example: "Maria Silva" },
    { name: "reviewRating", required: false, description: "Nota", example: "5" },
  ],
  Corporation: [
    { name: "@type", required: true, description: "Tipo", example: "Corporation" },
    { name: "name", required: true, description: "Razão social", example: "Empresa SA" },
    { name: "tickerSymbol", required: false, description: "Ticker", example: "EMPR3" },
  ],
  ProductGroup: [
    { name: "@type", required: true, description: "Tipo", example: "ProductGroup" },
    { name: "name", required: true, description: "Nome da categoria", example: "Eletrônicos" },
    { name: "hasVariant", required: false, description: "Variantes", example: "Produto A, B, C" },
  ],
  MedicalProcedure: [
    { name: "@type", required: true, description: "Tipo", example: "MedicalProcedure" },
    { name: "name", required: true, description: "Nome do procedimento", example: "Consulta Médica" },
    { name: "procedureType", required: false, description: "Tipo de procedimento", example: "Diagnóstico" },
  ],
  IndividualProduct: [
    { name: "@type", required: true, description: "Tipo", example: "IndividualProduct" },
    { name: "name", required: true, description: "Nome", example: "Produto Único" },
    { name: "serialNumber", required: false, description: "Nº Serial", example: "SN-12345" },
  ],
  HealthClub: [
    { name: "@type", required: true, description: "Tipo", example: "HealthClub" },
    { name: "name", required: true, description: "Nome da academia", example: "Fitness Club" },
    { name: "address", required: true, description: "Endereço", example: "Rua dos Atletas, 50" },
    { name: "openingHoursSpecification", required: false, description: "Horário", example: "Seg-Sab 06:00-22:00" },
  ],
  RealEstateAgent: [
    { name: "@type", required: true, description: "Tipo", example: "RealEstateAgent" },
    { name: "name", required: true, description: "Nome da imobiliária", example: "Imobiliária XYZ" },
    { name: "address", required: true, description: "Endereço", example: "Av. Central, 800" },
  ],
  TravelAgency: [
    { name: "@type", required: true, description: "Tipo", example: "TravelAgency" },
    { name: "name", required: true, description: "Nome da agência", example: "Viagens & Cia" },
    { name: "address", required: true, description: "Endereço", example: "Rua dos Viajantes, 100" },
  ],
  EducationalOrganization: [
    { name: "@type", required: true, description: "Tipo", example: "EducationalOrganization" },
    { name: "name", required: true, description: "Nome da instituição", example: "Escola ABC" },
    { name: "address", required: true, description: "Endereço", example: "Rua da Educação, 300" },
  ],
  AutoRepair: [
    { name: "@type", required: true, description: "Tipo", example: "AutoRepair" },
    { name: "name", required: true, description: "Nome da oficina", example: "Oficina do Zé" },
    { name: "address", required: true, description: "Endereço", example: "Rua dos Mecânicos, 75" },
  ],
  BeautySalon: [
    { name: "@type", required: true, description: "Tipo", example: "BeautySalon" },
    { name: "name", required: true, description: "Nome do salão", example: "Salão Beleza" },
    { name: "address", required: true, description: "Endereço", example: "Rua da Beleza, 42" },
  ],
  HomeAndConstructionBusiness: [
    { name: "@type", required: true, description: "Tipo", example: "HomeAndConstructionBusiness" },
    { name: "name", required: true, description: "Nome", example: "Reparos Já" },
    { name: "areaServed", required: false, description: "Área atendida", example: "Grande São Paulo" },
  ],
};

interface Triple {
  id: string;
  predicate: string;
  otherEntityName: string;
  otherEntityType: string;
  direction: "outgoing" | "incoming";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string | null;
  entityData: EntityNodeData | null;
  projectId: string;
  allNodes: { id: string; data: EntityNodeData }[];
  allEdges: { id: string; source: string; target: string; data?: { predicate?: string } }[];
}

export function EntityDetailPanel({ open, onOpenChange, entityId, entityData, projectId, allNodes, allEdges }: Props) {
  const [schemaValues, setSchemaValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const schemaType = entityData?.schemaType || "";
  const properties = SCHEMA_PROPERTIES[schemaType] || SCHEMA_PROPERTIES["Organization"] || [];

  // Load saved schema properties
  useEffect(() => {
    if (!entityId || !open) return;
    (async () => {
      const { data } = await supabase
        .from("semantic_entities")
        .select("schema_properties")
        .eq("id", entityId)
        .single();
      if (data?.schema_properties && typeof data.schema_properties === "object") {
        setSchemaValues(data.schema_properties as Record<string, string>);
      } else {
        // Pre-fill @type and name
        setSchemaValues({
          "@type": schemaType || "",
          name: entityData?.label || "",
        });
      }
    })();
  }, [entityId, open, schemaType, entityData?.label]);

  // Get connected triples
  const triples: Triple[] = [];
  if (entityId) {
    allEdges.forEach((edge) => {
      if (edge.source === entityId) {
        const target = allNodes.find((n) => n.id === edge.target);
        if (target) {
          triples.push({
            id: edge.id,
            predicate: edge.data?.predicate || "relacionado_a",
            otherEntityName: (target.data as EntityNodeData).label,
            otherEntityType: (target.data as EntityNodeData).entityType,
            direction: "outgoing",
          });
        }
      }
      if (edge.target === entityId) {
        const source = allNodes.find((n) => n.id === edge.source);
        if (source) {
          triples.push({
            id: edge.id,
            predicate: edge.data?.predicate || "relacionado_a",
            otherEntityName: (source.data as EntityNodeData).label,
            otherEntityType: (source.data as EntityNodeData).entityType,
            direction: "incoming",
          });
        }
      }
    });
  }

  const handleSaveProperties = async () => {
    if (!entityId) return;
    setSaving(true);
    await supabase
      .from("semantic_entities")
      .update({ schema_properties: schemaValues })
      .eq("id", entityId);
    setSaving(false);
    toast({ title: "Propriedades salvas!" });
  };

  const generateJsonLd = () => {
    const obj: Record<string, any> = { "@context": "https://schema.org" };
    properties.forEach((p) => {
      const val = schemaValues[p.name];
      if (val) obj[p.name] = val;
    });
    return JSON.stringify(obj, null, 2);
  };

  const handleCopyJsonLd = () => {
    navigator.clipboard.writeText(generateJsonLd());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "JSON-LD copiado!" });
  };

  const Icon = entityData ? (ENTITY_ICONS[entityData.entityType] || ENTITY_ICONS.site) : ENTITY_ICONS.site;
  const color = entityData ? (ENTITY_COLORS[entityData.entityType] || "hsl(250 85% 60%)") : "hsl(250 85% 60%)";

  const filledRequired = properties.filter((p) => p.required && schemaValues[p.name]);
  const totalRequired = properties.filter((p) => p.required);
  const completionPct = totalRequired.length > 0 ? Math.round((filledRequired.length / totalRequired.length) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <SheetHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: color + "22", color }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg truncate">{entityData?.label || "Entidade"}</SheetTitle>
                <SheetDescription className="text-xs">
                  {entityData?.description || "Detalhes da entidade"}
                </SheetDescription>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge style={{ backgroundColor: color + "22", color, borderColor: color + "44" }}>
                {entityData?.entityType}
              </Badge>
              {schemaType && (
                <Badge variant="outline" className="gap-1">
                  <Code2 className="h-3 w-3" />
                  {schemaType}
                </Badge>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Content */}
        <Tabs defaultValue="schema" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 bg-muted/50">
            <TabsTrigger value="schema" className="gap-1 text-xs">
              <Code2 className="h-3 w-3" />
              Schema
            </TabsTrigger>
            <TabsTrigger value="triples" className="gap-1 text-xs">
              <GitBranch className="h-3 w-3" />
              Triples ({triples.length})
            </TabsTrigger>
            <TabsTrigger value="jsonld" className="gap-1 text-xs">
              <ExternalLink className="h-3 w-3" />
              JSON-LD
            </TabsTrigger>
          </TabsList>

          {/* Schema Properties Tab */}
          <TabsContent value="schema" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {/* Completion meter */}
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Completude do Schema</span>
                    <span className="text-xs font-bold" style={{ color: completionPct === 100 ? "hsl(155 70% 42%)" : completionPct > 50 ? "hsl(42 95% 52%)" : "hsl(0 78% 55%)" }}>
                      {completionPct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${completionPct}%`,
                        backgroundColor: completionPct === 100 ? "hsl(155 70% 42%)" : completionPct > 50 ? "hsl(42 95% 52%)" : "hsl(0 78% 55%)",
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {filledRequired.length}/{totalRequired.length} propriedades obrigatórias preenchidas
                  </p>
                </Card>

                {/* Properties form */}
                <div className="space-y-3">
                  {properties.map((prop) => (
                    <div key={prop.name} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium">{prop.name}</Label>
                        {prop.required ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">obrigatório</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">opcional</Badge>
                        )}
                        {schemaValues[prop.name] && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />
                        )}
                      </div>
                      <Input
                        placeholder={prop.example}
                        value={schemaValues[prop.name] || ""}
                        onChange={(e) => setSchemaValues((v) => ({ ...v, [prop.name]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">{prop.description}</p>
                    </div>
                  ))}
                </div>

                <Button onClick={handleSaveProperties} disabled={saving} className="w-full gap-2">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Salvando..." : "Salvar Propriedades"}
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Triples Tab */}
          <TabsContent value="triples" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-3">
                {triples.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <GitBranch className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhuma relação encontrada</p>
                    <p className="text-xs text-muted-foreground">Conecte esta entidade a outras no grafo</p>
                  </div>
                ) : (
                  triples.map((t) => {
                    const OtherIcon = ENTITY_ICONS[t.otherEntityType] || ENTITY_ICONS.site;
                    const otherColor = ENTITY_COLORS[t.otherEntityType] || "hsl(250 85% 60%)";
                    return (
                      <Card key={t.id} className="p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 text-xs">
                          {t.direction === "outgoing" ? (
                            <>
                              <div className="font-semibold text-foreground truncate max-w-[100px]">{entityData?.label}</div>
                              <Badge variant="outline" className="shrink-0 text-[10px]">{t.predicate}</Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="h-5 w-5 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: otherColor + "22", color: otherColor }}>
                                  <OtherIcon className="h-3 w-3" />
                                </div>
                                <span className="font-medium truncate">{t.otherEntityName}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="h-5 w-5 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: otherColor + "22", color: otherColor }}>
                                  <OtherIcon className="h-3 w-3" />
                                </div>
                                <span className="font-medium truncate max-w-[100px]">{t.otherEntityName}</span>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-[10px]">{t.predicate}</Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <div className="font-semibold text-foreground truncate">{entityData?.label}</div>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* JSON-LD Tab */}
          <TabsContent value="jsonld" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Gerado com base nas propriedades preenchidas
                    </span>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={handleCopyJsonLd}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
                <pre className="p-4 rounded-xl bg-muted/50 border text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground">
                  {generateJsonLd()}
                </pre>
                <Card className="p-3 bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      Cole este JSON-LD no <code className="text-primary">&lt;head&gt;</code> da página correspondente a esta entidade para que o Google entenda sua estrutura semântica.
                    </p>
                  </div>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
