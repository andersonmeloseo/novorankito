import { TopBar } from "@/components/layout/TopBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function RRFinancialPage() {
  const { user } = useAuth();

  const { data: contracts } = useQuery({
    queryKey: ["rr-contracts-fin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_contracts").select("*, projects(name), rr_clients(company_name)").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: invoices } = useQuery({
    queryKey: ["rr-invoices", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_invoices").select("*, rr_clients(company_name)").eq("owner_id", user!.id).order("due_date", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const activeContracts = contracts?.filter(c => c.status === "active") || [];
  const monthlyRevenue = activeContracts.reduce((s, c) => s + Number(c.monthly_value), 0);
  const annualProjection = monthlyRevenue * 12;
  const pendingInvoices = invoices?.filter(i => i.status === "pending") || [];
  const paidInvoices = invoices?.filter(i => i.status === "paid") || [];
  const totalReceived = paidInvoices.reduce((s, i) => s + Number(i.amount), 0);

  // Revenue by project chart data
  const revenueByProject: Record<string, number> = {};
  activeContracts.forEach((c: any) => {
    const name = c.projects?.name || "Sem projeto";
    revenueByProject[name] = (revenueByProject[name] || 0) + Number(c.monthly_value);
  });
  const chartData = Object.entries(revenueByProject).map(([name, value]) => ({ name, value }));

  return (
    <>
      <TopBar title="Financeiro" subtitle="Receitas, faturas e projeções de faturamento" />
      <div className="p-4 sm:p-6 space-y-5 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Receita Mensal" value={monthlyRevenue} change={0} prefix="R$" />
          <KpiCard label="Receita Acumulada" value={totalReceived} change={0} prefix="R$" />
          <KpiCard label="Projeção Anual" value={annualProjection} change={0} prefix="R$" />
          <KpiCard label="Faturas Pendentes" value={pendingInvoices.length} change={0} />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Revenue by Project */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Receita por Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de receita</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Últimas Faturas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground p-3">Cliente</th>
                      <th className="text-right font-medium text-muted-foreground p-3">Valor</th>
                      <th className="text-left font-medium text-muted-foreground p-3">Vencimento</th>
                      <th className="text-left font-medium text-muted-foreground p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices?.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhuma fatura</td></tr>
                    )}
                    {invoices?.slice(0, 8).map((inv: any) => (
                      <tr key={inv.id} className="border-b border-border">
                        <td className="p-3 text-foreground">{inv.rr_clients?.company_name || "—"}</td>
                        <td className="p-3 text-right tabular-nums font-medium">R$ {Number(inv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-muted-foreground">{new Date(inv.due_date).toLocaleDateString("pt-BR")}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] ${inv.status === "paid" ? "bg-success/10 text-success" : inv.status === "overdue" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                            {inv.status === "paid" ? "Pago" : inv.status === "overdue" ? "Atrasado" : "Pendente"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Client */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Receita por Cliente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-3">Cliente</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Receita Mensal</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Contratos</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const byClient: Record<string, { revenue: number; count: number }> = {};
                    activeContracts.forEach((c: any) => {
                      const name = c.rr_clients?.company_name || "Sem cliente";
                      if (!byClient[name]) byClient[name] = { revenue: 0, count: 0 };
                      byClient[name].revenue += Number(c.monthly_value);
                      byClient[name].count += 1;
                    });
                    return Object.entries(byClient).map(([name, data]) => (
                      <tr key={name} className="border-b border-border">
                        <td className="p-3 font-medium text-foreground">{name}</td>
                        <td className="p-3 text-right tabular-nums">R$ {data.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right tabular-nums">{data.count}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
