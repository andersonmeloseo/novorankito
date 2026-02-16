import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Code2, Search, Copy, Check, ExternalLink, CheckCircle2, AlertCircle,
  ChevronRight, Sparkles, BookOpen, Layers, FileCode, Eye, ArrowRight,
  Lightbulb, Shield, BarChart3, Zap, Globe, Package, Briefcase, MapPin,
  User, Star, Store, Building2, ChevronDown, ChevronUp, Info, FileJson,
  ListChecks, Puzzle, Target, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ENTITY_ICONS, ENTITY_COLORS, type EntityNodeData } from "./EntityNode";
import { SCHEMA_TYPES, ENTITY_TYPES } from "./CreateEntityDialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Complete Schema.org catalog with ALL types organized by category ──
interface SchemaTypeDef {
  type: string;
  category: string;
  description: string;
  googleFeature?: string;
  properties: { name: string; required: boolean; description: string; example: string }[];
  relatedTypes?: string[];
}

const SCHEMA_CATALOG: SchemaTypeDef[] = [
  // ── Organizations ──
  {
    type: "Organization", category: "Organizações", description: "Organização genérica, empresa ou instituição.",
    googleFeature: "Knowledge Panel, Sitelinks",
    relatedTypes: ["Corporation", "LocalBusiness", "NGO"],
    properties: [
      { name: "@type", required: true, description: "Tipo Schema.org", example: "Organization" },
      { name: "name", required: true, description: "Nome oficial", example: "Minha Empresa SA" },
      { name: "url", required: true, description: "URL do site principal", example: "https://example.com" },
      { name: "logo", required: true, description: "URL do logotipo", example: "https://example.com/logo.png" },
      { name: "description", required: false, description: "Descrição da organização", example: "Líder em tecnologia..." },
      { name: "foundingDate", required: false, description: "Data de fundação", example: "2015-03-10" },
      { name: "founder", required: false, description: "Fundador(es)", example: "João Silva" },
      { name: "numberOfEmployees", required: false, description: "Número de funcionários", example: "50-100" },
      { name: "sameAs", required: false, description: "Links para redes sociais", example: '["https://facebook.com/empresa","https://linkedin.com/company/empresa"]' },
      { name: "contactPoint", required: false, description: "Ponto de contato", example: '{"@type":"ContactPoint","telephone":"+55-11-99999","contactType":"customer service"}' },
      { name: "address", required: false, description: "Endereço da sede", example: "Av. Paulista, 1000" },
      { name: "email", required: false, description: "E-mail institucional", example: "contato@empresa.com" },
      { name: "taxID", required: false, description: "CNPJ/Tax ID", example: "12.345.678/0001-90" },
      { name: "areaServed", required: false, description: "Área de atuação", example: "Brasil" },
      { name: "knowsAbout", required: false, description: "Áreas de expertise", example: "SEO, Marketing Digital" },
    ],
  },
  {
    type: "Corporation", category: "Organizações", description: "Empresa de capital aberto ou corporação.",
    googleFeature: "Knowledge Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo Schema.org", example: "Corporation" },
      { name: "name", required: true, description: "Razão social", example: "Empresa SA" },
      { name: "tickerSymbol", required: false, description: "Código na bolsa", example: "EMPR3" },
      { name: "url", required: true, description: "URL do site", example: "https://empresa.com.br" },
      { name: "logo", required: true, description: "Logotipo", example: "https://empresa.com.br/logo.svg" },
      { name: "founder", required: false, description: "Fundador", example: "Carlos Santos" },
      { name: "foundingDate", required: false, description: "Data de fundação", example: "1998-01-15" },
      { name: "numberOfEmployees", required: false, description: "Funcionários", example: "1000+" },
    ],
  },
  {
    type: "LocalBusiness", category: "Organizações", description: "Negócio local com endereço físico.",
    googleFeature: "Local Pack, Knowledge Panel, Maps",
    relatedTypes: ["Restaurant", "MedicalBusiness", "LegalService", "AutoRepair", "BeautySalon"],
    properties: [
      { name: "@type", required: true, description: "Tipo Schema.org", example: "LocalBusiness" },
      { name: "name", required: true, description: "Nome do negócio", example: "Pizzaria Napoli" },
      { name: "image", required: true, description: "Foto principal", example: "https://example.com/foto.jpg" },
      { name: "address", required: true, description: "Endereço completo", example: '{"@type":"PostalAddress","streetAddress":"Rua A, 123","addressLocality":"São Paulo","addressRegion":"SP","postalCode":"01234-000"}' },
      { name: "telephone", required: true, description: "Telefone", example: "+55 11 3333-4444" },
      { name: "url", required: false, description: "Site", example: "https://pizzarianapoli.com" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: '{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday"],"opens":"08:00","closes":"18:00"}' },
      { name: "aggregateRating", required: false, description: "Avaliação média", example: '{"@type":"AggregateRating","ratingValue":"4.5","reviewCount":"120"}' },
      { name: "geo", required: false, description: "Coordenadas", example: '{"@type":"GeoCoordinates","latitude":"-23.55","longitude":"-46.63"}' },
      { name: "areaServed", required: false, description: "Área atendida", example: "São Paulo - Zona Sul" },
      { name: "paymentAccepted", required: false, description: "Formas de pagamento", example: "Dinheiro, Cartão, PIX" },
      { name: "currenciesAccepted", required: false, description: "Moedas aceitas", example: "BRL" },
      { name: "hasMap", required: false, description: "Link do mapa", example: "https://maps.google.com/?q=..." },
    ],
  },
  {
    type: "Restaurant", category: "Organizações", description: "Restaurante, bar ou estabelecimento alimentício.",
    googleFeature: "Local Pack, Rich Results, Maps",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Restaurant" },
      { name: "name", required: true, description: "Nome do restaurante", example: "Sushi Garden" },
      { name: "image", required: true, description: "Foto", example: "https://example.com/sushi.jpg" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Sabores, 42" },
      { name: "telephone", required: true, description: "Telefone", example: "+55 11 99999-0000" },
      { name: "servesCuisine", required: true, description: "Tipo de culinária", example: "Japonesa" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$$" },
      { name: "menu", required: false, description: "URL do cardápio", example: "https://sushi.com/cardapio" },
      { name: "acceptsReservations", required: false, description: "Aceita reservas", example: "True" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "Seg-Sab 11:30-23:00" },
      { name: "aggregateRating", required: false, description: "Avaliação", example: "4.7" },
      { name: "hasMenu", required: false, description: "Cardápio estruturado", example: '{"@type":"Menu","hasMenuSection":[...]}' },
    ],
  },
  // ── Products ──
  {
    type: "Product", category: "Produtos", description: "Produto físico ou digital à venda.",
    googleFeature: "Product Rich Results, Shopping",
    relatedTypes: ["IndividualProduct", "ProductGroup", "SoftwareApplication"],
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Product" },
      { name: "name", required: true, description: "Nome do produto", example: "Smartphone XYZ Pro" },
      { name: "image", required: true, description: "Imagem do produto", example: "https://example.com/smartphone.jpg" },
      { name: "description", required: true, description: "Descrição detalhada", example: "Smartphone premium com câmera de 108MP..." },
      { name: "sku", required: false, description: "SKU/Código", example: "SKU-XYZ-PRO-128" },
      { name: "gtin13", required: false, description: "EAN/GTIN", example: "7891234567890" },
      { name: "brand", required: true, description: "Marca", example: '{"@type":"Brand","name":"TechBrand"}' },
      { name: "offers", required: true, description: "Oferta/Preço", example: '{"@type":"Offer","price":"2999.90","priceCurrency":"BRL","availability":"https://schema.org/InStock"}' },
      { name: "aggregateRating", required: false, description: "Avaliação média", example: '{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"356"}' },
      { name: "review", required: false, description: "Avaliações", example: '{"@type":"Review","author":"João","reviewRating":{"@type":"Rating","ratingValue":"5"}}' },
      { name: "color", required: false, description: "Cor", example: "Preto" },
      { name: "weight", required: false, description: "Peso", example: '{"@type":"QuantitativeValue","value":"185","unitCode":"GRM"}' },
      { name: "material", required: false, description: "Material", example: "Alumínio e Vidro" },
      { name: "manufacturer", required: false, description: "Fabricante", example: "TechBrand Inc." },
      { name: "model", required: false, description: "Modelo", example: "XYZ Pro 2025" },
      { name: "itemCondition", required: false, description: "Condição", example: "https://schema.org/NewCondition" },
    ],
  },
  {
    type: "IndividualProduct", category: "Produtos", description: "Produto individual com serial único.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "IndividualProduct" },
      { name: "name", required: true, description: "Nome", example: "Edição Limitada #42" },
      { name: "serialNumber", required: false, description: "Número serial", example: "SN-2025-042" },
      { name: "brand", required: false, description: "Marca", example: "ArtBrand" },
    ],
  },
  {
    type: "ProductGroup", category: "Produtos", description: "Grupo de produtos com variantes.",
    googleFeature: "Product Variants",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "ProductGroup" },
      { name: "name", required: true, description: "Nome do grupo", example: "Camiseta Básica" },
      { name: "description", required: true, description: "Descrição", example: "Camiseta básica em algodão" },
      { name: "variesBy", required: false, description: "Varia por", example: '["https://schema.org/color","https://schema.org/size"]' },
      { name: "hasVariant", required: false, description: "Variantes", example: "[Product A, Product B]" },
      { name: "productGroupID", required: false, description: "ID do grupo", example: "CAM-BASICA" },
    ],
  },
  {
    type: "SoftwareApplication", category: "Produtos", description: "Aplicativo ou software.",
    googleFeature: "Software App Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "SoftwareApplication" },
      { name: "name", required: true, description: "Nome do app", example: "MeuApp" },
      { name: "operatingSystem", required: false, description: "Sistema operacional", example: "Android, iOS" },
      { name: "applicationCategory", required: false, description: "Categoria", example: "BusinessApplication" },
      { name: "offers", required: false, description: "Preço", example: '{"@type":"Offer","price":"0","priceCurrency":"BRL"}' },
      { name: "aggregateRating", required: false, description: "Avaliação", example: "4.6" },
    ],
  },
  // ── Services ──
  {
    type: "Service", category: "Serviços", description: "Serviço prestado por pessoa ou empresa.",
    googleFeature: "Service Rich Results",
    relatedTypes: ["ProfessionalService", "FinancialService"],
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Service" },
      { name: "name", required: true, description: "Nome do serviço", example: "Consultoria SEO" },
      { name: "description", required: true, description: "Descrição detalhada", example: "Análise completa de SEO..." },
      { name: "provider", required: true, description: "Provedor", example: '{"@type":"Organization","name":"Minha Agência"}' },
      { name: "serviceType", required: false, description: "Tipo do serviço", example: "Consultoria Digital" },
      { name: "areaServed", required: false, description: "Área atendida", example: "Todo o Brasil" },
      { name: "hasOfferCatalog", required: false, description: "Catálogo de ofertas", example: '{"@type":"OfferCatalog","name":"Pacotes","itemListElement":[...]}' },
      { name: "offers", required: false, description: "Preço", example: "A partir de R$ 1.500/mês" },
      { name: "termsOfService", required: false, description: "Termos de serviço", example: "https://example.com/termos" },
      { name: "award", required: false, description: "Prêmios", example: "Melhor Agência SEO 2024" },
      { name: "serviceOutput", required: false, description: "Resultado entregue", example: "Relatório de SEO completo" },
      { name: "serviceAudience", required: false, description: "Público-alvo", example: "Empresas de médio porte" },
    ],
  },
  {
    type: "ProfessionalService", category: "Serviços", description: "Serviço profissional especializado.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "ProfessionalService" },
      { name: "name", required: true, description: "Nome", example: "Contabilidade Express" },
      { name: "address", required: true, description: "Endereço", example: "Rua Comercial, 200" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 5555-6666" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "Seg-Sex 08:00-18:00" },
    ],
  },
  // ── People ──
  {
    type: "Person", category: "Pessoas", description: "Pessoa física, autor, profissional.",
    googleFeature: "Knowledge Panel, Author Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Person" },
      { name: "name", required: true, description: "Nome completo", example: "João Silva" },
      { name: "jobTitle", required: false, description: "Cargo atual", example: "CEO & Fundador" },
      { name: "worksFor", required: false, description: "Empresa", example: '{"@type":"Organization","name":"Empresa SA"}' },
      { name: "image", required: false, description: "Foto profissional", example: "https://example.com/joao.jpg" },
      { name: "url", required: false, description: "Site pessoal", example: "https://joaosilva.com" },
      { name: "sameAs", required: false, description: "Redes sociais", example: '["https://linkedin.com/in/joao","https://twitter.com/joao"]' },
      { name: "email", required: false, description: "E-mail", example: "joao@empresa.com" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 99999-0000" },
      { name: "alumniOf", required: false, description: "Formação acadêmica", example: '{"@type":"EducationalOrganization","name":"USP"}' },
      { name: "knowsAbout", required: false, description: "Áreas de expertise", example: "SEO, Marketing Digital, Growth" },
      { name: "award", required: false, description: "Prêmios", example: "Top 10 SEOs do Brasil 2024" },
      { name: "description", required: false, description: "Bio", example: "Especialista em SEO com 10 anos de experiência..." },
    ],
  },
  // ── Web ──
  {
    type: "WebSite", category: "Web", description: "Website completo com busca interna.",
    googleFeature: "Sitelinks Search Box",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "WebSite" },
      { name: "name", required: true, description: "Nome do site", example: "Meu Site" },
      { name: "url", required: true, description: "URL principal", example: "https://example.com" },
      { name: "description", required: false, description: "Descrição do site", example: "O melhor site de..." },
      { name: "inLanguage", required: false, description: "Idioma", example: "pt-BR" },
      { name: "publisher", required: false, description: "Publicador", example: '{"@type":"Organization","name":"Minha Empresa"}' },
      { name: "potentialAction", required: false, description: "Busca interna (SearchAction)", example: '{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://example.com/busca?q={search_term_string}"},"query-input":"required name=search_term_string"}' },
    ],
  },
  {
    type: "WebPage", category: "Web", description: "Página individual do site.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "WebPage" },
      { name: "name", required: true, description: "Título", example: "Sobre Nós" },
      { name: "url", required: true, description: "URL da página", example: "https://example.com/sobre" },
      { name: "description", required: false, description: "Descrição", example: "Conheça nossa história" },
      { name: "breadcrumb", required: false, description: "Breadcrumb", example: '{"@type":"BreadcrumbList","itemListElement":[...]}' },
      { name: "mainEntity", required: false, description: "Entidade principal da página", example: '{"@type":"Organization","name":"Minha Empresa"}' },
      { name: "speakable", required: false, description: "Seções faladas (Google Assistant)", example: '{"@type":"SpeakableSpecification","cssSelector":["h1",".resumo"]}' },
      { name: "lastReviewed", required: false, description: "Última revisão", example: "2025-01-15" },
    ],
  },
  {
    type: "FAQPage", category: "Web", description: "Página de perguntas frequentes.",
    googleFeature: "FAQ Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "FAQPage" },
      { name: "mainEntity", required: true, description: "Lista de perguntas", example: '[{"@type":"Question","name":"Pergunta?","acceptedAnswer":{"@type":"Answer","text":"Resposta."}}]' },
    ],
  },
  {
    type: "Article", category: "Web", description: "Artigo, post de blog ou notícia.",
    googleFeature: "Article Rich Results, Top Stories",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Article" },
      { name: "headline", required: true, description: "Título", example: "10 Dicas de SEO para 2025" },
      { name: "image", required: true, description: "Imagem destaque", example: "https://example.com/artigo.jpg" },
      { name: "author", required: true, description: "Autor", example: '{"@type":"Person","name":"João Silva","url":"https://joao.com"}' },
      { name: "datePublished", required: true, description: "Data de publicação", example: "2025-02-01" },
      { name: "dateModified", required: false, description: "Última atualização", example: "2025-02-15" },
      { name: "publisher", required: true, description: "Publicador", example: '{"@type":"Organization","name":"Meu Blog","logo":"..."}' },
      { name: "description", required: false, description: "Resumo", example: "As melhores dicas de SEO..." },
      { name: "articleBody", required: false, description: "Corpo do artigo", example: "Texto completo..." },
      { name: "wordCount", required: false, description: "Contagem de palavras", example: "2500" },
      { name: "keywords", required: false, description: "Palavras-chave", example: "SEO, Google, 2025" },
    ],
  },
  {
    type: "BreadcrumbList", category: "Web", description: "Navegação de breadcrumb/trilha.",
    googleFeature: "Breadcrumb Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "BreadcrumbList" },
      { name: "itemListElement", required: true, description: "Itens do breadcrumb", example: '[{"@type":"ListItem","position":1,"name":"Home","item":"https://example.com"}]' },
    ],
  },
  // ── Locations ──
  {
    type: "Place", category: "Locais", description: "Local genérico, ponto de interesse.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Place" },
      { name: "name", required: true, description: "Nome do local", example: "Parque Ibirapuera" },
      { name: "address", required: false, description: "Endereço", example: "Av. Pedro Álvares Cabral" },
      { name: "geo", required: false, description: "Coordenadas", example: '{"@type":"GeoCoordinates","latitude":"-23.58","longitude":"-46.66"}' },
      { name: "hasMap", required: false, description: "Mapa", example: "https://maps.google.com/..." },
    ],
  },
  {
    type: "PostalAddress", category: "Locais", description: "Endereço postal completo.",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "PostalAddress" },
      { name: "streetAddress", required: true, description: "Rua e número", example: "Rua Principal, 123" },
      { name: "addressLocality", required: true, description: "Cidade", example: "São Paulo" },
      { name: "addressRegion", required: true, description: "Estado/UF", example: "SP" },
      { name: "postalCode", required: false, description: "CEP", example: "01234-567" },
      { name: "addressCountry", required: false, description: "País", example: "BR" },
    ],
  },
  // ── Reviews ──
  {
    type: "Review", category: "Avaliações", description: "Avaliação individual de produto/serviço.",
    googleFeature: "Review Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Review" },
      { name: "reviewBody", required: true, description: "Texto da avaliação", example: "Excelente! Recomendo muito." },
      { name: "author", required: true, description: "Autor", example: '{"@type":"Person","name":"Maria Santos"}' },
      { name: "reviewRating", required: true, description: "Nota", example: '{"@type":"Rating","ratingValue":"5","bestRating":"5"}' },
      { name: "itemReviewed", required: false, description: "Item avaliado", example: '{"@type":"Product","name":"Produto X"}' },
      { name: "datePublished", required: false, description: "Data", example: "2025-01-20" },
    ],
  },
  {
    type: "AggregateRating", category: "Avaliações", description: "Avaliação agregada de múltiplas reviews.",
    googleFeature: "Star Ratings",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "AggregateRating" },
      { name: "ratingValue", required: true, description: "Nota média", example: "4.7" },
      { name: "reviewCount", required: true, description: "Total de avaliações", example: "342" },
      { name: "bestRating", required: false, description: "Nota máxima", example: "5" },
      { name: "worstRating", required: false, description: "Nota mínima", example: "1" },
    ],
  },
  // ── Specialized Business ──
  {
    type: "MedicalBusiness", category: "Negócios Especializados", description: "Clínica médica, hospital ou consultório.",
    googleFeature: "Health Panel, Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "MedicalBusiness" },
      { name: "name", required: true, description: "Nome", example: "Clínica Saúde Total" },
      { name: "medicalSpecialty", required: true, description: "Especialidade", example: "Dermatologia" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Médicos, 100" },
      { name: "telephone", required: true, description: "Telefone", example: "+55 11 3333-4444" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "Seg-Sex 08:00-18:00" },
      { name: "isAcceptingNewPatients", required: false, description: "Aceita novos pacientes", example: "true" },
      { name: "availableService", required: false, description: "Serviços disponíveis", example: "Consulta dermatológica" },
    ],
  },
  {
    type: "LegalService", category: "Negócios Especializados", description: "Escritório de advocacia ou serviço jurídico.",
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
    type: "AutoRepair", category: "Negócios Especializados", description: "Oficina mecânica, funilaria ou auto center.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "AutoRepair" },
      { name: "name", required: true, description: "Nome", example: "Auto Center Express" },
      { name: "address", required: true, description: "Endereço", example: "Av. dos Mecânicos, 300" },
      { name: "telephone", required: false, description: "Telefone", example: "+55 11 4444-5555" },
    ],
  },
  {
    type: "BeautySalon", category: "Negócios Especializados", description: "Salão de beleza, barbearia ou spa.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "BeautySalon" },
      { name: "name", required: true, description: "Nome do salão", example: "Studio Beleza" },
      { name: "address", required: true, description: "Endereço", example: "Rua da Beleza, 42" },
      { name: "priceRange", required: false, description: "Faixa de preço", example: "$$" },
    ],
  },
  {
    type: "RealEstateAgent", category: "Negócios Especializados", description: "Imobiliária ou corretor de imóveis.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "RealEstateAgent" },
      { name: "name", required: true, description: "Nome", example: "Imobiliária Top" },
      { name: "address", required: true, description: "Endereço", example: "Av. Central, 800" },
      { name: "areaServed", required: false, description: "Região atendida", example: "Zona Oeste de SP" },
    ],
  },
  {
    type: "EducationalOrganization", category: "Negócios Especializados", description: "Escola, universidade ou curso.",
    googleFeature: "Knowledge Panel",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "EducationalOrganization" },
      { name: "name", required: true, description: "Nome", example: "Escola de Negócios" },
      { name: "address", required: true, description: "Endereço", example: "Rua da Educação, 300" },
      { name: "url", required: false, description: "Site", example: "https://escola.com" },
    ],
  },
  {
    type: "HealthClub", category: "Negócios Especializados", description: "Academia, clube fitness ou estúdio.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "HealthClub" },
      { name: "name", required: true, description: "Nome", example: "CrossFit Arena" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Atletas, 50" },
      { name: "openingHoursSpecification", required: false, description: "Horários", example: "Seg-Sab 06:00-22:00" },
    ],
  },
  {
    type: "TravelAgency", category: "Negócios Especializados", description: "Agência de viagens e turismo.",
    googleFeature: "Local Pack",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "TravelAgency" },
      { name: "name", required: true, description: "Nome", example: "Viagens & Cia" },
      { name: "address", required: true, description: "Endereço", example: "Rua dos Viajantes, 100" },
      { name: "areaServed", required: false, description: "Destinos", example: "Nacional e Internacional" },
    ],
  },
  // ── Events ──
  {
    type: "Event", category: "Eventos", description: "Evento presencial ou online.",
    googleFeature: "Event Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Event" },
      { name: "name", required: true, description: "Nome do evento", example: "Conferência SEO 2025" },
      { name: "startDate", required: true, description: "Data de início", example: "2025-06-15T09:00" },
      { name: "endDate", required: false, description: "Data de término", example: "2025-06-17T18:00" },
      { name: "location", required: true, description: "Local", example: '{"@type":"Place","name":"Centro de Convenções","address":"Av. Principal, 1000"}' },
      { name: "description", required: false, description: "Descrição", example: "O maior evento de SEO do Brasil" },
      { name: "image", required: false, description: "Imagem", example: "https://example.com/evento.jpg" },
      { name: "organizer", required: false, description: "Organizador", example: '{"@type":"Organization","name":"SEO Brasil"}' },
      { name: "offers", required: false, description: "Ingressos", example: '{"@type":"Offer","price":"299","priceCurrency":"BRL","url":"https://..."}' },
      { name: "performer", required: false, description: "Palestrantes", example: '{"@type":"Person","name":"Especialista SEO"}' },
      { name: "eventAttendanceMode", required: false, description: "Modo", example: "https://schema.org/OfflineEventAttendanceMode" },
      { name: "eventStatus", required: false, description: "Status", example: "https://schema.org/EventScheduled" },
    ],
  },
  // ── Creative Work ──
  {
    type: "VideoObject", category: "Conteúdo", description: "Vídeo publicado online.",
    googleFeature: "Video Rich Results, Video Carousels",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "VideoObject" },
      { name: "name", required: true, description: "Título", example: "Como fazer SEO em 2025" },
      { name: "description", required: true, description: "Descrição", example: "Aprenda SEO do zero..." },
      { name: "thumbnailUrl", required: true, description: "Thumbnail", example: "https://example.com/thumb.jpg" },
      { name: "uploadDate", required: true, description: "Data de upload", example: "2025-01-15" },
      { name: "duration", required: false, description: "Duração (ISO 8601)", example: "PT10M30S" },
      { name: "contentUrl", required: false, description: "URL do vídeo", example: "https://example.com/video.mp4" },
      { name: "embedUrl", required: false, description: "URL de embed", example: "https://youtube.com/embed/..." },
    ],
  },
  {
    type: "HowTo", category: "Conteúdo", description: "Tutorial passo-a-passo.",
    googleFeature: "How-To Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "HowTo" },
      { name: "name", required: true, description: "Título", example: "Como otimizar imagens para SEO" },
      { name: "description", required: false, description: "Descrição", example: "Guia completo de otimização de imagens" },
      { name: "step", required: true, description: "Passos", example: '[{"@type":"HowToStep","name":"Comprimir","text":"Use WebP..."}]' },
      { name: "totalTime", required: false, description: "Tempo total", example: "PT30M" },
      { name: "estimatedCost", required: false, description: "Custo estimado", example: '{"@type":"MonetaryAmount","currency":"BRL","value":"0"}' },
    ],
  },
  {
    type: "Recipe", category: "Conteúdo", description: "Receita culinária.",
    googleFeature: "Recipe Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Recipe" },
      { name: "name", required: true, description: "Nome da receita", example: "Bolo de Chocolate" },
      { name: "image", required: true, description: "Foto", example: "https://example.com/bolo.jpg" },
      { name: "author", required: true, description: "Autor", example: '{"@type":"Person","name":"Chef Ana"}' },
      { name: "prepTime", required: false, description: "Tempo de preparo", example: "PT30M" },
      { name: "cookTime", required: false, description: "Tempo de cozimento", example: "PT45M" },
      { name: "recipeYield", required: false, description: "Rendimento", example: "12 porções" },
      { name: "recipeIngredient", required: true, description: "Ingredientes", example: '["2 xícaras de farinha","1 xícara de açúcar"]' },
      { name: "recipeInstructions", required: true, description: "Instruções", example: '[{"@type":"HowToStep","text":"Misture os ingredientes secos"}]' },
      { name: "nutrition", required: false, description: "Informações nutricionais", example: '{"@type":"NutritionInformation","calories":"350 cal"}' },
    ],
  },
  // ── Commerce ──
  {
    type: "Offer", category: "Comércio", description: "Oferta de compra para um produto/serviço.",
    googleFeature: "Product Rich Results",
    properties: [
      { name: "@type", required: true, description: "Tipo", example: "Offer" },
      { name: "price", required: true, description: "Preço", example: "199.90" },
      { name: "priceCurrency", required: true, description: "Moeda", example: "BRL" },
      { name: "availability", required: true, description: "Disponibilidade", example: "https://schema.org/InStock" },
      { name: "url", required: false, description: "URL de compra", example: "https://example.com/comprar" },
      { name: "priceValidUntil", required: false, description: "Preço válido até", example: "2025-12-31" },
      { name: "seller", required: false, description: "Vendedor", example: '{"@type":"Organization","name":"Loja"}' },
      { name: "itemCondition", required: false, description: "Condição", example: "https://schema.org/NewCondition" },
      { name: "shippingDetails", required: false, description: "Detalhes de envio", example: '{"@type":"OfferShippingDetails","shippingRate":{...}}' },
    ],
  },
];

const CATEGORIES = [...new Set(SCHEMA_CATALOG.map((s) => s.category))];

// ── Helper: get icon for category ──
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
  "Conteúdo": BookOpen,
  "Comércio": TrendingUp,
};

interface Props {
  projectId: string;
}

export function SchemaOrgTab({ projectId }: Props) {
  const { user } = useAuth();
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SchemaTypeDef | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(CATEGORIES);
  const [copied, setCopied] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<"catalog" | "entities" | "generator">("catalog");

  // Load entities
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(false);
      const { data } = await supabase
        .from("semantic_entities")
        .select("*")
        .eq("project_id", projectId);
      setEntities(data || []);
    })();
  }, [projectId]);

  // Filter catalog
  const filteredCatalog = useMemo(() => {
    let items = SCHEMA_CATALOG;
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

  // Entity coverage stats
  const entitySchemaTypes = useMemo(() => {
    const types = new Set(entities.filter((e) => e.schema_type).map((e) => e.schema_type));
    return types;
  }, [entities]);

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

  const generateTemplateJsonLd = (typeDef: SchemaTypeDef) => {
    const obj: Record<string, any> = { "@context": "https://schema.org" };
    typeDef.properties.forEach((p) => {
      obj[p.name] = p.example;
    });
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-medium">Tipos no Catálogo</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{SCHEMA_CATALOG.length}</p>
          <p className="text-[10px] text-muted-foreground">{CATEGORIES.length} categorias</p>
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
            <span className="text-xs font-medium">Props Preenchidas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{entitiesWithProperties.length}</p>
          <Progress value={propertiesPct} className="h-1.5" />
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Puzzle className="h-4 w-4" />
            <span className="text-xs font-medium">Tipos Únicos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{entitySchemaTypes.size}</p>
          <p className="text-[10px] text-muted-foreground">em uso no grafo</p>
        </Card>
      </div>

      {/* Inner Tabs */}
      <Tabs value={innerTab} onValueChange={(v) => setInnerTab(v as any)}>
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="catalog" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Catálogo Completo
          </TabsTrigger>
          <TabsTrigger value="entities" className="gap-1.5 text-xs">
            <FileCode className="h-3.5 w-3.5" />
            Minhas Entidades ({entities.length})
          </TabsTrigger>
          <TabsTrigger value="generator" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Gerador JSON-LD
          </TabsTrigger>
        </TabsList>

        {/* ── Catalog Tab ── */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          {/* Search & Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tipo, categoria ou recurso Google..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="cursor-pointer text-[10px] hover:bg-primary/10 transition-colors"
                onClick={() => setSelectedCategory(null)}
              >
                Todos ({SCHEMA_CATALOG.length})
              </Badge>
              {CATEGORIES.map((cat) => {
                const CatIcon = CATEGORY_ICONS[cat] || Globe;
                return (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    className="cursor-pointer text-[10px] gap-1 hover:bg-primary/10 transition-colors"
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  >
                    <CatIcon className="h-3 w-3" />
                    {cat}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Schema Type Detail */}
          {selectedType ? (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs">{selectedType.category}</Badge>
                      <CardTitle className="text-lg">{selectedType.type}</CardTitle>
                    </div>
                    <CardDescription>{selectedType.description}</CardDescription>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedType(null)} className="text-xs">
                    ← Voltar
                  </Button>
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
                    {/* Properties */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Propriedades ({selectedType.properties.length})
                      </h4>
                      <p className="text-[11px] text-muted-foreground mb-3">
                        {selectedType.properties.filter((p) => p.required).length} obrigatórias, {selectedType.properties.filter((p) => !p.required).length} opcionais
                      </p>
                    </div>
                    <div className="space-y-2">
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
                              </div>
                              <p className="text-[11px] text-muted-foreground">{prop.description}</p>
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground">Ex:</span>
                                <code className="text-[10px] text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded truncate max-w-[400px]">
                                  {prop.example}
                                </code>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Related Types */}
                    {selectedType.relatedTypes && selectedType.relatedTypes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Puzzle className="h-4 w-4" />
                          Tipos Relacionados
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          {selectedType.relatedTypes.map((rt) => {
                            const found = SCHEMA_CATALOG.find((s) => s.type === rt);
                            return (
                              <Badge
                                key={rt}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary/10 gap-1 text-xs"
                                onClick={() => found && setSelectedType(found)}
                              >
                                <ChevronRight className="h-3 w-3" />
                                {rt}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* JSON-LD Template */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          Template JSON-LD
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7"
                          onClick={() => handleCopy(generateTemplateJsonLd(selectedType), selectedType.type)}
                        >
                          {copied === selectedType.type ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied === selectedType.type ? "Copiado!" : "Copiar"}
                        </Button>
                      </div>
                      <pre className="p-4 rounded-xl bg-muted/50 border text-[11px] font-mono overflow-x-auto whitespace-pre-wrap text-foreground max-h-[300px] overflow-y-auto">
                        {generateTemplateJsonLd(selectedType)}
                      </pre>
                      <Card className="p-3 bg-primary/5 border-primary/20">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-[11px] text-muted-foreground">
                            Cole este JSON-LD no <code className="text-primary font-mono">&lt;head&gt;</code> ou <code className="text-primary font-mono">&lt;script type="application/ld+json"&gt;</code> da página correspondente.
                          </p>
                        </div>
                      </Card>
                    </div>

                    {/* Link to schema.org */}
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" asChild>
                      <a href={`https://schema.org/${selectedType.type}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver documentação em schema.org/{selectedType.type}
                      </a>
                    </Button>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            /* Schema Catalog Grid */
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
                                      {inUse && (
                                        <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{schema.description}</p>
                                    {schema.googleFeature && (
                                      <div className="flex items-center gap-1 mt-1.5">
                                        <Sparkles className="h-2.5 w-2.5 text-primary" />
                                        <span className="text-[9px] text-primary/80 font-medium">{schema.googleFeature}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-1">
                                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                                        {schema.properties.length} props
                                      </Badge>
                                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                                        {schema.properties.filter((p) => p.required).length} obrig.
                                      </Badge>
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

        {/* ── Entities Tab ── */}
        <TabsContent value="entities" className="mt-4 space-y-4">
          {entities.length === 0 ? (
            <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
              <Code2 className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nenhuma entidade criada</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Crie entidades no Construtor de Grafo para ver suas sugestões de Schema.org aqui.
              </p>
              <Button
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent("switch-semantic-tab", { detail: "graph" }))}
              >
                Ir para o Construtor
              </Button>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-520px)] min-h-[300px]">
              <div className="space-y-3">
                {entities.map((entity) => {
                  const Icon = ENTITY_ICONS[entity.entity_type] || Globe;
                  const color = ENTITY_COLORS[entity.entity_type] || "hsl(250 85% 60%)";
                  const schemaType = entity.schema_type;
                  const catalogEntry = SCHEMA_CATALOG.find((s) => s.type === schemaType);
                  const props = entity.schema_properties as Record<string, string> | null;
                  const filledCount = props ? Object.values(props).filter(Boolean).length : 0;
                  const totalProps = catalogEntry?.properties.length || 0;
                  const requiredProps = catalogEntry?.properties.filter((p) => p.required) || [];
                  const filledRequired = requiredProps.filter((p) => props?.[p.name]);
                  const reqPct = requiredProps.length > 0 ? Math.round((filledRequired.length / requiredProps.length) * 100) : 0;

                  // Suggest schemas for entities without one
                  const suggestions = !schemaType
                    ? (SCHEMA_TYPES[entity.entity_type] || []).map((t) => SCHEMA_CATALOG.find((s) => s.type === t)).filter(Boolean) as SchemaTypeDef[]
                    : [];

                  return (
                    <Card key={entity.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: color + "22", color }}
                        >
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
                                <Badge className="gap-1 text-[10px]">
                                  <Code2 className="h-3 w-3" />
                                  {schemaType}
                                </Badge>
                                {catalogEntry?.googleFeature && (
                                  <span className="text-[9px] text-primary/80">
                                    <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />
                                    {catalogEntry.googleFeature}
                                  </span>
                                )}
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground">
                                    {filledRequired.length}/{requiredProps.length} obrigatórias
                                  </span>
                                  <span className="text-[10px] font-semibold" style={{
                                    color: reqPct === 100 ? "hsl(155 70% 42%)" : reqPct > 50 ? "hsl(42 95% 52%)" : "hsl(0 78% 55%)"
                                  }}>
                                    {reqPct}%
                                  </span>
                                </div>
                                <Progress value={reqPct} className="h-1.5" />
                                <span className="text-[10px] text-muted-foreground">{filledCount}/{totalProps} propriedades total</span>
                              </div>

                              {/* Missing required */}
                              {reqPct < 100 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {requiredProps.filter((p) => !props?.[p.name]).map((p) => (
                                    <Badge key={p.name} variant="destructive" className="text-[9px] gap-0.5">
                                      <AlertCircle className="h-2.5 w-2.5" />
                                      {p.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 text-xs gap-1.5 h-7"
                                onClick={() => catalogEntry && setSelectedType(catalogEntry)}
                              >
                                <Eye className="h-3 w-3" />
                                Ver Schema Completo
                              </Button>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-amber-500">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Sem Schema.org definido</span>
                              </div>
                              {suggestions.length > 0 && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground block mb-1">Sugestões:</span>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {suggestions.map((s) => (
                                      <Badge
                                        key={s.type}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-primary/10 text-[10px] gap-1"
                                        onClick={() => {
                                          setInnerTab("catalog");
                                          setSelectedType(s);
                                        }}
                                      >
                                        <Lightbulb className="h-2.5 w-2.5" />
                                        {s.type}
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

        {/* ── JSON-LD Generator ── */}
        <TabsContent value="generator" className="mt-4 space-y-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold mb-1">Gerador Completo de JSON-LD</h4>
                <p className="text-xs text-muted-foreground">
                  Gera automaticamente todo o código JSON-LD de todas as entidades do seu grafo que possuem Schema.org definido e propriedades preenchidas.
                  Ideal para copiar e colar no seu site.
                </p>
              </div>
            </div>
          </Card>

          {entitiesWithProperties.length === 0 ? (
            <Card className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center space-y-3">
              <FileCode className="h-8 w-8 text-muted-foreground" />
              <h3 className="text-base font-semibold">Nenhum JSON-LD disponível</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Preencha as propriedades Schema.org das suas entidades no painel lateral (clique na entidade no grafo) para gerar o JSON-LD.
              </p>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-540px)] min-h-[300px]">
              <div className="space-y-4">
                {entitiesWithProperties.map((entity) => {
                  const Icon = ENTITY_ICONS[entity.entity_type] || Globe;
                  const color = ENTITY_COLORS[entity.entity_type] || "hsl(250 85% 60%)";
                  const props = entity.schema_properties as Record<string, string>;
                  const jsonLd = JSON.stringify({ "@context": "https://schema.org", ...props }, null, 2);

                  return (
                    <Card key={entity.id} className="overflow-hidden">
                      <div className="p-3 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-7 w-7 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: color + "22", color }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-sm">{entity.name}</span>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Code2 className="h-3 w-3" />
                            {entity.schema_type}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7"
                          onClick={() => handleCopy(jsonLd, entity.id)}
                        >
                          {copied === entity.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied === entity.id ? "Copiado!" : "Copiar"}
                        </Button>
                      </div>
                      <pre className="p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap text-foreground bg-muted/30 max-h-[250px] overflow-y-auto">
                        {jsonLd}
                      </pre>
                    </Card>
                  );
                })}

                {/* All-in-one generator */}
                {entitiesWithProperties.length > 1 && (
                  <>
                    <Separator />
                    <Card className="overflow-hidden">
                      <div className="p-3 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-sm">Todos os JSON-LD (Grafo Completo)</span>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1 text-xs h-7"
                          onClick={() => {
                            const allJsonLd = entitiesWithProperties.map((e) => {
                              const p = e.schema_properties as Record<string, string>;
                              return JSON.stringify({ "@context": "https://schema.org", ...p }, null, 2);
                            });
                            const scriptTags = allJsonLd.map((j) => `<script type="application/ld+json">\n${j}\n</script>`).join("\n\n");
                            handleCopy(scriptTags, "all-jsonld");
                          }}
                        >
                          {copied === "all-jsonld" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied === "all-jsonld" ? "Copiado!" : "Copiar Tudo"}
                        </Button>
                      </div>
                      <pre className="p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap text-foreground bg-muted/30 max-h-[400px] overflow-y-auto">
                        {entitiesWithProperties.map((e) => {
                          const p = e.schema_properties as Record<string, string>;
                          return `<script type="application/ld+json">\n${JSON.stringify({ "@context": "https://schema.org", ...p }, null, 2)}\n</script>`;
                        }).join("\n\n")}
                      </pre>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
