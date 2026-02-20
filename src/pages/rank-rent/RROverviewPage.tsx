import { TopBar } from "@/components/layout/TopBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, Building2, FileText, BarChart3, ArrowRight,
  Gem, PieChart, Layers, Store, Coins
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { calculateValuation, calculatePortfolioValue } from "@/lib/valuation-engine";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  disponivel: { label: "Disponível", color: "bg-success/10 text-success" },
  em_negociacao: { label: "Em negociação", color: "bg-warning/10 text-warning" },
  alugado: { label: "Alugado", color: "bg-primary/10 text-primary" },
  suspenso: { label: "Suspenso", color: "bg-destructive/10 text-destructive" },
  encerrado: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--muted))"];

export default function RROverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: projects } = useQuery({
    queryKey: ["rr-projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: contracts } = useQuery({
    queryKey: ["rr-contracts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_contracts").select("*").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: clients } = useQuery({
    queryKey: ["rr-clients", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_clients").select("*").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: pages } = useQuery({
    queryKey: ["rr-pages", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_pages").select("*").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Computed metrics
  const activeContracts = contracts?.filter(c => c.status === "active") || [];
  const totalMonthlyRevenue = activeContracts.reduce((s, c) => s + Number(c.monthly_value), 0);
  const annualProjected = totalMonthlyRevenue * 12;
  const totalPages = pages?.length || 0;
  const rentedPages = pages?.filter(p => p.status === "alugada").length || 0;
  const availablePages = pages?.filter(p => p.status === "disponivel").length || 0;
  const occupancyPct = totalPages > 0 ? (rentedPages / totalPages) * 100 : 0;

  // Valuation: calculate portfolio estimated value
  const totalTrafficValue = pages?.reduce((s, p) => {
    const v = calculateValuation({ traffic: p.traffic, leads: p.leads, conversions: p.conversions, niche: p.niche });
    return s + v.trafficValue;
  }, 0) || 0;
  const portfolioValue = calculatePortfolioValue(totalMonthlyRevenue, totalTrafficValue, projects?.length || 0);

  // Pie chart data for asset distribution
  const statusCounts = [
    { name: "Alugado", value: rentedPages },
    { name: "Disponível", value: availablePages },
    { name: "Reservada", value: pages?.filter(p => p.status === "reservada").length || 0 },
  ].filter(d => d.value > 0);

  return (
    <>
      <TopBar title="Meu Portfólio" subtitle="Patrimônio digital, receita recorrente e gestão de ativos" />
      <div className="p-4 sm:p-6 space-y-5 overflow-auto">
        {/* Hero KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <Gem className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Patrimônio Estimado</p>
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">
                R$ {portfolioValue >= 1000 ? `${(portfolioValue / 1000).toFixed(0)}K` : portfolioValue.toLocaleString("pt-BR")}
              </span>
            </Card>
          </motion.div>
          <KpiCard label="Receita Mensal" value={totalMonthlyRevenue} change={0} prefix="R$" />
          <KpiCard label="Receita Anual Projetada" value={annualProjected} change={0} prefix="R$" />
          <KpiCard label="% Ativos Alugados" value={Number(occupancyPct.toFixed(1))} change={0} suffix="%" />
          <KpiCard label="% Disponíveis" value={totalPages > 0 ? Number(((availablePages / totalPages) * 100).toFixed(1)) : 0} change={0} suffix="%" />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Asset Distribution Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Distribuição de Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              {statusCounts.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {statusCounts.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Adicione páginas para ver a distribuição</p>
              )}
              <div className="flex justify-center gap-4 mt-2">
                {statusCounts.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{s.name}: {s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Occupancy & Revenue Summary */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Projetos</p>
                  <p className="text-xl font-bold text-foreground mt-1">{projects?.length || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Clientes</p>
                  <p className="text-xl font-bold text-foreground mt-1">{clients?.length || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contratos Ativos</p>
                  <p className="text-xl font-bold text-foreground mt-1">{activeContracts.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Páginas</p>
                  <p className="text-xl font-bold text-foreground mt-1">{totalPages}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Ocupação do portfólio</span>
                  <span className="font-medium text-foreground">{occupancyPct.toFixed(0)}%</span>
                </div>
                <Progress value={occupancyPct} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Portfolio Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-tight">Meu Portfólio de Ativos</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate("/rank-rent/availability")}>
                  <Store className="h-3 w-3 mr-1" /> Marketplace
                </Button>
                <Button size="sm" className="text-xs h-7" onClick={() => navigate("/onboarding")}>
                  Novo Ativo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-3">Projeto</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Cliente Atual</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Valor Mensal</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Status</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Páginas</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Valor Estimado</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {projects?.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum ativo no portfólio. Crie seu primeiro projeto.</td></tr>
                  )}
                  {projects?.map((p, i) => {
                    const st = STATUS_LABELS[p.monetization_status] || STATUS_LABELS.disponivel;
                    const projectContracts = activeContracts.filter(c => c.project_id === p.id);
                    const projectValue = projectContracts.reduce((s, c) => s + Number(c.monthly_value), 0);
                    const projectPages = pages?.filter(pg => pg.project_id === p.id) || [];
                    const projectClient = projectContracts.length > 0
                      ? clients?.find(cl => cl.id === projectContracts[0].client_id)
                      : null;
                    
                    // Valuation for this project
                    const totalTraffic = projectPages.reduce((s, pg) => s + pg.traffic, 0);
                    const totalLeads = projectPages.reduce((s, pg) => s + pg.leads, 0);
                    const totalConv = projectPages.reduce((s, pg) => s + pg.conversions, 0);
                    const valuation = calculateValuation({ traffic: totalTraffic, leads: totalLeads, conversions: totalConv, niche: p.site_type, currentMonthlyRevenue: projectValue });
                    
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.domain}</p>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{projectClient?.company_name || "—"}</td>
                        <td className="p-3 text-right tabular-nums font-medium">
                          {projectValue > 0 ? `R$ ${projectValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                        </td>
                        <td className="p-3 text-right tabular-nums">{projectPages.length}</td>
                        <td className="p-3 text-right">
                          {valuation.estimatedMonthlyValue > 0 ? (
                            <span className="tabular-nums font-medium text-primary">
                              R$ {valuation.suggestedMinPrice.toLocaleString("pt-BR")} – {valuation.suggestedMaxPrice.toLocaleString("pt-BR")}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => navigate("/overview")}>
                              Entrar
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => navigate(`/rank-rent/project/${p.id}`)}>
                              Monetizar
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Clientes", desc: "CRM de clientes", icon: Building2, to: "/rank-rent/clients" },
            { label: "Contratos", desc: "Gestão de contratos", icon: FileText, to: "/rank-rent/contracts" },
            { label: "Financeiro", desc: "Receitas e faturas", icon: DollarSign, to: "/rank-rent/financial" },
            { label: "Performance", desc: "Dashboard por cliente", icon: BarChart3, to: "/rank-rent/performance" },
          ].map((item) => (
            <Card key={item.label} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(item.to)}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
