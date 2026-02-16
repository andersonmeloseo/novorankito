import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wand2, Building2, Stethoscope, GraduationCap, Utensils, Scale, Wrench,
  ShoppingBag, Dumbbell, Car, Home, Plane, Briefcase, Palette, Laptop,
  ArrowRight, ArrowLeft, Sparkles, Check,
} from "lucide-react";

// ── Niche templates ──
interface NicheEntity {
  name: string;
  type: string;
  schema: string;
  description: string;
}
interface NicheRelation {
  subjectIndex: number;
  objectIndex: number;
  predicate: string;
}
interface NicheTemplate {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  entities: NicheEntity[];
  relations: NicheRelation[];
}

const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    id: "restaurante", label: "Restaurante", icon: Utensils, color: "hsl(0 78% 55%)",
    entities: [
      { name: "", type: "empresa", schema: "Restaurant", description: "O restaurante principal" },
      { name: "Cardápio", type: "produto", schema: "Menu", description: "Menu do restaurante" },
      { name: "Chef Principal", type: "pessoa", schema: "Person", description: "Chef responsável" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço físico" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website do restaurante" },
      { name: "Prato Signature", type: "produto", schema: "Product", description: "Prato principal da casa" },
      { name: "Avaliações Google", type: "avaliacao", schema: "AggregateRating", description: "Reviews no Google" },
      { name: "Serviço de Delivery", type: "servico", schema: "Service", description: "Entrega de pedidos" },
      { name: "Área de Eventos", type: "servico", schema: "Service", description: "Espaço para eventos" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 2, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 3, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 4, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 5, predicate: "é_dono_de" },
      { subjectIndex: 1, objectIndex: 6, predicate: "parte_de" },
      { subjectIndex: 4, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 8, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 9, predicate: "oferece" },
      { subjectIndex: 2, objectIndex: 6, predicate: "criou" },
    ],
  },
  {
    id: "clinica", label: "Clínica / Saúde", icon: Stethoscope, color: "hsl(155 70% 42%)",
    entities: [
      { name: "", type: "empresa", schema: "MedicalBusiness", description: "A clínica principal" },
      { name: "Dr(a). Principal", type: "pessoa", schema: "Person", description: "Médico responsável" },
      { name: "Consulta Médica", type: "servico", schema: "MedicalProcedure", description: "Serviço de consulta" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço da clínica" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da clínica" },
      { name: "Avaliações Google", type: "avaliacao", schema: "AggregateRating", description: "Reviews no Google" },
      { name: "Exames", type: "servico", schema: "Service", description: "Serviços de exames" },
      { name: "Telemedicina", type: "servico", schema: "Service", description: "Consultas online" },
      { name: "Blog de Saúde", type: "site", schema: "WebPage", description: "Blog com conteúdo de saúde" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 4, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 5, predicate: "é_dono_de" },
      { subjectIndex: 4, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 7, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 8, predicate: "oferece" },
      { subjectIndex: 5, objectIndex: 9, predicate: "parte_de" },
    ],
  },
  {
    id: "ecommerce", label: "E-commerce", icon: ShoppingBag, color: "hsl(250 85% 60%)",
    entities: [
      { name: "", type: "empresa", schema: "Organization", description: "A loja online" },
      { name: "Produto Principal", type: "produto", schema: "Product", description: "Produto carro-chefe" },
      { name: "Categoria A", type: "produto", schema: "ProductGroup", description: "Categoria de produtos" },
      { name: "Categoria B", type: "produto", schema: "ProductGroup", description: "Segunda categoria" },
      { name: "Site / Loja", type: "site", schema: "WebSite", description: "Website da loja" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews dos clientes" },
      { name: "Frete e Entrega", type: "servico", schema: "Service", description: "Logística" },
      { name: "SAC / Suporte", type: "servico", schema: "Service", description: "Atendimento ao cliente" },
      { name: "Blog da Loja", type: "site", schema: "WebPage", description: "Blog de conteúdo" },
      { name: "Redes Sociais", type: "site", schema: "WebPage", description: "Perfis sociais" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 2, objectIndex: 1, predicate: "parte_de" },
      { subjectIndex: 0, objectIndex: 4, predicate: "é_dono_de" },
      { subjectIndex: 1, objectIndex: 5, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 6, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 7, predicate: "oferece" },
      { subjectIndex: 4, objectIndex: 8, predicate: "parte_de" },
      { subjectIndex: 0, objectIndex: 9, predicate: "relacionado_a" },
    ],
  },
  {
    id: "advocacia", label: "Advocacia", icon: Scale, color: "hsl(42 95% 52%)",
    entities: [
      { name: "", type: "empresa", schema: "LegalService", description: "O escritório de advocacia" },
      { name: "Advogado(a) Sócio", type: "pessoa", schema: "Person", description: "Sócio principal" },
      { name: "Consultoria Jurídica", type: "servico", schema: "Service", description: "Consultoria legal" },
      { name: "Direito Trabalhista", type: "servico", schema: "Service", description: "Área trabalhista" },
      { name: "Direito Civil", type: "servico", schema: "Service", description: "Área civil" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço do escritório" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website do escritório" },
      { name: "Avaliações Google", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Blog Jurídico", type: "site", schema: "WebPage", description: "Blog com artigos jurídicos" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 7, predicate: "é_dono_de" },
      { subjectIndex: 6, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 7, objectIndex: 9, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  {
    id: "academia", label: "Academia / Fitness", icon: Dumbbell, color: "hsl(215 92% 56%)",
    entities: [
      { name: "", type: "empresa", schema: "HealthClub", description: "A academia" },
      { name: "Personal Trainer", type: "pessoa", schema: "Person", description: "Profissional destaque" },
      { name: "Musculação", type: "servico", schema: "Service", description: "Treino de musculação" },
      { name: "Aulas em Grupo", type: "servico", schema: "Service", description: "Aulas coletivas" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço da academia" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Plano Mensal", type: "produto", schema: "Product", description: "Plano de assinatura" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da academia" },
      { name: "Nutrição", type: "servico", schema: "Service", description: "Acompanhamento nutricional" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 5, predicate: "relacionado_a" },
      { subjectIndex: 5, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 7, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 8, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 9, predicate: "oferece" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  {
    id: "imobiliaria", label: "Imobiliária", icon: Home, color: "hsl(260 90% 68%)",
    entities: [
      { name: "", type: "empresa", schema: "RealEstateAgent", description: "A imobiliária" },
      { name: "Corretor Destaque", type: "pessoa", schema: "Person", description: "Corretor principal" },
      { name: "Imóveis à Venda", type: "servico", schema: "Service", description: "Venda de imóveis" },
      { name: "Locação", type: "servico", schema: "Service", description: "Aluguel de imóveis" },
      { name: "", type: "local", schema: "PostalAddress", description: "Região de atuação" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Portal de imóveis" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Financiamento", type: "servico", schema: "Service", description: "Assessoria de financiamento" },
      { name: "Blog Imobiliário", type: "site", schema: "WebPage", description: "Blog de dicas" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 5, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 6, predicate: "é_dono_de" },
      { subjectIndex: 5, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 8, predicate: "oferece" },
      { subjectIndex: 6, objectIndex: 9, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  {
    id: "agencia", label: "Agência Digital", icon: Laptop, color: "hsl(250 85% 60%)",
    entities: [
      { name: "", type: "empresa", schema: "Organization", description: "A agência" },
      { name: "CEO / Fundador", type: "pessoa", schema: "Person", description: "Líder da agência" },
      { name: "SEO", type: "servico", schema: "Service", description: "Otimização para buscas" },
      { name: "Tráfego Pago", type: "servico", schema: "Service", description: "Gestão de anúncios" },
      { name: "Social Media", type: "servico", schema: "Service", description: "Gestão de redes sociais" },
      { name: "Web Design", type: "servico", schema: "Service", description: "Criação de sites" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da agência" },
      { name: "Portfólio", type: "site", schema: "WebPage", description: "Casos de sucesso" },
      { name: "Blog", type: "site", schema: "WebPage", description: "Blog de marketing" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 6, predicate: "é_dono_de" },
      { subjectIndex: 6, objectIndex: 7, predicate: "parte_de" },
      { subjectIndex: 6, objectIndex: 8, predicate: "parte_de" },
      { subjectIndex: 0, objectIndex: 9, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  {
    id: "educacao", label: "Escola / Educação", icon: GraduationCap, color: "hsl(42 95% 52%)",
    entities: [
      { name: "", type: "empresa", schema: "EducationalOrganization", description: "A instituição" },
      { name: "Diretor(a)", type: "pessoa", schema: "Person", description: "Diretor da escola" },
      { name: "Ensino Fundamental", type: "servico", schema: "Service", description: "Ensino básico" },
      { name: "Ensino Médio", type: "servico", schema: "Service", description: "Ensino médio" },
      { name: "Curso Extra", type: "servico", schema: "Service", description: "Atividades extras" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço da escola" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da escola" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Blog Educacional", type: "site", schema: "WebPage", description: "Blog de conteúdo educacional" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 7, predicate: "é_dono_de" },
      { subjectIndex: 6, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 7, objectIndex: 9, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 3, predicate: "oferece" },
    ],
  },
  {
    id: "automoveis", label: "Oficina / Auto", icon: Car, color: "hsl(0 78% 55%)",
    entities: [
      { name: "", type: "empresa", schema: "AutoRepair", description: "A oficina mecânica" },
      { name: "Mecânico Chefe", type: "pessoa", schema: "Person", description: "Profissional principal" },
      { name: "Manutenção Preventiva", type: "servico", schema: "Service", description: "Revisão periódica" },
      { name: "Reparos", type: "servico", schema: "Service", description: "Consertos gerais" },
      { name: "Peças", type: "produto", schema: "Product", description: "Peças automotivas" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço da oficina" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da oficina" },
      { name: "Guincho / Socorro", type: "servico", schema: "Service", description: "Serviço de reboque" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 6, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 8, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 9, predicate: "oferece" },
      { subjectIndex: 1, objectIndex: 3, predicate: "oferece" },
    ],
  },
  {
    id: "turismo", label: "Turismo / Viagens", icon: Plane, color: "hsl(215 92% 56%)",
    entities: [
      { name: "", type: "empresa", schema: "TravelAgency", description: "A agência de viagens" },
      { name: "Guia de Turismo", type: "pessoa", schema: "Person", description: "Guia principal" },
      { name: "Pacotes Nacionais", type: "servico", schema: "Service", description: "Viagens nacionais" },
      { name: "Pacotes Internacionais", type: "servico", schema: "Service", description: "Viagens internacionais" },
      { name: "Destino Popular", type: "local", schema: "Place", description: "Destino mais procurado" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Portal de viagens" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Blog de Viagens", type: "site", schema: "WebPage", description: "Blog de dicas de viagem" },
      { name: "Seguro Viagem", type: "servico", schema: "Service", description: "Seguro para viajantes" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 2, objectIndex: 4, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 5, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 6, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 5, objectIndex: 8, predicate: "parte_de" },
      { subjectIndex: 0, objectIndex: 9, predicate: "oferece" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  {
    id: "consultoria", label: "Consultoria", icon: Briefcase, color: "hsl(155 70% 42%)",
    entities: [
      { name: "", type: "empresa", schema: "ProfessionalService", description: "A consultoria" },
      { name: "Consultor(a) Sênior", type: "pessoa", schema: "Person", description: "Consultor principal" },
      { name: "Diagnóstico Empresarial", type: "servico", schema: "Service", description: "Análise de negócios" },
      { name: "Planejamento Estratégico", type: "servico", schema: "Service", description: "Planejamento" },
      { name: "Treinamento", type: "servico", schema: "Service", description: "Capacitação de equipes" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da consultoria" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Cases de Sucesso", type: "site", schema: "WebPage", description: "Portfolio de resultados" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Blog", type: "site", schema: "WebPage", description: "Blog de gestão" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 5, objectIndex: 7, predicate: "parte_de" },
      { subjectIndex: 0, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 5, objectIndex: 9, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 3, predicate: "oferece" },
    ],
  },
  {
    id: "estetica", label: "Estética / Beleza", icon: Palette, color: "hsl(260 90% 68%)",
    entities: [
      { name: "", type: "empresa", schema: "BeautySalon", description: "O salão / clínica estética" },
      { name: "Profissional Destaque", type: "pessoa", schema: "Person", description: "Profissional principal" },
      { name: "Corte e Coloração", type: "servico", schema: "Service", description: "Serviços de cabelo" },
      { name: "Tratamentos Faciais", type: "servico", schema: "Service", description: "Estética facial" },
      { name: "Manicure / Pedicure", type: "servico", schema: "Service", description: "Cuidados com unhas" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço do salão" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website do salão" },
      { name: "Produtos", type: "produto", schema: "Product", description: "Produtos utilizados/vendidos" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 6, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 8, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 9, predicate: "oferece" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  {
    id: "manutencao", label: "Manutenção / Reparos", icon: Wrench, color: "hsl(42 95% 52%)",
    entities: [
      { name: "", type: "empresa", schema: "HomeAndConstructionBusiness", description: "A empresa de manutenção" },
      { name: "Técnico Principal", type: "pessoa", schema: "Person", description: "Técnico responsável" },
      { name: "Elétrica", type: "servico", schema: "Service", description: "Serviços elétricos" },
      { name: "Hidráulica", type: "servico", schema: "Service", description: "Serviços hidráulicos" },
      { name: "Pintura", type: "servico", schema: "Service", description: "Serviços de pintura" },
      { name: "", type: "local", schema: "PostalAddress", description: "Região de atendimento" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da empresa" },
      { name: "Orçamento Online", type: "servico", schema: "Service", description: "Solicitar orçamento" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 6, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 8, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 9, predicate: "oferece" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (template: NicheTemplate, businessName: string, locationName: string) => void;
  generating: boolean;
}

export function NicheGraphWizard({ open, onOpenChange, onGenerate, generating }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedNiche, setSelectedNiche] = useState<NicheTemplate | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [locationName, setLocationName] = useState("");

  const handleSelect = (t: NicheTemplate) => {
    setSelectedNiche(t);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedNiche(null);
  };

  const handleGenerate = () => {
    if (!selectedNiche || !businessName.trim()) return;
    onGenerate(selectedNiche, businessName.trim(), locationName.trim());
  };

  // Reset on close
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setStep(1);
      setSelectedNiche(null);
      setBusinessName("");
      setLocationName("");
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {step === 1 ? "Wizard de Grafo — Escolha o Nicho" : `Configurar: ${selectedNiche?.label}`}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Selecione o nicho do seu negócio para gerar automaticamente um grafo semântico completo."
              : "Personalize com o nome do negócio e localização para gerar entidades e relações."
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
              {NICHE_TEMPLATES.map((t) => {
                const Icon = t.icon;
                return (
                  <Card
                    key={t.id}
                    className="p-4 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                    onClick={() => handleSelect(t)}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: t.color + "22", color: t.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">{t.label}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {t.entities.length} entidades
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {step === 2 && selectedNiche && (
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {(() => { const Icon = selectedNiche.icon; return <Icon className="h-5 w-5" style={{ color: selectedNiche.color }} />; })()}
              <div>
                <p className="text-sm font-semibold">{selectedNiche.label}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedNiche.entities.length} entidades · {selectedNiche.relations.length} relações
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="biz-name">Nome do Negócio *</Label>
              <Input
                id="biz-name"
                placeholder="Ex: Pizzaria do João"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="biz-location">Cidade / Bairro (opcional)</Label>
              <Input
                id="biz-location"
                placeholder="Ex: São Paulo - SP"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Entidades que serão criadas:</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedNiche.entities.map((e, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {e.name || (i === 0 ? "🏢 Negócio" : `📍 Endereço`)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={handleBack} disabled={generating}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Voltar
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleGenerate} disabled={!businessName.trim() || generating}>
              {generating ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1 animate-pulse" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Gerar Grafo Completo
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { NicheTemplate };
