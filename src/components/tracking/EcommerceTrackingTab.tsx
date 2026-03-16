import { useMemo, useState } from "react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import {
  useTrackingEvents, TrackingEvent, EVENT_LABELS, EVENT_CATEGORIES,
} from "@/hooks/use-tracking-events";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  ShoppingCart, Package, CreditCard, TrendingUp, Search, DollarSign, Loader2,
  Eye, ArrowDownRight, ExternalLink, ChevronDown, ChevronRight, Tag, BarChart3,
  Clock, Globe, Smartphone, Monitor, ShoppingBag, Receipt, Percent,
  Lightbulb, AlertTriangle, Zap, Users, Repeat, Timer, ArrowUpRight, ArrowDownLeft,
  Star, Target, TrendingDown, Brain,
} from "lucide-react";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, LineGlowGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, PipelineVisual,
} from "@/components/analytics/ChartPrimitives";

/* ── Spark KPI card ── */
function SparkKpi({ label, value, prefix, suffix, color, icon: Icon, trend, trendLabel }: {
  label: string; value: string | number; prefix?: string; suffix?: string;
  color: string; icon?: React.ElementType; trend?: number; trendLabel?: string;
}) {
  return (
    <Card className="p-3.5 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
        <span className="text-base font-bold text-foreground font-display tracking-tight">{prefix}{value}{suffix}</span>
        {trend !== undefined && trend !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            {trend > 0 ? <ArrowUpRight className="h-3 w-3 text-success" /> : <ArrowDownLeft className="h-3 w-3 text-destructive" />}
            <span className={`text-[9px] font-semibold ${trend > 0 ? "text-success" : "text-destructive"}`}>{trend > 0 ? "+" : ""}{trend.toFixed(1)}%</span>
            {trendLabel && <span className="text-[8px] text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── Insight card component ── */
function InsightItem({ icon: Icon, type, title, description }: {
  icon: React.ElementType; type: "success" | "warning" | "info" | "danger"; title: string; description: string;
}) {
  const colorMap = {
    success: { bg: "bg-success/10", border: "border-success/30", icon: "text-success", badge: "bg-success/15 text-success border-success/30" },
    warning: { bg: "bg-warning/10", border: "border-warning/30", icon: "text-warning", badge: "bg-warning/15 text-warning border-warning/30" },
    info: { bg: "bg-info/10", border: "border-info/30", icon: "text-info", badge: "bg-info/15 text-info border-info/30" },
    danger: { bg: "bg-destructive/10", border: "border-destructive/30", icon: "text-destructive", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const c = colorMap[type];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${c.bg} border ${c.border}`}>
      <Icon className={`h-4 w-4 ${c.icon} shrink-0 mt-0.5`} />
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}

const ECOM_COLORS: Record<string, string> = {
  view_item: "hsl(var(--info))",
  add_to_cart: "hsl(var(--primary))",
  remove_from_cart: "hsl(var(--warning))",
  view_cart: "hsl(var(--chart-3))",
  begin_checkout: "hsl(var(--chart-5))",
  add_shipping_info: "hsl(var(--chart-7))",
  add_payment_info: "hsl(var(--chart-8))",
  purchase: "hsl(var(--success))",
  refund: "hsl(var(--destructive))",
  search: "hsl(var(--chart-9))",
};

const ECOM_LABELS: Record<string, string> = {
  view_item: "View Item",
  view_item_list: "View Item List",
  select_item: "Select Item",
  add_to_cart: "Add to Cart",
  remove_from_cart: "Remove from Cart",
  view_cart: "View Cart",
  begin_checkout: "Begin Checkout",
  add_shipping_info: "Add Shipping Info",
  add_payment_info: "Add Payment Info",
  purchase: "Purchase",
  refund: "Refund",
  search: "Search",
  select_promotion: "Select Promotion",
  view_promotion: "View Promotion",
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function fmtCurrency(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function EcommerceTrackingTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const { data: allEvents = [], isLoading } = useTrackingEvents(projectId);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const ecomEvents = useMemo(() => allEvents.filter(e => EVENT_CATEGORIES.ecommerce.includes(e.event_type)), [allEvents]);

  /* ── KPI calculations ── */
  const totalViews = ecomEvents.filter(e => e.event_type === "view_item").length;
  const totalAddToCart = ecomEvents.filter(e => e.event_type === "add_to_cart").length;
  const totalRemoveFromCart = ecomEvents.filter(e => e.event_type === "remove_from_cart").length;
  const totalCheckout = ecomEvents.filter(e => e.event_type === "begin_checkout").length;
  const totalPurchases = ecomEvents.filter(e => e.event_type === "purchase").length;
  const totalRevenue = ecomEvents.filter(e => e.event_type === "purchase").reduce((s, e) => s + (e.cart_value || e.product_price || 0), 0);
  const totalSearches = ecomEvents.filter(e => e.event_type === "search").length;
  const totalRefunds = ecomEvents.filter(e => e.event_type === "refund").length;
  const refundValue = ecomEvents.filter(e => e.event_type === "refund").reduce((s, e) => s + (e.cart_value || e.product_price || 0), 0);
  const avgTicket = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;
  const cartToCheckout = totalAddToCart > 0 ? ((totalCheckout / totalAddToCart) * 100) : 0;
  const checkoutToPurchase = totalCheckout > 0 ? ((totalPurchases / totalCheckout) * 100) : 0;
  const overallConversion = totalViews > 0 ? ((totalPurchases / totalViews) * 100) : 0;
  const cartAbandonment = totalAddToCart > 0 ? (((totalAddToCart - totalPurchases) / totalAddToCart) * 100) : 0;
  const netRevenue = totalRevenue - refundValue;
  const refundRate = totalPurchases > 0 ? ((totalRefunds / totalPurchases) * 100) : 0;

  /* ── Period comparison (last 15d vs prev 15d) ── */
  const periodMetrics = useMemo(() => {
    const now = Date.now();
    const mid = now - 15 * 86400000;
    const start = now - 30 * 86400000;
    const recent = ecomEvents.filter(e => new Date(e.created_at).getTime() >= mid);
    const prev = ecomEvents.filter(e => { const t = new Date(e.created_at).getTime(); return t >= start && t < mid; });
    const recentRev = recent.filter(e => e.event_type === "purchase").reduce((s, e) => s + (e.cart_value || e.product_price || 0), 0);
    const prevRev = prev.filter(e => e.event_type === "purchase").reduce((s, e) => s + (e.cart_value || e.product_price || 0), 0);
    const recentPurchases = recent.filter(e => e.event_type === "purchase").length;
    const prevPurchases = prev.filter(e => e.event_type === "purchase").length;
    const recentViews = recent.filter(e => e.event_type === "view_item").length;
    const prevViews = prev.filter(e => e.event_type === "view_item").length;
    const recentCart = recent.filter(e => e.event_type === "add_to_cart").length;
    const prevCart = prev.filter(e => e.event_type === "add_to_cart").length;
    const calcTrend = (c: number, p: number) => p > 0 ? ((c - p) / p) * 100 : 0;
    return {
      revenueTrend: calcTrend(recentRev, prevRev),
      purchasesTrend: calcTrend(recentPurchases, prevPurchases),
      viewsTrend: calcTrend(recentViews, prevViews),
      cartTrend: calcTrend(recentCart, prevCart),
    };
  }, [ecomEvents]);

  /* ── Buyer behavior metrics ── */
  const buyerMetrics = useMemo(() => {
    const buyerVisitors = new Map<string, { purchases: number; firstPurchase: number; sessions: Set<string> }>();
    ecomEvents.filter(e => e.event_type === "purchase" && e.visitor_id).forEach(e => {
      const entry = buyerVisitors.get(e.visitor_id!) || { purchases: 0, firstPurchase: Infinity, sessions: new Set() };
      entry.purchases++;
      entry.firstPurchase = Math.min(entry.firstPurchase, new Date(e.created_at).getTime());
      if (e.session_id) entry.sessions.add(e.session_id);
      buyerVisitors.set(e.visitor_id!, entry);
    });
    const totalBuyers = buyerVisitors.size;
    const repeatBuyers = Array.from(buyerVisitors.values()).filter(b => b.purchases > 1).length;
    const repeatRate = totalBuyers > 0 ? (repeatBuyers / totalBuyers) * 100 : 0;

    // Avg time from first view to purchase per visitor
    const viewToPurchaseTimes: number[] = [];
    const viewerFirstSeen = new Map<string, number>();
    ecomEvents.forEach(e => {
      if (!e.visitor_id) return;
      if (e.event_type === "view_item") {
        const t = new Date(e.created_at).getTime();
        if (!viewerFirstSeen.has(e.visitor_id) || t < viewerFirstSeen.get(e.visitor_id)!) {
          viewerFirstSeen.set(e.visitor_id, t);
        }
      }
    });
    buyerVisitors.forEach((v, vid) => {
      const firstView = viewerFirstSeen.get(vid);
      if (firstView && v.firstPurchase > firstView) {
        viewToPurchaseTimes.push(v.firstPurchase - firstView);
      }
    });
    const avgTimeToPurchaseMs = viewToPurchaseTimes.length > 0 ? viewToPurchaseTimes.reduce((a, b) => a + b, 0) / viewToPurchaseTimes.length : 0;
    const avgTimeToPurchaseHrs = avgTimeToPurchaseMs / (1000 * 60 * 60);

    // Unique visitors total
    const uniqueVisitors = new Set(ecomEvents.map(e => e.visitor_id).filter(Boolean)).size;

    return { totalBuyers, repeatBuyers, repeatRate, avgTimeToPurchaseHrs, uniqueVisitors };
  }, [ecomEvents]);

  /* ── Top removed products (cart removals) ── */
  const topRemovedProducts = useMemo(() => {
    const map = new Map<string, number>();
    ecomEvents.filter(e => e.event_type === "remove_from_cart" && e.product_name).forEach(e => {
      map.set(e.product_name!, (map.get(e.product_name!) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [ecomEvents]);

  /* ── Automated Insights ── */
  const insights = useMemo(() => {
    const list: { icon: React.ElementType; type: "success" | "warning" | "info" | "danger"; title: string; description: string }[] = [];

    if (cartAbandonment > 70) {
      list.push({ icon: AlertTriangle, type: "danger", title: "Abandono de carrinho crítico", description: `${cartAbandonment.toFixed(0)}% dos visitantes abandonam o carrinho. Considere simplificar o checkout, adicionar selos de segurança e oferecer frete grátis acima de um valor mínimo.` });
    } else if (cartAbandonment > 50) {
      list.push({ icon: AlertTriangle, type: "warning", title: "Abandono de carrinho moderado", description: `${cartAbandonment.toFixed(0)}% de abandono. Teste pop-ups de saída com cupom de desconto e reduza os campos obrigatórios no checkout.` });
    }

    if (overallConversion > 0 && overallConversion < 1) {
      list.push({ icon: Target, type: "warning", title: "Taxa de conversão abaixo do ideal", description: `Sua taxa geral é de ${overallConversion.toFixed(1)}%. A média do e-commerce brasileiro é 1.5-2%. Melhore as descrições de produto, adicione reviews e otimize a velocidade do site.` });
    } else if (overallConversion >= 3) {
      list.push({ icon: Star, type: "success", title: "Excelente taxa de conversão!", description: `${overallConversion.toFixed(1)}% de conversão está acima da média do mercado. Continue otimizando a experiência do usuário para manter esse desempenho.` });
    }

    if (buyerMetrics.repeatRate > 20) {
      list.push({ icon: Repeat, type: "success", title: "Boa taxa de recompra", description: `${buyerMetrics.repeatRate.toFixed(0)}% dos compradores são recorrentes. Invista em programas de fidelidade e cross-sell para maximizar o LTV.` });
    } else if (buyerMetrics.totalBuyers > 0 && buyerMetrics.repeatRate < 5) {
      list.push({ icon: Repeat, type: "info", title: "Baixa taxa de recompra", description: `Apenas ${buyerMetrics.repeatRate.toFixed(0)}% dos compradores retornam. Implemente e-mails pós-compra, programas de pontos e ofertas exclusivas para clientes.` });
    }

    if (periodMetrics.revenueTrend > 20) {
      list.push({ icon: TrendingUp, type: "success", title: "Receita em alta!", description: `Receita cresceu ${periodMetrics.revenueTrend.toFixed(0)}% nos últimos 15 dias comparado ao período anterior. Ótimo momento para escalar investimento em tráfego.` });
    } else if (periodMetrics.revenueTrend < -20) {
      list.push({ icon: TrendingDown, type: "danger", title: "Queda na receita", description: `Receita caiu ${Math.abs(periodMetrics.revenueTrend).toFixed(0)}% nos últimos 15 dias. Revise campanhas de tráfego, preços e disponibilidade de estoque.` });
    }

    if (refundRate > 10) {
      list.push({ icon: AlertTriangle, type: "danger", title: "Taxa de reembolso alta", description: `${refundRate.toFixed(1)}% das compras foram reembolsadas. Revise a qualidade dos produtos, descrições e expectativas do cliente.` });
    }

    if (totalRemoveFromCart > totalAddToCart * 0.3 && totalRemoveFromCart > 5) {
      list.push({ icon: ShoppingCart, type: "warning", title: "Alta remoção de itens do carrinho", description: `${totalRemoveFromCart} remoções para ${totalAddToCart} adições. Produtos ${topRemovedProducts.slice(0, 2).map(p => `"${p.name}"`).join(" e ")} são os mais removidos. Verifique preços e informações.` });
    }

    if (buyerMetrics.avgTimeToPurchaseHrs > 0 && buyerMetrics.avgTimeToPurchaseHrs < 1) {
      list.push({ icon: Zap, type: "success", title: "Decisão de compra rápida", description: `Tempo médio de ${(buyerMetrics.avgTimeToPurchaseHrs * 60).toFixed(0)} minutos entre primeira visualização e compra. Seus produtos têm boa conversão imediata.` });
    } else if (buyerMetrics.avgTimeToPurchaseHrs > 48) {
      list.push({ icon: Timer, type: "info", title: "Ciclo de compra longo", description: `Média de ${buyerMetrics.avgTimeToPurchaseHrs.toFixed(0)}h entre visualização e compra. Implemente remarketing, e-mails de carrinho abandonado e urgência (estoque limitado).` });
    }

    if (totalSearches > 10 && totalSearches > totalViews * 0.3) {
      list.push({ icon: Search, type: "info", title: "Alta busca interna", description: `${totalSearches} buscas internas detectadas. Usuários estão ativamente procurando produtos — otimize a experiência de busca e categorie melhor seu catálogo.` });
    }

    if (list.length === 0 && ecomEvents.length > 0) {
      list.push({ icon: Lightbulb, type: "info", title: "Dados em coleta", description: "Continue acumulando dados para gerar insights mais precisos. Recomendamos pelo menos 7 dias de dados para análises robustas." });
    }

    return list;
  }, [cartAbandonment, overallConversion, buyerMetrics, periodMetrics, refundRate, totalRemoveFromCart, totalAddToCart, topRemovedProducts, totalSearches, totalViews, ecomEvents.length]);

  /* ── Funnel ── */
  const ecommerceFunnelTotals = [
    { label: "Visualização", value: totalViews, color: "#3b82f6", width: 80 },
    { label: "Carrinho", value: totalAddToCart, color: "#8b5cf6", width: 60 },
    { label: "Checkout", value: totalCheckout, color: "#f59e0b", width: 40 },
    { label: "Compra", value: totalPurchases, color: "#22c55e", width: 30 },
  ];

  /* ── Heatmap: Day × Hour for ecommerce events ── */
  const heatmapData = useMemo(() => {
    const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const grid: number[][] = DAYS.map(() => Array(24).fill(0));
    ecomEvents.forEach(e => {
      const d = new Date(e.created_at);
      const dayIdx = (d.getDay() + 6) % 7;
      grid[dayIdx][d.getHours()]++;
    });
    return DAYS.map((day, i) => ({ day, hours: grid[i].map((value, hour) => ({ hour, value })) }));
  }, [ecomEvents]);

  const heatmapMax = useMemo(() => Math.max(...heatmapData.flatMap(d => d.hours.map(h => h.value)), 1), [heatmapData]);

  /* ── Session-level heatmap (unique sessions per hour) ── */
  const sessionHeatmapData = useMemo(() => {
    const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const grid: Set<string>[][] = DAYS.map(() => Array.from({ length: 24 }, () => new Set<string>()));
    ecomEvents.forEach(e => {
      if (!e.session_id) return;
      const d = new Date(e.created_at);
      const dayIdx = (d.getDay() + 6) % 7;
      grid[dayIdx][d.getHours()].add(e.session_id);
    });
    return DAYS.map((day, i) => ({ day, hours: grid[i].map((set, hour) => ({ hour, value: set.size })) }));
  }, [ecomEvents]);

  const sessionHeatmapMax = useMemo(() => Math.max(...sessionHeatmapData.flatMap(d => d.hours.map(h => h.value)), 1), [sessionHeatmapData]);

  /* ── Peak activity ── */
  const peakActivity = useMemo(() => {
    let maxVal = 0, peakDay = "", peakHour = 0;
    heatmapData.forEach(d => d.hours.forEach(h => { if (h.value > maxVal) { maxVal = h.value; peakDay = d.day; peakHour = h.hour; } }));
    return { day: peakDay, hour: peakHour, value: maxVal };
  }, [heatmapData]);

  /* ── Product performance ── */
  const productPerformance = useMemo(() => {
    const map = new Map<string, { views: number; addToCart: number; purchases: number; revenue: number; lastPrice: number; removals: number }>();
    ecomEvents.forEach(e => {
      const name = e.product_name || "Desconhecido";
      const entry = map.get(name) || { views: 0, addToCart: 0, purchases: 0, revenue: 0, lastPrice: 0, removals: 0 };
      if (e.event_type === "view_item") entry.views++;
      if (e.event_type === "add_to_cart") entry.addToCart++;
      if (e.event_type === "remove_from_cart") entry.removals++;
      if (e.event_type === "purchase") {
        entry.purchases++;
        entry.revenue += e.cart_value || e.product_price || 0;
      }
      if (e.product_price) entry.lastPrice = e.product_price;
      map.set(name, entry);
    });
    return Array.from(map.entries()).map(([name, v]) => ({
      name, ...v,
      conversionRate: v.views > 0 ? Number(((v.purchases / v.views) * 100).toFixed(1)) : 0,
      cartToSaleRate: v.addToCart > 0 ? Number(((v.purchases / v.addToCart) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.revenue - a.revenue || b.views - a.views);
  }, [ecomEvents]);

  /* ── URL-level analytics ── */
  const urlAnalytics = useMemo(() => {
    const map = new Map<string, {
      url: string; totalEvents: number; views: number; addToCart: number;
      checkout: number; purchases: number; revenue: number; searches: number;
      events: TrackingEvent[];
    }>();
    ecomEvents.forEach(e => {
      const url = e.page_url || "(sem URL)";
      const entry = map.get(url) || { url, totalEvents: 0, views: 0, addToCart: 0, checkout: 0, purchases: 0, revenue: 0, searches: 0, events: [] };
      entry.totalEvents++;
      entry.events.push(e);
      if (e.event_type === "view_item") entry.views++;
      if (e.event_type === "add_to_cart") entry.addToCart++;
      if (e.event_type === "begin_checkout") entry.checkout++;
      if (e.event_type === "purchase") { entry.purchases++; entry.revenue += e.cart_value || e.product_price || 0; }
      if (e.event_type === "search") entry.searches++;
      map.set(url, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.totalEvents - a.totalEvents);
  }, [ecomEvents]);

  /* ── Search terms ── */
  const searchTerms = useMemo(() => {
    const map = new Map<string, number>();
    ecomEvents.filter(e => e.event_type === "search" && e.cta_text).forEach(e => map.set(e.cta_text!, (map.get(e.cta_text!) || 0) + 1));
    return Array.from(map.entries()).map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count);
  }, [ecomEvents]);

  /* ── Revenue donut ── */
  const revenueDonut = useMemo(() => {
    return productPerformance.filter(p => p.revenue > 0).slice(0, 8).map((p, i) => ({
      name: p.name.length > 20 ? p.name.substring(0, 18) + "…" : p.name,
      value: p.revenue,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [productPerformance]);

  /* ── Events by day ── */
  const ecommerceFunnelByDay = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    ecomEvents.forEach(e => {
      const day = new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const entry = map.get(day) || { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0 };
      if (entry[e.event_type] !== undefined) entry[e.event_type]++;
      map.set(day, entry);
    });
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  }, [ecomEvents]);

  /* ── Revenue by day ── */
  const revenueByDay = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; purchases: number; avgTicket: number }>();
    ecomEvents.filter(e => e.event_type === "purchase").forEach(e => {
      const day = new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const entry = map.get(day) || { date: day, revenue: 0, purchases: 0, avgTicket: 0 };
      entry.revenue += e.cart_value || e.product_price || 0;
      entry.purchases++;
      map.set(day, entry);
    });
    return Array.from(map.values()).map(d => ({ ...d, avgTicket: d.purchases > 0 ? d.revenue / d.purchases : 0 }));
  }, [ecomEvents]);

  /* ── Device breakdown ── */
  const deviceBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    ecomEvents.filter(e => e.event_type === "purchase").forEach(e => {
      const device = e.device || "Desconhecido";
      const entry = map.get(device) || { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += e.cart_value || e.product_price || 0;
      map.set(device, entry);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, value: v.count, revenue: v.revenue })).sort((a, b) => b.value - a.value);
  }, [ecomEvents]);

  /* ── Hourly purchase distribution ── */
  const hourlyPurchases = useMemo(() => {
    const hours = Array(24).fill(0);
    ecomEvents.filter(e => e.event_type === "purchase").forEach(e => {
      hours[new Date(e.created_at).getHours()]++;
    });
    return hours.map((count, hour) => ({ hour: `${String(hour).padStart(2, "0")}h`, count }));
  }, [ecomEvents]);

  /* ── Recent events log ── */
  const recentEvents = ecomEvents.slice(0, 30);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const hasData = ecomEvents.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Banner ── */}
      <FeatureBanner
        icon={ShoppingCart}
        title="E-commerce Intelligence"
        description={<>Acompanhe o <strong>funil de e-commerce completo</strong> com insights automáticos, métricas de comportamento de compra, análise de recompra e recomendações acionáveis para maximizar sua receita.</>}
      />

      {/* ── KPI Grid with trends ── */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SparkKpi label="Receita Líquida" value={fmtCurrency(netRevenue)} color="hsl(var(--success))" icon={DollarSign} trend={periodMetrics.revenueTrend} trendLabel="vs 15d ant." />
        <SparkKpi label="Compras" value={fmt(totalPurchases)} color="hsl(var(--success))" icon={Receipt} trend={periodMetrics.purchasesTrend} trendLabel="vs 15d ant." />
        <SparkKpi label="Ticket Médio" value={fmtCurrency(avgTicket)} color="hsl(var(--chart-7))" icon={Tag} />
        <SparkKpi label="Taxa Conversão" value={overallConversion.toFixed(1)} suffix="%" color="hsl(var(--primary))" icon={Percent} />
        <SparkKpi label="Abandono Carrinho" value={cartAbandonment.toFixed(1)} suffix="%" color="hsl(var(--warning))" icon={ShoppingCart} />
      </StaggeredGrid>

      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SparkKpi label="Visualizações" value={fmt(totalViews)} color="hsl(var(--info))" icon={Eye} trend={periodMetrics.viewsTrend} trendLabel="vs 15d ant." />
        <SparkKpi label="Add Carrinho" value={fmt(totalAddToCart)} color="hsl(var(--primary))" icon={ShoppingCart} trend={periodMetrics.cartTrend} trendLabel="vs 15d ant." />
        <SparkKpi label="Removidos" value={fmt(totalRemoveFromCart)} color="hsl(var(--warning))" icon={ArrowDownRight} />
        <SparkKpi label="Checkouts" value={fmt(totalCheckout)} color="hsl(var(--chart-5))" icon={CreditCard} />
        <SparkKpi label="Cart→Checkout" value={cartToCheckout.toFixed(1)} suffix="%" color="hsl(var(--primary))" icon={TrendingUp} />
        <SparkKpi label="Checkout→Compra" value={checkoutToPurchase.toFixed(1)} suffix="%" color="hsl(var(--success))" icon={TrendingUp} />
      </StaggeredGrid>

      {/* ── Buyer Behavior Metrics ── */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SparkKpi label="Compradores Únicos" value={fmt(buyerMetrics.totalBuyers)} color="hsl(var(--primary))" icon={Users} />
        <SparkKpi label="Compradores Recorrentes" value={fmt(buyerMetrics.repeatBuyers)} color="hsl(var(--success))" icon={Repeat} suffix={buyerMetrics.totalBuyers > 0 ? ` (${buyerMetrics.repeatRate.toFixed(0)}%)` : ""} />
        <SparkKpi label="Tempo Médio p/ Compra" value={buyerMetrics.avgTimeToPurchaseHrs > 0 ? (buyerMetrics.avgTimeToPurchaseHrs < 1 ? `${(buyerMetrics.avgTimeToPurchaseHrs * 60).toFixed(0)}min` : `${buyerMetrics.avgTimeToPurchaseHrs.toFixed(1)}h`) : "—"} color="hsl(var(--info))" icon={Timer} />
        <SparkKpi label="Reembolsos" value={fmt(totalRefunds)} color="hsl(var(--destructive))" icon={ArrowDownLeft} suffix={refundRate > 0 ? ` (${refundRate.toFixed(1)}%)` : ""} />
      </StaggeredGrid>

      {/* ── AI Insights Panel ── */}
      {insights.length > 0 && (
        <AnimatedContainer>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Insights & Recomendações Automáticas</h3>
              <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30">{insights.length} insights</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight, i) => (
                <InsightItem key={i} {...insight} />
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* ── Visual Funnel (polished trapezoid) ── */}
      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Funil de Conversão E-commerce" subtitle="Pipeline completo: Visualização → Carrinho → Checkout → Compra" />
          <style>{`
            @keyframes funnelArrowBounce {
              0%, 100% { transform: translateY(0); opacity: 0.7; }
              50% { transform: translateY(3px); opacity: 1; }
            }
            .funnel-arrow { animation: funnelArrowBounce 1.5s ease-in-out infinite; }
            .funnel-step-bar { transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
            .funnel-step-bar:hover { filter: brightness(1.15); transform: scaleY(1.04); }
          `}</style>
          <div className="flex flex-col items-center py-6 max-w-lg mx-auto">
            {ecommerceFunnelTotals.map((step, i) => {
              const prevVal = i > 0 ? ecommerceFunnelTotals[i - 1].value : null;
              const convPct = prevVal && prevVal > 0 ? ((step.value / prevVal) * 100).toFixed(1) : null;
              const dropPct = prevVal && prevVal > 0 ? (((prevVal - step.value) / prevVal) * 100).toFixed(1) : null;
              const topW = step.width;
              const bottomW = i < ecommerceFunnelTotals.length - 1 ? ecommerceFunnelTotals[i + 1].width : step.width - 6;
              const topInset = ((100 - topW) / 2).toFixed(1);
              const botInset = ((100 - bottomW) / 2).toFixed(1);

              return (
                <div key={step.label} className="flex flex-col items-center w-full">
                  {i > 0 && (
                    <div className="flex items-center gap-2.5 py-1.5">
                      <svg width="16" height="22" viewBox="0 0 16 22" className="funnel-arrow text-muted-foreground/60">
                        <path d="M8 0 L8 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M3 12 L8 19 L13 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-success">{convPct}%</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[9px] text-destructive/70">-{dropPct}% drop</span>
                      </div>
                    </div>
                  )}
                  <div
                    className="funnel-step-bar relative flex items-center justify-center cursor-default"
                    style={{
                      width: "100%",
                      height: "52px",
                      background: `linear-gradient(180deg, ${step.color}ee, ${step.color}bb)`,
                      clipPath: `polygon(${topInset}% 0%, ${100 - Number(topInset)}% 0%, ${100 - Number(botInset)}% 100%, ${botInset}% 100%)`,
                      boxShadow: `0 6px 24px ${step.color}40, inset 0 1px 0 ${step.color}66`,
                    }}
                  >
                    <div className="flex items-center gap-3 z-10">
                      <span className="text-sm font-bold text-white drop-shadow-md tracking-wide">{step.label}</span>
                      <span className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white">{fmt(step.value)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!hasData && <p className="text-center text-xs text-muted-foreground mt-2">Instale o Pixel Rankito para começar a capturar dados do funil.</p>}
        </Card>
      </AnimatedContainer>

      {/* ── Heatmaps: Events + Sessions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.03}>
          <Card className="p-5">
            <ChartHeader title="Mapa de Calor — Eventos E-commerce" subtitle="Descubra quais dias e horários têm mais ações de e-commerce" />
            {peakActivity.value > 0 && (
              <p className="text-[10px] text-muted-foreground mb-3">
                🔥 Pico: <strong className="text-foreground">{peakActivity.day} às {String(peakActivity.hour).padStart(2, "0")}h</strong> ({peakActivity.value} eventos) — <span className="text-info">ideal para campanhas e promoções relâmpago</span>
              </p>
            )}
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="flex gap-0.5 mb-1 pl-10">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center text-[8px] text-muted-foreground">{h}</div>
                  ))}
                </div>
                {heatmapData.map(row => (
                  <div key={row.day} className="flex gap-0.5 items-center mb-0.5">
                    <span className="w-10 text-[10px] text-muted-foreground text-right pr-1.5 shrink-0">{row.day}</span>
                    {row.hours.map(cell => {
                      const intensity = heatmapMax > 0 ? cell.value / heatmapMax : 0;
                      return (
                        <div
                          key={cell.hour}
                          className="flex-1 aspect-square rounded-[2px] transition-colors"
                          style={{ backgroundColor: intensity > 0 ? `color-mix(in srgb, hsl(var(--primary)) ${Math.round(intensity * 100)}%, hsl(var(--muted)))` : "hsl(var(--muted)/0.3)" }}
                          title={`${row.day} ${String(cell.hour).padStart(2, "0")}h: ${cell.value} eventos`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.04}>
          <Card className="p-5">
            <ChartHeader title="Mapa de Calor — Sessões E-commerce" subtitle="Volume de sessões únicas por dia e horário" />
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="flex gap-0.5 mb-1 pl-10">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center text-[8px] text-muted-foreground">{h}</div>
                  ))}
                </div>
                {sessionHeatmapData.map(row => (
                  <div key={row.day} className="flex gap-0.5 items-center mb-0.5">
                    <span className="w-10 text-[10px] text-muted-foreground text-right pr-1.5 shrink-0">{row.day}</span>
                    {row.hours.map(cell => {
                      const intensity = sessionHeatmapMax > 0 ? cell.value / sessionHeatmapMax : 0;
                      return (
                        <div
                          key={cell.hour}
                          className="flex-1 aspect-square rounded-[2px] transition-colors"
                          style={{ backgroundColor: intensity > 0 ? `color-mix(in srgb, hsl(var(--success)) ${Math.round(intensity * 100)}%, hsl(var(--muted)))` : "hsl(var(--muted)/0.3)" }}
                          title={`${row.day} ${String(cell.hour).padStart(2, "0")}h: ${cell.value} sessões`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ── Hourly Purchase Distribution ── */}
      <AnimatedContainer delay={0.045}>
        <Card className="p-5">
          <ChartHeader title="Distribuição Horária de Compras" subtitle="Identifique os melhores horários para campanhas e promoções" />
          <div className="h-[200px]">
            {hourlyPurchases.some(h => h.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyPurchases}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="hour" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Compras" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Sem dados de compras por horário</div>
            )}
          </div>
        </Card>
      </AnimatedContainer>

      {/* ── Revenue Trend + Stacked Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.05}>
          <Card className="p-5">
            <ChartHeader title="Receita ao Longo do Tempo" subtitle="Evolução diária de receita e ticket médio" />
            <div className="h-[280px]">
              {revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByDay}>
                    <defs>
                      <LineGlowGradient id="revTrend" color="hsl(var(--success))" />
                      <LineGlowGradient id="ticketTrend" color="hsl(var(--chart-7))" />
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="date" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [fmtCurrency(v), name === "revenue" ? "Receita" : "Ticket Médio"]} />
                    <Legend {...LEGEND_STYLE} />
                    <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--success))" fill="url(#revTrend)" strokeWidth={2.5} dot={{ r: 2.5, fill: "hsl(var(--success))" }} />
                    <Area type="monotone" dataKey="avgTicket" name="Ticket Médio" stroke="hsl(var(--chart-7))" fill="url(#ticketTrend)" strokeWidth={1.5} dot={{ r: 2, fill: "hsl(var(--chart-7))" }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Sem dados de receita ainda</div>
              )}
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="Eventos E-commerce por Dia" subtitle="Composição por tipo de evento ao longo do tempo" />
            <div className="h-[280px]">
              {ecommerceFunnelByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ecommerceFunnelByDay}>
                    <defs>
                      {Object.entries(ECOM_COLORS).map(([key, color]) => (
                        <LineGlowGradient key={key} id={`ecom-${key}`} color={color} />
                      ))}
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="date" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend {...LEGEND_STYLE} />
                    <Area type="monotone" dataKey="view_item" stackId="1" stroke={ECOM_COLORS.view_item} fill="url(#ecom-view_item)" strokeWidth={1.5} name="View Item" />
                    <Area type="monotone" dataKey="add_to_cart" stackId="1" stroke={ECOM_COLORS.add_to_cart} fill="url(#ecom-add_to_cart)" strokeWidth={1.5} name="Add Carrinho" />
                    <Area type="monotone" dataKey="begin_checkout" stackId="1" stroke={ECOM_COLORS.begin_checkout} fill="url(#ecom-begin_checkout)" strokeWidth={1.5} name="Checkout" />
                    <Area type="monotone" dataKey="purchase" stackId="1" stroke={ECOM_COLORS.purchase} fill="url(#ecom-purchase)" strokeWidth={1.5} name="Compra" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Sem dados de eventos ainda</div>
              )}
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ── Product Performance Table (enhanced) ── */}
      <AnimatedContainer delay={0.15}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" /> Performance por Produto
              </h3>
              <p className="text-[10px] text-muted-foreground">Conversão, receita, remoções e métricas por produto rastreado</p>
            </div>
            <Badge variant="secondary" className="text-[9px]">{productPerformance.length} produtos</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Produto</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Preço</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Views</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Carrinho</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Removidos</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Compras</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Receita</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Conv. View</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Conv. Cart</th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {productPerformance.length > 0 ? productPerformance.map(p => (
                  <tr key={p.name} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground max-w-[200px] truncate" title={p.name}>{p.name}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{p.lastPrice > 0 ? fmtCurrency(p.lastPrice) : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{fmt(p.views)}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{fmt(p.addToCart)}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-warning">{fmt(p.removals)}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-success">{fmt(p.purchases)}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-semibold text-foreground">{fmtCurrency(p.revenue)}</td>
                    <td className="px-4 py-2.5 text-xs text-right">
                      <Badge variant={p.conversionRate > 10 ? "default" : "secondary"} className="text-[9px]">{p.conversionRate}%</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-right">
                      <Badge variant={p.cartToSaleRate > 50 ? "default" : "secondary"} className="text-[9px]">{p.cartToSaleRate}%</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {p.purchases > 0 ? (
                        <Badge className="text-[9px] bg-success/15 text-success border-success/30">Vendido</Badge>
                      ) : p.addToCart > 0 ? (
                        <Badge className="text-[9px] bg-warning/15 text-warning border-warning/30">No Carrinho</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px]">Apenas Visto</Badge>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum produto rastreado ainda. Configure o Pixel Rankito no seu e-commerce.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ── Revenue Donut + Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.2}>
          <Card className="p-5">
            <ChartHeader title="Receita por Produto" subtitle="Distribuição de receita entre os produtos mais vendidos" />
            <div className="h-[260px]">
              {revenueDonut.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))" animationDuration={900}>
                      {revenueDonut.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => fmtCurrency(v)} />
                    <Legend {...LEGEND_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Sem receita registrada</div>
              )}
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.25}>
          <Card className="p-5">
            <ChartHeader title="Pipeline Visual" subtitle="Barras verticais proporcionais por etapa do funil" />
            <PipelineVisual steps={ecommerceFunnelTotals} />
          </Card>
        </AnimatedContainer>
      </div>

      {/* ── Product Bar Chart + Devices/Search ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedContainer delay={0.3} className="lg:col-span-2">
          <Card className="p-5">
            <ChartHeader title="Top Produtos — Views vs Compras" subtitle="Compare engajamento e conversão dos principais produtos" />
            <div className="h-[280px]">
              {productPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productPerformance.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis type="number" {...AXIS_STYLE} />
                    <YAxis dataKey="name" type="category" width={120} {...AXIS_STYLE} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend {...LEGEND_STYLE} />
                    <Bar dataKey="views" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} name="Views" />
                    <Bar dataKey="addToCart" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Carrinho" />
                    <Bar dataKey="purchases" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="Compras" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Sem dados de produtos</div>
              )}
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.35}>
          <Card className="p-5 space-y-5">
            {/* Device breakdown with revenue */}
            <div>
              <ChartHeader title="Compras por Dispositivo" subtitle="Vendas e receita por dispositivo" />
              {deviceBreakdown.length > 0 ? (
                <div className="space-y-2 mt-3">
                  {deviceBreakdown.map((d, i) => {
                    const total = deviceBreakdown.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : "0";
                    const DevIcon = d.name.toLowerCase().includes("mobile") ? Smartphone : Monitor;
                    return (
                      <div key={d.name} className="flex items-center gap-2">
                        <DevIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-foreground">{d.name}</span>
                            <span className="text-[10px] text-muted-foreground">{d.value} ({pct}%) · {fmtCurrency(d.revenue)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${pct}%`,
                              background: CHART_COLORS[i % CHART_COLORS.length],
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-3">Sem dados</p>
              )}
            </div>

            {/* Top removed products */}
            {topRemovedProducts.length > 0 && (
              <div>
                <ChartHeader title="Mais Removidos do Carrinho" subtitle="Produtos que os usuários mais desistem" />
                <div className="space-y-2 mt-3">
                  {topRemovedProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <ArrowDownRight className="h-3 w-3 text-warning shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-medium text-foreground truncate" title={p.name}>{p.name}</span>
                          <Badge variant="secondary" className="text-[9px] shrink-0">{p.count}×</Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div className="h-full rounded-full bg-warning" style={{
                            width: `${(p.count / (topRemovedProducts[0]?.count || 1)) * 100}%`,
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search terms */}
            <div>
              <ChartHeader title="Termos de Busca" subtitle="Palavras buscadas no seu site" />
              {searchTerms.length > 0 ? (
                <div className="space-y-2 mt-3">
                  {searchTerms.slice(0, 6).map((t, i) => (
                    <div key={t.term} className="flex items-center gap-2">
                      <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-medium text-foreground truncate" title={t.term}>{t.term}</span>
                          <Badge variant="secondary" className="text-[9px] shrink-0">{t.count}×</Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${(t.count / (searchTerms[0]?.count || 1)) * 100}%`,
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-3">Nenhuma busca registrada</p>
              )}
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ── URL-Level Analytics ── */}
      <AnimatedContainer delay={0.4}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Análise por URL
              </h3>
              <p className="text-[10px] text-muted-foreground">Detalhamento de eventos e-commerce por página — clique para expandir</p>
            </div>
            <Badge variant="secondary" className="text-[9px]">{urlAnalytics.length} URLs</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase w-8"></th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">URL</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Eventos</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Views</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Carrinho</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Compras</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Receita</th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {urlAnalytics.length > 0 ? urlAnalytics.map(u => {
                  const isExpanded = expandedUrl === u.url;
                  const convRate = u.views > 0 ? ((u.purchases / u.views) * 100).toFixed(1) : "0.0";
                  return (
                    <>
                      <tr key={u.url} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setExpandedUrl(isExpanded ? null : u.url)}>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium text-foreground max-w-[300px] truncate" title={u.url}>
                          <span className="flex items-center gap-1.5">
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                            {u.url}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{fmt(u.totalEvents)}</td>
                        <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{fmt(u.views)}</td>
                        <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{fmt(u.addToCart)}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-medium text-success">{fmt(u.purchases)}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-semibold text-foreground">{fmtCurrency(u.revenue)}</td>
                        <td className="px-4 py-2.5 text-center">
                          {u.purchases > 0 ? (
                            <Badge className="text-[9px] bg-success/15 text-success border-success/30">{convRate}%</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px]">{convRate}%</Badge>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${u.url}-detail`}>
                          <td colSpan={99} className="bg-muted/10 px-6 py-3 border-b border-border/50">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Últimos eventos nesta URL</p>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                              {u.events.slice(0, 15).map(ev => (
                                <div key={ev.id} className="flex items-center gap-3 text-[11px]">
                                  <span className="text-muted-foreground shrink-0 w-[110px]">{new Date(ev.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                                  <Badge
                                    className="text-[9px] shrink-0"
                                    style={{
                                      backgroundColor: `color-mix(in srgb, ${ECOM_COLORS[ev.event_type] || "hsl(var(--muted))"} 15%, transparent)`,
                                      color: ECOM_COLORS[ev.event_type] || "hsl(var(--muted-foreground))",
                                      borderColor: `color-mix(in srgb, ${ECOM_COLORS[ev.event_type] || "hsl(var(--muted))"} 30%, transparent)`,
                                    }}
                                  >
                                    {ECOM_LABELS[ev.event_type] || ev.event_type}
                                  </Badge>
                                  {ev.product_name && <span className="text-foreground font-medium truncate" title={ev.product_name}>{ev.product_name}</span>}
                                  {(ev.cart_value || ev.product_price) ? <span className="text-success font-semibold shrink-0">{fmtCurrency(ev.cart_value || ev.product_price || 0)}</span> : null}
                                  {ev.device && <span className="text-muted-foreground shrink-0">· {ev.device}</span>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                }) : (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma URL com eventos de e-commerce registrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ── Recent Events Log ── */}
      <AnimatedContainer delay={0.45}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Log de Eventos E-commerce
              </h3>
              <p className="text-[10px] text-muted-foreground">Últimos 30 eventos de e-commerce capturados em tempo real</p>
            </div>
            <Badge variant="secondary" className="text-[9px]">{ecomEvents.length} total</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Data/Hora</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Evento</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Produto</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">URL</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Dispositivo</th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.length > 0 ? recentEvents.map(ev => (
                  <tr key={ev.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(ev.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        className="text-[9px]"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${ECOM_COLORS[ev.event_type] || "hsl(var(--muted))"} 15%, transparent)`,
                          color: ECOM_COLORS[ev.event_type] || "hsl(var(--muted-foreground))",
                          borderColor: `color-mix(in srgb, ${ECOM_COLORS[ev.event_type] || "hsl(var(--muted))"} 30%, transparent)`,
                        }}
                      >
                        {ECOM_LABELS[ev.event_type] || ev.event_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground max-w-[160px] truncate" title={ev.product_name || "—"}>{ev.product_name || "—"}</td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground max-w-[200px] truncate" title={ev.page_url || "—"}>{ev.page_url || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium">
                      {(ev.cart_value || ev.product_price) ? (
                        <span className="text-success">{fmtCurrency(ev.cart_value || ev.product_price || 0)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{ev.device || "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      {ev.event_type === "purchase" ? (
                        <Badge className="text-[9px] bg-success/15 text-success border-success/30">Venda</Badge>
                      ) : ev.event_type === "refund" ? (
                        <Badge className="text-[9px] bg-destructive/15 text-destructive border-destructive/30">Reembolso</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px]">E-commerce</Badge>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum evento de e-commerce capturado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
