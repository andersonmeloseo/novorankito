// ═══════════════════════════════════════════════════════════
// Mock data for Rankito Plugin v3.1.0 — Analítica Rankito
// ═══════════════════════════════════════════════════════════

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── All Plugin Event Types ──
export const PLUGIN_EVENT_TYPES = [
  "page_view", "page_exit", "whatsapp_click", "phone_click", "email_click",
  "button_click", "form_submit", "product_view", "add_to_cart", "remove_from_cart",
  "begin_checkout", "purchase", "search",
] as const;

export type PluginEventType = typeof PLUGIN_EVENT_TYPES[number];

export const EVENT_LABELS: Record<PluginEventType, string> = {
  page_view: "Visualização de Página",
  page_exit: "Saída da Página",
  whatsapp_click: "Clique WhatsApp",
  phone_click: "Clique Telefone",
  email_click: "Clique Email",
  button_click: "Clique Botão",
  form_submit: "Envio Formulário",
  product_view: "Visualização Produto",
  add_to_cart: "Adicionar ao Carrinho",
  remove_from_cart: "Remover do Carrinho",
  begin_checkout: "Início Checkout",
  purchase: "Compra",
  search: "Busca",
};

export const EVENT_CATEGORIES = {
  tracking: ["page_view", "page_exit", "button_click"] as PluginEventType[],
  conversions: ["whatsapp_click", "phone_click", "email_click", "form_submit"] as PluginEventType[],
  ecommerce: ["product_view", "add_to_cart", "remove_from_cart", "begin_checkout", "purchase", "search"] as PluginEventType[],
};

// ── Platforms ──
export const PLATFORMS = ["WooCommerce", "GTM", "Genérico"] as const;

const DEVICES = ["mobile", "desktop", "tablet"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"];
const PAGES = [
  "/", "/products", "/products/wireless-headphones", "/products/smart-speaker",
  "/blog/best-noise-cancelling-2026", "/contact", "/pricing",
  "/checkout", "/category/headphones", "/landing/promo-verao", "/search",
];
const PRODUCT_PAGES = ["/products/wireless-headphones", "/products/smart-speaker", "/products/earbuds-pro", "/products/soundbar-ultra"];
const PRODUCT_NAMES = ["Wireless Headphones", "Smart Speaker", "Earbuds Pro", "Soundbar Ultra"];
const CITIES = ["São Paulo", "Rio de Janeiro", "Curitiba", "Belo Horizonte", "Porto Alegre", "Salvador", "Recife", "Brasília"];
const STATES = ["SP", "RJ", "PR", "MG", "RS", "BA", "PE", "DF"];
const SOURCES = ["google", "direct", "facebook", "instagram", "bing", "referral", "twitter", "tiktok"];
const MEDIUMS = ["organic", "cpc", "social", "referral", "(none)", "email"];
const CAMPAIGNS = ["brand_search", "products_shopping", "remarketing", "lookalike", "black_friday", "(not set)"];
const CTA_TEXTS = ["Chamar no WhatsApp", "Enviar Formulário", "Ligar Agora", "Ver Planos", "Comprar Agora", "Saiba Mais", "Adicionar ao Carrinho"];
const SEARCH_TERMS = ["fone bluetooth", "caixa de som", "headphone gamer", "earbuds", "soundbar", "home theater"];
const ELEMENT_SELECTORS = ["button.cta-buy", "a.whatsapp-cta", "button.add-to-cart", "a.phone-link", "form.contact", "button.checkout", "div.product-card", "span.promo-badge"];

// ── Plugin Event Interface ──
export interface PluginEvent {
  event_id: string;
  timestamp: string;
  event_type: PluginEventType;
  sequence_number: number;
  session_id: string;
  page_url: string;
  element_selector: string;
  cta_text: string;
  device: string;
  browser: string;
  city: string;
  state: string;
  platform: string;
  // Page exit specific
  time_on_page_sec: number;
  // E-commerce specific
  product_name: string | null;
  product_id: string | null;
  product_price: number | null;
  order_id: string | null;
  revenue: number | null;
  search_term: string | null;
  // Conversion metadata
  lead_name: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  // Ads tracking
  gclid: string | null;
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
  // UTM params
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  // Value
  value: number;
}

let seqCounter = 0;

function generatePluginEvent(i: number): PluginEvent {
  const d = new Date(2026, 1, 14 - Math.floor(i / 8));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  
  const eventType = randomFrom([...PLUGIN_EVENT_TYPES]);
  const isEcommerce = EVENT_CATEGORIES.ecommerce.includes(eventType);
  const isConversion = EVENT_CATEGORIES.conversions.includes(eventType);
  const isPurchase = eventType === "purchase";
  const isSearch = eventType === "search";
  const isPageExit = eventType === "page_exit";
  const hasAds = Math.random() < 0.35;
  const hasUtm = Math.random() < 0.55;
  const productIdx = Math.floor(Math.random() * PRODUCT_NAMES.length);
  const sessionId = `sess-${Math.floor(i / 5).toString(36)}`;
  
  seqCounter++;

  return {
    event_id: `ev-${i + 1}`,
    timestamp: d.toISOString(),
    event_type: eventType,
    sequence_number: seqCounter,
    session_id: sessionId,
    page_url: isEcommerce ? randomFrom(PRODUCT_PAGES) : randomFrom(PAGES),
    element_selector: randomFrom(ELEMENT_SELECTORS),
    cta_text: randomFrom(CTA_TEXTS),
    device: randomFrom(DEVICES),
    browser: randomFrom(BROWSERS),
    city: randomFrom(CITIES),
    state: randomFrom(STATES),
    platform: randomFrom([...PLATFORMS]),
    time_on_page_sec: isPageExit ? Math.floor(Math.random() * 300 + 5) : Math.floor(Math.random() * 120 + 3),
    product_name: isEcommerce ? PRODUCT_NAMES[productIdx] : null,
    product_id: isEcommerce ? `prod-${productIdx + 1}` : null,
    product_price: isEcommerce ? parseFloat((Math.random() * 400 + 49.90).toFixed(2)) : null,
    order_id: isPurchase ? `order-${1000 + i}` : null,
    revenue: isPurchase ? parseFloat((Math.random() * 800 + 99.90).toFixed(2)) : null,
    search_term: isSearch ? randomFrom(SEARCH_TERMS) : null,
    lead_name: isConversion && Math.random() > 0.3 ? `Lead ${i}` : null,
    lead_phone: isConversion && eventType === "phone_click" ? `+55 11 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}` : null,
    lead_email: isConversion && eventType === "email_click" ? `lead${i}@email.com` : null,
    gclid: hasAds && Math.random() > 0.5 ? `CjwKCA${Math.random().toString(36).substring(2, 12)}` : null,
    fbclid: hasAds && Math.random() > 0.5 ? `IwAR${Math.random().toString(36).substring(2, 15)}` : null,
    fbc: hasAds && Math.random() > 0.6 ? `fb.1.${Date.now()}.${Math.random().toString(36).substring(2, 12)}` : null,
    fbp: hasAds && Math.random() > 0.6 ? `fb.1.${Date.now()}.${Math.floor(Math.random() * 999999999)}` : null,
    utm_source: hasUtm ? randomFrom(SOURCES) : null,
    utm_medium: hasUtm ? randomFrom(MEDIUMS) : null,
    utm_campaign: hasUtm ? randomFrom(CAMPAIGNS) : null,
    utm_content: hasUtm && Math.random() > 0.5 ? `variant_${randomFrom(["a", "b", "c"])}` : null,
    utm_term: hasUtm && Math.random() > 0.6 ? randomFrom(SEARCH_TERMS) : null,
    value: isPurchase ? parseFloat((Math.random() * 800 + 99).toFixed(2)) : isConversion ? parseFloat((Math.random() * 50 + 5).toFixed(2)) : 0,
  };
}

export const pluginEvents: PluginEvent[] = Array.from({ length: 300 }, (_, i) => generatePluginEvent(i));

// ── Derived: E-commerce funnel data by day ──
export const ecommerceFunnelByDay = (() => {
  const map = new Map<string, Record<string, number>>();
  pluginEvents.filter(e => EVENT_CATEGORIES.ecommerce.includes(e.event_type)).forEach(e => {
    const day = new Date(e.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const entry = map.get(day) || { product_view: 0, add_to_cart: 0, remove_from_cart: 0, begin_checkout: 0, purchase: 0, search: 0 };
    entry[e.event_type] = (entry[e.event_type] || 0) + 1;
    map.set(day, entry);
  });
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
})();

// ── Derived: E-commerce funnel totals ──
export const ecommerceFunnelTotals = (() => {
  const steps: { type: PluginEventType; label: string; color: string }[] = [
    { type: "product_view", label: "Visualização", color: "hsl(var(--info))" },
    { type: "add_to_cart", label: "Add Carrinho", color: "hsl(var(--primary))" },
    { type: "begin_checkout", label: "Checkout", color: "hsl(var(--warning))" },
    { type: "purchase", label: "Compra", color: "hsl(var(--success))" },
  ];
  return steps.map(s => ({
    ...s,
    value: pluginEvents.filter(e => e.event_type === s.type).length,
  }));
})();

// ── Derived: Conversions by day ──
export const conversionsByDay = (() => {
  const map = new Map<string, Record<string, number>>();
  pluginEvents.filter(e => EVENT_CATEGORIES.conversions.includes(e.event_type)).forEach(e => {
    const day = new Date(e.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const entry = map.get(day) || { whatsapp_click: 0, phone_click: 0, email_click: 0, form_submit: 0 };
    entry[e.event_type] = (entry[e.event_type] || 0) + 1;
    map.set(day, entry);
  });
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
})();

// ── Derived: Events by day (all types) ──
export const allEventsByDay = (() => {
  const map = new Map<string, { total: number; tracking: number; conversions: number; ecommerce: number }>();
  pluginEvents.forEach(e => {
    const day = new Date(e.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const entry = map.get(day) || { total: 0, tracking: 0, conversions: 0, ecommerce: 0 };
    entry.total++;
    if (EVENT_CATEGORIES.tracking.includes(e.event_type)) entry.tracking++;
    if (EVENT_CATEGORIES.conversions.includes(e.event_type)) entry.conversions++;
    if (EVENT_CATEGORIES.ecommerce.includes(e.event_type)) entry.ecommerce++;
    map.set(day, entry);
  });
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
})();

// ── Derived: UTM Source distribution ──
export const utmSourceDistribution = (() => {
  const map = new Map<string, number>();
  pluginEvents.filter(e => e.utm_source).forEach(e => map.set(e.utm_source!, (map.get(e.utm_source!) || 0) + 1));
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
})();

// ── Derived: UTM Medium distribution ──
export const utmMediumDistribution = (() => {
  const map = new Map<string, number>();
  pluginEvents.filter(e => e.utm_medium).forEach(e => map.set(e.utm_medium!, (map.get(e.utm_medium!) || 0) + 1));
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
})();

// ── Derived: UTM Campaign distribution ──
export const utmCampaignDistribution = (() => {
  const map = new Map<string, number>();
  pluginEvents.filter(e => e.utm_campaign).forEach(e => map.set(e.utm_campaign!, (map.get(e.utm_campaign!) || 0) + 1));
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
})();

// ── Derived: Ads tracking stats ──
export const adsTrackingStats = (() => {
  const withGclid = pluginEvents.filter(e => e.gclid).length;
  const withFbclid = pluginEvents.filter(e => e.fbclid).length;
  const withFbc = pluginEvents.filter(e => e.fbc).length;
  const withFbp = pluginEvents.filter(e => e.fbp).length;
  const withUtm = pluginEvents.filter(e => e.utm_source).length;
  return { withGclid, withFbclid, withFbc, withFbp, withUtm, total: pluginEvents.length };
})();

// ── Derived: Platform distribution ──
export const platformDistribution = (() => {
  const map = new Map<string, number>();
  pluginEvents.forEach(e => map.set(e.platform, (map.get(e.platform) || 0) + 1));
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
})();

// ── Derived: Events by type totals ──
export const eventTypeTotals = (() => {
  const map = new Map<PluginEventType, number>();
  PLUGIN_EVENT_TYPES.forEach(t => map.set(t, 0));
  pluginEvents.forEach(e => map.set(e.event_type, (map.get(e.event_type) || 0) + 1));
  return Array.from(map.entries()).map(([type, count]) => ({
    type,
    label: EVENT_LABELS[type],
    count,
  }));
})();

// ── Derived: Page exit time analysis ──
export const pageExitAnalysis = (() => {
  const exitEvents = pluginEvents.filter(e => e.event_type === "page_exit");
  const map = new Map<string, { totalTime: number; count: number }>();
  exitEvents.forEach(e => {
    const entry = map.get(e.page_url) || { totalTime: 0, count: 0 };
    entry.totalTime += e.time_on_page_sec;
    entry.count++;
    map.set(e.page_url, entry);
  });
  return Array.from(map.entries())
    .map(([page, v]) => ({ page: page.replace(/^\//, "") || "home", avgTime: Math.round(v.totalTime / v.count), exits: v.count }))
    .sort((a, b) => b.exits - a.exits)
    .slice(0, 10);
})();

// ── Derived: Product performance ──
export const productPerformance = (() => {
  const map = new Map<string, { views: number; addToCart: number; purchases: number; revenue: number }>();
  pluginEvents.filter(e => e.product_name).forEach(e => {
    const entry = map.get(e.product_name!) || { views: 0, addToCart: 0, purchases: 0, revenue: 0 };
    if (e.event_type === "product_view") entry.views++;
    if (e.event_type === "add_to_cart") entry.addToCart++;
    if (e.event_type === "purchase") { entry.purchases++; entry.revenue += e.revenue || 0; }
    map.set(e.product_name!, entry);
  });
  return Array.from(map.entries()).map(([name, v]) => ({
    name,
    ...v,
    conversionRate: v.views > 0 ? Number(((v.purchases / v.views) * 100).toFixed(1)) : 0,
  }));
})();

// ── Derived: Ads data by campaign ──
export const adsByCampaign = (() => {
  const map = new Map<string, { events: number; conversions: number; revenue: number; hasGclid: number; hasFbclid: number }>();
  pluginEvents.filter(e => e.utm_campaign && e.utm_campaign !== "(not set)").forEach(e => {
    const entry = map.get(e.utm_campaign!) || { events: 0, conversions: 0, revenue: 0, hasGclid: 0, hasFbclid: 0 };
    entry.events++;
    if (EVENT_CATEGORIES.conversions.includes(e.event_type) || e.event_type === "purchase") {
      entry.conversions++;
      entry.revenue += e.value;
    }
    if (e.gclid) entry.hasGclid++;
    if (e.fbclid) entry.hasFbclid++;
    map.set(e.utm_campaign!, entry);
  });
  return Array.from(map.entries()).map(([campaign, v]) => ({
    campaign,
    ...v,
    conversionRate: v.events > 0 ? Number(((v.conversions / v.events) * 100).toFixed(1)) : 0,
  }));
})();
