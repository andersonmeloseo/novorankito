import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import {
  pluginEvents, ecommerceFunnelTotals, ecommerceFunnelByDay, productPerformance,
  EVENT_CATEGORIES, EVENT_LABELS,
} from "@/lib/plugin-mock-data";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { ShoppingCart, Package, CreditCard, TrendingUp, Search, DollarSign } from "lucide-react";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, ChartGradient, LineGlowGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, PipelineVisual,
} from "@/components/analytics/ChartPrimitives";

function generateSparkline(length = 12, base = 50, variance = 20): number[] {
  return Array.from({ length }, () => Math.max(0, base + Math.floor((Math.random() - 0.3) * variance)));
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80; const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return <svg width={w} height={h} className="ml-auto"><polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SparkKpi({ label, value, change, suffix, prefix, sparkData, color, icon: Icon }: {
  label: string; value: string | number; change: number; suffix?: string; prefix?: string;
  sparkData: number[]; color: string; icon?: React.ElementType;
}) {
  const isPositive = change >= 0;
  return (
    <Card className="p-3.5 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isPositive ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
            {isPositive ? "+" : ""}{change}%
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-base font-bold text-foreground font-display tracking-tight">{prefix}{value}{suffix}</span>
          <Sparkline data={sparkData} color={color} />
        </div>
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

export function EcommerceTrackingTab() {
  const ecomEvents = pluginEvents.filter(e => EVENT_CATEGORIES.ecommerce.includes(e.event_type));
  const totalViews = ecomEvents.filter(e => e.event_type === "product_view").length;
  const totalAddToCart = ecomEvents.filter(e => e.event_type === "add_to_cart").length;
  const totalCheckout = ecomEvents.filter(e => e.event_type === "begin_checkout").length;
  const totalPurchases = ecomEvents.filter(e => e.event_type === "purchase").length;
  const totalRevenue = ecomEvents.filter(e => e.event_type === "purchase").reduce((s, e) => s + (e.revenue || 0), 0);
  const totalSearches = ecomEvents.filter(e => e.event_type === "search").length;
  const cartToCheckout = totalAddToCart > 0 ? ((totalCheckout / totalAddToCart) * 100).toFixed(1) : "0";
  const checkoutToPurchase = totalCheckout > 0 ? ((totalPurchases / totalCheckout) * 100).toFixed(1) : "0";

  // Search terms breakdown
  const searchTerms = (() => {
    const map = new Map<string, number>();
    ecomEvents.filter(e => e.search_term).forEach(e => map.set(e.search_term!, (map.get(e.search_term!) || 0) + 1));
    return Array.from(map.entries()).map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count);
  })();

  // Product pie
  const productPie = productPerformance.map((p, i) => ({ name: p.name, value: p.views, fill: CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <SparkKpi label="Visualizações" value={totalViews} change={12.4} sparkData={generateSparkline(12, 40, 15)} color="hsl(var(--info))" icon={Package} />
        <SparkKpi label="Add Carrinho" value={totalAddToCart} change={8.1} sparkData={generateSparkline(12, 25, 10)} color="hsl(var(--primary))" icon={ShoppingCart} />
        <SparkKpi label="Checkouts" value={totalCheckout} change={5.8} sparkData={generateSparkline(12, 15, 6)} color="hsl(var(--warning))" icon={CreditCard} />
        <SparkKpi label="Compras" value={totalPurchases} change={18.3} sparkData={generateSparkline(12, 10, 5)} color="hsl(var(--success))" icon={TrendingUp} />
        <SparkKpi label="Receita" value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} change={22.1} sparkData={generateSparkline(12, 500, 200)} color="hsl(var(--success))" icon={DollarSign} />
        <SparkKpi label="Cart→Checkout" value={cartToCheckout} suffix="%" change={3.5} sparkData={generateSparkline(12, 60, 12)} color="hsl(var(--primary))" />
        <SparkKpi label="Checkout→Compra" value={checkoutToPurchase} suffix="%" change={7.9} sparkData={generateSparkline(12, 45, 10)} color="hsl(var(--success))" />
      </StaggeredGrid>

      {/* Visual Funnel */}
      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Funil de E-commerce" subtitle="Pipeline completo: Visualização → Carrinho → Checkout → Compra" />
          <div className="flex flex-col items-center py-4 gap-0">
            {ecommerceFunnelTotals.map((step, i) => {
              const fixedWidths = [100, 80, 50, 30];
              const widthPct = fixedWidths[i] || 30;
              const prevVal = i > 0 ? ecommerceFunnelTotals[i - 1].value : null;
              const dropRate = prevVal && prevVal > 0 ? (((prevVal - step.value) / prevVal) * 100).toFixed(1) : null;
              return (
                <div key={step.label} className="flex flex-col items-center w-full">
                  {dropRate && (
                    <div className="text-[10px] text-muted-foreground py-1">
                      ▼ {dropRate}% drop
                    </div>
                  )}
                  <div
                    className="relative flex items-center justify-center py-3 transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      background: step.color,
                      clipPath: i < ecommerceFunnelTotals.length - 1
                        ? "polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)"
                        : "polygon(4% 0%, 96% 0%, 92% 100%, 8% 100%)",
                      borderRadius: i === 0 ? "8px 8px 0 0" : i === ecommerceFunnelTotals.length - 1 ? "0 0 8px 8px" : "0",
                      boxShadow: `0 2px 16px ${step.color}44`,
                    }}
                  >
                    <div className="flex items-center gap-2 z-10">
                      <span className="text-xs font-bold text-white drop-shadow-sm">{step.label}</span>
                      <span className="text-white/80 text-[10px] font-semibold">{step.value.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </AnimatedContainer>

      {/* E-commerce events stacked area by day */}
      <AnimatedContainer delay={0.05}>
        <Card className="p-5">
          <ChartHeader title="Eventos E-commerce ao Longo do Tempo" subtitle="Stacked area — composição por tipo de evento" />
          <div className="h-[300px]">
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
                <Area type="monotone" dataKey="product_view" stackId="1" stroke={ECOM_COLORS.product_view} fill={`url(#ecom-product_view)`} strokeWidth={1.5} name="Visualização" />
                <Area type="monotone" dataKey="add_to_cart" stackId="1" stroke={ECOM_COLORS.add_to_cart} fill={`url(#ecom-add_to_cart)`} strokeWidth={1.5} name="Add Carrinho" />
                <Area type="monotone" dataKey="begin_checkout" stackId="1" stroke={ECOM_COLORS.begin_checkout} fill={`url(#ecom-begin_checkout)`} strokeWidth={1.5} name="Checkout" />
                <Area type="monotone" dataKey="purchase" stackId="1" stroke={ECOM_COLORS.purchase} fill={`url(#ecom-purchase)`} strokeWidth={1.5} name="Compra" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Product Performance + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="Performance por Produto" subtitle="Visualizações, Add Carrinho, Compras e Taxa de Conversão" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPerformance} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" width={120} {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                  <Bar dataKey="views" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} name="Views" />
                  <Bar dataKey="addToCart" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Carrinho" />
                  <Bar dataKey="purchases" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="Compras" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <ChartHeader title="Pipeline Visual E-commerce" subtitle="Barras verticais proporcionais por etapa" />
            <PipelineVisual steps={ecommerceFunnelTotals} />
          </Card>
        </AnimatedContainer>
      </div>

      {/* Donut Product Views + Search terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.2}>
          <Card className="p-5">
            <ChartHeader title="Distribuição por Produto" subtitle="Donut chart de visualizações" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={productPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                    {productPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.25}>
          <Card className="p-5">
            <ChartHeader title="Termos de Busca (WooCommerce/GTM)" subtitle="Palavras buscadas no site capturadas pelo plugin" />
            <div className="space-y-2">
              {searchTerms.slice(0, 8).map((t, i) => (
                <div key={t.term} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{t.term}</span>
                      <Badge variant="secondary" className="text-[9px]">{t.count}×</Badge>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${(t.count / (searchTerms[0]?.count || 1)) * 100}%`,
                        background: `linear-gradient(90deg, ${CHART_COLORS[i % CHART_COLORS.length]}88, ${CHART_COLORS[i % CHART_COLORS.length]})`,
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Revenue by product table */}
      <AnimatedContainer delay={0.3}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Receita por Produto</h3>
            <p className="text-[10px] text-muted-foreground">Dados do plugin WooCommerce — order_id e revenue capturados automaticamente</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Produto</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Views</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Carrinho</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Compras</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Receita</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {productPerformance.map((p) => (
                  <tr key={p.name} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{p.views}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{p.addToCart}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-success">{p.purchases}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-foreground">R$ {p.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-xs text-right">
                      <Badge variant={p.conversionRate > 10 ? "default" : "secondary"} className="text-[9px]">{p.conversionRate}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
