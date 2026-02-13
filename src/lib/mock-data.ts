// Mock data for all Rankito modules

export const mockProjects = [
  { id: "1", name: "acme.com", domain: "acme.com", status: "active" as const, type: "E-commerce", country: "BR" },
  { id: "2", name: "blog.startup.io", domain: "blog.startup.io", status: "active" as const, type: "Blog", country: "US" },
  { id: "3", name: "services.co", domain: "services.co", status: "setup" as const, type: "Services", country: "PT" },
];

export const mockKpis = {
  clicks: { value: 24_832, change: 12.4, label: "Clicks" },
  impressions: { value: 1_284_920, change: 8.1, label: "Impressions" },
  ctr: { value: 1.93, change: 3.8, label: "CTR", suffix: "%" },
  position: { value: 14.2, change: -2.1, label: "Avg. Position" },
  users: { value: 18_420, change: 15.2, label: "Users" },
  sessions: { value: 32_100, change: 9.7, label: "Sessions" },
  conversions: { value: 842, change: 22.3, label: "Conversions" },
  revenue: { value: 48_290, change: 18.6, label: "Revenue", prefix: "$" },
};

export const mockTrendData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 0, i + 15);
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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

export const mockAdsCampaigns = [
  { name: "Brand - Search", platform: "Google Ads", cost: 2840, clicks: 4200, conversions: 182, cpa: 15.60, roas: 4.2 },
  { name: "Products - Shopping", platform: "Google Ads", cost: 5420, clicks: 8900, conversions: 310, cpa: 17.48, roas: 3.8 },
  { name: "Remarketing - Display", platform: "Google Ads", cost: 1200, clicks: 3100, conversions: 48, cpa: 25.00, roas: 2.1 },
  { name: "Lookalike - Converters", platform: "Meta Ads", cost: 3100, clicks: 6200, conversions: 124, cpa: 25.00, roas: 2.9 },
];
