import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Code2, Search, Copy, Check, ExternalLink, CheckCircle2, AlertCircle,
  ChevronRight, Sparkles, BookOpen, Layers, FileCode, Eye, ArrowRight,
  Lightbulb, Zap, Globe, Package, Briefcase, MapPin,
  User, Star, Store, Building2, ChevronDown, ChevronUp, FileJson,
  ListChecks, Puzzle, Target, TrendingUp, Plus, Trash2, Play, Wrench,
  TreePine, FolderTree, Hash, Minus, RotateCcw, Download, ClipboardPaste,
  Save, ShieldCheck, FileDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ENTITY_ICONS, ENTITY_COLORS, type EntityNodeData } from "./EntityNode";
import { SCHEMA_TYPES, ENTITY_TYPES } from "./CreateEntityDialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FULL_SCHEMA_TYPES, buildFullSchemaTree, getAllSchemaTypeNames, getSchemaTypeCount,
  buildFullCatalog, getAllCategories,
  type SchemaTreeNode, type AutoSchemaTypeDef,
} from "./schema-registry";

// ═══════════════════════════════════════════════════════════════
// Schema.org Type Definitions — Full Catalog
// ═══════════════════════════════════════════════════════════════

interface SchemaProp {
  name: string;
  required: boolean;
  description: string;
  example: string;
  inputType?: "text" | "url" | "date" | "number" | "json" | "boolean" | "textarea";
}

interface SchemaTypeDef {
  type: string;
  category: string;
  description: string;
  googleFeature?: string;
  properties: SchemaProp[];
  relatedTypes?: string[];
  parent?: string;
}

// ── Full catalog ──
const SCHEMA_CATALOG: SchemaTypeDef[] = [
  // Organizations
  {
    type: "Organization", category: "Organizações", parent: "Thing", description: "Organização genérica, empresa ou instituição.",
    googleFeature: "Knowledge Panel, Sitelinks",
    relatedTypes: ["Corporation", "LocalBusiness", "NGO"],
    properties: [
      { name: "@type", required: true, description: "Tipo Schema.org", example: "Organization" },
      { name: "name", required: true, description: "Nome oficial", example: "Minha Empresa SA" },
      { name: "url", required: true, description: "URL do site principal", example: "https://example.com", inputType: "url" },
      { name: "logo", required: true, description: "URL do logotipo", example: "https://example.com/logo.png", inputType: "url" },
      { name: "description", required: false, description: "Descrição da organização", example: "Líder em tecnologia...", inputType: "textarea" },
      { name: "foundingDate", required: false, description: "Data de fundação", example: "2015-03-10", inputType: "date" },
      { name: "founder", required: false, description: "Fundador(es)", example: "João Silva" },
      { name: "numberOfEmployees", required: false, description: "Número de funcionários", example: "50-100" },
      { name: "sameAs", required: false, description: "Links para redes sociais (JSON array)", example: '["https://facebook.com/empresa","https://linkedin.com/company/empresa"]', inputType: "json" },
      { name: "contactPoint", required: false, description: "Ponto de contato (JSON)", example: '{"@type":"ContactPoint","telephone":"+55-11-99999","contactType":"customer service"}', inputType: "json" },
      { name: "address", required: false, description: "Endereço da sede", example: "Av. Paulista, 1000" },
      { name: "email", required: false, description: "E-mail institucional", example: "contato@empresa.com" },
      { name: "taxID", required: false, description: "CNPJ/Tax ID", example: "12.345.678/0001-90" },
      { name: "areaServed", required: false, description: "Área de atuação", example: "Brasil" },
      { name: "knowsAbout", required: false, description: "Áreas de expertise", example: "SEO, Marketing Digital" },
    ],
  },
  {
    type: "Corporation", category: "Organizações", parent: "Organization", description: "Empresa de capital aberto ou corporação.",
    googleFeature: "Knowledge Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Corporation" },
      { name: "name", required: true, description: "Razão social", example: "Empresa SA" },
      { name: "tickerSymbol", required: false, description: "Código na bolsa", example: "EMPR3" },
      { name: "url", required: true, description: "URL do site", example: "https://empresa.com.br", inputType: "url" },
      { name: "logo", required: true, description: "Logotipo", example: "https://empresa.com.br/logo.svg", inputType: "url" },
      { name: "founder", required: false, description: "Fundador", example: "Carlos Santos" },
      { name: "foundingDate", required: false, description: "Data de fundação", example: "1998-01-15", inputType: "date" },
      { name: "numberOfEmployees", required: false, description: "Funcionários", example: "1000+" },
    ],
  },
  {
    type: "LocalBusiness", category: "Organizações", parent: "Organization", description: "Negócio local com endereço físico.",
    googleFeature: "Local Pack, Knowledge Panel, Maps",
    relatedTypes: ["Restaurant", "MedicalBusiness", "LegalService", "AutoRepair", "BeautySalon"],
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "LocalBusiness" },
      { name: "name", required: true, description: "Nome do negócio", example: "Pizzaria Napoli" },
      { name: "image", required: true, description: "Foto principal", example: "https://example.com/foto.jpg", inputType: "url" },
      { name: "address", required: true, description: "Endereço (JSON PostalAddress)", example: '{"@type":"PostalAddress","streetAddress":"Rua A, 123","addressLocality":"São Paulo","addressRegion":"SP","postalCode":"01234-000"}', inputType: "json" },
      { name: "telephone", required: true, description: "Telefone", example: "+55 11 3333-4444" },
      { name: "url", required: false, description: "Site", example: "https://pizzarianapoli.com", inputType: "url" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$" },
      { name: "openingHoursSpecification", required: false, description: "Horários (JSON)", example: '{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday"],"opens":"08:00","closes":"18:00"}', inputType: "json" },
      { name: "aggregateRating", required: false, description: "Avaliação média (JSON)", example: '{"@type":"AggregateRating","ratingValue":"4.5","reviewCount":"120"}', inputType: "json" },
      { name: "geo", required: false, description: "Coordenadas (JSON)", example: '{"@type":"GeoCoordinates","latitude":"-23.55","longitude":"-46.63"}', inputType: "json" },
      { name: "areaServed", required: false, description: "Área atendida", example: "São Paulo - Zona Sul" },
      { name: "paymentAccepted", required: false, description: "Formas de pagamento", example: "Dinheiro, Cartão, PIX" },
    ],
  },
  {
    type: "Restaurant", category: "Organizações", parent: "LocalBusiness", description: "Restaurante, bar ou estabelecimento alimentício.",
    googleFeature: "Local Pack, Rich Results, Maps",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Restaurant" },
      { name: "name", required: true, description: "Nome do restaurante", example: "Sushi Garden" },
      { name: "image", required: true, description: "Foto", example: "https://example.com/sushi.jpg", inputType: "url" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Sabores, 42" },
      { name: "telephone", required: true, description: "Telefone", example: "+55 11 99999-0000" },
      { name: "servesCuisine", required: true, description: "Tipo de culinária", example: "Japonesa" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$$" },
      { name: "menu", required: false, description: "URL do cardápio", example: "https://sushi.com/cardapio", inputType: "url" },
      { name: "acceptsReservations", required: false, description: "Aceita reservas", example: "True", inputType: "boolean" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: '{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday"],"opens":"11:30","closes":"23:00"}', inputType: "json" },
      { name: "aggregateRating", required: false, description: "Avaliação", example: '{"@type":"AggregateRating","ratingValue":"4.7","reviewCount":"89"}', inputType: "json" },
    ],
  },
  // Products
  {
    type: "Product", category: "Produtos", parent: "Thing", description: "Produto físico ou digital à venda.",
    googleFeature: "Product Rich Results, Shopping",
    relatedTypes: ["IndividualProduct", "ProductGroup", "SoftwareApplication"],
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Product" },
      { name: "name", required: true, description: "Nome do produto", example: "Smartphone XYZ Pro" },
      { name: "image", required: true, description: "Imagem do produto", example: "https://example.com/smartphone.jpg", inputType: "url" },
      { name: "description", required: true, description: "Descrição detalhada", example: "Smartphone premium com câmera de 108MP...", inputType: "textarea" },
      { name: "sku", required: false, description: "SKU/Código", example: "SKU-XYZ-PRO-128" },
      { name: "gtin13", required: false, description: "EAN/GTIN", example: "7891234567890" },
      { name: "brand", required: true, description: "Marca (JSON Brand)", example: '{"@type":"Brand","name":"TechBrand"}', inputType: "json" },
      { name: "offers", required: true, description: "Oferta/Preço (JSON Offer)", example: '{"@type":"Offer","price":"2999.90","priceCurrency":"BRL","availability":"https://schema.org/InStock"}', inputType: "json" },
      { name: "aggregateRating", required: false, description: "Avaliação média (JSON)", example: '{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"356"}', inputType: "json" },
      { name: "review", required: false, description: "Avaliações (JSON)", example: '{"@type":"Review","author":{"@type":"Person","name":"João"},"reviewRating":{"@type":"Rating","ratingValue":"5"}}', inputType: "json" },
      { name: "color", required: false, description: "Cor", example: "Preto" },
      { name: "material", required: false, description: "Material", example: "Alumínio e Vidro" },
      { name: "manufacturer", required: false, description: "Fabricante", example: "TechBrand Inc." },
      { name: "model", required: false, description: "Modelo", example: "XYZ Pro 2025" },
    ],
  },
  {
    type: "SoftwareApplication", category: "Produtos", parent: "Product", description: "Aplicativo ou software.",
    googleFeature: "Software App Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SoftwareApplication" },
      { name: "name", required: true, description: "Nome do app", example: "MeuApp" },
      { name: "operatingSystem", required: false, description: "Sistema operacional", example: "Android, iOS" },
      { name: "applicationCategory", required: false, description: "Categoria", example: "BusinessApplication" },
      { name: "offers", required: false, description: "Preço (JSON Offer)", example: '{"@type":"Offer","price":"0","priceCurrency":"BRL"}', inputType: "json" },
      { name: "aggregateRating", required: false, description: "Avaliação", example: '{"@type":"AggregateRating","ratingValue":"4.6","reviewCount":"120"}', inputType: "json" },
    ],
  },
  // Services
  {
    type: "Service", category: "Serviços", parent: "Thing", description: "Serviço prestado por pessoa ou empresa.",
    googleFeature: "Service Rich Results",
    relatedTypes: ["ProfessionalService", "FinancialService"],
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Service" },
      { name: "name", required: true, description: "Nome do serviço", example: "Consultoria SEO" },
      { name: "description", required: true, description: "Descrição detalhada", example: "Análise completa de SEO...", inputType: "textarea" },
      { name: "provider", required: true, description: "Provedor (JSON Organization)", example: '{"@type":"Organization","name":"Minha Agência"}', inputType: "json" },
      { name: "serviceType", required: false, description: "Tipo do serviço", example: "Consultoria Digital" },
      { name: "areaServed", required: false, description: "Área atendida", example: "Todo o Brasil" },
      { name: "offers", required: false, description: "Preço", example: "A partir de R$ 1.500/mês" },
      { name: "serviceOutput", required: false, description: "Resultado entregue", example: "Relatório de SEO completo" },
      { name: "serviceAudience", required: false, description: "Público-alvo", example: "Empresas de médio porte" },
    ],
  },
  {
    type: "ProfessionalService", category: "Serviços", parent: "LocalBusiness", description: "Serviço profissional especializado.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "ProfessionalService" },
      { name: "name", required: true, description: "Nome", example: "Contabilidade Express" },
      { name: "address", required: true, description: "Endereço", example: "Rua Comercial, 200" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 5555-6666" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$" },
    ],
  },
  // People
  {
    type: "Person", category: "Pessoas", parent: "Thing", description: "Pessoa física, autor, profissional.",
    googleFeature: "Knowledge Panel, Author Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Person" },
      { name: "name", required: true, description: "Nome completo", example: "João Silva" },
      { name: "jobTitle", required: false, description: "Cargo atual", example: "CEO & Fundador" },
      { name: "worksFor", required: false, description: "Empresa (JSON Organization)", example: '{"@type":"Organization","name":"Empresa SA"}', inputType: "json" },
      { name: "image", required: false, description: "Foto profissional", example: "https://example.com/joao.jpg", inputType: "url" },
      { name: "url", required: false, description: "Site pessoal", example: "https://joaosilva.com", inputType: "url" },
      { name: "sameAs", required: false, description: "Redes sociais (JSON array)", example: '["https://linkedin.com/in/joao","https://twitter.com/joao"]', inputType: "json" },
      { name: "email", required: false, description: "E-mail", example: "joao@empresa.com" },
      { name: "alumniOf", required: false, description: "Formação acadêmica (JSON)", example: '{"@type":"EducationalOrganization","name":"USP"}', inputType: "json" },
      { name: "knowsAbout", required: false, description: "Áreas de expertise", example: "SEO, Marketing Digital, Growth" },
      { name: "description", required: false, description: "Bio", example: "Especialista em SEO com 10 anos de experiência...", inputType: "textarea" },
    ],
  },
  // Web
  {
    type: "WebSite", category: "Web", parent: "CreativeWork", description: "Website completo com busca interna.",
    googleFeature: "Sitelinks Search Box",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "WebSite" },
      { name: "name", required: true, description: "Nome do site", example: "Meu Site" },
      { name: "url", required: true, description: "URL principal", example: "https://example.com", inputType: "url" },
      { name: "description", required: false, description: "Descrição do site", example: "O melhor site de...", inputType: "textarea" },
      { name: "inLanguage", required: false, description: "Idioma", example: "pt-BR" },
      { name: "publisher", required: false, description: "Publicador (JSON Organization)", example: '{"@type":"Organization","name":"Minha Empresa"}', inputType: "json" },
      { name: "potentialAction", required: false, description: "Busca interna (JSON SearchAction)", example: '{"@type":"SearchAction","target":"https://example.com/busca?q={search_term_string}","query-input":"required name=search_term_string"}', inputType: "json" },
    ],
  },
  {
    type: "WebPage", category: "Web", parent: "CreativeWork", description: "Página individual do site.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "WebPage" },
      { name: "name", required: true, description: "Título", example: "Sobre Nós" },
      { name: "url", required: true, description: "URL da página", example: "https://example.com/sobre", inputType: "url" },
      { name: "description", required: false, description: "Descrição", example: "Conheça nossa história", inputType: "textarea" },
      { name: "breadcrumb", required: false, description: "Breadcrumb (JSON BreadcrumbList)", example: '{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://example.com"}]}', inputType: "json" },
      { name: "mainEntity", required: false, description: "Entidade principal da página (JSON)", example: '{"@type":"Organization","name":"Minha Empresa"}', inputType: "json" },
      { name: "lastReviewed", required: false, description: "Última revisão", example: "2025-01-15", inputType: "date" },
    ],
  },
  {
    type: "FAQPage", category: "Web", parent: "WebPage", description: "Página de perguntas frequentes.",
    googleFeature: "FAQ Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "FAQPage" },
      { name: "mainEntity", required: true, description: "Lista de perguntas (JSON array)", example: '[{"@type":"Question","name":"Como funciona?","acceptedAnswer":{"@type":"Answer","text":"Funciona assim..."}}]', inputType: "json" },
    ],
  },
  {
    type: "Article", category: "Conteúdo", parent: "CreativeWork", description: "Artigo, post de blog ou notícia.",
    googleFeature: "Article Rich Results, Top Stories",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Article" },
      { name: "headline", required: true, description: "Título", example: "10 Dicas de SEO para 2025" },
      { name: "image", required: true, description: "Imagem destaque", example: "https://example.com/artigo.jpg", inputType: "url" },
      { name: "author", required: true, description: "Autor (JSON Person)", example: '{"@type":"Person","name":"João Silva","url":"https://joao.com"}', inputType: "json" },
      { name: "datePublished", required: true, description: "Data de publicação", example: "2025-02-01", inputType: "date" },
      { name: "dateModified", required: false, description: "Última atualização", example: "2025-02-15", inputType: "date" },
      { name: "publisher", required: true, description: "Publicador (JSON Organization)", example: '{"@type":"Organization","name":"Meu Blog","logo":{"@type":"ImageObject","url":"https://example.com/logo.png"}}', inputType: "json" },
      { name: "description", required: false, description: "Resumo", example: "As melhores dicas de SEO...", inputType: "textarea" },
      { name: "wordCount", required: false, description: "Contagem de palavras", example: "2500", inputType: "number" },
      { name: "keywords", required: false, description: "Palavras-chave", example: "SEO, Google, 2025" },
    ],
  },
  {
    type: "BreadcrumbList", category: "Web", parent: "ItemList", description: "Navegação de breadcrumb/trilha.",
    googleFeature: "Breadcrumb Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "BreadcrumbList" },
      { name: "itemListElement", required: true, description: "Itens do breadcrumb (JSON array)", example: '[{"@type":"ListItem","position":1,"name":"Home","item":"https://example.com"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://example.com/blog"}]', inputType: "json" },
    ],
  },
  // Locations
  {
    type: "Place", category: "Locais", parent: "Thing", description: "Local genérico, ponto de interesse.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Place" },
      { name: "name", required: true, description: "Nome do local", example: "Parque Ibirapuera" },
      { name: "address", required: false, description: "Endereço", example: "Av. Pedro Álvares Cabral" },
      { name: "geo", required: false, description: "Coordenadas (JSON GeoCoordinates)", example: '{"@type":"GeoCoordinates","latitude":"-23.58","longitude":"-46.66"}', inputType: "json" },
    ],
  },
  {
    type: "PostalAddress", category: "Locais", parent: "StructuredValue", description: "Endereço postal completo.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "PostalAddress" },
      { name: "streetAddress", required: true, description: "Rua e número", example: "Rua Principal, 123" },
      { name: "addressLocality", required: true, description: "Cidade", example: "São Paulo" },
      { name: "addressRegion", required: true, description: "Estado/UF", example: "SP" },
      { name: "postalCode", required: false, description: "CEP", example: "01234-567" },
      { name: "addressCountry", required: false, description: "País", example: "BR" },
    ],
  },
  // Reviews
  {
    type: "Review", category: "Avaliações", parent: "CreativeWork", description: "Avaliação individual de produto/serviço.",
    googleFeature: "Review Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Review" },
      { name: "reviewBody", required: true, description: "Texto da avaliação", example: "Excelente! Recomendo muito.", inputType: "textarea" },
      { name: "author", required: true, description: "Autor (JSON Person)", example: '{"@type":"Person","name":"Maria Santos"}', inputType: "json" },
      { name: "reviewRating", required: true, description: "Nota (JSON Rating)", example: '{"@type":"Rating","ratingValue":"5","bestRating":"5"}', inputType: "json" },
      { name: "itemReviewed", required: false, description: "Item avaliado (JSON)", example: '{"@type":"Product","name":"Produto X"}', inputType: "json" },
      { name: "datePublished", required: false, description: "Data", example: "2025-01-20", inputType: "date" },
    ],
  },
  {
    type: "AggregateRating", category: "Avaliações", parent: "Rating", description: "Avaliação agregada de múltiplas reviews.",
    googleFeature: "Star Ratings",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "AggregateRating" },
      { name: "ratingValue", required: true, description: "Nota média", example: "4.7", inputType: "number" },
      { name: "reviewCount", required: true, description: "Total de avaliações", example: "342", inputType: "number" },
      { name: "bestRating", required: false, description: "Nota máxima", example: "5", inputType: "number" },
      { name: "worstRating", required: false, description: "Nota mínima", example: "1", inputType: "number" },
    ],
  },
  // Specialized Business
  {
    type: "MedicalBusiness", category: "Negócios Especializados", parent: "LocalBusiness", description: "Clínica médica, hospital ou consultório.",
    googleFeature: "Health Panel, Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "MedicalBusiness" },
      { name: "name", required: true, description: "Nome", example: "Clínica Saúde Total" },
      { name: "medicalSpecialty", required: true, description: "Especialidade", example: "Dermatologia" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Médicos, 100" },
      { name: "telephone", required: true, description: "Telefone", example: "+55 11 3333-4444" },
      { name: "openingHoursSpecification", required: false, description: "Horários (JSON)", example: '{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday"],"opens":"08:00","closes":"18:00"}', inputType: "json" },
      { name: "isAcceptingNewPatients", required: false, description: "Aceita novos pacientes", example: "true", inputType: "boolean" },
    ],
  },
  {
    type: "LegalService", category: "Negócios Especializados", parent: "LocalBusiness", description: "Escritório de advocacia ou serviço jurídico.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "LegalService" },
      { name: "name", required: true, description: "Nome do escritório", example: "Silva & Associados" },
      { name: "address", required: true, description: "Endereço", example: "Av. Justiça, 500" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 2222-3333" },
      { name: "areaServed", required: false, description: "Área de atuação", example: "Direito Empresarial" },
      { name: "knowsAbout", required: false, description: "Áreas do direito", example: "Tributário, Trabalhista, Civil" },
    ],
  },
  {
    type: "AutoRepair", category: "Negócios Especializados", parent: "LocalBusiness", description: "Oficina mecânica, funilaria ou auto center.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "AutoRepair" },
      { name: "name", required: true, description: "Nome", example: "Auto Center Express" },
      { name: "address", required: true, description: "Endereço", example: "Av. dos Mecânicos, 300" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 4444-5555" },
    ],
  },
  {
    type: "BeautySalon", category: "Negócios Especializados", parent: "LocalBusiness", description: "Salão de beleza, barbearia ou spa.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "BeautySalon" },
      { name: "name", required: true, description: "Nome do salão", example: "Studio Beleza" },
      { name: "address", required: true, description: "Endereço", example: "Rua da Beleza, 42" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$" },
    ],
  },
  {
    type: "RealEstateAgent", category: "Negócios Especializados", parent: "LocalBusiness", description: "Imobiliária ou corretor.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "RealEstateAgent" },
      { name: "name", required: true, description: "Nome", example: "Imobiliária Top" },
      { name: "address", required: true, description: "Endereço", example: "Av. Central, 800" },
      { name: "areaServed", required: false, description: "Região", example: "Zona Oeste de SP" },
    ],
  },
  {
    type: "EducationalOrganization", category: "Negócios Especializados", parent: "Organization", description: "Escola, universidade ou curso.",
    googleFeature: "Knowledge Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "EducationalOrganization" },
      { name: "name", required: true, description: "Nome", example: "Escola de Negócios" },
      { name: "address", required: true, description: "Endereço", example: "Rua da Educação, 300" },
      { name: "url", required: false, description: "Site", example: "https://escola.com", inputType: "url" },
    ],
  },
  {
    type: "HealthClub", category: "Negócios Especializados", parent: "LocalBusiness", description: "Academia, clube fitness ou estúdio.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "HealthClub" },
      { name: "name", required: true, description: "Nome", example: "CrossFit Arena" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Atletas, 50" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "Seg-Sab 06:00-22:00" },
    ],
  },
  {
    type: "TravelAgency", category: "Negócios Especializados", parent: "LocalBusiness", description: "Agência de viagens e turismo.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "TravelAgency" },
      { name: "name", required: true, description: "Nome", example: "Viagens & Cia" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Viajantes, 100" },
    ],
  },
  // Events
  {
    type: "Event", category: "Eventos", parent: "Thing", description: "Evento presencial ou online.",
    googleFeature: "Event Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Event" },
      { name: "name", required: true, description: "Nome do evento", example: "Conferência SEO 2025" },
      { name: "startDate", required: true, description: "Data de início", example: "2025-06-15T09:00", inputType: "date" },
      { name: "endDate", required: false, description: "Data de término", example: "2025-06-17T18:00", inputType: "date" },
      { name: "location", required: true, description: "Local (JSON Place)", example: '{"@type":"Place","name":"Centro de Convenções","address":"Av. Principal, 1000"}', inputType: "json" },
      { name: "description", required: false, description: "Descrição", example: "O maior evento de SEO do Brasil", inputType: "textarea" },
      { name: "image", required: false, description: "Imagem", example: "https://example.com/evento.jpg", inputType: "url" },
      { name: "organizer", required: false, description: "Organizador (JSON Organization)", example: '{"@type":"Organization","name":"SEO Brasil"}', inputType: "json" },
      { name: "offers", required: false, description: "Ingressos (JSON Offer)", example: '{"@type":"Offer","price":"299","priceCurrency":"BRL","url":"https://..."}', inputType: "json" },
      { name: "eventAttendanceMode", required: false, description: "Modo", example: "https://schema.org/OfflineEventAttendanceMode", inputType: "url" },
      { name: "eventStatus", required: false, description: "Status", example: "https://schema.org/EventScheduled", inputType: "url" },
    ],
  },
  // Content
  {
    type: "VideoObject", category: "Conteúdo", parent: "MediaObject", description: "Vídeo publicado online.",
    googleFeature: "Video Rich Results, Video Carousels",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "VideoObject" },
      { name: "name", required: true, description: "Título", example: "Como fazer SEO em 2025" },
      { name: "description", required: true, description: "Descrição", example: "Aprenda SEO do zero...", inputType: "textarea" },
      { name: "thumbnailUrl", required: true, description: "Thumbnail", example: "https://example.com/thumb.jpg", inputType: "url" },
      { name: "uploadDate", required: true, description: "Data de upload", example: "2025-01-15", inputType: "date" },
      { name: "duration", required: false, description: "Duração (ISO 8601)", example: "PT10M30S" },
      { name: "contentUrl", required: false, description: "URL do vídeo", example: "https://example.com/video.mp4", inputType: "url" },
      { name: "embedUrl", required: false, description: "URL de embed", example: "https://youtube.com/embed/abc123", inputType: "url" },
    ],
  },
  {
    type: "HowTo", category: "Conteúdo", parent: "CreativeWork", description: "Tutorial passo-a-passo.",
    googleFeature: "How-To Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "HowTo" },
      { name: "name", required: true, description: "Título", example: "Como otimizar imagens para SEO" },
      { name: "description", required: false, description: "Descrição", example: "Guia completo de otimização de imagens", inputType: "textarea" },
      { name: "step", required: true, description: "Passos (JSON array de HowToStep)", example: '[{"@type":"HowToStep","name":"Comprimir","text":"Use formato WebP para melhor compressão"}]', inputType: "json" },
      { name: "totalTime", required: false, description: "Tempo total (ISO 8601)", example: "PT30M" },
      { name: "estimatedCost", required: false, description: "Custo estimado (JSON MonetaryAmount)", example: '{"@type":"MonetaryAmount","currency":"BRL","value":"0"}', inputType: "json" },
    ],
  },
  {
    type: "Recipe", category: "Conteúdo", parent: "HowTo", description: "Receita culinária.",
    googleFeature: "Recipe Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Recipe" },
      { name: "name", required: true, description: "Nome da receita", example: "Bolo de Chocolate" },
      { name: "image", required: true, description: "Foto", example: "https://example.com/bolo.jpg", inputType: "url" },
      { name: "author", required: true, description: "Autor (JSON Person)", example: '{"@type":"Person","name":"Chef Ana"}', inputType: "json" },
      { name: "prepTime", required: false, description: "Tempo de preparo (ISO 8601)", example: "PT30M" },
      { name: "cookTime", required: false, description: "Tempo de cozimento (ISO 8601)", example: "PT45M" },
      { name: "recipeYield", required: false, description: "Rendimento", example: "12 porções" },
      { name: "recipeIngredient", required: true, description: "Ingredientes (JSON array)", example: '["2 xícaras de farinha","1 xícara de açúcar","3 ovos"]', inputType: "json" },
      { name: "recipeInstructions", required: true, description: "Instruções (JSON array de HowToStep)", example: '[{"@type":"HowToStep","text":"Misture os ingredientes secos"}]', inputType: "json" },
      { name: "nutrition", required: false, description: "Info nutricional (JSON NutritionInformation)", example: '{"@type":"NutritionInformation","calories":"350 cal"}', inputType: "json" },
    ],
  },
  // Commerce
  {
    type: "Offer", category: "Comércio", parent: "Intangible", description: "Oferta de compra para um produto/serviço.",
    googleFeature: "Product Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Offer" },
      { name: "price", required: true, description: "Preço", example: "199.90", inputType: "number" },
      { name: "priceCurrency", required: true, description: "Moeda", example: "BRL" },
      { name: "availability", required: true, description: "Disponibilidade", example: "https://schema.org/InStock", inputType: "url" },
      { name: "url", required: false, description: "URL de compra", example: "https://example.com/comprar", inputType: "url" },
      { name: "priceValidUntil", required: false, description: "Preço válido até", example: "2025-12-31", inputType: "date" },
      { name: "seller", required: false, description: "Vendedor (JSON Organization)", example: '{"@type":"Organization","name":"Loja"}', inputType: "json" },
      { name: "itemCondition", required: false, description: "Condição do item", example: "https://schema.org/NewCondition", inputType: "url" },
    ],
  },
  {
    type: "JobPosting", category: "Comércio", parent: "Intangible", description: "Vaga de emprego publicada.",
    googleFeature: "Job Posting Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "JobPosting" },
      { name: "title", required: true, description: "Cargo", example: "Analista de SEO Sênior" },
      { name: "description", required: true, description: "Descrição da vaga", example: "Buscamos um analista de SEO...", inputType: "textarea" },
      { name: "datePosted", required: true, description: "Data de publicação", example: "2025-02-01", inputType: "date" },
      { name: "hiringOrganization", required: true, description: "Empresa (JSON Organization)", example: '{"@type":"Organization","name":"Empresa XYZ"}', inputType: "json" },
      { name: "jobLocation", required: false, description: "Local (JSON Place)", example: '{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"São Paulo"}}', inputType: "json" },
      { name: "baseSalary", required: false, description: "Salário (JSON MonetaryAmount)", example: '{"@type":"MonetaryAmount","currency":"BRL","value":{"@type":"QuantitativeValue","value":"8000","unitText":"MONTH"}}', inputType: "json" },
      { name: "employmentType", required: false, description: "Tipo de emprego", example: "FULL_TIME" },
    ],
  },
  {
    type: "Course", category: "Conteúdo", parent: "CreativeWork", description: "Curso educacional online ou presencial.",
    googleFeature: "Course Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Course" },
      { name: "name", required: true, description: "Nome do curso", example: "SEO Avançado" },
      { name: "description", required: true, description: "Descrição", example: "Domine técnicas avançadas de SEO...", inputType: "textarea" },
      { name: "provider", required: true, description: "Provedor (JSON Organization)", example: '{"@type":"Organization","name":"Escola SEO"}', inputType: "json" },
      { name: "offers", required: false, description: "Preço (JSON Offer)", example: '{"@type":"Offer","price":"497","priceCurrency":"BRL"}', inputType: "json" },
    ],
  },
  // ── Expanded Organizations ──
  {
    type: "NGO", category: "Organizações", parent: "Organization", description: "Organização não-governamental.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "NGO" },
      { name: "name", required: true, description: "Nome da ONG", example: "Instituto Esperança" },
      { name: "url", required: false, description: "Site", example: "https://ong.org", inputType: "url" },
      { name: "description", required: false, description: "Descrição", example: "ONG focada em educação infantil", inputType: "textarea" },
      { name: "foundingDate", required: false, description: "Data de fundação", example: "2010-03-15", inputType: "date" },
      { name: "areaServed", required: false, description: "Área de atuação", example: "Brasil" },
    ],
  },
  {
    type: "Airline", category: "Organizações", parent: "Organization", description: "Companhia aérea.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Airline" },
      { name: "name", required: true, description: "Nome da companhia", example: "Azul Linhas Aéreas" },
      { name: "iataCode", required: false, description: "Código IATA", example: "AD" },
      { name: "url", required: false, description: "Site", example: "https://voeazul.com.br", inputType: "url" },
    ],
  },
  {
    type: "SportsOrganization", category: "Organizações", parent: "Organization", description: "Organização esportiva, liga ou federação.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SportsOrganization" },
      { name: "name", required: true, description: "Nome", example: "CBF" },
      { name: "sport", required: false, description: "Esporte", example: "Futebol" },
      { name: "url", required: false, description: "Site", example: "https://cbf.com.br", inputType: "url" },
    ],
  },
  {
    type: "SportsTeam", category: "Organizações", parent: "SportsOrganization", description: "Time ou equipe esportiva.",
    googleFeature: "Knowledge Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SportsTeam" },
      { name: "name", required: true, description: "Nome do time", example: "Corinthians" },
      { name: "sport", required: false, description: "Esporte", example: "Futebol" },
      { name: "coach", required: false, description: "Treinador (JSON Person)", example: '{"@type":"Person","name":"Técnico X"}', inputType: "json" },
      { name: "memberOf", required: false, description: "Liga/Federação", example: '{"@type":"SportsOrganization","name":"CBF"}', inputType: "json" },
    ],
  },
  {
    type: "GovernmentOrganization", category: "Organizações", parent: "Organization", description: "Órgão governamental.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "GovernmentOrganization" },
      { name: "name", required: true, description: "Nome do órgão", example: "Ministério da Educação" },
      { name: "url", required: false, description: "Site", example: "https://gov.br/mec", inputType: "url" },
      { name: "address", required: false, description: "Endereço", example: "Brasília - DF" },
    ],
  },
  {
    type: "MusicGroup", category: "Organizações", parent: "PerformingGroup", description: "Banda musical ou grupo artístico.",
    googleFeature: "Knowledge Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "MusicGroup" },
      { name: "name", required: true, description: "Nome da banda", example: "Legião Urbana" },
      { name: "genre", required: false, description: "Gênero musical", example: "Rock Brasileiro" },
      { name: "album", required: false, description: "Álbuns (JSON)", example: '{"@type":"MusicAlbum","name":"Dois"}', inputType: "json" },
      { name: "sameAs", required: false, description: "Links", example: '["https://open.spotify.com/artist/..."]', inputType: "json" },
    ],
  },
  // ── Expanded Products ──
  {
    type: "IndividualProduct", category: "Produtos", parent: "Product", description: "Produto individual com identificador único.",
    googleFeature: "Product Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "IndividualProduct" },
      { name: "name", required: true, description: "Nome", example: "Tênis Air Max 90" },
      { name: "serialNumber", required: false, description: "Número de série", example: "SN-2025-001" },
      { name: "brand", required: true, description: "Marca (JSON)", example: '{"@type":"Brand","name":"Nike"}', inputType: "json" },
      { name: "offers", required: true, description: "Oferta (JSON)", example: '{"@type":"Offer","price":"799","priceCurrency":"BRL"}', inputType: "json" },
    ],
  },
  {
    type: "ProductGroup", category: "Produtos", parent: "Product", description: "Grupo de variantes de produto (cores, tamanhos).",
    googleFeature: "Product Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "ProductGroup" },
      { name: "name", required: true, description: "Nome do grupo", example: "Camiseta Básica" },
      { name: "productGroupID", required: false, description: "ID do grupo", example: "GRP-CAMISETA-001" },
      { name: "variesBy", required: false, description: "Varia por", example: '["https://schema.org/color","https://schema.org/size"]', inputType: "json" },
      { name: "hasVariant", required: false, description: "Variantes (JSON)", example: '[{"@type":"Product","name":"Camiseta P Azul","color":"Azul","size":"P"}]', inputType: "json" },
    ],
  },
  {
    type: "Vehicle", category: "Produtos", parent: "Product", description: "Veículo automotor.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Vehicle" },
      { name: "name", required: true, description: "Nome do veículo", example: "Honda Civic 2025" },
      { name: "brand", required: true, description: "Marca (JSON)", example: '{"@type":"Brand","name":"Honda"}', inputType: "json" },
      { name: "model", required: false, description: "Modelo", example: "Civic EXL" },
      { name: "vehicleModelDate", required: false, description: "Ano/modelo", example: "2025" },
      { name: "fuelType", required: false, description: "Combustível", example: "Flex" },
      { name: "mileageFromOdometer", required: false, description: "Quilometragem", example: '{"@type":"QuantitativeValue","value":"0","unitCode":"KMT"}', inputType: "json" },
      { name: "offers", required: false, description: "Preço (JSON)", example: '{"@type":"Offer","price":"165000","priceCurrency":"BRL"}', inputType: "json" },
    ],
  },
  {
    type: "Book", category: "Produtos", parent: "CreativeWork", description: "Livro físico ou digital.",
    googleFeature: "Book Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Book" },
      { name: "name", required: true, description: "Título", example: "A Arte do SEO" },
      { name: "author", required: true, description: "Autor", example: '{"@type":"Person","name":"Eric Enge"}', inputType: "json" },
      { name: "isbn", required: false, description: "ISBN", example: "978-85-352-0000-0" },
      { name: "numberOfPages", required: false, description: "Páginas", example: "450", inputType: "number" },
      { name: "publisher", required: false, description: "Editora (JSON)", example: '{"@type":"Organization","name":"Editora X"}', inputType: "json" },
      { name: "datePublished", required: false, description: "Data de publicação", example: "2024-06-01", inputType: "date" },
      { name: "inLanguage", required: false, description: "Idioma", example: "pt-BR" },
      { name: "offers", required: false, description: "Preço (JSON)", example: '{"@type":"Offer","price":"89.90","priceCurrency":"BRL"}', inputType: "json" },
    ],
  },
  // ── Expanded Services ──
  {
    type: "FinancialService", category: "Serviços", parent: "LocalBusiness", description: "Serviço financeiro: banco, seguradora, contabilidade.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "FinancialService" },
      { name: "name", required: true, description: "Nome", example: "Banco Digital Plus" },
      { name: "address", required: false, description: "Endereço", example: "Av. Financeira, 500" },
      { name: "url", required: false, description: "Site", example: "https://bancodigital.com", inputType: "url" },
      { name: "areaServed", required: false, description: "Área de atuação", example: "Todo o Brasil" },
    ],
  },
  {
    type: "InsuranceAgency", category: "Serviços", parent: "FinancialService", description: "Corretora ou agência de seguros.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "InsuranceAgency" },
      { name: "name", required: true, description: "Nome", example: "Seguros Confiança" },
      { name: "address", required: false, description: "Endereço", example: "Rua dos Seguros, 200" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 3333-7777" },
    ],
  },
  {
    type: "GovernmentService", category: "Serviços", parent: "Service", description: "Serviço governamental oferecido ao público.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "GovernmentService" },
      { name: "name", required: true, description: "Nome do serviço", example: "Emissão de Passaporte" },
      { name: "serviceOperator", required: false, description: "Órgão responsável", example: '{"@type":"GovernmentOrganization","name":"Polícia Federal"}', inputType: "json" },
      { name: "areaServed", required: false, description: "Área", example: "Brasil" },
      { name: "url", required: false, description: "URL", example: "https://gov.br/passaporte", inputType: "url" },
    ],
  },
  // ── Expanded Pessoas ──
  {
    type: "Occupation", category: "Pessoas", parent: "Intangible", description: "Profissão ou ocupação.",
    googleFeature: "Occupation Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Occupation" },
      { name: "name", required: true, description: "Nome da profissão", example: "Analista de SEO" },
      { name: "description", required: false, description: "Descrição", example: "Profissional que otimiza sites...", inputType: "textarea" },
      { name: "estimatedSalary", required: false, description: "Salário estimado (JSON)", example: '{"@type":"MonetaryAmountDistribution","name":"base","currency":"BRL","median":"8000"}', inputType: "json" },
      { name: "occupationLocation", required: false, description: "Local", example: '{"@type":"Country","name":"Brasil"}', inputType: "json" },
      { name: "skills", required: false, description: "Habilidades", example: "Google Analytics, SEMrush, Python" },
    ],
  },
  // ── Expanded Web ──
  {
    type: "SearchAction", category: "Web", parent: "Action", description: "Ação de busca para Sitelinks Search Box.",
    googleFeature: "Sitelinks Search Box",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SearchAction" },
      { name: "target", required: true, description: "URL com template de busca", example: "https://example.com/busca?q={search_term_string}", inputType: "url" },
      { name: "query-input", required: true, description: "Input da query", example: "required name=search_term_string" },
    ],
  },
  {
    type: "SiteNavigationElement", category: "Web", parent: "WebPageElement", description: "Elemento de navegação do site.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SiteNavigationElement" },
      { name: "name", required: true, description: "Nome do item", example: "Menu Principal" },
      { name: "url", required: false, description: "URL", example: "https://example.com/sobre", inputType: "url" },
    ],
  },
  {
    type: "ProfilePage", category: "Web", parent: "WebPage", description: "Página de perfil de pessoa ou organização.",
    googleFeature: "Profile Page",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "ProfilePage" },
      { name: "name", required: true, description: "Nome do perfil", example: "Perfil de João Silva" },
      { name: "url", required: true, description: "URL do perfil", example: "https://example.com/joao", inputType: "url" },
      { name: "mainEntity", required: false, description: "Entidade principal (JSON Person)", example: '{"@type":"Person","name":"João Silva"}', inputType: "json" },
    ],
  },
  // ── Expanded Conteúdo ──
  {
    type: "NewsArticle", category: "Conteúdo", parent: "Article", description: "Notícia ou artigo jornalístico.",
    googleFeature: "Top Stories, Article Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "NewsArticle" },
      { name: "headline", required: true, description: "Título", example: "Google Atualiza Algoritmo de Busca" },
      { name: "image", required: true, description: "Imagem destaque", example: "https://example.com/news.jpg", inputType: "url" },
      { name: "datePublished", required: true, description: "Publicação", example: "2025-03-01", inputType: "date" },
      { name: "dateModified", required: false, description: "Última atualização", example: "2025-03-02", inputType: "date" },
      { name: "author", required: true, description: "Autor", example: '{"@type":"Person","name":"Repórter X"}', inputType: "json" },
      { name: "publisher", required: true, description: "Veículo (JSON Organization)", example: '{"@type":"Organization","name":"Portal News"}', inputType: "json" },
    ],
  },
  {
    type: "BlogPosting", category: "Conteúdo", parent: "SocialMediaPosting", description: "Post de blog.",
    googleFeature: "Article Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "BlogPosting" },
      { name: "headline", required: true, description: "Título", example: "10 Dicas de SEO para 2025" },
      { name: "image", required: true, description: "Imagem", example: "https://example.com/post.jpg", inputType: "url" },
      { name: "author", required: true, description: "Autor", example: '{"@type":"Person","name":"Ana Blog"}', inputType: "json" },
      { name: "datePublished", required: true, description: "Publicação", example: "2025-01-10", inputType: "date" },
      { name: "publisher", required: false, description: "Publicador (JSON)", example: '{"@type":"Organization","name":"Meu Blog"}', inputType: "json" },
      { name: "wordCount", required: false, description: "Palavras", example: "1500", inputType: "number" },
    ],
  },
  {
    type: "Podcast", category: "Conteúdo", parent: "CreativeWorkSeries", description: "Série de podcast.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "PodcastSeries" },
      { name: "name", required: true, description: "Nome", example: "SEO Cast" },
      { name: "description", required: false, description: "Descrição", example: "Podcast semanal sobre SEO", inputType: "textarea" },
      { name: "url", required: false, description: "URL", example: "https://seocast.com", inputType: "url" },
      { name: "author", required: false, description: "Host (JSON Person)", example: '{"@type":"Person","name":"Carlos"}', inputType: "json" },
    ],
  },
  {
    type: "MusicRecording", category: "Conteúdo", parent: "CreativeWork", description: "Gravação musical individual.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "MusicRecording" },
      { name: "name", required: true, description: "Nome da música", example: "Faroeste Caboclo" },
      { name: "byArtist", required: false, description: "Artista (JSON)", example: '{"@type":"MusicGroup","name":"Legião Urbana"}', inputType: "json" },
      { name: "duration", required: false, description: "Duração (ISO 8601)", example: "PT9M30S" },
      { name: "inAlbum", required: false, description: "Álbum (JSON)", example: '{"@type":"MusicAlbum","name":"Que País É Este?"}', inputType: "json" },
    ],
  },
  {
    type: "Movie", category: "Conteúdo", parent: "CreativeWork", description: "Filme ou longa-metragem.",
    googleFeature: "Knowledge Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Movie" },
      { name: "name", required: true, description: "Título", example: "Tropa de Elite" },
      { name: "director", required: false, description: "Diretor (JSON Person)", example: '{"@type":"Person","name":"José Padilha"}', inputType: "json" },
      { name: "dateCreated", required: false, description: "Ano", example: "2007", inputType: "number" },
      { name: "duration", required: false, description: "Duração", example: "PT1H55M" },
      { name: "genre", required: false, description: "Gênero", example: "Ação, Drama" },
      { name: "aggregateRating", required: false, description: "Avaliação (JSON)", example: '{"@type":"AggregateRating","ratingValue":"8.0","reviewCount":"5000"}', inputType: "json" },
    ],
  },
  {
    type: "Dataset", category: "Conteúdo", parent: "CreativeWork", description: "Conjunto de dados estruturados.",
    googleFeature: "Dataset Search",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Dataset" },
      { name: "name", required: true, description: "Nome", example: "Dados de Tráfego Orgânico 2025" },
      { name: "description", required: true, description: "Descrição", example: "Dataset com métricas de tráfego...", inputType: "textarea" },
      { name: "url", required: false, description: "URL", example: "https://example.com/dataset", inputType: "url" },
      { name: "distribution", required: false, description: "Distribuição (JSON)", example: '{"@type":"DataDownload","encodingFormat":"CSV","contentUrl":"https://..."}', inputType: "json" },
      { name: "license", required: false, description: "Licença", example: "https://creativecommons.org/licenses/by/4.0/" },
    ],
  },
  // ── Expanded Locais ──
  {
    type: "TouristAttraction", category: "Locais", parent: "Place", description: "Ponto turístico ou atração.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "TouristAttraction" },
      { name: "name", required: true, description: "Nome", example: "Cristo Redentor" },
      { name: "description", required: false, description: "Descrição", example: "Estátua icônica no Rio de Janeiro", inputType: "textarea" },
      { name: "address", required: false, description: "Endereço", example: "Parque Nacional da Tijuca, RJ" },
      { name: "geo", required: false, description: "Coordenadas", example: '{"@type":"GeoCoordinates","latitude":"-22.9519","longitude":"-43.2105"}', inputType: "json" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "08:00-18:00" },
    ],
  },
  {
    type: "Airport", category: "Locais", parent: "CivicStructure", description: "Aeroporto.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Airport" },
      { name: "name", required: true, description: "Nome", example: "Aeroporto de Guarulhos" },
      { name: "iataCode", required: false, description: "Código IATA", example: "GRU" },
      { name: "address", required: false, description: "Endereço", example: "Guarulhos, SP" },
      { name: "geo", required: false, description: "Coordenadas", example: '{"@type":"GeoCoordinates","latitude":"-23.4356","longitude":"-46.4731"}', inputType: "json" },
    ],
  },
  {
    type: "Hotel", category: "Locais", parent: "LodgingBusiness", description: "Hotel ou hospedagem.",
    googleFeature: "Hotel Rich Results, Maps",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Hotel" },
      { name: "name", required: true, description: "Nome", example: "Grand Hotel São Paulo" },
      { name: "address", required: true, description: "Endereço", example: "Av. Paulista, 2000" },
      { name: "starRating", required: false, description: "Estrelas (JSON Rating)", example: '{"@type":"Rating","ratingValue":"5"}', inputType: "json" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$$" },
      { name: "amenityFeature", required: false, description: "Facilidades (JSON)", example: '[{"@type":"LocationFeatureSpecification","name":"Wi-Fi","value":true}]', inputType: "json" },
      { name: "aggregateRating", required: false, description: "Avaliação", example: '{"@type":"AggregateRating","ratingValue":"4.5","reviewCount":"300"}', inputType: "json" },
    ],
  },
  {
    type: "GeoCoordinates", category: "Locais", parent: "StructuredValue", description: "Coordenadas geográficas (latitude/longitude).",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "GeoCoordinates" },
      { name: "latitude", required: true, description: "Latitude", example: "-23.5505", inputType: "number" },
      { name: "longitude", required: true, description: "Longitude", example: "-46.6333", inputType: "number" },
      { name: "elevation", required: false, description: "Elevação (metros)", example: "760", inputType: "number" },
    ],
  },
  // ── Expanded Avaliações ──
  {
    type: "Rating", category: "Avaliações", parent: "Intangible", description: "Classificação individual com nota.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Rating" },
      { name: "ratingValue", required: true, description: "Nota", example: "4.5", inputType: "number" },
      { name: "bestRating", required: false, description: "Nota máxima", example: "5", inputType: "number" },
      { name: "worstRating", required: false, description: "Nota mínima", example: "1", inputType: "number" },
      { name: "author", required: false, description: "Autor", example: '{"@type":"Person","name":"Maria"}', inputType: "json" },
    ],
  },
  {
    type: "EmployerAggregateRating", category: "Avaliações", parent: "AggregateRating", description: "Avaliação agregada de empregador.",
    googleFeature: "Employer Rating",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "EmployerAggregateRating" },
      { name: "ratingValue", required: true, description: "Nota média", example: "4.2", inputType: "number" },
      { name: "reviewCount", required: true, description: "Total reviews", example: "150", inputType: "number" },
      { name: "bestRating", required: false, description: "Máximo", example: "5", inputType: "number" },
      { name: "itemReviewed", required: false, description: "Empresa avaliada", example: '{"@type":"Organization","name":"Empresa XYZ"}', inputType: "json" },
    ],
  },
  // ── Expanded Negócios Especializados ──
  {
    type: "Dentist", category: "Negócios Especializados", parent: "LocalBusiness", description: "Consultório dentário ou clínica odontológica.",
    googleFeature: "Local Pack, Health Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Dentist" },
      { name: "name", required: true, description: "Nome", example: "Odonto Care" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Dentistas, 50" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 8888-9999" },
      { name: "medicalSpecialty", required: false, description: "Especialidade", example: "Ortodontia" },
    ],
  },
  {
    type: "Bakery", category: "Negócios Especializados", parent: "FoodEstablishment", description: "Padaria ou confeitaria.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Bakery" },
      { name: "name", required: true, description: "Nome", example: "Pão Quente" },
      { name: "address", required: true, description: "Endereço", example: "Rua do Pão, 15" },
      { name: "servesCuisine", required: false, description: "Especialidade", example: "Pães artesanais" },
    ],
  },
  {
    type: "Pharmacy", category: "Negócios Especializados", parent: "MedicalBusiness", description: "Farmácia ou drogaria.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Pharmacy" },
      { name: "name", required: true, description: "Nome", example: "Farmácia Popular" },
      { name: "address", required: true, description: "Endereço", example: "Av. da Saúde, 300" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "24 horas" },
    ],
  },
  {
    type: "GasStation", category: "Negócios Especializados", parent: "AutomotiveBusiness", description: "Posto de combustíveis.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "GasStation" },
      { name: "name", required: true, description: "Nome", example: "Posto Shell Centro" },
      { name: "address", required: true, description: "Endereço", example: "Rodovia BR-101, km 200" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "24 horas" },
    ],
  },
  {
    type: "ExerciseGym", category: "Negócios Especializados", parent: "SportsActivityLocation", description: "Academia de ginástica.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "ExerciseGym" },
      { name: "name", required: true, description: "Nome", example: "SmartFit" },
      { name: "address", required: true, description: "Endereço", example: "Shopping Center, Piso 2" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "Seg-Sex 06:00-23:00" },
    ],
  },
  {
    type: "Electrician", category: "Negócios Especializados", parent: "HomeAndConstructionBusiness", description: "Eletricista ou empresa de serviços elétricos.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Electrician" },
      { name: "name", required: true, description: "Nome", example: "Eletricista Express" },
      { name: "address", required: false, description: "Endereço", example: "São Paulo - SP" },
      { name: "areaServed", required: false, description: "Região atendida", example: "Grande São Paulo" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 9999-0000" },
    ],
  },
  {
    type: "Plumber", category: "Negócios Especializados", parent: "HomeAndConstructionBusiness", description: "Encanador ou empresa de serviços hidráulicos.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Plumber" },
      { name: "name", required: true, description: "Nome", example: "Hidro Service" },
      { name: "address", required: false, description: "Endereço", example: "São Paulo - SP" },
      { name: "areaServed", required: false, description: "Região atendida", example: "Zona Sul de SP" },
    ],
  },
  {
    type: "Hospital", category: "Negócios Especializados", parent: "EmergencyService", description: "Hospital ou pronto-socorro.",
    googleFeature: "Health Panel, Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Hospital" },
      { name: "name", required: true, description: "Nome", example: "Hospital Albert Einstein" },
      { name: "address", required: true, description: "Endereço", example: "Av. Albert Einstein, 627" },
      { name: "telephone", required: true, description: "Telefone", example: "+55 11 2151-1233" },
      { name: "medicalSpecialty", required: false, description: "Especialidades", example: "Cardiologia, Oncologia, Neurologia" },
      { name: "availableService", required: false, description: "Serviços disponíveis", example: "Emergência 24h, UTI, Centro Cirúrgico" },
    ],
  },
  // ── Expanded Eventos ──
  {
    type: "MusicEvent", category: "Eventos", parent: "Event", description: "Show, festival ou concerto musical.",
    googleFeature: "Event Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "MusicEvent" },
      { name: "name", required: true, description: "Nome", example: "Rock in Rio 2025" },
      { name: "startDate", required: true, description: "Início", example: "2025-09-19", inputType: "date" },
      { name: "location", required: true, description: "Local (JSON Place)", example: '{"@type":"Place","name":"Cidade do Rock","address":"Rio de Janeiro"}', inputType: "json" },
      { name: "performer", required: false, description: "Artistas (JSON)", example: '[{"@type":"MusicGroup","name":"Foo Fighters"}]', inputType: "json" },
      { name: "offers", required: false, description: "Ingressos (JSON)", example: '{"@type":"Offer","price":"695","priceCurrency":"BRL"}', inputType: "json" },
    ],
  },
  {
    type: "SportsEvent", category: "Eventos", parent: "Event", description: "Evento esportivo: jogo, campeonato, corrida.",
    googleFeature: "Event Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SportsEvent" },
      { name: "name", required: true, description: "Nome", example: "Final da Copa do Brasil" },
      { name: "startDate", required: true, description: "Data", example: "2025-11-15", inputType: "date" },
      { name: "location", required: true, description: "Local (JSON Place)", example: '{"@type":"Place","name":"Maracanã"}', inputType: "json" },
      { name: "homeTeam", required: false, description: "Time mandante (JSON)", example: '{"@type":"SportsTeam","name":"Flamengo"}', inputType: "json" },
      { name: "awayTeam", required: false, description: "Time visitante (JSON)", example: '{"@type":"SportsTeam","name":"Corinthians"}', inputType: "json" },
    ],
  },
  {
    type: "BusinessEvent", category: "Eventos", parent: "Event", description: "Evento corporativo: conferência, feira, meetup.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "BusinessEvent" },
      { name: "name", required: true, description: "Nome", example: "Web Summit Rio 2025" },
      { name: "startDate", required: true, description: "Início", example: "2025-04-28", inputType: "date" },
      { name: "endDate", required: false, description: "Fim", example: "2025-04-30", inputType: "date" },
      { name: "location", required: false, description: "Local (JSON Place)", example: '{"@type":"Place","name":"Expo Center","address":"Rio de Janeiro"}', inputType: "json" },
      { name: "organizer", required: false, description: "Organizador", example: '{"@type":"Organization","name":"Web Summit"}', inputType: "json" },
    ],
  },
  {
    type: "EducationEvent", category: "Eventos", parent: "Event", description: "Evento educacional: workshop, palestra, aula.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "EducationEvent" },
      { name: "name", required: true, description: "Nome", example: "Workshop de SEO Técnico" },
      { name: "startDate", required: true, description: "Data", example: "2025-05-20", inputType: "date" },
      { name: "location", required: false, description: "Local", example: '{"@type":"VirtualLocation","url":"https://meet.google.com/xyz"}', inputType: "json" },
      { name: "organizer", required: false, description: "Organizador", example: '{"@type":"Organization","name":"SEO Academy"}', inputType: "json" },
    ],
  },
  // ── Expanded Comércio ──
  {
    type: "AggregateOffer", category: "Comércio", parent: "Offer", description: "Oferta agregada com faixa de preço de múltiplos vendedores.",
    googleFeature: "Product Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "AggregateOffer" },
      { name: "lowPrice", required: true, description: "Preço mínimo", example: "99.90", inputType: "number" },
      { name: "highPrice", required: true, description: "Preço máximo", example: "299.90", inputType: "number" },
      { name: "priceCurrency", required: true, description: "Moeda", example: "BRL" },
      { name: "offerCount", required: false, description: "Número de ofertas", example: "15", inputType: "number" },
    ],
  },
  {
    type: "Order", category: "Comércio", parent: "Intangible", description: "Pedido/encomenda de produto ou serviço.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Order" },
      { name: "orderNumber", required: true, description: "Número do pedido", example: "PED-2025-001234" },
      { name: "orderStatus", required: false, description: "Status", example: "https://schema.org/OrderDelivered", inputType: "url" },
      { name: "orderedItem", required: false, description: "Item (JSON Product)", example: '{"@type":"Product","name":"Produto X"}', inputType: "json" },
      { name: "orderDate", required: false, description: "Data", example: "2025-03-01", inputType: "date" },
      { name: "customer", required: false, description: "Cliente (JSON Person)", example: '{"@type":"Person","name":"João"}', inputType: "json" },
    ],
  },
  {
    type: "Invoice", category: "Comércio", parent: "Intangible", description: "Fatura ou nota fiscal.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Invoice" },
      { name: "totalPaymentDue", required: true, description: "Total (JSON MonetaryAmount)", example: '{"@type":"MonetaryAmount","value":"599.90","currency":"BRL"}', inputType: "json" },
      { name: "paymentDueDate", required: false, description: "Vencimento", example: "2025-04-15", inputType: "date" },
      { name: "paymentStatus", required: false, description: "Status", example: "PaymentComplete" },
      { name: "customer", required: false, description: "Cliente", example: '{"@type":"Person","name":"Maria"}', inputType: "json" },
    ],
  },
  // ── Categorias novas ──
  {
    type: "ItemList", category: "Listas", parent: "Intangible", description: "Lista ordenada de itens (carrossel).",
    googleFeature: "Carousel, List Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "ItemList" },
      { name: "name", required: false, description: "Nome da lista", example: "Top 10 Restaurantes" },
      { name: "itemListElement", required: true, description: "Itens (JSON array)", example: '[{"@type":"ListItem","position":1,"name":"Restaurante A","url":"https://..."}]', inputType: "json" },
      { name: "itemListOrder", required: false, description: "Ordem", example: "https://schema.org/ItemListOrderAscending", inputType: "url" },
      { name: "numberOfItems", required: false, description: "Número de itens", example: "10", inputType: "number" },
    ],
  },
  {
    type: "ListItem", category: "Listas", parent: "Intangible", description: "Item individual dentro de uma lista.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "ListItem" },
      { name: "position", required: true, description: "Posição", example: "1", inputType: "number" },
      { name: "name", required: true, description: "Nome", example: "Item 1" },
      { name: "url", required: false, description: "URL", example: "https://example.com/item1", inputType: "url" },
      { name: "item", required: false, description: "Item referenciado (JSON)", example: '{"@type":"Product","name":"Produto 1"}', inputType: "json" },
    ],
  },
  {
    type: "SpecialAnnouncement", category: "Comunicação", parent: "CreativeWork", description: "Anúncio especial (COVID, emergência, eventos).",
    googleFeature: "Special Announcement",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SpecialAnnouncement" },
      { name: "name", required: true, description: "Título", example: "Mudança de Horário" },
      { name: "text", required: true, description: "Texto do anúncio", example: "Nosso horário de funcionamento mudou...", inputType: "textarea" },
      { name: "datePosted", required: true, description: "Data", example: "2025-03-01", inputType: "date" },
      { name: "expires", required: false, description: "Validade", example: "2025-06-30", inputType: "date" },
      { name: "announcementLocation", required: false, description: "Local (JSON Place)", example: '{"@type":"Place","name":"Todas as unidades"}', inputType: "json" },
    ],
  },
  {
    type: "Brand", category: "Comércio", parent: "Intangible", description: "Marca comercial.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Brand" },
      { name: "name", required: true, description: "Nome da marca", example: "Apple" },
      { name: "logo", required: false, description: "Logo URL", example: "https://apple.com/logo.png", inputType: "url" },
      { name: "url", required: false, description: "Site", example: "https://apple.com", inputType: "url" },
      { name: "slogan", required: false, description: "Slogan", example: "Think Different" },
    ],
  },
  {
    type: "OfferCatalog", category: "Comércio", parent: "ItemList", description: "Catálogo de ofertas de produtos/serviços.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "OfferCatalog" },
      { name: "name", required: true, description: "Nome", example: "Catálogo Verão 2025" },
      { name: "itemListElement", required: true, description: "Ofertas (JSON array)", example: '[{"@type":"Offer","itemOffered":{"@type":"Product","name":"Produto A"}}]', inputType: "json" },
    ],
  },
  // ── Saúde ──
  {
    type: "Drug", category: "Saúde", parent: "Substance", description: "Medicamento ou substância farmacêutica.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Drug" },
      { name: "name", required: true, description: "Nome comercial", example: "Dipirona Sódica" },
      { name: "activeIngredient", required: false, description: "Princípio ativo", example: "Metamizol" },
      { name: "drugClass", required: false, description: "Classe terapêutica", example: "Analgésico" },
      { name: "administrationRoute", required: false, description: "Via de administração", example: "Oral" },
      { name: "prescriptionStatus", required: false, description: "Status", example: "OTC" },
    ],
  },
  {
    type: "MedicalCondition", category: "Saúde", parent: "MedicalEntity", description: "Condição ou doença médica.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "MedicalCondition" },
      { name: "name", required: true, description: "Nome", example: "Diabetes Tipo 2" },
      { name: "description", required: false, description: "Descrição", example: "Condição crônica que afeta o metabolismo...", inputType: "textarea" },
      { name: "signOrSymptom", required: false, description: "Sintomas", example: "Sede excessiva, visão turva" },
      { name: "possibleTreatment", required: false, description: "Tratamento", example: "Medicação, dieta, exercícios" },
      { name: "riskFactor", required: false, description: "Fatores de risco", example: "Obesidade, sedentarismo, genética" },
    ],
  },
  // ── Educação ──
  {
    type: "EducationalOccupationalCredential", category: "Educação", parent: "CreativeWork", description: "Certificação, diploma ou credencial educacional.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "EducationalOccupationalCredential" },
      { name: "name", required: true, description: "Nome", example: "Certificação Google Analytics" },
      { name: "credentialCategory", required: false, description: "Categoria", example: "Certificação Profissional" },
      { name: "recognizedBy", required: false, description: "Reconhecido por", example: '{"@type":"Organization","name":"Google"}', inputType: "json" },
      { name: "validIn", required: false, description: "Válido em", example: "Global" },
    ],
  },
  {
    type: "CollegeOrUniversity", category: "Educação", parent: "EducationalOrganization", description: "Faculdade ou universidade.",
    googleFeature: "Knowledge Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "CollegeOrUniversity" },
      { name: "name", required: true, description: "Nome", example: "Universidade de São Paulo" },
      { name: "url", required: false, description: "Site", example: "https://usp.br", inputType: "url" },
      { name: "address", required: false, description: "Endereço", example: "Cidade Universitária, SP" },
      { name: "foundingDate", required: false, description: "Fundação", example: "1934-01-25", inputType: "date" },
    ],
  },
  // ── Imobiliário ──
  {
    type: "Apartment", category: "Imóveis", parent: "Accommodation", description: "Apartamento para venda ou aluguel.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Apartment" },
      { name: "name", required: true, description: "Nome/Título", example: "Apartamento 3Q Moema" },
      { name: "numberOfRooms", required: false, description: "Quartos", example: "3", inputType: "number" },
      { name: "floorSize", required: false, description: "Área (JSON QuantitativeValue)", example: '{"@type":"QuantitativeValue","value":"85","unitCode":"MTK"}', inputType: "json" },
      { name: "address", required: false, description: "Endereço", example: "R. dos Moemas, 200, SP" },
      { name: "numberOfBathroomsTotal", required: false, description: "Banheiros", example: "2", inputType: "number" },
    ],
  },
  {
    type: "SingleFamilyResidence", category: "Imóveis", parent: "House", description: "Casa residencial.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SingleFamilyResidence" },
      { name: "name", required: true, description: "Título", example: "Casa 4 quartos Alphaville" },
      { name: "numberOfRooms", required: false, description: "Quartos", example: "4", inputType: "number" },
      { name: "floorSize", required: false, description: "Área", example: '{"@type":"QuantitativeValue","value":"250","unitCode":"MTK"}', inputType: "json" },
      { name: "address", required: false, description: "Endereço", example: "Alphaville, Barueri - SP" },
    ],
  },
];

// Merge explicit catalog with auto-generated entries from registry
const EXPLICIT_TYPE_NAMES = new Set(SCHEMA_CATALOG.map((s) => s.type));
const AUTO_GENERATED = buildFullCatalog(EXPLICIT_TYPE_NAMES);

// Full merged catalog: explicit first, then auto-generated
const FULL_CATALOG: SchemaTypeDef[] = [
  ...SCHEMA_CATALOG,
  ...AUTO_GENERATED.map((a) => ({
    type: a.type,
    category: a.category,
    description: a.description,
    googleFeature: a.googleFeature,
    parent: a.parent,
    properties: a.properties.map((p) => ({
      name: p.name,
      required: p.required,
      description: p.description,
      example: p.example,
      inputType: p.inputType,
    })),
    relatedTypes: undefined,
  })),
];

const CATEGORIES = [...new Set(FULL_CATALOG.map((s) => s.category))].sort();

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Organizações": Building2,
  "Produtos": Package,
  "Serviços": Briefcase,
  "Pessoas": User,
  "Web": Globe,
  "Locais": MapPin,
  "Avaliações": Star,
  "Negócios Especializados": Store,
  "Eventos": Zap,
  "Conteúdo": FileCode,
  "Comércio": TrendingUp,
  "Listas": ListChecks,
  "Comunicação": Sparkles,
  "Saúde": Plus,
  "Educação": BookOpen,
  "Imóveis": Building2,
  "Ações": Play,
  "Viagens": Globe,
  "Enumerações": Hash,
  "Tipos de Dados": Code2,
  "Valores Estruturados": Layers,
  "Outros": Puzzle,
};

// ── Pre-built sample schemas ──
interface SchemaSample {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  type: string;
  values: Record<string, string>;
}

const SCHEMA_SAMPLES: SchemaSample[] = [
  {
    id: "local-business", title: "Negócio Local", description: "Schema completo para empresas com endereço físico e Google Maps.",
    icon: Store, type: "LocalBusiness",
    values: {
      "@type": "LocalBusiness", name: "Minha Empresa", image: "https://www.exemplo.com/foto.jpg",
      address: '{"@type":"PostalAddress","streetAddress":"Rua Principal, 123","addressLocality":"São Paulo","addressRegion":"SP","postalCode":"01234-000","addressCountry":"BR"}',
      telephone: "+55 11 3333-4444", url: "https://www.exemplo.com", priceRange: "$$",
      openingHoursSpecification: '{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"08:00","closes":"18:00"}',
      aggregateRating: '{"@type":"AggregateRating","ratingValue":"4.5","reviewCount":"89"}',
      geo: '{"@type":"GeoCoordinates","latitude":"-23.5505","longitude":"-46.6333"}',
    },
  },
  {
    id: "restaurant", title: "Restaurante", description: "Ideal para restaurantes, bares e cafés com cardápio e reservas.",
    icon: Store, type: "Restaurant",
    values: {
      "@type": "Restaurant", name: "Restaurante Exemplo", image: "https://www.exemplo.com/restaurante.jpg",
      address: "Rua Gastronômica, 42, São Paulo - SP", telephone: "+55 11 99999-0000",
      servesCuisine: "Brasileira", priceRange: "$$", menu: "https://www.exemplo.com/cardapio",
      acceptsReservations: "True",
      aggregateRating: '{"@type":"AggregateRating","ratingValue":"4.7","reviewCount":"245"}',
    },
  },
  {
    id: "product", title: "Produto E-commerce", description: "Para lojas online com preço, disponibilidade e avaliações.",
    icon: Package, type: "Product",
    values: {
      "@type": "Product", name: "Produto Premium", image: "https://www.exemplo.com/produto.jpg",
      description: "Descrição completa do produto premium...", sku: "PROD-001",
      brand: '{"@type":"Brand","name":"MinhaMarca"}',
      offers: '{"@type":"Offer","price":"299.90","priceCurrency":"BRL","availability":"https://schema.org/InStock","url":"https://www.exemplo.com/produto"}',
      aggregateRating: '{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"120"}',
    },
  },
  {
    id: "article", title: "Artigo / Blog Post", description: "Para artigos, posts de blog e conteúdo editorial.",
    icon: FileCode, type: "Article",
    values: {
      "@type": "Article", headline: "Título do Artigo Completo", image: "https://www.exemplo.com/artigo.jpg",
      author: '{"@type":"Person","name":"Autor do Artigo","url":"https://www.exemplo.com/autor"}',
      datePublished: "2025-02-01", dateModified: "2025-02-15",
      publisher: '{"@type":"Organization","name":"Meu Blog","logo":{"@type":"ImageObject","url":"https://www.exemplo.com/logo.png"}}',
      description: "Resumo completo do artigo para SEO...", wordCount: "2500", keywords: "SEO, Marketing, Google",
    },
  },
  {
    id: "person", title: "Pessoa / Autor", description: "Para perfis profissionais, autores e especialistas.",
    icon: User, type: "Person",
    values: {
      "@type": "Person", name: "João Silva", jobTitle: "CEO & Fundador",
      worksFor: '{"@type":"Organization","name":"Empresa SA"}',
      image: "https://www.exemplo.com/joao.jpg", url: "https://www.joaosilva.com",
      sameAs: '["https://linkedin.com/in/joao","https://twitter.com/joao"]',
      knowsAbout: "SEO, Marketing Digital, Growth Hacking",
      description: "Especialista em SEO com 10+ anos de experiência...",
    },
  },
  {
    id: "website", title: "WebSite + SearchAction", description: "Schema do site com busca interna para Sitelinks Search Box.",
    icon: Globe, type: "WebSite",
    values: {
      "@type": "WebSite", name: "Meu Site", url: "https://www.exemplo.com",
      description: "O melhor site sobre o assunto...", inLanguage: "pt-BR",
      publisher: '{"@type":"Organization","name":"Minha Empresa"}',
      potentialAction: '{"@type":"SearchAction","target":"https://www.exemplo.com/busca?q={search_term_string}","query-input":"required name=search_term_string"}',
    },
  },
  {
    id: "faq", title: "FAQ Page", description: "Perguntas frequentes para FAQ Rich Results no Google.",
    icon: Lightbulb, type: "FAQPage",
    values: {
      "@type": "FAQPage",
      mainEntity: '[{"@type":"Question","name":"Como funciona o serviço?","acceptedAnswer":{"@type":"Answer","text":"Nosso serviço funciona da seguinte forma..."}},{"@type":"Question","name":"Qual o prazo de entrega?","acceptedAnswer":{"@type":"Answer","text":"O prazo é de 3 a 5 dias úteis."}}]',
    },
  },
  {
    id: "event", title: "Evento", description: "Para eventos presenciais ou online com datas e ingressos.",
    icon: Zap, type: "Event",
    values: {
      "@type": "Event", name: "Conferência SEO Brasil 2025",
      startDate: "2025-06-15T09:00", endDate: "2025-06-17T18:00",
      location: '{"@type":"Place","name":"Centro de Convenções SP","address":{"@type":"PostalAddress","addressLocality":"São Paulo","addressRegion":"SP"}}',
      description: "O maior evento de SEO do Brasil",
      organizer: '{"@type":"Organization","name":"SEO Brasil"}',
      offers: '{"@type":"Offer","price":"499","priceCurrency":"BRL","availability":"https://schema.org/InStock","url":"https://www.evento.com/ingressos"}',
    },
  },
  {
    id: "video", title: "Vídeo", description: "Para vídeos no YouTube, Vimeo ou hospedagem própria.",
    icon: Play, type: "VideoObject",
    values: {
      "@type": "VideoObject", name: "Como fazer SEO em 2025",
      description: "Aprenda as melhores técnicas de SEO...",
      thumbnailUrl: "https://www.exemplo.com/thumb.jpg", uploadDate: "2025-01-15",
      duration: "PT15M30S", contentUrl: "https://www.exemplo.com/video.mp4",
      embedUrl: "https://www.youtube.com/embed/abc123",
    },
  },
  {
    id: "howto", title: "How-To / Tutorial", description: "Tutorial passo-a-passo para How-To Rich Results.",
    icon: ListChecks, type: "HowTo",
    values: {
      "@type": "HowTo", name: "Como otimizar imagens para SEO",
      description: "Guia completo de otimização de imagens para melhor performance.",
      step: '[{"@type":"HowToStep","position":"1","name":"Escolha o formato","text":"Use WebP para melhor compressão com qualidade."},{"@type":"HowToStep","position":"2","name":"Comprima a imagem","text":"Use ferramentas como TinyPNG ou Squoosh."},{"@type":"HowToStep","position":"3","name":"Adicione alt text","text":"Descreva a imagem de forma concisa e relevante."}]',
      totalTime: "PT15M",
    },
  },
  {
    id: "course", title: "Curso Online", description: "Para cursos e treinamentos com preço e provedor.",
    icon: BookOpen, type: "Course",
    values: {
      "@type": "Course", name: "SEO Avançado - Do Zero ao Topo",
      description: "Domine técnicas avançadas de SEO e conquiste as primeiras posições do Google.",
      provider: '{"@type":"Organization","name":"Escola de SEO","url":"https://escolaseo.com"}',
      offers: '{"@type":"Offer","price":"497","priceCurrency":"BRL","availability":"https://schema.org/InStock"}',
    },
  },
  {
    id: "job", title: "Vaga de Emprego", description: "Para publicação de vagas com Job Posting Rich Results.",
    icon: Briefcase, type: "JobPosting",
    values: {
      "@type": "JobPosting", title: "Analista de SEO Sênior",
      description: "Buscamos um profissional de SEO com experiência em projetos de grande porte...",
      datePosted: "2025-02-01",
      hiringOrganization: '{"@type":"Organization","name":"Empresa XYZ","url":"https://empresa.com"}',
      jobLocation: '{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"São Paulo","addressRegion":"SP","addressCountry":"BR"}}',
      baseSalary: '{"@type":"MonetaryAmount","currency":"BRL","value":{"@type":"QuantitativeValue","value":"10000","unitText":"MONTH"}}',
      employmentType: "FULL_TIME",
    },
  },
  {
    id: "recipe", title: "Receita Culinária", description: "Receita completa com ingredientes, passos e informações nutricionais.",
    icon: Star, type: "Recipe",
    values: {
      "@type": "Recipe", name: "Bolo de Chocolate Fácil",
      image: "https://www.exemplo.com/bolo-chocolate.jpg",
      author: '{"@type":"Person","name":"Chef Ana Paula"}',
      prepTime: "PT20M", cookTime: "PT40M", recipeYield: "10 porções",
      recipeIngredient: '["3 xícaras de farinha de trigo","2 xícaras de açúcar","1 xícara de chocolate em pó","3 ovos","1 xícara de óleo","1 xícara de leite quente"]',
      recipeInstructions: '[{"@type":"HowToStep","position":"1","text":"Misture todos os ingredientes secos."},{"@type":"HowToStep","position":"2","text":"Adicione os ovos, óleo e leite quente e bata por 3 minutos."},{"@type":"HowToStep","position":"3","text":"Asse em forno pré-aquecido a 180°C por 40 minutos."}]',
      nutrition: '{"@type":"NutritionInformation","calories":"350 cal","fatContent":"12g","carbohydrateContent":"48g"}',
    },
  },
  {
    id: "breadcrumb", title: "BreadcrumbList", description: "Navegação breadcrumb para melhorar rastreamento e Rich Results.",
    icon: ArrowRight, type: "BreadcrumbList",
    values: {
      "@type": "BreadcrumbList",
      itemListElement: '[{"@type":"ListItem","position":1,"name":"Home","item":"https://www.exemplo.com"},{"@type":"ListItem","position":2,"name":"Produtos","item":"https://www.exemplo.com/produtos"},{"@type":"ListItem","position":3,"name":"Smartphones","item":"https://www.exemplo.com/produtos/smartphones"}]',
    },
  },
  {
    id: "blog-posting", title: "Blog Post", description: "Post de blog otimizado para Article Rich Results.",
    icon: FileCode, type: "BlogPosting",
    values: {
      "@type": "BlogPosting", headline: "Guia Completo de SEO Técnico para 2025",
      image: "https://www.exemplo.com/seo-tecnico.jpg",
      author: '{"@type":"Person","name":"Carlos Silva","url":"https://www.exemplo.com/autor/carlos"}',
      datePublished: "2025-01-15", dateModified: "2025-02-10",
      publisher: '{"@type":"Organization","name":"Blog de Marketing Digital","logo":{"@type":"ImageObject","url":"https://www.exemplo.com/logo.png"}}',
      wordCount: "3200",
    },
  },
  {
    id: "music-event", title: "Show / Festival", description: "Evento musical com artistas, local e ingressos.",
    icon: Zap, type: "MusicEvent",
    values: {
      "@type": "MusicEvent", name: "Rock in Rio 2025",
      startDate: "2025-09-19T16:00", endDate: "2025-09-19T23:00",
      location: '{"@type":"Place","name":"Cidade do Rock","address":{"@type":"PostalAddress","addressLocality":"Rio de Janeiro","addressRegion":"RJ","addressCountry":"BR"}}',
      performer: '[{"@type":"MusicGroup","name":"Foo Fighters"},{"@type":"MusicGroup","name":"Iron Maiden"}]',
      offers: '{"@type":"Offer","price":"695","priceCurrency":"BRL","availability":"https://schema.org/InStock","url":"https://rockinrio.com/ingressos"}',
    },
  },
  {
    id: "organization", title: "Organização / Empresa", description: "Schema completo para empresas com Knowledge Panel.",
    icon: Building2, type: "Organization",
    values: {
      "@type": "Organization", name: "TechBrasil SA",
      url: "https://www.techbrasil.com.br",
      logo: "https://www.techbrasil.com.br/logo.png",
      description: "Líder em soluções de tecnologia e inovação no Brasil.",
      foundingDate: "2010-03-15", numberOfEmployees: "500-1000",
      sameAs: '["https://www.linkedin.com/company/techbrasil","https://www.facebook.com/techbrasil","https://twitter.com/techbrasil"]',
      contactPoint: '{"@type":"ContactPoint","telephone":"+55-11-3000-4000","contactType":"customer service","availableLanguage":"Portuguese"}',
      address: "Av. Paulista, 1000, São Paulo - SP",
    },
  },
  {
    id: "software-app", title: "App / Software", description: "Para aplicativos mobile ou web com avaliações.",
    icon: Package, type: "SoftwareApplication",
    values: {
      "@type": "SoftwareApplication", name: "Rankito SEO",
      operatingSystem: "Web, Android, iOS",
      applicationCategory: "BusinessApplication",
      offers: '{"@type":"Offer","price":"0","priceCurrency":"BRL"}',
      aggregateRating: '{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"1250"}',
    },
  },
  {
    id: "medical-business", title: "Clínica / Consultório", description: "Negócio de saúde com especialidades e horários.",
    icon: Plus, type: "MedicalBusiness",
    values: {
      "@type": "MedicalBusiness", name: "Clínica Saúde Integral",
      medicalSpecialty: "Cardiologia, Dermatologia, Ortopedia",
      address: "Rua dos Médicos, 500, São Paulo - SP",
      telephone: "+55 11 3333-4444",
      openingHoursSpecification: '{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"07:00","closes":"19:00"}',
      isAcceptingNewPatients: "true",
    },
  },
  {
    id: "itemlist-carousel", title: "Lista / Carrossel", description: "Lista ordenada para Carousel Rich Results no Google.",
    icon: ListChecks, type: "ItemList",
    values: {
      "@type": "ItemList", name: "Top 5 Restaurantes Japoneses em SP",
      itemListElement: '[{"@type":"ListItem","position":1,"name":"Sushi Leblon","url":"https://www.exemplo.com/sushi-leblon"},{"@type":"ListItem","position":2,"name":"Temakeria Tokyo","url":"https://www.exemplo.com/temakeria-tokyo"},{"@type":"ListItem","position":3,"name":"Akami Sushi","url":"https://www.exemplo.com/akami-sushi"},{"@type":"ListItem","position":4,"name":"Jiro Dreams","url":"https://www.exemplo.com/jiro-dreams"},{"@type":"ListItem","position":5,"name":"Nagoya House","url":"https://www.exemplo.com/nagoya-house"}]',
      numberOfItems: "5",
    },
  },
  {
    id: "review-snippet", title: "Review / Avaliação", description: "Avaliação individual para Review Rich Results.",
    icon: Star, type: "Review",
    values: {
      "@type": "Review",
      reviewBody: "Excelente serviço! A equipe é muito profissional e atenciosa. Recomendo a todos que buscam qualidade e bom atendimento.",
      author: '{"@type":"Person","name":"Maria Oliveira"}',
      reviewRating: '{"@type":"Rating","ratingValue":"5","bestRating":"5"}',
      itemReviewed: '{"@type":"LocalBusiness","name":"Studio Beleza Premium","address":"Rua da Beleza, 42, SP"}',
      datePublished: "2025-01-28",
    },
  },
];

// ── Didactic descriptions for explorer ──
const SCHEMA_DIDACTICS: Record<string, string> = {
  Thing: "Tipo base de tudo. Na prática, use sempre um subtipo mais específico.",
  CreativeWork: "Qualquer conteúdo autoral. Ideal para artigos, vídeos e ebooks — use subtipos como Article.",
  Article: "Posts e artigos com autor e data. Essencial para blogs — gera Rich Results no Google.",
  BlogPosting: "Específico para posts de blog. Use em todo conteúdo do seu blog.",
  NewsArticle: "Para veículos de notícia. Qualifica para Google News e Top Stories.",
  WebPage: "Página genérica. Prefira subtipos como FAQPage ou AboutPage quando possível.",
  WebSite: "Representa o site inteiro. Use na homepage para ativar a caixa de busca no Google.",
  FAQPage: "Perguntas e respostas. Gera FAQ Rich Results — suas respostas aparecem direto no Google.",
  HowTo: "Tutoriais com passos. Gera 'Como fazer' no Google — ótimo para buscas informacionais.",
  Review: "Avaliação de produto ou serviço. Gera estrelas nos resultados — alto impacto no CTR.",
  Recipe: "Receitas culinárias. Gera cards visuais com foto, tempo e ingredientes no Google.",
  VideoObject: "Vídeos publicados. Mostra miniatura nos resultados — muito chamativo na busca.",
  ImageObject: "Imagens com metadados. Útil para galerias e portfolios no Google Imagens.",
  Product: "Produto à venda. Obrigatório para e-commerce — mostra preço e disponibilidade no Google.",
  Offer: "Preço e disponibilidade de um produto. Use sempre dentro de Product.",
  Organization: "Empresa ou instituição. Alimenta o Knowledge Panel lateral do Google.",
  Corporation: "Empresa de capital aberto. Use só se a empresa está listada em bolsa.",
  LocalBusiness: "Negócio com endereço físico. Obrigatório para SEO local e Google Maps.",
  Restaurant: "Restaurante, bar ou café. Ativa cardápio e reservas nos resultados.",
  Store: "Loja física. Melhora presença no Google Maps com horários e localização.",
  MedicalBusiness: "Clínica ou consultório. Google dá destaque especial a negócios de saúde.",
  Person: "Autor, fundador ou especialista. Fortalece E-E-A-T e autoridade no Google.",
  Event: "Evento com data e local. Gera Rich Results com ingresso e localização.",
  MusicEvent: "Show ou festival. Inclui lineup de artistas e venda de ingressos.",
  Course: "Curso ou treinamento. Gera Rich Results com preço e provedor.",
  JobPosting: "Vaga de emprego. Aparece no Google Jobs — enorme potencial de tráfego.",
  Place: "Lugar genérico. Prefira subtipos como LocalBusiness quando possível.",
  PostalAddress: "Endereço estruturado. Use dentro de Organization ou LocalBusiness.",
  GeoCoordinates: "Latitude e longitude. Posiciona o negócio com precisão no mapa.",
  BreadcrumbList: "Trilha de navegação. Fácil de implementar e melhora CTR no Google.",
  ItemList: "Lista ordenada. Gera carrossel de resultados no Google — ideal para rankings.",
  SoftwareApplication: "App ou software. Mostra nota, preço e plataforma nos resultados.",
  Brand: "Marca comercial. Use dentro de Product para identificar o fabricante.",
  ContactPoint: "Telefone ou e-mail de contato. Aparece no Knowledge Panel da empresa.",
  Action: "Ação genérica. Base para SearchAction, BuyAction — raramente usada diretamente.",
  SearchAction: "Busca interna do site. Ativa a caixa de pesquisa no Google. Use com WebSite.",
  Intangible: "Categoria abstrata. Nunca use diretamente — prefira Offer, Service, etc.",
  Service: "Serviço profissional. Descreve consultoria, advocacia, marketing com provedor e preço.",
  AggregateRating: "Nota média de avaliações. Gera as ⭐ estrelas no Google — alto impacto.",
  Dataset: "Dados estruturados. Aparece no Google Dataset Search para pesquisadores.",
  SpeakableSpecification: "Texto para assistentes de voz. Google Assistant pode ler em voz alta.",
  CollectionPage: "Página de categoria ou listagem. Ajuda na hierarquia do site.",
  ProfilePage: "Perfil de autor ou especialista. Fortalece autoria e E-E-A-T.",
  Book: "Livro publicado. Gera Rich Results com autor, ISBN e avaliações.",
  Movie: "Filme ou documentário. Mostra nota, elenco e diretor nos resultados.",
  MusicRecording: "Música gravada. Vincula artista, álbum e duração.",
  MusicAlbum: "Álbum musical. Agrupa faixas com artista e data de lançamento.",
  Podcast: "Podcast ou série de áudio. Ajuda na descoberta via Google Podcasts.",
  PodcastEpisode: "Episódio de podcast. Vincula ao programa com data e duração.",
  WebApplication: "App web. Similar a SoftwareApplication mas para ferramentas online.",
  MobileApplication: "App mobile. Específico para apps de celular com sistema operacional.",
  EducationalOrganization: "Escola ou universidade. Para instituições de ensino.",
  GovernmentOrganization: "Órgão público. Para prefeituras, secretarias e autarquias.",
  NGO: "ONG ou entidade sem fins lucrativos.",
  SportsOrganization: "Clube ou federação esportiva.",
  Airline: "Companhia aérea. Inclui código IATA e rotas.",
  Hotel: "Hotel ou pousada. Ativa avaliações e disponibilidade no Google.",
  TouristAttraction: "Ponto turístico. Melhora visibilidade para buscas de viagem.",
  LandmarksOrHistoricalBuildings: "Monumento ou construção histórica.",
  Hospital: "Hospital ou pronto-socorro. Destaque especial do Google para saúde.",
  Dentist: "Consultório odontológico. SEO local para dentistas.",
  Pharmacy: "Farmácia. Ativa horários e localização no Maps.",
  FinancialService: "Banco, corretora ou fintech. Para serviços financeiros.",
  InsuranceAgency: "Seguradora ou corretora de seguros.",
  RealEstateAgent: "Imobiliária ou corretor de imóveis.",
  LegalService: "Escritório de advocacia. Para serviços jurídicos.",
  AutoDealer: "Concessionária de veículos.",
  AutoRepair: "Oficina mecânica ou funilaria.",
  BeautySalon: "Salão de beleza ou estética.",
  DayCare: "Creche ou escola infantil.",
  Florist: "Floricultura.",
  HairSalon: "Barbearia ou cabeleireiro.",
  HealthClub: "Academia ou centro fitness.",
  HomeAndConstructionBusiness: "Construção civil ou reforma residencial.",
  InternetCafe: "Lan house ou espaço coworking.",
  Library: "Biblioteca pública ou privada.",
  Bakery: "Padaria ou confeitaria.",
  BarOrPub: "Bar ou pub.",
  CafeOrCoffeeShop: "Cafeteria.",
  FastFoodRestaurant: "Fast food ou lanchonete rápida.",
  IceCreamShop: "Sorveteria.",
  ClothingStore: "Loja de roupas.",
  ElectronicsStore: "Loja de eletrônicos.",
  FurnitureStore: "Loja de móveis.",
  GroceryStore: "Mercado ou mercearia.",
  HardwareStore: "Loja de ferragens ou materiais de construção.",
  JewelryStore: "Joalheria.",
  ShoeStore: "Loja de calçados.",
  SportingGoodsStore: "Loja de artigos esportivos.",
  ToyStore: "Loja de brinquedos.",
  PetStore: "Pet shop.",
  Residence: "Residência ou moradia.",
  Apartment: "Apartamento. Útil para imobiliárias e classificados.",
  House: "Casa. Para listagens imobiliárias.",
  MediaObject: "Arquivo de mídia genérico (áudio, vídeo, imagem).",
  AudioObject: "Arquivo de áudio. Para podcasts, músicas ou narrações.",
  DataDownload: "Arquivo para download. Vincula formato e tamanho.",
  QAPage: "Página de pergunta e resposta única (tipo Stack Overflow).",
  AboutPage: "Página 'Sobre nós'. Ajuda o Google a entender a identidade do site.",
  ContactPage: "Página de contato. Facilita descoberta de formas de contato.",
  CheckoutPage: "Página de checkout de e-commerce.",
  SearchResultsPage: "Página de resultados de busca interna.",
  RealEstateListing: "Anúncio de imóvel. Para portais imobiliários.",
  Vehicle: "Veículo à venda. Para concessionárias e classificados.",
  Car: "Carro. Subtipo de Vehicle com detalhes automotivos.",
  DefinedTerm: "Termo com definição formal. Útil para glossários.",
  HowToStep: "Passo individual de um tutorial. Use dentro de HowTo.",
  HowToSection: "Seção agrupando passos de um tutorial.",
  ListItem: "Item individual de uma lista. Use dentro de ItemList ou BreadcrumbList.",
  Rating: "Nota individual (ex: 4 de 5). Use dentro de Review.",
  MonetaryAmount: "Valor monetário com moeda. Use para salários e preços.",
  QuantitativeValue: "Valor numérico com unidade. Para medidas e especificações.",
  PropertyValue: "Par nome-valor para especificações técnicas de produtos.",
  NutritionInformation: "Info nutricional. Use dentro de Recipe.",
  OpeningHoursSpecification: "Horário de funcionamento. Use dentro de LocalBusiness.",
  GeoShape: "Área geográfica (polígono). Para definir áreas de atuação.",
  SpecialAnnouncement: "Anúncio especial (COVID, emergências). Destaque temporário no Google.",
  LiveBlogPosting: "Blog ao vivo. Para cobertura em tempo real de eventos.",
  DiscussionForumPosting: "Post de fórum. Para comunidades e discussões online.",
  SocialMediaPosting: "Post de rede social. Estrutura conteúdo social.",
  Clip: "Trecho de vídeo ou áudio. Use para highlights.",
  CreativeWorkSeason: "Temporada de série. Agrupa episódios.",
  CreativeWorkSeries: "Série (TV, podcast). Agrupa temporadas.",
  Episode: "Episódio de série ou podcast.",
  TVSeries: "Série de TV. Com temporadas, elenco e rede.",
  TVEpisode: "Episódio de TV. Vincula à série e temporada.",
  MusicPlaylist: "Playlist musical. Agrupa faixas em sequência.",
  Photograph: "Fotografia. Para galerias e portfolios fotográficos.",
  Painting: "Pintura ou obra de arte visual.",
  Sculpture: "Escultura. Para galerias e museus.",
  VisualArtwork: "Obra de arte visual genérica.",
  Thesis: "Tese ou dissertação acadêmica.",
  ScholarlyArticle: "Artigo acadêmico ou científico.",
  TechArticle: "Artigo técnico ou documentação.",
  Report: "Relatório formal. Para relatórios empresariais ou de pesquisa.",
  Menu: "Cardápio de restaurante. Use dentro de Restaurant.",
  MenuItem: "Item do cardápio com preço e descrição.",
  EducationalOccupationalCredential: "Certificação ou diploma. Para cursos e formações.",
  Occupation: "Profissão ou ocupação. Descreve carreira com salário médio.",
  TradeAction: "Ação de compra/venda. Base para BuyAction e SellAction.",
  BuyAction: "Ação de compra. Indica que algo pode ser comprado.",
  OrderAction: "Ação de pedido. Para e-commerce e delivery.",
  PayAction: "Ação de pagamento. Indica formas de pagamento aceitas.",
  DonateAction: "Ação de doação. Para ONGs e campanhas.",
  SubscribeAction: "Ação de assinatura. Para newsletters e planos recorrentes.",
  RegisterAction: "Ação de cadastro. Indica formulário de registro.",
  BookmarkAction: "Ação de favoritar. Para listas de desejos e salvos.",
  ShareAction: "Ação de compartilhar. Indica botões de share.",
  CommentAction: "Ação de comentar. Para seções de comentários.",
  FollowAction: "Ação de seguir. Para redes sociais e perfis.",
  LikeAction: "Ação de curtir. Para interações sociais.",
  WatchAction: "Ação de assistir. Indica conteúdo de vídeo assistível.",
  ListenAction: "Ação de ouvir. Para podcasts e músicas.",
  ReadAction: "Ação de ler. Para artigos e ebooks.",
};

// ── Hierarchical tree — uses full registry ──


// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

interface Props {
  projectId: string;
  semanticProjectId?: string;
}

export function SchemaOrgTab({ projectId, semanticProjectId }: Props) {
  const { user } = useAuth();
  const [entities, setEntities] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SchemaTypeDef | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(CATEGORIES);
  const [copied, setCopied] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<"builder" | "samples" | "catalog" | "entities" | "explorer">("builder");

  // Builder state
  const [builderType, setBuilderType] = useState<SchemaTypeDef | null>(null);
  const [builderValues, setBuilderValues] = useState<Record<string, string>>({});
  const [showOnlyRequired, setShowOnlyRequired] = useState(false);
  const [addedExtraProps, setAddedExtraProps] = useState<string[]>([]);
  const [sampleFilter, setSampleFilter] = useState("all");

  // Tree state
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<string>>(new Set([
    "Thing", "CreativeWork", "Organization", "LocalBusiness", "Event",
    "Intangible", "Place", "Action", "Product",
  ]));
  const tree = useMemo(buildFullSchemaTree, []);

  // Load entities
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      let query = supabase
        .from("semantic_entities")
        .select("*")
        .eq("project_id", projectId);
      if (semanticProjectId) query = query.eq("goal_project_id", semanticProjectId);
      const { data } = await query;
      setEntities(data || []);
    })();
  }, [projectId, semanticProjectId]);

  // Filter catalog — use FULL_CATALOG instead of SCHEMA_CATALOG
  const filteredCatalog = useMemo(() => {
    let items = FULL_CATALOG;
    if (selectedCategory) items = items.filter((s) => s.category === selectedCategory);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((s) =>
        s.type.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.googleFeature && s.googleFeature.toLowerCase().includes(q))
      );
    }
    return items;
  }, [search, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCatalog.forEach((s) => { counts[s.category] = (counts[s.category] || 0) + 1; });
    return counts;
  }, [filteredCatalog]);

  // Entity stats
  const entitySchemaTypes = useMemo(() => new Set(entities.filter((e) => e.schema_type).map((e) => e.schema_type)), [entities]);
  const entitiesWithSchema = entities.filter((e) => e.schema_type);
  const entitiesWithProperties = entities.filter((e) => e.schema_properties && Object.keys(e.schema_properties).length > 1);
  const coveragePct = entities.length > 0 ? Math.round((entitiesWithSchema.length / entities.length) * 100) : 0;
  const propertiesPct = entitiesWithSchema.length > 0 ? Math.round((entitiesWithProperties.length / entitiesWithSchema.length) * 100) : 0;

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "JSON-LD copiado!" });
  };

  // ── Builder logic ──
  const startBuilder = useCallback((typeDef: SchemaTypeDef, prefill?: Record<string, string>) => {
    setBuilderType(typeDef);
    setBuilderValues(prefill || { "@type": typeDef.type });
    setAddedExtraProps([]);
    setShowOnlyRequired(false);
    setInnerTab("builder");
  }, []);

  const builderJsonLd = useMemo(() => {
    if (!builderType) return "";
    const obj: Record<string, any> = { "@context": "https://schema.org" };
    builderType.properties.forEach((p) => {
      const val = builderValues[p.name];
      if (val && val.trim()) {
        // Try parsing JSON values
        if (p.inputType === "json" || (val.startsWith("{") || val.startsWith("["))) {
          try { obj[p.name] = JSON.parse(val); } catch { obj[p.name] = val; }
        } else if (p.inputType === "number") {
          obj[p.name] = isNaN(Number(val)) ? val : Number(val);
        } else {
          obj[p.name] = val;
        }
      }
    });
    return JSON.stringify(obj, null, 2);
  }, [builderType, builderValues]);

  const builderScriptTag = useMemo(() => {
    if (!builderJsonLd) return "";
    return `<script type="application/ld+json">\n${builderJsonLd}\n</script>`;
  }, [builderJsonLd]);

  const builderCompletion = useMemo(() => {
    if (!builderType) return { pct: 0, filled: 0, total: 0 };
    const req = builderType.properties.filter((p) => p.required);
    const filled = req.filter((p) => builderValues[p.name]?.trim());
    return { pct: req.length > 0 ? Math.round((filled.length / req.length) * 100) : 100, filled: filled.length, total: req.length };
  }, [builderType, builderValues]);

  // ── Validation & Export helpers ──
  const openGoogleValidator = useCallback(() => {
    const encoded = encodeURIComponent(builderScriptTag);
    window.open(`https://search.google.com/test/rich-results?code=${encoded}`, "_blank");
  }, [builderScriptTag]);

  const openSchemaOrgValidator = useCallback(() => {
    window.open("https://validator.schema.org/", "_blank");
    // Copy to clipboard so user can paste
    navigator.clipboard.writeText(builderJsonLd);
    toast({ title: "JSON-LD copiado!", description: "Cole no validador que acabou de abrir." });
  }, [builderJsonLd]);

  const downloadJsonFile = useCallback(() => {
    if (!builderJsonLd || !builderType) return;
    const blob = new Blob([builderJsonLd], { type: "application/ld+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schema-${builderType.type.toLowerCase()}.jsonld`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Arquivo baixado!", description: `schema-${builderType.type.toLowerCase()}.jsonld` });
  }, [builderJsonLd, builderType]);

  const downloadScriptTag = useCallback(() => {
    if (!builderScriptTag || !builderType) return;
    const blob = new Blob([builderScriptTag], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schema-${builderType.type.toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Script tag baixado!", description: `Pronto para colar no <head> do site.` });
  }, [builderScriptTag, builderType]);

  const saveSchemaToProject = useCallback(async () => {
    if (!builderType || !user || !projectId) return;
    // Find or create an entity with this schema type
    const existing = entities.find((e) => e.schema_type === builderType.type);
    if (existing) {
      const { error } = await supabase
        .from("semantic_entities")
        .update({ schema_properties: builderValues, schema_type: builderType.type })
        .eq("id", existing.id);
      if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Schema atualizado!", description: `Entidade "${existing.name}" atualizada com sucesso.` });
    } else {
      const { error } = await supabase.from("semantic_entities").insert({
        name: builderValues.name || builderType.type,
        entity_type: "concept",
        schema_type: builderType.type,
        schema_properties: builderValues,
        project_id: projectId,
        owner_id: user.id,
        goal_project_id: semanticProjectId || null,
      } as any);
      if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Schema salvo!", description: `Nova entidade "${builderValues.name || builderType.type}" criada no projeto.` });
    }
    // Reload entities
    let reloadQuery = supabase.from("semantic_entities").select("*").eq("project_id", projectId);
    if (semanticProjectId) reloadQuery = reloadQuery.eq("goal_project_id", semanticProjectId);
    const { data } = await reloadQuery;
    setEntities(data || []);
  }, [builderType, builderValues, user, projectId, entities]);

  // ── Tree toggle ──
  const toggleTreeNode = (name: string) => {
    setExpandedTreeNodes((prev) => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  const renderTreeNode = (node: SchemaTreeNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedTreeNodes.has(node.name);
    const hasSchema = FULL_CATALOG.find((s) => s.type === node.name);
    const inUse = entitySchemaTypes.has(node.name);

    const schemaDesc = hasSchema?.description || SCHEMA_DIDACTICS[node.name];

    return (
      <div key={node.name}>
        <div
          className={`group flex items-start gap-1.5 py-2 px-2 rounded-md text-xs cursor-pointer transition-colors hover:bg-muted/60 ${inUse ? "bg-primary/5" : ""}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) toggleTreeNode(node.name);
            if (hasSchema) { setSelectedType(hasSchema); setInnerTab("catalog"); }
          }}
        >
          <div className="mt-0.5 shrink-0">
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggleTreeNode(node.name); }}>
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`${hasSchema ? "font-medium text-foreground" : "text-muted-foreground"}`}>{node.name}</span>
              {hasSchema?.googleFeature && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                  <Sparkles className="h-2 w-2 mr-0.5" />
                  {hasSchema.googleFeature.split(",")[0]}
                </Badge>
              )}
              {inUse && <CheckCircle2 className="h-3 w-3 text-primary" />}
              {hasSchema && (
                <button
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-primary font-medium flex items-center gap-0.5 hover:underline shrink-0"
                  onClick={(e) => { e.stopPropagation(); startBuilder(hasSchema); }}
                >
                  <Wrench className="h-2.5 w-2.5" />
                  Construir
                </button>
              )}
              {node.googleFeature && !hasSchema?.googleFeature && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 ml-auto">
                  <Sparkles className="h-2 w-2 mr-0.5" />
                  Google
                </Badge>
              )}
            </div>
            {schemaDesc && (
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{schemaDesc}</p>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && node.children.map((c) => renderTreeNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Banner explicativo */}
      <Card className="p-4 border-primary/20 bg-accent/30">
        <div className="flex gap-3 items-start">
          <Code2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Schema.org — Marcação Estruturada para SEO</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Schema.org é o <strong>vocabulário universal</strong> que o Google, Bing e outros buscadores usam para entender o conteúdo das suas páginas. Ao adicionar marcações JSON-LD corretas, você habilita <strong>rich snippets</strong> (estrelas, FAQ, breadcrumbs, preços) nos resultados de busca, aumentando CTR e visibilidade.
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              💡 <strong>Como usar:</strong> Explore o catálogo de 800+ tipos, use o <em>Builder</em> para montar seu JSON-LD com propriedades herdadas automaticamente, consulte as <em>Amostras</em> prontas para inspiração e valide externamente com o botão de teste do Google.
            </p>
          </div>
        </div>
      </Card>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-medium">Tipos no Catálogo</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{getSchemaTypeCount()}</p>
          <p className="text-[10px] text-muted-foreground">{CATEGORIES.length} categorias · {FULL_CATALOG.length} c/ builder</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span className="text-xs font-medium">Entidades c/ Schema</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{entitiesWithSchema.length}<span className="text-sm text-muted-foreground font-normal">/{entities.length}</span></p>
          <Progress value={coveragePct} className="h-1.5" />
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ListChecks className="h-4 w-4" />
            <span className="text-xs font-medium">Samples Prontos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{SCHEMA_SAMPLES.length}</p>
          <p className="text-[10px] text-muted-foreground">schemas pré-prontos</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Puzzle className="h-4 w-4" />
            <span className="text-xs font-medium">Em Uso no Grafo</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{entitySchemaTypes.size}</p>
          <p className="text-[10px] text-muted-foreground">tipos únicos</p>
        </Card>
      </div>

      {/* Inner Tabs */}
      <Tabs value={innerTab} onValueChange={(v) => setInnerTab(v as any)}>
        <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="builder" className="tab-glow gap-1.5 text-xs px-3 py-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Construtor
          </TabsTrigger>
          <TabsTrigger value="samples" className="tab-glow gap-1.5 text-xs px-3 py-1.5">
            <ClipboardPaste className="h-3.5 w-3.5" />
            Exemplos Prontos
          </TabsTrigger>
          <TabsTrigger value="catalog" className="tab-glow gap-1.5 text-xs px-3 py-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="entities" className="tab-glow gap-1.5 text-xs px-3 py-1.5">
            <FileCode className="h-3.5 w-3.5" />
            Minhas Entidades ({entities.length})
          </TabsTrigger>
          <TabsTrigger value="explorer" className="tab-glow gap-1.5 text-xs px-3 py-1.5">
            <FolderTree className="h-3.5 w-3.5" />
            Explorador
          </TabsTrigger>
        </TabsList>

        {/* ═══════ BUILDER TAB ═══════ */}
        <TabsContent value="builder" className="mt-4">
          {!builderType ? (
            <Card className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Wrench className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Construtor de Schema JSON-LD</h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  Escolha um tipo de Schema para começar a construir seu JSON-LD interativamente. 
                  Preencha as propriedades e copie o código pronto para seu site.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {FULL_CATALOG.filter((s) => s.googleFeature).slice(0, 16).map((schema) => {
                  const CatIcon = CATEGORY_ICONS[schema.category] || Globe;
                  return (
                    <Card
                      key={schema.type}
                      className="p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all text-center"
                      onClick={() => startBuilder(schema)}
                    >
                      <CatIcon className="h-5 w-5 text-primary mx-auto mb-1.5" />
                      <span className="text-xs font-semibold block">{schema.type}</span>
                      {schema.googleFeature && (
                        <span className="text-[9px] text-primary/70 block mt-0.5">{schema.googleFeature.split(",")[0]}</span>
                      )}
                    </Card>
                  );
                })}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Ou escolha um <button className="text-primary font-medium underline" onClick={() => setInnerTab("samples")}>exemplo pré-pronto</button> para começar mais rápido
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Form */}
              <Card className="overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Badge>{builderType.category}</Badge>
                    <span className="font-semibold text-sm">{builderType.type}</span>
                    {builderType.googleFeature && (
                      <Badge variant="outline" className="text-[9px] gap-0.5">
                        <Sparkles className="h-2.5 w-2.5" />
                        {builderType.googleFeature.split(",")[0]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={() => { setBuilderType(null); setBuilderValues({}); }}>
                      <RotateCcw className="h-3 w-3" />
                      Trocar
                    </Button>
                  </div>
                </div>

                {/* Completion */}
                <div className="px-4 pt-3 pb-2 border-b space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-bold" style={{
                      color: builderCompletion.pct === 100 ? "hsl(var(--primary))" : builderCompletion.pct > 50 ? "hsl(42 95% 52%)" : "hsl(0 78% 55%)"
                    }}>
                      {builderCompletion.filled}/{builderCompletion.total} obrigatórias · {builderCompletion.pct}%
                    </span>
                  </div>
                  <Progress value={builderCompletion.pct} className="h-1.5" />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={showOnlyRequired} onCheckedChange={setShowOnlyRequired} className="scale-75" />
                      <span className="text-[10px] text-muted-foreground">Só obrigatórias</span>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 h-[calc(100vh-580px)] min-h-[300px]">
                  <div className="p-4 space-y-3">
                    {builderType.properties
                      .filter((p) => !showOnlyRequired || p.required)
                      .map((prop) => (
                        <div key={prop.name} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-mono font-medium">{prop.name}</Label>
                            {prop.required ? (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">obrigatório</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">opcional</Badge>
                            )}
                            {builderValues[prop.name]?.trim() && (
                              <CheckCircle2 className="h-3 w-3 text-primary ml-auto shrink-0" />
                            )}
                          </div>
                          {prop.inputType === "textarea" || prop.inputType === "json" ? (
                            <Textarea
                              placeholder={prop.example}
                              value={builderValues[prop.name] || ""}
                              onChange={(e) => setBuilderValues((v) => ({ ...v, [prop.name]: e.target.value }))}
                              rows={prop.inputType === "json" ? 3 : 2}
                              className="text-xs font-mono"
                            />
                          ) : (
                            <Input
                              type={prop.inputType === "url" ? "url" : prop.inputType === "number" ? "number" : prop.inputType === "date" ? "date" : "text"}
                              placeholder={prop.example}
                              value={builderValues[prop.name] || ""}
                              onChange={(e) => setBuilderValues((v) => ({ ...v, [prop.name]: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          )}
                          <p className="text-[10px] text-muted-foreground">{prop.description}</p>
                        </div>
                      ))}

                    {/* Fill with example values */}
                    <Separator />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => {
                        const vals: Record<string, string> = {};
                        builderType.properties.forEach((p) => { vals[p.name] = p.example; });
                        setBuilderValues(vals);
                        toast({ title: "Valores de exemplo preenchidos!" });
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Preencher com Exemplos
                    </Button>

                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" asChild>
                      <a href={`https://schema.org/${builderType.type}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Documentação schema.org/{builderType.type}
                      </a>
                    </Button>
                  </div>
                </ScrollArea>
              </Card>

              {/* Right: Live JSON-LD Preview */}
              <Card className="overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">JSON-LD Preview</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-7"
                      onClick={() => handleCopy(builderScriptTag, "builder-script")}
                    >
                      {copied === "builder-script" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === "builder-script" ? "Copiado!" : "<script>"}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 text-xs h-7"
                      onClick={() => handleCopy(builderJsonLd, "builder-json")}
                    >
                      {copied === "builder-json" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === "builder-json" ? "Copiado!" : "JSON"}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 h-[calc(100vh-580px)] min-h-[300px]">
                  <pre className="p-4 text-[11px] font-mono whitespace-pre-wrap text-foreground leading-relaxed">
                    <span className="text-muted-foreground">{"<"}</span>
                    <span className="text-primary">script</span>
                    <span className="text-muted-foreground"> type=</span>
                    <span className="text-amber-500">"application/ld+json"</span>
                    <span className="text-muted-foreground">{">"}</span>
                    {"\n"}{builderJsonLd}{"\n"}
                    <span className="text-muted-foreground">{"</"}</span>
                    <span className="text-primary">script</span>
                    <span className="text-muted-foreground">{">"}</span>
                  </pre>
                </ScrollArea>

                <div className="p-3 border-t space-y-2">
                  {/* Action Buttons Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={openGoogleValidator}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Testar no Google
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={openSchemaOrgValidator}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Validador Schema.org
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={downloadJsonFile}>
                      <FileDown className="h-3.5 w-3.5" />
                      Baixar .jsonld
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={downloadScriptTag}>
                      <Download className="h-3.5 w-3.5" />
                      Baixar &lt;script&gt;
                    </Button>
                  </div>
                  <Button size="sm" className="w-full gap-1.5 text-xs h-8" onClick={saveSchemaToProject}>
                    <Save className="h-3.5 w-3.5" />
                    Salvar no Projeto
                  </Button>
                  <div className="flex items-start gap-2 pt-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[10px] text-muted-foreground">
                      Cole o <code className="text-primary font-mono">&lt;script&gt;</code> no <code className="text-primary font-mono">&lt;head&gt;</code> da página correspondente para ativar os Rich Results.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══════ SAMPLES TAB ═══════ */}
        <TabsContent value="samples" className="mt-4 space-y-4">
          {/* Filter bar */}
          {(() => {
            const SAMPLE_CATEGORIES: { key: string; label: string; types: string[] }[] = [
              { key: "all", label: "Todos", types: [] },
              { key: "negocios", label: "Negócios", types: ["LocalBusiness", "Restaurant", "Organization", "MedicalBusiness"] },
              { key: "conteudo", label: "Conteúdo", types: ["Article", "BlogPosting", "VideoObject", "HowTo", "FAQPage", "Recipe"] },
              { key: "comercio", label: "Comércio", types: ["Product", "SoftwareApplication", "Review", "ItemList"] },
              { key: "eventos", label: "Eventos & Cursos", types: ["Event", "MusicEvent", "Course", "JobPosting"] },
              { key: "tecnico", label: "Técnico", types: ["WebSite", "BreadcrumbList", "Person"] },
            ];
            const activeCat = SAMPLE_CATEGORIES.find(c => c.key === sampleFilter) || SAMPLE_CATEGORIES[0];
            const filteredSamples = sampleFilter === "all" ? SCHEMA_SAMPLES : SCHEMA_SAMPLES.filter(s => activeCat.types.includes(s.type));

            return (
              <>
                <div className="flex gap-1.5 flex-wrap">
                  {SAMPLE_CATEGORIES.map(cat => (
                    <Badge
                      key={cat.key}
                      variant={sampleFilter === cat.key ? "default" : "outline"}
                      className="cursor-pointer text-[10px] px-2.5 py-1"
                      onClick={() => setSampleFilter(cat.key)}
                    >
                      {cat.label}
                      {cat.key !== "all" && <span className="ml-1 opacity-60">({SCHEMA_SAMPLES.filter(s => cat.types.includes(s.type)).length})</span>}
                    </Badge>
                  ))}
                </div>

                <ScrollArea className="h-[calc(100vh-480px)] min-h-[400px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {filteredSamples.map((sample) => {
                      const SampleIcon = sample.icon;
                      const typeDef = FULL_CATALOG.find((s) => s.type === sample.type);
                      const sampleJson = JSON.stringify({ "@context": "https://schema.org", ...Object.fromEntries(
                        Object.entries(sample.values).map(([k, v]) => {
                          try { return [k, JSON.parse(v)]; } catch { return [k, v]; }
                        })
                      )}, null, 2);

                      return (
                        <Card key={sample.id} className="overflow-hidden hover:shadow-md transition-all group">
                          <div className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <SampleIcon className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-xs truncate">{sample.title}</h4>
                                <Badge variant="outline" className="text-[8px] gap-0.5 px-1 py-0">
                                  {sample.type}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{sample.description}</p>

                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                className="flex-1 gap-1 text-[10px] h-6 px-2"
                                onClick={() => typeDef && startBuilder(typeDef, sample.values)}
                              >
                                <Wrench className="h-2.5 w-2.5" />
                                Usar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-[10px] h-6 px-2"
                                onClick={() => handleCopy(`<script type="application/ld+json">\n${sampleJson}\n</script>`, sample.id)}
                              >
                                {copied === sample.id ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </TabsContent>

        {/* ═══════ CATALOG TAB ═══════ */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar tipo, categoria ou recurso Google..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Categorias</span>
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant={selectedCategory === null ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => setSelectedCategory(null)}>
                  Todos ({FULL_CATALOG.length})
                </Badge>
                {CATEGORIES.map((cat) => {
                  const CatIcon = CATEGORY_ICONS[cat] || Globe;
                  return (
                    <Badge key={cat} variant={selectedCategory === cat ? "default" : "outline"} className="cursor-pointer text-[10px] gap-1" onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}>
                      <CatIcon className="h-3 w-3" />{cat}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedType ? (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs">{selectedType.category}</Badge>
                      <CardTitle className="text-lg">{selectedType.type}</CardTitle>
                      {selectedType.parent && <Badge variant="outline" className="text-[10px]">← {selectedType.parent}</Badge>}
                    </div>
                    <CardDescription>{selectedType.description}</CardDescription>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedType(null)} className="text-xs">← Voltar</Button>
                </div>
                {selectedType.googleFeature && (
                  <div className="flex items-center gap-2 mt-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-primary font-medium">Google: {selectedType.googleFeature}</span>
                  </div>
                )}
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-580px)] min-h-[300px]">
                  <div className="p-6 space-y-6">
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-1.5 text-xs" onClick={() => startBuilder(selectedType)}>
                        <Wrench className="h-3.5 w-3.5" />
                        Abrir no Construtor
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
                        const vals: Record<string, string> = {};
                        selectedType.properties.forEach((p) => { vals[p.name] = p.example; });
                        startBuilder(selectedType, vals);
                      }}>
                        <Sparkles className="h-3.5 w-3.5" />
                        Com Exemplos
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Propriedades ({selectedType.properties.length})
                      </h4>
                      {selectedType.properties.map((prop) => (
                        <Card key={prop.name} className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs font-mono font-semibold text-foreground">{prop.name}</code>
                                {prop.required ? (
                                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">obrigatório</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">opcional</Badge>
                                )}
                                {prop.inputType && prop.inputType !== "text" && (
                                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">{prop.inputType}</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{prop.description}</p>
                              <code className="text-[10px] text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded mt-1 inline-block truncate max-w-full">{prop.example}</code>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {selectedType.relatedTypes && selectedType.relatedTypes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><Puzzle className="h-4 w-4" />Tipos Relacionados</h4>
                        <div className="flex gap-2 flex-wrap">
                          {selectedType.relatedTypes.map((rt) => {
                            const found = FULL_CATALOG.find((s) => s.type === rt);
                            return (
                              <Badge key={rt} variant="outline" className="cursor-pointer hover:bg-primary/10 gap-1 text-xs" onClick={() => found && setSelectedType(found)}>
                                <ChevronRight className="h-3 w-3" />{rt}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" asChild>
                      <a href={`https://schema.org/${selectedType.type}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />schema.org/{selectedType.type}
                      </a>
                    </Button>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-520px)] min-h-[400px]">
              <div className="space-y-4">
                {CATEGORIES.filter((cat) => categoryCounts[cat] > 0).map((cat) => {
                  const CatIcon = CATEGORY_ICONS[cat] || Globe;
                  const isExpanded = expandedCategories.includes(cat);
                  const catItems = filteredCatalog.filter((s) => s.category === cat);
                  return (
                    <Collapsible key={cat} open={isExpanded} onOpenChange={() => toggleCategory(cat)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer">
                          <div className="flex items-center gap-2">
                            <CatIcon className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">{cat}</span>
                            <Badge variant="secondary" className="text-[10px]">{catItems.length}</Badge>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 pt-2 pl-2">
                          {catItems.map((schema) => {
                            const inUse = entitySchemaTypes.has(schema.type);
                            return (
                              <Card
                                key={schema.type}
                                className={`p-3 cursor-pointer hover:shadow-md transition-all hover:border-primary/30 ${inUse ? "border-primary/40 bg-primary/5" : ""}`}
                                onClick={() => setSelectedType(schema)}
                              >
                                <div className="flex items-start gap-2">
                                  <Code2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="font-semibold text-xs">{schema.type}</span>
                                      {inUse && <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{schema.description}</p>
                                    {schema.googleFeature && (
                                      <div className="flex items-center gap-1 mt-1.5">
                                        <Sparkles className="h-2.5 w-2.5 text-primary" />
                                        <span className="text-[9px] text-primary/80 font-medium">{schema.googleFeature}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-1">
                                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">{schema.properties.length} props</Badge>
                                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">{schema.properties.filter((p) => p.required).length} obrig.</Badge>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ═══════ ENTITIES TAB ═══════ */}
        <TabsContent value="entities" className="mt-4 space-y-4">
          {entities.length === 0 ? (
            <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
              <Code2 className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nenhuma entidade criada</h3>
              <p className="text-sm text-muted-foreground max-w-md">Crie entidades no Construtor de Grafo para ver sugestões de Schema.org aqui.</p>
              <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: "graph" }))}>Ir para o Construtor</Button>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-520px)] min-h-[300px]">
              <div className="space-y-3">
                {entities.map((entity) => {
                  const Icon = ENTITY_ICONS[entity.entity_type] || Globe;
                  const color = ENTITY_COLORS[entity.entity_type] || "hsl(250 85% 60%)";
                  const schemaType = entity.schema_type;
                  const catalogEntry = FULL_CATALOG.find((s) => s.type === schemaType);
                  const props = entity.schema_properties as Record<string, string> | null;
                  const filledCount = props ? Object.values(props).filter(Boolean).length : 0;
                  const totalProps = catalogEntry?.properties.length || 0;
                  const requiredProps = catalogEntry?.properties.filter((p) => p.required) || [];
                  const filledRequired = requiredProps.filter((p) => props?.[p.name]);
                  const reqPct = requiredProps.length > 0 ? Math.round((filledRequired.length / requiredProps.length) * 100) : 0;
                  const suggestions = !schemaType
                    ? (SCHEMA_TYPES[entity.entity_type] || []).map((t) => FULL_CATALOG.find((s) => s.type === t)).filter(Boolean) as SchemaTypeDef[]
                    : [];

                  return (
                    <Card key={entity.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "22", color }}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{entity.name}</span>
                            <Badge variant="outline" className="text-[10px]">{entity.entity_type}</Badge>
                          </div>
                          {schemaType ? (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="gap-1 text-[10px]"><Code2 className="h-3 w-3" />{schemaType}</Badge>
                                {catalogEntry?.googleFeature && <span className="text-[9px] text-primary/80"><Sparkles className="h-2.5 w-2.5 inline mr-0.5" />{catalogEntry.googleFeature}</span>}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground">{filledRequired.length}/{requiredProps.length} obrigatórias</span>
                                  <span className="text-[10px] font-semibold" style={{ color: reqPct === 100 ? "hsl(155 70% 42%)" : reqPct > 50 ? "hsl(42 95% 52%)" : "hsl(0 78% 55%)" }}>{reqPct}%</span>
                                </div>
                                <Progress value={reqPct} className="h-1.5" />
                              </div>
                              {reqPct < 100 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {requiredProps.filter((p) => !props?.[p.name]).map((p) => (
                                    <Badge key={p.name} variant="destructive" className="text-[9px] gap-0.5"><AlertCircle className="h-2.5 w-2.5" />{p.name}</Badge>
                                  ))}
                                </div>
                              )}
                              <Button variant="outline" size="sm" className="mt-2 text-xs gap-1.5 h-7" onClick={() => catalogEntry && startBuilder(catalogEntry, props || { "@type": schemaType })}>
                                <Wrench className="h-3 w-3" />Abrir no Construtor
                              </Button>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-amber-500"><AlertCircle className="h-3.5 w-3.5" /><span className="text-xs font-medium">Sem Schema.org definido</span></div>
                              {suggestions.length > 0 && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground block mb-1">Sugestões:</span>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {suggestions.map((s) => (
                                      <Badge key={s.type} variant="outline" className="cursor-pointer hover:bg-primary/10 text-[10px] gap-1" onClick={() => startBuilder(s)}>
                                        <Lightbulb className="h-2.5 w-2.5" />{s.type}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ═══════ EXPLORER TAB ═══════ */}
        <TabsContent value="explorer" className="mt-4">
          <Card className="overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-semibold text-sm">Explorador Hierárquico de Schema Types</h4>
                  <p className="text-[11px] text-muted-foreground">Clique para ver detalhes no catálogo · Hover para construir JSON-LD</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => {
                  const allNames = getAllSchemaTypeNames();
                  setExpandedTreeNodes(new Set(allNames));
                }}>
                  <ChevronDown className="h-3 w-3" /> Expandir Tudo
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => {
                  setExpandedTreeNodes(new Set(["Thing"]));
                }}>
                  <ChevronUp className="h-3 w-3" /> Recolher
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-520px)] min-h-[400px]">
              <div className="p-3">
                {renderTreeNode(tree)}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
