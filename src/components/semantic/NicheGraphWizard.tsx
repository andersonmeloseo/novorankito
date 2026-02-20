import { useState } from "react";
import { cn } from "@/lib/utils";
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
  ArrowRight, ArrowLeft, Sparkles, Check, Heart, Hotel, Calculator,
  Camera, Dog, Scissors, Music, Baby, Church, Truck,
  Crown, Layers, MapPin, ShieldCheck, Store,
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

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

// ── Wizard questions ──
interface ScopeQuestion {
  key: string;
  label: string;
  description: string;
  default: boolean;
  /** Indices of entities to add/remove based on answer */
  entityIndices: number[];
}
interface DataQuestion {
  key: string;
  label: string;
  placeholder: string;
  /** Index of entity whose name/description gets filled */
  entityIndex: number;
  field: "name" | "description";
}
interface NicheQuestions {
  scope: ScopeQuestion[];
  data: DataQuestion[];
}

interface NicheTemplate {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  entities: NicheEntity[];
  relations: NicheRelation[];
  questions?: NicheQuestions;
}

// ── Questions per niche ──
const NICHE_QUESTIONS: Record<string, NicheQuestions> = {
  restaurante: {
    scope: [
      { key: "delivery", label: "Tem serviço de delivery?", description: "Adiciona node de Serviço de Delivery", default: true, entityIndices: [8] },
      { key: "eventos", label: "Tem área para eventos?", description: "Adiciona node de Área de Eventos", default: true, entityIndices: [9] },
      { key: "chef", label: "Quer destacar o Chef?", description: "Adiciona node do Chef Principal", default: true, entityIndices: [2] },
    ],
    data: [
      { key: "prato", label: "Qual o prato principal da casa?", placeholder: "Ex: Picanha na Brasa", entityIndex: 6, field: "name" },
      { key: "chef_name", label: "Nome do Chef (se aplicável)", placeholder: "Ex: Chef Roberto", entityIndex: 2, field: "name" },
    ],
  },
  clinica: {
    scope: [
      { key: "exames", label: "Oferece serviço de exames?", description: "Adiciona node de Exames", default: true, entityIndices: [7] },
      { key: "telemedicina", label: "Oferece telemedicina?", description: "Adiciona node de Telemedicina", default: true, entityIndices: [8] },
      { key: "blog", label: "Tem blog de saúde?", description: "Adiciona Blog de Saúde ao grafo", default: true, entityIndices: [9] },
    ],
    data: [
      { key: "medico", label: "Nome do médico principal", placeholder: "Ex: Dr. Silva", entityIndex: 1, field: "name" },
      { key: "especialidade", label: "Especialidade principal", placeholder: "Ex: Dermatologia", entityIndex: 2, field: "name" },
    ],
  },
  ecommerce: {
    scope: [
      { key: "frete", label: "Oferece frete próprio?", description: "Adiciona node de Frete e Entrega", default: true, entityIndices: [6] },
      { key: "sac", label: "Tem SAC / Suporte dedicado?", description: "Adiciona node de SAC", default: true, entityIndices: [7] },
      { key: "blog", label: "Tem blog da loja?", description: "Adiciona Blog da Loja", default: true, entityIndices: [8] },
      { key: "social", label: "Redes sociais ativas?", description: "Adiciona node de Redes Sociais", default: true, entityIndices: [9] },
    ],
    data: [
      { key: "produto", label: "Nome do produto carro-chefe", placeholder: "Ex: Tênis Runner Pro", entityIndex: 1, field: "name" },
      { key: "cat_a", label: "Nome da categoria principal", placeholder: "Ex: Calçados Esportivos", entityIndex: 2, field: "name" },
      { key: "cat_b", label: "Nome da segunda categoria", placeholder: "Ex: Acessórios", entityIndex: 3, field: "name" },
    ],
  },
  advocacia: {
    scope: [
      { key: "trabalhista", label: "Atua em Direito Trabalhista?", description: "Inclui Direito Trabalhista", default: true, entityIndices: [3] },
      { key: "civil", label: "Atua em Direito Civil?", description: "Inclui Direito Civil", default: true, entityIndices: [4] },
      { key: "blog", label: "Tem blog jurídico?", description: "Inclui Blog Jurídico", default: true, entityIndices: [9] },
    ],
    data: [
      { key: "advogado", label: "Nome do advogado sócio", placeholder: "Ex: Dra. Maria Santos, OAB/SP 12345", entityIndex: 1, field: "name" },
    ],
  },
  academia: {
    scope: [
      { key: "nutricao", label: "Oferece acompanhamento nutricional?", description: "Adiciona node de Nutrição", default: true, entityIndices: [9] },
      { key: "aulas", label: "Tem aulas em grupo?", description: "Adiciona node de Aulas em Grupo", default: true, entityIndices: [3] },
    ],
    data: [
      { key: "personal", label: "Nome do Personal Trainer destaque", placeholder: "Ex: Prof. Lucas", entityIndex: 1, field: "name" },
      { key: "plano", label: "Nome do plano principal", placeholder: "Ex: Plano Gold", entityIndex: 7, field: "name" },
    ],
  },
  imobiliaria: {
    scope: [
      { key: "locacao", label: "Trabalha com locação?", description: "Adiciona node de Locação", default: true, entityIndices: [3] },
      { key: "financiamento", label: "Oferece assessoria de financiamento?", description: "Adiciona node de Financiamento", default: true, entityIndices: [8] },
      { key: "blog", label: "Tem blog imobiliário?", description: "Adiciona Blog Imobiliário", default: true, entityIndices: [9] },
    ],
    data: [
      { key: "corretor", label: "Nome do corretor destaque", placeholder: "Ex: Carlos Mendes, CRECI 54321", entityIndex: 1, field: "name" },
    ],
  },
  agencia: {
    scope: [
      { key: "social", label: "Oferece Social Media?", description: "Inclui Social Media", default: true, entityIndices: [4] },
      { key: "webdesign", label: "Oferece Web Design?", description: "Inclui Web Design", default: true, entityIndices: [5] },
      { key: "portfolio", label: "Tem portfólio de cases?", description: "Adiciona Portfólio", default: true, entityIndices: [7] },
    ],
    data: [
      { key: "ceo", label: "Nome do CEO / Fundador", placeholder: "Ex: Ana Paula", entityIndex: 1, field: "name" },
    ],
  },
  educacao: {
    scope: [
      { key: "medio", label: "Tem Ensino Médio?", description: "Inclui Ensino Médio", default: true, entityIndices: [3] },
      { key: "extra", label: "Tem cursos extracurriculares?", description: "Inclui Cursos Extra", default: true, entityIndices: [4] },
      { key: "blog", label: "Tem blog educacional?", description: "Inclui Blog Educacional", default: true, entityIndices: [9] },
    ],
    data: [
      { key: "diretor", label: "Nome do(a) Diretor(a)", placeholder: "Ex: Profa. Cristina", entityIndex: 1, field: "name" },
    ],
  },
  automoveis: {
    scope: [
      { key: "pecas", label: "Vende peças automotivas?", description: "Inclui node de Peças", default: true, entityIndices: [4] },
      { key: "guincho", label: "Oferece guincho / socorro?", description: "Inclui Guincho / Socorro", default: true, entityIndices: [9] },
    ],
    data: [
      { key: "mecanico", label: "Nome do mecânico chefe", placeholder: "Ex: João Ferreira", entityIndex: 1, field: "name" },
    ],
  },
  turismo: {
    scope: [],
    data: [
      { key: "guia", label: "Nome do guia de turismo", placeholder: "Ex: Ricardo", entityIndex: 1, field: "name" },
    ],
  },
};

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
    id: "odontologia", label: "Odontologia", icon: Stethoscope, color: "hsl(165 65% 45%)",
    entities: [
      { name: "", type: "empresa", schema: "Dentist", description: "A clínica odontológica" },
      { name: "Dentista Responsável", type: "pessoa", schema: "Person", description: "Dentista principal com CRO" },
      { name: "Implante Dentário", type: "servico", schema: "MedicalProcedure", description: "Procedimento de implante" },
      { name: "Ortodontia", type: "servico", schema: "MedicalProcedure", description: "Aparelhos e alinhadores" },
      { name: "Clareamento", type: "servico", schema: "MedicalProcedure", description: "Clareamento dental" },
      { name: "Limpeza / Profilaxia", type: "servico", schema: "MedicalProcedure", description: "Limpeza periódica" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço da clínica" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações Google", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da clínica" },
      { name: "Raio-X Digital", type: "equipamento", schema: "MedicalDevice", description: "Equipamento de diagnóstico" },
      { name: "Blog Odontológico", type: "site", schema: "WebPage", description: "Conteúdo sobre saúde bucal" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 6, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 7, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 9, predicate: "é_dono_de" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 10, predicate: "possui" },
      { subjectIndex: 9, objectIndex: 11, predicate: "parte_de" },
    ],
  },
  {
    id: "petshop", label: "Pet Shop / Vet", icon: Dog, color: "hsl(280 70% 60%)",
    entities: [
      { name: "", type: "empresa", schema: "VeterinaryCare", description: "O pet shop / clínica veterinária" },
      { name: "Veterinário(a)", type: "pessoa", schema: "Person", description: "Veterinário responsável" },
      { name: "Consulta Veterinária", type: "servico", schema: "Service", description: "Atendimento clínico" },
      { name: "Banho e Tosa", type: "servico", schema: "Service", description: "Higiene e estética pet" },
      { name: "Vacinação", type: "servico", schema: "Service", description: "Imunização de pets" },
      { name: "Hospedagem Pet", type: "servico", schema: "Service", description: "Hotel para animais" },
      { name: "Rações e Produtos", type: "produto", schema: "Product", description: "Alimentação e acessórios" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço do pet shop" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website do pet shop" },
      { name: "Emergência 24h", type: "servico", schema: "Service", description: "Plantão veterinário" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 6, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 7, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 8, objectIndex: 9, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 10, predicate: "é_dono_de" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 11, predicate: "oferece" },
    ],
  },
  {
    id: "hotel", label: "Hotel / Pousada", icon: Hotel, color: "hsl(200 80% 50%)",
    entities: [
      { name: "", type: "empresa", schema: "LodgingBusiness", description: "O hotel ou pousada" },
      { name: "Quarto Standard", type: "produto", schema: "HotelRoom", description: "Acomodação básica" },
      { name: "Suíte Luxo", type: "produto", schema: "HotelRoom", description: "Acomodação premium" },
      { name: "Restaurante do Hotel", type: "servico", schema: "FoodService", description: "Café da manhã e refeições" },
      { name: "Piscina / Spa", type: "servico", schema: "Service", description: "Área de lazer" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço e localização" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews (Google, Booking, TripAdvisor)" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website do hotel" },
      { name: "Reservas Online", type: "servico", schema: "Service", description: "Sistema de reservas" },
      { name: "Atrações Próximas", type: "local", schema: "Place", description: "Pontos turísticos na região" },
      { name: "Wi-Fi / Estacionamento", type: "servico", schema: "Service", description: "Comodidades incluídas" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 6, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 8, predicate: "é_dono_de" },
      { subjectIndex: 8, objectIndex: 9, predicate: "parte_de" },
      { subjectIndex: 5, objectIndex: 10, predicate: "proximo_a" },
      { subjectIndex: 0, objectIndex: 11, predicate: "oferece" },
      { subjectIndex: 1, objectIndex: 9, predicate: "relacionado_a" },
    ],
  },
  {
    id: "contabilidade", label: "Contabilidade", icon: Calculator, color: "hsl(170 60% 42%)",
    entities: [
      { name: "", type: "empresa", schema: "AccountingService", description: "O escritório contábil" },
      { name: "Contador(a) Responsável", type: "pessoa", schema: "Person", description: "Contador com CRC" },
      { name: "Abertura de Empresa", type: "servico", schema: "Service", description: "Constituição empresarial" },
      { name: "Imposto de Renda", type: "servico", schema: "Service", description: "IRPF e IRPJ" },
      { name: "Folha de Pagamento", type: "servico", schema: "Service", description: "Gestão de folha" },
      { name: "BPO Financeiro", type: "servico", schema: "Service", description: "Terceirização financeira" },
      { name: "Consultoria Fiscal", type: "servico", schema: "Service", description: "Planejamento tributário" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço do escritório" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website do escritório" },
      { name: "Blog Fiscal", type: "site", schema: "WebPage", description: "Artigos sobre legislação" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 6, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 7, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 8, objectIndex: 9, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 10, predicate: "é_dono_de" },
      { subjectIndex: 10, objectIndex: 11, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 3, predicate: "oferece" },
    ],
  },
  {
    id: "saas", label: "SaaS / Tecnologia", icon: Laptop, color: "hsl(245 80% 62%)",
    entities: [
      { name: "", type: "empresa", schema: "Organization", description: "A empresa de software" },
      { name: "CEO / Fundador", type: "pessoa", schema: "Person", description: "Fundador da empresa" },
      { name: "Plataforma Principal", type: "produto", schema: "SoftwareApplication", description: "O produto SaaS" },
      { name: "Plano Free", type: "produto", schema: "Product", description: "Versão gratuita" },
      { name: "Plano Pro", type: "produto", schema: "Product", description: "Versão premium" },
      { name: "API / Integrações", type: "servico", schema: "Service", description: "Conectores e APIs" },
      { name: "Suporte Técnico", type: "servico", schema: "Service", description: "Atendimento ao cliente" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website do produto" },
      { name: "Documentação", type: "site", schema: "WebPage", description: "Docs e tutoriais" },
      { name: "Blog Técnico", type: "site", schema: "WebPage", description: "Blog de conteúdo" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews (G2, Capterra)" },
      { name: "Cases de Sucesso", type: "site", schema: "WebPage", description: "Estudos de caso" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "fundado_por" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 2, objectIndex: 3, predicate: "possui" },
      { subjectIndex: 2, objectIndex: 4, predicate: "possui" },
      { subjectIndex: 2, objectIndex: 5, predicate: "integra_com" },
      { subjectIndex: 0, objectIndex: 6, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 7, predicate: "é_dono_de" },
      { subjectIndex: 7, objectIndex: 8, predicate: "parte_de" },
      { subjectIndex: 7, objectIndex: 9, predicate: "parte_de" },
      { subjectIndex: 2, objectIndex: 10, predicate: "relacionado_a" },
      { subjectIndex: 7, objectIndex: 11, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 2, predicate: "criou" },
    ],
  },
  {
    id: "fotografo", label: "Fotógrafo / Vídeo", icon: Camera, color: "hsl(340 75% 55%)",
    entities: [
      { name: "", type: "empresa", schema: "ProfessionalService", description: "O estúdio / fotógrafo" },
      { name: "Fotógrafo Principal", type: "pessoa", schema: "Person", description: "Profissional responsável" },
      { name: "Ensaio Fotográfico", type: "servico", schema: "Service", description: "Sessões de fotos" },
      { name: "Cobertura de Eventos", type: "servico", schema: "Service", description: "Fotos e vídeo de eventos" },
      { name: "Fotos Corporativas", type: "servico", schema: "Service", description: "Fotos para empresas" },
      { name: "Edição de Vídeo", type: "servico", schema: "Service", description: "Produção audiovisual" },
      { name: "Portfólio", type: "site", schema: "WebPage", description: "Galeria de trabalhos" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website do fotógrafo" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Instagram", type: "site", schema: "WebPage", description: "Perfil social principal" },
      { name: "Equipamentos", type: "equipamento", schema: "Product", description: "Câmeras e lentes profissionais" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 7, objectIndex: 6, predicate: "parte_de" },
      { subjectIndex: 0, objectIndex: 7, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 8, objectIndex: 9, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 10, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 11, predicate: "possui" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  {
    id: "farmacia", label: "Farmácia / Drogaria", icon: Heart, color: "hsl(350 70% 50%)",
    entities: [
      { name: "", type: "empresa", schema: "Pharmacy", description: "A farmácia" },
      { name: "Farmacêutico(a)", type: "pessoa", schema: "Person", description: "Farmacêutico responsável" },
      { name: "Medicamentos", type: "produto", schema: "Product", description: "Remédios e genéricos" },
      { name: "Dermocosméticos", type: "produto", schema: "Product", description: "Produtos de beleza" },
      { name: "Manipulação", type: "servico", schema: "Service", description: "Fórmulas manipuladas" },
      { name: "Aferição de Pressão", type: "servico", schema: "Service", description: "Serviços farmacêuticos" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço da farmácia" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site / App", type: "site", schema: "WebSite", description: "Loja online e app" },
      { name: "Delivery", type: "servico", schema: "Service", description: "Entrega em domicílio" },
      { name: "Convênios", type: "servico", schema: "Service", description: "Planos e convênios aceitos" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 6, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 7, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 9, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 10, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 11, predicate: "aceita" },
      { subjectIndex: 1, objectIndex: 4, predicate: "oferece" },
    ],
  },
  {
    id: "construcao", label: "Construção / Reforma", icon: Wrench, color: "hsl(30 80% 50%)",
    entities: [
      { name: "", type: "empresa", schema: "HomeAndConstructionBusiness", description: "A construtora / empreiteira" },
      { name: "Engenheiro(a)", type: "pessoa", schema: "Person", description: "Responsável técnico com CREA" },
      { name: "Construção Civil", type: "servico", schema: "Service", description: "Obras residenciais e comerciais" },
      { name: "Reforma e Ampliação", type: "servico", schema: "Service", description: "Reformas em geral" },
      { name: "Projeto Arquitetônico", type: "servico", schema: "Service", description: "Projetos e plantas" },
      { name: "Acabamento", type: "servico", schema: "Service", description: "Pisos, revestimentos, pintura" },
      { name: "", type: "local", schema: "PostalAddress", description: "Região de atuação" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website com portfólio" },
      { name: "Portfólio de Obras", type: "site", schema: "WebPage", description: "Galeria de projetos realizados" },
      { name: "Orçamento Online", type: "servico", schema: "Service", description: "Solicitar orçamento" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 6, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 7, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 9, predicate: "é_dono_de" },
      { subjectIndex: 9, objectIndex: 10, predicate: "parte_de" },
      { subjectIndex: 9, objectIndex: 11, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 4, predicate: "oferece" },
    ],
  },
  {
    id: "musica", label: "Escola de Música", icon: Music, color: "hsl(290 65% 55%)",
    entities: [
      { name: "", type: "empresa", schema: "EducationalOrganization", description: "A escola de música" },
      { name: "Professor(a) Principal", type: "pessoa", schema: "Person", description: "Instrutor destaque" },
      { name: "Aulas de Violão", type: "servico", schema: "Course", description: "Curso de violão/guitarra" },
      { name: "Aulas de Piano", type: "servico", schema: "Course", description: "Curso de piano/teclado" },
      { name: "Aulas de Canto", type: "servico", schema: "Course", description: "Técnica vocal" },
      { name: "Aulas de Bateria", type: "servico", schema: "Course", description: "Curso de bateria/percussão" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço da escola" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da escola" },
      { name: "Canal YouTube", type: "site", schema: "WebPage", description: "Vídeos de aulas e apresentações" },
      { name: "Eventos / Recitais", type: "servico", schema: "Event", description: "Apresentações dos alunos" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 6, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 7, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 9, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 10, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 11, predicate: "oferece" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  {
    id: "transportadora", label: "Transportadora / Frete", icon: Truck, color: "hsl(20 75% 48%)",
    entities: [
      { name: "", type: "empresa", schema: "Organization", description: "A transportadora" },
      { name: "Diretor de Logística", type: "pessoa", schema: "Person", description: "Responsável operacional" },
      { name: "Frete Rodoviário", type: "servico", schema: "Service", description: "Transporte terrestre" },
      { name: "Frete Expresso", type: "servico", schema: "Service", description: "Entrega rápida" },
      { name: "Carga Fracionada", type: "servico", schema: "Service", description: "Cargas menores" },
      { name: "Mudanças", type: "servico", schema: "Service", description: "Serviço de mudanças" },
      { name: "Rastreamento", type: "servico", schema: "Service", description: "Rastreio em tempo real" },
      { name: "", type: "local", schema: "PostalAddress", description: "Base operacional" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website da transportadora" },
      { name: "Cotação Online", type: "servico", schema: "Service", description: "Solicitar cotação de frete" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 4, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 5, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 6, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 7, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 8, objectIndex: 9, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 10, predicate: "é_dono_de" },
      { subjectIndex: 10, objectIndex: 11, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 2, predicate: "oferece" },
    ],
  },
  // ── SEO OBJECTIVES ──
  {
    id: "knowledge_panel", label: "Knowledge Panel", icon: Crown, color: "hsl(45 95% 50%)",
    entities: [
      { name: "", type: "empresa", schema: "Organization", description: "A marca/empresa principal" },
      { name: "Fundador / CEO", type: "pessoa", schema: "Person", description: "Fundador com sameAs e credenciais" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website principal da marca" },
      { name: "Perfil Wikipedia", type: "site", schema: "WebPage", description: "Página na Wikipedia ou Wikidata" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "Perfil no Google" },
      { name: "Logo Oficial", type: "produto", schema: "ImageObject", description: "Logo da marca para Knowledge Panel" },
      { name: "Redes Sociais", type: "site", schema: "WebPage", description: "Perfis oficiais (LinkedIn, Instagram, etc)" },
      { name: "Setor de Atuação", type: "servico", schema: "Service", description: "Área/indústria principal" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews agregados" },
      { name: "", type: "local", schema: "PostalAddress", description: "Sede da empresa" },
      { name: "Prêmios / Certificações", type: "especialidade", schema: "CreativeWork", description: "Reconhecimentos oficiais" },
      { name: "Artigos / Menções", type: "conteudo", schema: "Article", description: "Publicações que mencionam a marca" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 2, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 3, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 4, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 5, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 6, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 7, predicate: "oferece" },
      { subjectIndex: 4, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 9, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 10, predicate: "relacionado_a" },
      { subjectIndex: 11, objectIndex: 0, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 6, predicate: "relacionado_a" },
    ],
  },
  {
    id: "entity_pack", label: "Entity Pack Google", icon: Layers, color: "hsl(220 85% 55%)",
    entities: [
      { name: "", type: "empresa", schema: "Organization", description: "A entidade principal" },
      { name: "Produto Principal", type: "produto", schema: "Product", description: "Produto ou serviço carro-chefe" },
      { name: "Produto Secundário", type: "produto", schema: "Product", description: "Segundo produto/serviço" },
      { name: "Categoria do Setor", type: "servico", schema: "Service", description: "Categoria que aparece no carrossel" },
      { name: "FAQ Estruturado", type: "conteudo", schema: "FAQPage", description: "Perguntas frequentes em Schema" },
      { name: "Avaliações", type: "avaliacao", schema: "AggregateRating", description: "Reviews para Rich Snippets" },
      { name: "Ofertas", type: "produto", schema: "Offer", description: "Promoções e preços" },
      { name: "Imagens de Produto", type: "produto", schema: "ImageObject", description: "Fotos otimizadas" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website com SearchAction" },
      { name: "Breadcrumb", type: "conteudo", schema: "BreadcrumbList", description: "Navegação estruturada" },
      { name: "HowTo Guide", type: "conteudo", schema: "HowTo", description: "Guias passo-a-passo" },
      { name: "Vídeos", type: "conteudo", schema: "VideoObject", description: "Vídeos com Schema" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 2, predicate: "oferece" },
      { subjectIndex: 0, objectIndex: 3, predicate: "parte_de" },
      { subjectIndex: 8, objectIndex: 4, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 5, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 7, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 8, predicate: "é_dono_de" },
      { subjectIndex: 8, objectIndex: 9, predicate: "parte_de" },
      { subjectIndex: 8, objectIndex: 10, predicate: "parte_de" },
      { subjectIndex: 8, objectIndex: 11, predicate: "parte_de" },
      { subjectIndex: 2, objectIndex: 6, predicate: "relacionado_a" },
    ],
  },
  {
    id: "local_seo", label: "SEO Local Completo", icon: MapPin, color: "hsl(140 70% 45%)",
    entities: [
      { name: "", type: "empresa", schema: "LocalBusiness", description: "O negócio local" },
      { name: "", type: "local", schema: "PostalAddress", description: "Endereço completo com geo" },
      { name: "Google Business Profile", type: "gbp", schema: "LocalBusiness", description: "GBP otimizado" },
      { name: "Avaliações Google", type: "avaliacao", schema: "AggregateRating", description: "Reviews no Google Maps" },
      { name: "Área de Atendimento", type: "local", schema: "GeoCircle", description: "Raio de cobertura" },
      { name: "Horários de Funcionamento", type: "horario", schema: "OpeningHoursSpecification", description: "Dias e horários" },
      { name: "Fotos do Estabelecimento", type: "produto", schema: "ImageObject", description: "Fotos do local para GBP" },
      { name: "Serviço Principal", type: "servico", schema: "Service", description: "Serviço principal oferecido" },
      { name: "Categorias GBP", type: "servico", schema: "Service", description: "Categorias do Google Business" },
      { name: "Site Oficial", type: "site", schema: "WebSite", description: "Website com NAP consistente" },
      { name: "Citações Locais", type: "site", schema: "WebPage", description: "Diretórios e citações (Yelp, TripAdvisor)" },
      { name: "Posts GBP", type: "conteudo", schema: "Article", description: "Google Posts semanais" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "localizado_em" },
      { subjectIndex: 0, objectIndex: 2, predicate: "relacionado_a" },
      { subjectIndex: 2, objectIndex: 3, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 4, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 5, predicate: "relacionado_a" },
      { subjectIndex: 2, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 7, predicate: "oferece" },
      { subjectIndex: 2, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 9, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 10, predicate: "relacionado_a" },
      { subjectIndex: 2, objectIndex: 11, predicate: "relacionado_a" },
      { subjectIndex: 9, objectIndex: 1, predicate: "relacionado_a" },
    ],
  },
  {
    id: "content_authority", label: "E-E-A-T / Autoridade", icon: ShieldCheck, color: "hsl(270 75% 58%)",
    entities: [
      { name: "", type: "empresa", schema: "Organization", description: "A marca/empresa" },
      { name: "Autor Principal", type: "pessoa", schema: "Person", description: "Autor com credenciais e sameAs" },
      { name: "Segundo Autor", type: "pessoa", schema: "Person", description: "Co-autor ou especialista" },
      { name: "Blog / Hub de Conteúdo", type: "site", schema: "WebPage", description: "Central de conteúdo" },
      { name: "Artigo Pilar", type: "conteudo", schema: "Article", description: "Conteúdo pilar com author markup" },
      { name: "Artigo Cluster", type: "conteudo", schema: "Article", description: "Conteúdo de suporte" },
      { name: "Credenciais / Certificações", type: "especialidade", schema: "EducationalOccupationalCredential", description: "Diplomas, certificações" },
      { name: "Publicações Externas", type: "conteudo", schema: "Article", description: "Guest posts e menções" },
      { name: "Depoimentos", type: "avaliacao", schema: "Review", description: "Reviews e testimonials" },
      { name: "Perfil LinkedIn", type: "site", schema: "WebPage", description: "Perfil profissional do autor" },
      { name: "Página Sobre", type: "conteudo", schema: "AboutPage", description: "Página sobre com credenciais" },
      { name: "FAQ Especializado", type: "conteudo", schema: "FAQPage", description: "FAQ com expertise demonstrada" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "é_dono_de" },
      { subjectIndex: 0, objectIndex: 3, predicate: "é_dono_de" },
      { subjectIndex: 1, objectIndex: 4, predicate: "criou" },
      { subjectIndex: 1, objectIndex: 5, predicate: "criou" },
      { subjectIndex: 1, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 7, predicate: "criou" },
      { subjectIndex: 0, objectIndex: 8, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 9, predicate: "relacionado_a" },
      { subjectIndex: 0, objectIndex: 10, predicate: "é_dono_de" },
      { subjectIndex: 3, objectIndex: 11, predicate: "parte_de" },
      { subjectIndex: 2, objectIndex: 5, predicate: "criou" },
      { subjectIndex: 4, objectIndex: 5, predicate: "relacionado_a" },
    ],
  },
  {
    id: "ecommerce_seo", label: "SEO para E-commerce", icon: Store, color: "hsl(330 70% 55%)",
    entities: [
      { name: "", type: "empresa", schema: "Organization", description: "A loja online" },
      { name: "Produto Carro-Chefe", type: "produto", schema: "Product", description: "Produto principal com Schema" },
      { name: "Categoria Principal", type: "servico", schema: "CollectionPage", description: "Categoria de produtos" },
      { name: "Oferta / Promoção", type: "produto", schema: "Offer", description: "Preço e disponibilidade" },
      { name: "Avaliações de Produto", type: "avaliacao", schema: "AggregateRating", description: "Reviews dos produtos" },
      { name: "Marca / Fabricante", type: "empresa", schema: "Brand", description: "Marca do produto" },
      { name: "FAQ de Produto", type: "conteudo", schema: "FAQPage", description: "Perguntas sobre o produto" },
      { name: "Breadcrumb", type: "conteudo", schema: "BreadcrumbList", description: "Navegação estruturada da loja" },
      { name: "Site da Loja", type: "site", schema: "WebSite", description: "Website com SearchAction" },
      { name: "Política de Troca", type: "conteudo", schema: "WebPage", description: "Página de devoluções" },
      { name: "Frete / Entrega", type: "servico", schema: "OfferShippingDetails", description: "Informações de entrega" },
      { name: "Imagens de Produto", type: "produto", schema: "ImageObject", description: "Fotos otimizadas com alt" },
    ],
    relations: [
      { subjectIndex: 0, objectIndex: 1, predicate: "oferece" },
      { subjectIndex: 1, objectIndex: 2, predicate: "parte_de" },
      { subjectIndex: 1, objectIndex: 3, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 4, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 5, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 6, predicate: "relacionado_a" },
      { subjectIndex: 8, objectIndex: 7, predicate: "parte_de" },
      { subjectIndex: 0, objectIndex: 8, predicate: "é_dono_de" },
      { subjectIndex: 8, objectIndex: 9, predicate: "parte_de" },
      { subjectIndex: 3, objectIndex: 10, predicate: "relacionado_a" },
      { subjectIndex: 1, objectIndex: 11, predicate: "relacionado_a" },
      { subjectIndex: 2, objectIndex: 1, predicate: "relacionado_a" },
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedNiche, setSelectedNiche] = useState<NicheTemplate | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [scopeAnswers, setScopeAnswers] = useState<Record<string, boolean>>({});
  const [dataAnswers, setDataAnswers] = useState<Record<string, string>>({});

  const questions = selectedNiche ? NICHE_QUESTIONS[selectedNiche.id] : null;
  const hasQuestions = questions && (questions.scope.length > 0 || questions.data.length > 0);

  const handleSelect = (t: NicheTemplate) => {
    setSelectedNiche(t);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else {
      setStep(1);
      setSelectedNiche(null);
    }
  };

  const handleNextToQuestions = () => {
    if (!businessName.trim()) return;
    if (hasQuestions) {
      // Initialize scope defaults
      const defaults: Record<string, boolean> = {};
      questions!.scope.forEach((q) => { defaults[q.key] = q.default; });
      setScopeAnswers(defaults);
      setDataAnswers({});
      setStep(3);
    } else {
      handleGenerate();
    }
  };

  const handleGenerate = () => {
    if (!selectedNiche || !businessName.trim()) return;

    // Clone template and apply scope/data answers
    const cloned: NicheTemplate = JSON.parse(JSON.stringify(selectedNiche));

    // Apply data answers — fill entity names
    if (questions) {
      questions.data.forEach((dq) => {
        const val = dataAnswers[dq.key]?.trim();
        if (val && cloned.entities[dq.entityIndex]) {
          cloned.entities[dq.entityIndex][dq.field] = val;
        }
      });

      // Collect indices to remove (scope answers that are false)
      const indicesToRemove = new Set<number>();
      questions.scope.forEach((sq) => {
        if (scopeAnswers[sq.key] === false) {
          sq.entityIndices.forEach((i) => indicesToRemove.add(i));
        }
      });

      if (indicesToRemove.size > 0) {
        // Build index mapping (old → new)
        const oldToNew = new Map<number, number>();
        let newIdx = 0;
        for (let i = 0; i < cloned.entities.length; i++) {
          if (!indicesToRemove.has(i)) {
            oldToNew.set(i, newIdx++);
          }
        }

        // Filter entities
        cloned.entities = cloned.entities.filter((_, i) => !indicesToRemove.has(i));

        // Remap relations
        cloned.relations = cloned.relations
          .filter((r) => !indicesToRemove.has(r.subjectIndex) && !indicesToRemove.has(r.objectIndex))
          .map((r) => ({
            ...r,
            subjectIndex: oldToNew.get(r.subjectIndex)!,
            objectIndex: oldToNew.get(r.objectIndex)!,
          }));
      }
    }

    onGenerate(cloned, businessName.trim(), locationName.trim());
  };

  // Reset on close
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setStep(1);
      setSelectedNiche(null);
      setBusinessName("");
      setLocationName("");
      setScopeAnswers({});
      setDataAnswers({});
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {step === 1
              ? "Wizard de Grafo — Escolha o Nicho"
              : step === 2
                ? `Configurar: ${selectedNiche?.label}`
                : `Personalizar: ${selectedNiche?.label}`
            }
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Selecione o nicho do seu negócio para gerar automaticamente um grafo semântico completo."
              : step === 2
                ? "Personalize com o nome do negócio e localização para gerar entidades e relações."
                : "Responda as perguntas abaixo para customizar seu grafo com mais precisão."
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {step > s ? <Check className="h-3 w-3" /> : s}
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {s === 1 ? "Nicho" : s === 2 ? "Dados" : "Customizar"}
              </span>
              {s < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6" style={{ maxHeight: "calc(85vh - 200px)" }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 py-2 pr-2">
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
          </div>
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

        {step === 3 && selectedNiche && questions && (
          <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: "calc(85vh - 260px)" }}>
            <div className="space-y-5 py-2 pr-2">
              {/* Scope questions */}
              {questions.scope.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Escopo do Grafo
                  </Label>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Ative ou desative nodes opcionais do seu grafo
                  </p>
                  <div className="space-y-2">
                    {questions.scope.map((sq) => (
                      <div
                        key={sq.key}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{sq.label}</p>
                          <p className="text-[10px] text-muted-foreground">{sq.description}</p>
                        </div>
                        <Switch
                          checked={scopeAnswers[sq.key] ?? sq.default}
                          onCheckedChange={(v) =>
                            setScopeAnswers((prev) => ({ ...prev, [sq.key]: v }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data questions */}
              {questions.data.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Dados do Negócio
                  </Label>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Preencha para que os nodes já venham com informações reais
                  </p>
                  <div className="space-y-3">
                    {questions.data.map((dq) => (
                      <div key={dq.key} className="space-y-1.5">
                        <Label htmlFor={`dq-${dq.key}`} className="text-xs">{dq.label}</Label>
                        <Input
                          id={`dq-${dq.key}`}
                          placeholder={dq.placeholder}
                          value={dataAnswers[dq.key] || ""}
                          onChange={(e) =>
                            setDataAnswers((prev) => ({ ...prev, [dq.key]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={generating}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Voltar
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleNextToQuestions} disabled={!businessName.trim()}>
              {hasQuestions ? (
                <>
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  Personalizar
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Gerar Grafo Completo
                </>
              )}
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleGenerate} disabled={generating}>
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
