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
} from "lucide-react";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, LineGlowGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, PipelineVisual,
} from "@/components/analytics/ChartPrimitives";

/* ── Spark KPI card ── */
function SparkKpi({ label, value, prefix, suffix, color, icon: Icon }: {
  label: string; value: string | number; prefix?: string; suffix?: string;
  color: string; icon?: React.ElementType;
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
      </div>
    </Card>
  );
}

const ECOM_COLORS: Record<string, string> = {
  product_view: "hsl(var(--info))",
  add_to_cart: "hsl(var(--primary))",
  remove_from_cart: "hsl(var(--warning))",
  begin_checkout: "hsl(var(--chart-5))",
  purchase: "hsl(var(--success))",
  search: "hsl(var(--chart-9))",
};

const ECOM_LABELS: Record<string, string> = {
  product_view: "Visualização Produto",
  add_to_cart: "Adicionar ao Carrinho",
  remove_from_cart: "Remover do Carrinho",
  begin_checkout: "Início Checkout",
  purchase: "Compra",
  search: "Busca",
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
  const totalViews = ecomEvents.filter(e => e.event_type === "product_view").length;
  const totalAddToCart = ecomEvents.filter(e => e.event_type === "add_to_cart").length;
  const totalRemoveFromCart = ecomEvents.filter(e => e.event_type === "remove_from_cart").length;
  const totalCheckout = ecomEvents.filter(e => e.event_type === "begin_checkout").length;
  const totalPurchases = ecomEvents.filter(e => e.event_type === "purchase").length;
  const totalRevenue = ecomEvents.filter(e => e.event_type === "purchase").reduce((s, e) => s + (e.cart_value || e.product_price || 0), 0);
  const totalSearches = ecomEvents.filter(e => e.event_type === "search").length;
  const avgTicket = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;
  const cartToCheckout = totalAddToCart > 0 ? ((totalCheckout / totalAddToCart) * 100) : 0;
  const checkoutToPurchase = totalCheckout > 0 ? ((totalPurchases / totalCheckout) * 100) : 0;
  const overallConversion = totalViews > 0 ? ((totalPurchases / totalViews) * 100) : 0;
  const cartAbandonment = totalAddToCart > 0 ? (((totalAddToCart - totalPurchases) / totalAddToCart) * 100) : 0;

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
    const map = new Map<string, { views: number; addToCart: number; purchases: number; revenue: number; lastPrice: number }>();
    ecomEvents.forEach(e => {
      const name = e.product_name || "Desconhecido";
      const entry = map.get(name) || { views: 0, addToCart: 0, purchases: 0, revenue: 0, lastPrice: 0 };
      if (e.event_type === "product_view") entry.views++;
      if (e.event_type === "add_to_cart") entry.addToCart++;
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
      if (e.event_type === "product_view") entry.views++;
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
      const entry = map.get(day) || { product_view: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0 };
      if (entry[e.event_type] !== undefined) entry[e.event_type]++;
      map.set(day, entry);
    });
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  }, [ecomEvents]);

  /* ── Revenue by day ── */
  const revenueByDay = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; purchases: number }>();
    ecomEvents.filter(e => e.event_type === "purchase").forEach(e => {
      const day = new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const entry = map.get(day) || { date: day, revenue: 0, purchases: 0 };
      entry.revenue += e.cart_value || e.product_price || 0;
      entry.purchases++;
      map.set(day, entry);
    });
    return Array.from(map.values());
  }, [ecomEvents]);

  /* ── Device breakdown ── */
  const deviceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    ecomEvents.filter(e => e.event_type === "purchase").forEach(e => {
      const device = e.device || "Desconhecido";
      map.set(device, (map.get(device) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
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
        title="E-commerce Tracking"
        description={<>Acompanhe o <strong>funil de e-commerce completo</strong>: visualizações de produto, adições ao carrinho, checkouts e compras. O Pixel Rankito captura automaticamente receita, taxas de conversão e drop-offs entre cada etapa.</>}
      />

      {/* ── KPI Grid ── */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SparkKpi label="Receita Total" value={fmtCurrency(totalRevenue)} color="hsl(var(--success))" icon={DollarSign} />
        <SparkKpi label="Compras" value={fmt(totalPurchases)} color="hsl(var(--success))" icon={Receipt} />
        <SparkKpi label="Ticket Médio" value={fmtCurrency(avgTicket)} color="hsl(var(--chart-7))" icon={Tag} />
        <SparkKpi label="Taxa Conversão" value={overallConversion.toFixed(1)} suffix="%" color="hsl(var(--primary))" icon={Percent} />
        <SparkKpi label="Abandono Carrinho" value={cartAbandonment.toFixed(1)} suffix="%" color="hsl(var(--warning))" icon={ShoppingCart} />
      </StaggeredGrid>

      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SparkKpi label="Visualizações" value={fmt(totalViews)} color="hsl(var(--info))" icon={Eye} />
        <SparkKpi label="Add Carrinho" value={fmt(totalAddToCart)} color="hsl(var(--primary))" icon={ShoppingCart} />
        <SparkKpi label="Removidos" value={fmt(totalRemoveFromCart)} color="hsl(var(--warning))" icon={ArrowDownRight} />
        <SparkKpi label="Checkouts" value={fmt(totalCheckout)} color="hsl(var(--chart-5))" icon={CreditCard} />
        <SparkKpi label="Cart→Checkout" value={cartToCheckout.toFixed(1)} suffix="%" color="hsl(var(--primary))" icon={TrendingUp} />
        <SparkKpi label="Checkout→Compra" value={checkoutToPurchase.toFixed(1)} suffix="%" color="hsl(var(--success))" icon={TrendingUp} />
      </StaggeredGrid>

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
                  {/* Animated arrow + conversion label */}
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
                  {/* Trapezoid step */}
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
                Pico: <strong className="text-foreground">{peakActivity.day} às {String(peakActivity.hour).padStart(2, "0")}h</strong> ({peakActivity.value} eventos)
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

      {/* ── Revenue Trend + Stacked Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.05}>
          <Card className="p-5">
            <ChartHeader title="Receita ao Longo do Tempo" subtitle="Evolução diária de receita e número de compras" />
            <div className="h-[280px]">
              {revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByDay}>
                    <defs>
                      <LineGlowGradient id="revTrend" color="hsl(var(--success))" />
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="date" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === "revenue" ? fmtCurrency(v) : v, name === "revenue" ? "Receita" : "Compras"]} />
                    <Legend {...LEGEND_STYLE} />
                    <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--success))" fill="url(#revTrend)" strokeWidth={2.5} dot={{ r: 2.5, fill: "hsl(var(--success))" }} />
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
                    <Area type="monotone" dataKey="product_view" stackId="1" stroke={ECOM_COLORS.product_view} fill="url(#ecom-product_view)" strokeWidth={1.5} name="Visualização" />
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

      {/* ── Product Performance Table ── */}
      <AnimatedContainer delay={0.15}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" /> Performance por Produto
              </h3>
              <p className="text-[10px] text-muted-foreground">Conversão, receita e métricas por produto rastreado</p>
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
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Compras</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Receita</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Conv.</th>
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
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-success">{fmt(p.purchases)}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-semibold text-foreground">{fmtCurrency(p.revenue)}</td>
                    <td className="px-4 py-2.5 text-xs text-right">
                      <Badge variant={p.conversionRate > 10 ? "default" : "secondary"} className="text-[9px]">{p.conversionRate}%</Badge>
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
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum produto rastreado ainda. Configure o Pixel Rankito no seu e-commerce.</td></tr>
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
            {/* Device breakdown */}
            <div>
              <ChartHeader title="Compras por Dispositivo" subtitle="De onde vêm suas vendas" />
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
                            <span className="text-[10px] text-muted-foreground">{d.value} ({pct}%)</span>
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
