import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { StaggeredGrid } from "@/components/ui/animated-container";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
        <KpiCard label="Receita Total" value={totalRevenue} change={0} prefix="R$" />
        <KpiCard label="Compras" value={totalPurchases} change={0} />
        <KpiCard label="Compradores" value={totalPurchasers} change={0} />
        <KpiCard label="Ticket Médio" value={avgRevenue} change={0} prefix="R$" />
      </StaggeredGrid>

      {chartData.length > 1 && (
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Tendência de Receita</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-10))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--chart-10))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--chart-10))" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {topItems.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-foreground">Produtos Mais Vendidos</h3>
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
