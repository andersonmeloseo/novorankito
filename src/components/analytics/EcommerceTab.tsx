import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { StaggeredGrid } from "@/components/ui/animated-container";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie, Label,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, LineGlowGradient, DonutCenterLabel, BarGradient, FunnelStep,
} from "./ChartPrimitives";

interface EcommerceTabProps {
  data: any;
}

export function EcommerceTab({ data }: EcommerceTabProps) {
  const revenueTrend = data?.revenueTrend || [];
  const topItems = data?.topItems || [];

  const totalRevenue = revenueTrend.reduce((s: number, r: any) => s + (r.totalRevenue || 0), 0);
  const totalPurchases = revenueTrend.reduce((s: number, r: any) => s + (r.ecommercePurchases || 0), 0);
  const totalPurchasers = revenueTrend.reduce((s: number, r: any) => s + (r.totalPurchasers || 0), 0);
  const avgRevenue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

  const chartData = revenueTrend.map((r: any) => ({
    date: (r.date || "").substring(4, 6) + "/" + (r.date || "").substring(6, 8),
    revenue: r.totalRevenue || 0,
    purchases: r.ecommercePurchases || 0,
  }));

  // ─── Product Funnel: views → cart → purchase ───
  const productFunnel = useMemo(() => {
    if (!topItems.length) return [];
    const totalViews = topItems.reduce((s: number, i: any) => s + (i.itemsViewed || 0), 0);
    const totalCart = topItems.reduce((s: number, i: any) => s + (i.itemsAddedToCart || 0), 0);
    const totalPurch = topItems.reduce((s: number, i: any) => s + (i.itemsPurchased || 0), 0);
    return [
      { name: "Visualizações", value: totalViews },
      { name: "Add ao Carrinho", value: totalCart },
      { name: "Compras", value: totalPurch },
    ];
  }, [topItems]);
  const maxFunnel = Math.max(...productFunnel.map(f => f.value), 1);

  // ─── Revenue donut by top items ───
  const revenueDonut = useMemo(() => {
    return topItems.slice(0, 6).map((i: any) => ({
      name: (i.itemName || "—").substring(0, 16),
      value: i.itemRevenue || 0,
    }));
  }, [topItems]);
  const totalItemRevenue = revenueDonut.reduce((s: number, d: any) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Receita Total" value={totalRevenue} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
        <KpiCard label="Compras" value={totalPurchases} change={0} sparklineColor="hsl(var(--chart-6))" />
        <KpiCard label="Compradores" value={totalPurchasers} change={0} sparklineColor="hsl(var(--chart-1))" />
        <KpiCard label="Ticket Médio" value={avgRevenue} change={0} prefix="R$" sparklineColor="hsl(var(--chart-7))" />
      </StaggeredGrid>

      {/* ─── Line Chart com Gradiente e Glow ─── */}
      {chartData.length > 1 && (
        <Card className="p-5">
          <ChartHeader title="Tendência de Receita & Compras" subtitle="Line chart com gradiente e glow" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <defs>
                  <LineGlowGradient id="ecomRevGlow" color="hsl(var(--chart-9))" />
                  <LineGlowGradient id="ecomPurchGlow" color="hsl(var(--chart-6))" />
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} width={50} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--chart-9))" fill="url(#ecomRevGlow)" strokeWidth={2.5} dot={{ r: 2.5, fill: "hsl(var(--chart-9))" }} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
                <Area type="monotone" dataKey="purchases" name="Compras" stroke="hsl(var(--chart-6))" fill="url(#ecomPurchGlow)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ─── Row 2: Product Funnel + Revenue Donut ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {productFunnel.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Funnel de Produtos" subtitle="Visualizações → Carrinho → Compras" />
            <div className="space-y-2">
              {productFunnel.map((f, i) => (
                <FunnelStep key={f.name} label={f.name} value={f.value} maxValue={maxFunnel} color={CHART_COLORS[i % CHART_COLORS.length]} index={i} />
              ))}
            </div>
          </Card>
        )}

        {revenueDonut.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Receita por Produto" subtitle="Distribuição de receita entre produtos" />
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} strokeWidth={0} animationDuration={900}>
                    {revenueDonut.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <Label content={<DonutCenterLabel value={`R$${totalItemRevenue.toLocaleString("pt-BR")}`} label="receita" />} />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {topItems.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-foreground">Produtos Mais Vendidos</h3>
          <AnalyticsDataTable
            columns={["Produto", "Visualizações", "Add ao Carrinho", "Compras", "Receita"]}
            rows={topItems.map((i: any) => [
              i.itemName || "—",
              (i.itemsViewed || 0).toLocaleString(),
              (i.itemsAddedToCart || 0).toLocaleString(),
              (i.itemsPurchased || 0).toLocaleString(),
              "R$ " + (i.itemRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            ])}
          />
        </>
      )}
    </div>
  );
}
