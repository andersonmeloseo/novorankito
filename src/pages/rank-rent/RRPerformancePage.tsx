import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function RRPerformancePage() {
  const { user } = useAuth();

  const { data: contracts } = useQuery({
    queryKey: ["rr-perf-contracts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_contracts").select("*, rr_clients(company_name), projects(name)").eq("owner_id", user!.id).eq("status", "active");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: pages } = useQuery({
    queryKey: ["rr-perf-pages", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_pages").select("*").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Build per-client performance
  const clientPerf: Record<string, { name: string; revenue: number; traffic: number; leads: number; conversions: number; pages: number }> = {};
  contracts?.forEach((c: any) => {
    const clientName = c.rr_clients?.company_name || "Sem cliente";
    if (!clientPerf[clientName]) clientPerf[clientName] = { name: clientName, revenue: 0, traffic: 0, leads: 0, conversions: 0, pages: 0 };
    clientPerf[clientName].revenue += Number(c.monthly_value);
    // Aggregate pages for this client
    const clientPages = pages?.filter(p => p.client_id === c.client_id) || [];
    clientPerf[clientName].traffic += clientPages.reduce((s, p) => s + p.traffic, 0);
    clientPerf[clientName].leads += clientPages.reduce((s, p) => s + p.leads, 0);
    clientPerf[clientName].conversions += clientPages.reduce((s, p) => s + p.conversions, 0);
    clientPerf[clientName].pages += clientPages.length;
  });

  const perfData = Object.values(clientPerf);
  const chartData = perfData.map(p => ({ name: p.name, receita: p.revenue, leads: p.leads }));

  return (
    <>
      <TopBar title="Performance" subtitle="Dashboard de performance por cliente com tráfego, leads e ROI" />
      <div className="p-4 sm:p-6 space-y-5 overflow-auto">
        {/* Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Receita e Leads por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Receita (R$)" />
                    <Bar dataKey="leads" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Per-client cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {perfData.map((client, i) => (
            <motion.div key={client.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground">{client.pages} páginas vinculadas</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-md bg-muted/50 text-center">
                    <p className="text-[10px] text-muted-foreground">Receita/mês</p>
                    <p className="text-sm font-semibold tabular-nums">R$ {client.revenue.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/50 text-center">
                    <p className="text-[10px] text-muted-foreground">Tráfego</p>
                    <p className="text-sm font-semibold tabular-nums">{client.traffic.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/50 text-center">
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                    <p className="text-sm font-semibold tabular-nums">{client.leads}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/50 text-center">
                    <p className="text-[10px] text-muted-foreground">Conversões</p>
                    <p className="text-sm font-semibold tabular-nums">{client.conversions}</p>
                  </div>
                </div>
                {client.revenue > 0 && client.leads > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs text-muted-foreground">
                      CPL estimado: <strong className="text-foreground">R$ {(client.revenue / client.leads).toFixed(2)}</strong>
                    </span>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
          {perfData.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              Nenhum dado de performance. Crie contratos e vincule páginas para ver métricas.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
