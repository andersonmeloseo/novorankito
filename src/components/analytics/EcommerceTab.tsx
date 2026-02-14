import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { StaggeredGrid } from "@/components/ui/animated-container";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader, ChartGradient } from "./ChartPrimitives";

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

  return (
    <div className="space-y-4">
      <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Receita Total" value={totalRevenue} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
        <KpiCard label="Compras" value={totalPurchases} change={0} sparklineColor="hsl(var(--chart-6))" />
        <KpiCard label="Compradores" value={totalPurchasers} change={0} sparklineColor="hsl(var(--chart-1))" />
        <KpiCard label="Ticket Médio" value={avgRevenue} change={0} prefix="R$" sparklineColor="hsl(var(--chart-7))" />
      </StaggeredGrid>

      {chartData.length > 1 && (
        <Card className="p-5">
          <ChartHeader title="Tendência de Receita & Compras" subtitle="Evolução diária de receita e volume de compras" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <defs>
                  <ChartGradient id="ecomRevGrad" color="hsl(var(--chart-9))" opacity={0.2} />
                  <ChartGradient id="ecomPurchGrad" color="hsl(var(--chart-6))" opacity={0.12} />
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} width={50} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--chart-9))" fill="url(#ecomRevGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="purchases" name="Compras" stroke="hsl(var(--chart-6))" fill="url(#ecomPurchGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

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
