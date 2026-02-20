import { useLocation } from "react-router-dom";

export interface Crumb {
  label: string;
  href?: string;
}

// Map every route segment / full path → human-readable label
const ROUTE_LABELS: Record<string, string> = {
  // Top-level
  "overview": "Visão Geral",
  "projects": "Projetos",
  "getting-started": "Guia de Início",
  "urls": "URLs",
  "seo": "SEO",
  "ga4": "Analytics GA4",
  "indexing": "Indexação",
  "rankito-ai": "Rankito IA",
  "ads": "Ads",
  "reports": "Relatórios",
  "project-settings": "Configurações",
  "semantic-graph": "SEO Semântico",

  // Account
  "account": "Conta",
  "profile": "Meu Perfil",
  "users": "Usuários & Permissões",
  "billing": "Billing & Planos",

  // Analítica Rankito
  "analitica-rankito": "Analítica Rankito",
  "eventos": "Eventos",
  "sessoes": "Sessões",
  "heatmaps": "Heatmaps",
  "ecommerce": "E-commerce",
  "jornada": "Jornada do Usuário",
  "ads-utm": "Ads & UTM",
  "offline": "Conversões Offline",
  "event-builder": "Event Builder",
  "metas": "Metas",
  "pixel": "Instalar Pixel",

  // Rank & Rent
  "rank-rent": "Rank & Rent",
  "clients": "Clientes",
  "contracts": "Contratos",
  "pages": "Páginas",
  "financial": "Financeiro",
  "availability": "Disponibilidade",
  "performance": "Performance",
  "project": "Projeto",

  // Admin
  "admin": "Super Admin",
  "usage": "Uso",
  "integrations": "Integrações",
  "apis": "APIs",
  "security": "Segurança",
  "logs": "Logs",
  "health": "Saúde do Sistema",
  "settings": "Configurações",
  "notifications": "Notificações",
  "flags": "Feature Flags",
  "announcements": "Comunicados",
  "plans": "Planos",
  "dashboard": "Dashboard",
  "academy": "Academy",
};

// Hash segment labels (e.g. /seo#queries → "Consultas")
const HASH_LABELS: Record<string, string> = {
  queries: "Consultas",
  pages: "Páginas",
  countries: "Países",
  devices: "Dispositivos",
  appearance: "Aparência",
  opportunities: "Oportunidades",
  decay: "Declínio",
  cannibalization: "Canibalização",
  inspection: "Inspeção",
  coverage: "Cobertura",
  sitemaps: "Sitemaps",
  links: "Links",
  discover: "Discover & News",
  history: "Histórico",
  grouping: "Agrupamento",
  "ai-insights": "IA Insights",

  // GA4
  overview: "Visão Geral",
  realtime: "Tempo Real",
  acquisition: "Aquisição",
  "ai-traffic": "Tráfego de IA",
  engagement: "Performance",
  demographics: "Público",
  technology: "Tecnologia",
  retention: "Retenção",
  ecommerce: "E-commerce",

  // Indexing
  dashboard: "Dashboard",
  inventory: "URLs",
  sitemap: "Sitemap",
  schedule: "Agendar",
  accounts: "Contas",

  // Rankito AI
  chat: "Chat",
  agents: "Agentes",
  workflows: "Workflows",
  canvas: "Canvas",
  orchestrator: "Orquestrador",
  schedules: "Agendamentos",

  // Settings
  general: "Geral",
  integrations: "Integrações",
  tracking: "Tracking",
  goals: "Metas & Alertas",
  team: "Equipe",
  api: "API & Webhooks",
  whitelabel: "White-Label",

  // Semantic
  builder: "Construtor de Grafo",
  triples: "Triplas",
  schema: "Schema.org",
  competitors: "Competidores",
  recommendations: "Recomendações",
  feedback: "Feedback",

  // Account
  profile: "Perfil",
  security: "Segurança",
  notifications: "Notificações",
  billing: "Billing",
  sessions: "Sessões",
};

function labelFor(segment: string): string {
  return ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function useBreadcrumbs(): Crumb[] {
  const { pathname, hash } = useLocation();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  // Build cumulative path crumbs
  let accumulated = "";
  segments.forEach((seg, i) => {
    accumulated += `/${seg}`;
    const isLast = i === segments.length - 1 && !hash;

    // Skip UUID-like segments as labels (use "Projeto" instead)
    const label = seg.match(/^[0-9a-f-]{36}$/) ? "Projeto" : labelFor(seg);

    crumbs.push({
      label,
      href: isLast ? undefined : accumulated,
    });
  });

  // Add hash crumb if present
  if (hash) {
    const hashKey = hash.replace("#", "");
    const hashLabel = HASH_LABELS[hashKey] || hashKey;
    crumbs.push({ label: hashLabel });
  }

  return crumbs;
}
