// Mock data for all Rankito modules

export const mockProjects = [
  { id: "1", name: "acme.com", domain: "acme.com", status: "active" as const, type: "E-commerce", country: "BR" },
  { id: "2", name: "blog.startup.io", domain: "blog.startup.io", status: "active" as const, type: "Blog", country: "US" },
  { id: "3", name: "services.co", domain: "services.co", status: "setup" as const, type: "Services", country: "PT" },
];

export const mockKpis = {
  clicks: { value: 24_832, change: 12.4, label: "Cliques" },
  impressions: { value: 1_284_920, change: 8.1, label: "Impressões" },
  ctr: { value: 1.93, change: 3.8, label: "CTR", suffix: "%" },
  position: { value: 14.2, change: -2.1, label: "Posição Média" },
  users: { value: 18_420, change: 15.2, label: "Usuários" },
  sessions: { value: 32_100, change: 9.7, label: "Sessões" },
  conversions: { value: 842, change: 22.3, label: "Conversões" },
  revenue: { value: 48_290, change: 18.6, label: "Receita", prefix: "$" },
};

export const mockTrendData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 0, i + 15);
  return {
    date: date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
    clicks: Math.floor(600 + Math.random() * 400 + i * 10),
    impressions: Math.floor(30000 + Math.random() * 15000 + i * 500),
    sessions: Math.floor(800 + Math.random() * 300 + i * 8),
  };
});

export const mockTopPages = [
  { url: "/products/wireless-headphones", clicks: 3842, impressions: 98420, ctr: 3.9, position: 4.2 },
  { url: "/blog/best-noise-cancelling-2026", clicks: 2910, impressions: 142300, ctr: 2.04, position: 6.1 },
  { url: "/products/smart-speaker", clicks: 2104, impressions: 68200, ctr: 3.08, position: 5.8 },
  { url: "/blog/home-audio-guide", clicks: 1890, impressions: 112400, ctr: 1.68, position: 8.3 },
  { url: "/category/headphones", clicks: 1542, impressions: 45200, ctr: 3.41, position: 3.9 },
];

export const mockInsights = [
  {
    id: "1",
    severity: "critical" as const,
    title: "Queda de 34% em cliques na /products/smart-speaker",
    description: "Nos últimos 7 dias, a página perdeu 34% dos cliques comparado ao período anterior. A posição média caiu de 5.8 para 9.2.",
    impact: "~720 cliques/mês em risco",
    action: "Revisar conteúdo e meta tags, verificar se houve atualização de algoritmo",
  },
  {
    id: "2",
    severity: "high" as const,
    title: "Oportunidade: 14 queries com posição 4-10 e alto volume",
    description: "Foram identificadas 14 consultas com posição entre 4 e 10, impressões acima de 5.000/mês e CTR abaixo de 2%.",
    impact: "+2.400 cliques/mês potencial",
    action: "Otimizar títulos e descriptions para aumentar CTR",
  },
  {
    id: "3",
    severity: "medium" as const,
    title: "3 páginas com CTR abaixo de 1% e alta impressão",
    description: "Páginas com mais de 10.000 impressões mensais mas CTR menor que 1%. Possível problema de relevância do snippet.",
    impact: "+800 cliques/mês potencial",
    action: "Reescrever meta descriptions com CTAs mais atraentes",
  },
];

export const mockUrlInventory = [
  { url: "/", type: "page", group: "Core", status: "active", priority: "high", lastCrawl: "2026-02-12" },
  { url: "/products", type: "category", group: "Products", status: "active", priority: "high", lastCrawl: "2026-02-12" },
  { url: "/products/wireless-headphones", type: "product", group: "Products", status: "active", priority: "high", lastCrawl: "2026-02-12" },
  { url: "/products/smart-speaker", type: "product", group: "Products", status: "active", priority: "medium", lastCrawl: "2026-02-11" },
  { url: "/blog/best-noise-cancelling-2026", type: "post", group: "Blog", status: "active", priority: "high", lastCrawl: "2026-02-12" },
  { url: "/blog/home-audio-guide", type: "post", group: "Blog", status: "active", priority: "medium", lastCrawl: "2026-02-10" },
  { url: "/old-promo", type: "page", group: "Legacy", status: "redirect", priority: "low", lastCrawl: "2026-02-08" },
  { url: "/products/discontinued-model", type: "product", group: "Products", status: "noindex", priority: "low", lastCrawl: "2026-02-05" },
];

export const mockIndexingQueue = [
  { url: "/blog/new-post-2026", type: "index" as const, status: "success" as const, sentAt: "2026-02-12 14:30", retries: 0 },
  { url: "/products/new-earbuds", type: "index" as const, status: "pending" as const, sentAt: "2026-02-13 09:00", retries: 0 },
  { url: "/products/smart-speaker", type: "update" as const, status: "success" as const, sentAt: "2026-02-11 10:15", retries: 1 },
  { url: "/blog/home-audio-guide", type: "update" as const, status: "failed" as const, sentAt: "2026-02-10 08:00", retries: 3, failReason: "Quota exceeded" },
];

export const mockTrackingEvents = [
  { id: "1", event: "click", element: "button.cta-buy", page: "/products/wireless-headphones", timestamp: "2026-02-13 10:32:14", device: "mobile", country: "BR" },
  { id: "2", event: "scroll", depth: "75%", page: "/blog/best-noise-cancelling-2026", timestamp: "2026-02-13 10:31:58", device: "desktop", country: "US" },
  { id: "3", event: "form_submit", element: "form.newsletter", page: "/blog/home-audio-guide", timestamp: "2026-02-13 10:30:42", device: "desktop", country: "BR" },
  { id: "4", event: "click", element: "a.whatsapp-cta", page: "/products/smart-speaker", timestamp: "2026-02-13 10:29:10", device: "mobile", country: "PT" },
];

export const mockConversions = [
  { id: "1", event: "purchase", page: "/checkout/success", value: 299.90, source: "google / organic", device: "mobile", date: "2026-02-13" },
  { id: "2", event: "lead_form", page: "/contact", value: 0, source: "google / cpc", device: "desktop", date: "2026-02-13" },
  { id: "3", event: "purchase", page: "/checkout/success", value: 149.90, source: "direct", device: "desktop", date: "2026-02-12" },
  { id: "4", event: "newsletter_signup", page: "/blog/home-audio-guide", value: 0, source: "google / organic", device: "mobile", date: "2026-02-12" },
];

// ── Extended mock data for Tracking Events Dashboard ──

const EVENT_TYPES = ["whatsapp_click", "form_submit", "phone_call", "page_view", "cta_click", "scroll_depth"];
const CONVERSION_TYPES = ["conversion", "micro_conversion"];
const DEVICES = ["mobile", "desktop", "tablet"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"];
const PAGES = [
  "/products/wireless-headphones", "/products/smart-speaker", "/blog/best-noise-cancelling-2026",
  "/contact", "/pricing", "/blog/home-audio-guide", "/checkout", "/category/headphones",
  "/landing/promo-verao", "/landing/black-friday",
];
const CTA_TEXTS = ["Chamar no WhatsApp", "Enviar Formulário", "Ligar Agora", "Ver Planos", "Comprar", "Saiba Mais"];
const GOALS = ["Chamada no Whats", "Lead Captado", "Venda Realizada", "Newsletter", "Download PDF", "Agendamento"];
const CITIES = ["São Paulo", "Rio de Janeiro", "Curitiba", "Belo Horizonte", "Porto Alegre", "Salvador", "Recife", "Brasília"];
const STATES = ["SP", "RJ", "PR", "MG", "RS", "BA", "PE", "DF"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface MockTrackingEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  conversion_type: string;
  page_url: string;
  cta_text: string;
  goal: string;
  value: number;
  device: string;
  browser: string;
  location_city: string;
  location_state: string;
}

export const mockTrackingEventsDetailed: MockTrackingEvent[] = Array.from({ length: 120 }, (_, i) => {
  const d = new Date(2026, 1, 14 - Math.floor(i / 4));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  const evType = randomFrom(EVENT_TYPES);
  const isConversion = ["whatsapp_click", "form_submit", "phone_call", "cta_click"].includes(evType);
  return {
    event_id: `ev-${i + 1}`,
    timestamp: d.toISOString(),
    event_type: evType,
    conversion_type: isConversion ? "conversion" : "micro_conversion",
    page_url: randomFrom(PAGES),
    cta_text: randomFrom(CTA_TEXTS),
    goal: randomFrom(GOALS),
    value: isConversion ? parseFloat((Math.random() * 50 + 5).toFixed(2)) : 0,
    device: randomFrom(DEVICES),
    browser: randomFrom(BROWSERS),
    location_city: randomFrom(CITIES),
    location_state: randomFrom(STATES),
  };
});

export function generateConversionsHeatmap() {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return days.map((day) => ({
    day,
    hours: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      value: Math.floor(Math.random() * 40),
    })),
  }));
}

export const mockConversionsByDay = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 0, 15 + i);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    whatsapp_click: Math.floor(Math.random() * 20 + 5),
    form_submit: Math.floor(Math.random() * 12 + 2),
    phone_call: Math.floor(Math.random() * 8 + 1),
    cta_click: Math.floor(Math.random() * 15 + 3),
  };
});

export const mockPageViewsByDay = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 0, 15 + i);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    page_views: Math.floor(Math.random() * 300 + 100 + i * 8),
    unique_views: Math.floor(Math.random() * 200 + 60 + i * 5),
  };
});

export interface MockSession {
  session_id: string;
  started_at: string;
  duration_sec: number;
  pages_viewed: number;
  landing_page: string;
  exit_page: string;
  source: string;
  medium: string;
  device: string;
  browser: string;
  country: string;
  city: string;
  is_bounce: boolean;
  converted: boolean;
  revenue: number;
  referrer: string;
}

const SOURCES = ["google", "direct", "facebook", "instagram", "bing", "referral", "twitter"];
const MEDIUMS = ["organic", "cpc", "social", "referral", "(none)"];
const LANDING_PAGES = ["/", "/products/wireless-headphones", "/blog/best-noise-cancelling-2026", "/pricing", "/landing/promo-verao", "/contact", "/products/smart-speaker"];
const EXIT_PAGES = ["/checkout/success", "/contact", "/pricing", "/products/wireless-headphones", "/blog/home-audio-guide", "/", "/products/smart-speaker"];
const SESSION_REFERRERS = ["https://www.google.com", "https://www.facebook.com", "https://www.instagram.com", "https://www.bing.com", "https://t.co", "https://www.youtube.com", "(direct)", "https://www.linkedin.com", "https://www.tiktok.com", "https://news.ycombinator.com"];

export const mockSessionsDetailed: MockSession[] = Array.from({ length: 80 }, (_, i) => {
  const d = new Date(2026, 1, 14 - Math.floor(i / 6));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  const isBounce = Math.random() < 0.3;
  const converted = !isBounce && Math.random() < 0.2;
  return {
    session_id: `sess-${(1000 + i).toString(36)}`,
    started_at: d.toISOString(),
    duration_sec: isBounce ? Math.floor(Math.random() * 15 + 2) : Math.floor(Math.random() * 600 + 30),
    pages_viewed: isBounce ? 1 : Math.floor(Math.random() * 8 + 2),
    landing_page: randomFrom(LANDING_PAGES),
    exit_page: isBounce ? randomFrom(LANDING_PAGES) : randomFrom(EXIT_PAGES),
    source: randomFrom(SOURCES),
    medium: randomFrom(MEDIUMS),
    device: randomFrom(DEVICES),
    browser: randomFrom(BROWSERS),
    country: "BR",
    city: randomFrom(CITIES),
    is_bounce: isBounce,
    converted,
    revenue: converted ? parseFloat((Math.random() * 400 + 50).toFixed(2)) : 0,
    referrer: randomFrom(SESSION_REFERRERS),
  };
});

export const mockAdsCampaigns = [
  { name: "Brand - Search", platform: "Google Ads", cost: 2840, clicks: 4200, conversions: 182, cpa: 15.60, roas: 4.2 },
  { name: "Products - Shopping", platform: "Google Ads", cost: 5420, clicks: 8900, conversions: 310, cpa: 17.48, roas: 3.8 },
  { name: "Remarketing - Display", platform: "Google Ads", cost: 1200, clicks: 3100, conversions: 48, cpa: 25.00, roas: 2.1 },
  { name: "Lookalike - Converters", platform: "Meta Ads", cost: 3100, clicks: 6200, conversions: 124, cpa: 25.00, roas: 2.9 },
];

// ── User Journey Mock Data ──

export interface JourneyStep {
  page: string;
  timestamp: string;
  duration_sec: number;
  action: string;
  cta_clicked: string | null;
  scroll_depth: number;
}

export interface MockUserJourney {
  visitor_id: string;
  session_id: string;
  started_at: string;
  total_duration_sec: number;
  device: string;
  browser: string;
  city: string;
  source: string;
  medium: string;
  referrer: string;
  converted: boolean;
  conversion_value: number;
  steps: JourneyStep[];
}

const JOURNEY_ACTIONS = ["page_view", "scroll", "cta_click", "form_focus", "video_play", "hover_product", "add_to_cart", "search"];
const JOURNEY_CTAS = ["Chamar no WhatsApp", "Comprar Agora", "Ver Planos", "Enviar Formulário", "Agendar Demo", "Download PDF", null, null, null];
const VISITOR_NAMES = ["Visitante Azul", "Visitante Verde", "Visitante Roxo", "Visitante Laranja", "Visitante Rosa", "Visitante Ciano", "Visitante Dourado", "Visitante Prata"];

const JOURNEY_PAGES_FLOW = [
  ["/", "/products/wireless-headphones", "/pricing", "/checkout", "/checkout/success"],
  ["/blog/best-noise-cancelling-2026", "/products/wireless-headphones", "/contact"],
  ["/landing/promo-verao", "/products/smart-speaker", "/products/wireless-headphones", "/checkout"],
  ["/", "/category/headphones", "/products/wireless-headphones", "/pricing"],
  ["/landing/black-friday", "/products/smart-speaker", "/contact", "/checkout/success"],
  ["/blog/home-audio-guide", "/category/headphones", "/products/smart-speaker"],
  ["/", "/pricing", "/contact"],
  ["/products/wireless-headphones", "/blog/best-noise-cancelling-2026", "/products/smart-speaker", "/pricing", "/checkout", "/checkout/success"],
];

export const mockUserJourneys: MockUserJourney[] = Array.from({ length: 40 }, (_, i) => {
  const flowTemplate = JOURNEY_PAGES_FLOW[i % JOURNEY_PAGES_FLOW.length];
  const numSteps = Math.min(flowTemplate.length, Math.floor(Math.random() * 3) + 2);
  const pages = flowTemplate.slice(0, numSteps);
  const d = new Date(2026, 1, 14 - Math.floor(i / 3));
  d.setHours(Math.floor(Math.random() * 18 + 6), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  const converted = pages.includes("/checkout/success") || Math.random() < 0.15;
  let cursor = new Date(d);
  const steps: JourneyStep[] = pages.map((page, si) => {
    const dur = Math.floor(Math.random() * 180 + 10);
    const step: JourneyStep = {
      page,
      timestamp: cursor.toISOString(),
      duration_sec: dur,
      action: si === 0 ? "page_view" : randomFrom(JOURNEY_ACTIONS),
      cta_clicked: si > 0 && Math.random() < 0.4 ? randomFrom(JOURNEY_CTAS.filter(Boolean) as string[]) : null,
      scroll_depth: Math.floor(Math.random() * 60 + 40),
    };
    cursor = new Date(cursor.getTime() + dur * 1000 + Math.random() * 5000);
    return step;
  });

  const totalDuration = steps.reduce((s, st) => s + st.duration_sec, 0);

  return {
    visitor_id: `vis-${(2000 + i).toString(36)}`,
    session_id: `jsess-${(3000 + i).toString(36)}`,
    started_at: d.toISOString(),
    total_duration_sec: totalDuration,
    device: randomFrom(DEVICES),
    browser: randomFrom(BROWSERS),
    city: randomFrom(CITIES),
    source: randomFrom(SOURCES),
    medium: randomFrom(MEDIUMS),
    referrer: randomFrom(SESSION_REFERRERS),
    converted,
    conversion_value: converted ? parseFloat((Math.random() * 500 + 30).toFixed(2)) : 0,
    steps,
  };
});
