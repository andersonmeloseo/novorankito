import { TopBar } from "@/components/layout/TopBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Building2, FileText, BarChart3, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  disponivel: { label: "Disponível", color: "bg-success/10 text-success" },
  em_negociacao: { label: "Em negociação", color: "bg-warning/10 text-warning" },
  alugado: { label: "Alugado", color: "bg-primary/10 text-primary" },
  suspenso: { label: "Suspenso", color: "bg-destructive/10 text-destructive" },
  encerrado: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

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

  const totalRevenue = contracts?.reduce((s, c) => s + Number(c.monthly_value), 0) || 0;
  const activeContracts = contracts?.filter(c => c.status === "active").length || 0;
  const totalPages = pages?.length || 0;
  const rentedPages = pages?.filter(p => p.status === "alugada").length || 0;
  const availablePages = pages?.filter(p => p.status === "disponivel").length || 0;
  const occupancy = totalPages > 0 ? ((rentedPages / totalPages) * 100) : 0;

  return (
    <>
      <TopBar title="Rank & Rent" subtitle="Visão geral de monetização dos seus projetos e páginas" />
      <div className="p-4 sm:p-6 space-y-5 overflow-auto">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Receita Mensal" value={totalRevenue} change={0} prefix="R$" />
          <KpiCard label="Contratos Ativos" value={activeContracts} change={0} />
          <KpiCard label="Clientes" value={clients?.length || 0} change={0} />
          <KpiCard label="Ocupação" value={Number(occupancy.toFixed(1))} change={0} suffix="%" />
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-tight">Meus Projetos</CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate("/rank-rent/availability")}>
                Ver Disponibilidade <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-3">Projeto</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Domínio</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Nicho</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Valor Mensal</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Páginas</th>
                  </tr>
                </thead>
                <tbody>
                  {projects?.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum projeto encontrado. Crie seu primeiro projeto.</td></tr>
                  )}
                  {projects?.map((p, i) => {
                    const st = STATUS_LABELS[p.monetization_status] || STATUS_LABELS.disponivel;
                    const projectContracts = contracts?.filter(c => c.project_id === p.id) || [];
                    const projectValue = projectContracts.reduce((s, c) => s + Number(c.monthly_value), 0);
                    const projectPages = pages?.filter(pg => pg.project_id === p.id).length || 0;
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate("/overview")}
                      >
                        <td className="p-3 font-medium text-foreground">{p.name}</td>
                        <td className="p-3 text-muted-foreground">{p.domain}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{p.site_type || "—"}</td>
                        <td className="p-3 text-right tabular-nums font-medium">R$ {projectValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right tabular-nums">{projectPages}</td>
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
            { label: "Clientes", desc: "Gerenciar CRM", icon: Building2, to: "/rank-rent/clients" },
            { label: "Contratos", desc: "Gerenciar contratos", icon: FileText, to: "/rank-rent/contracts" },
            { label: "Financeiro", desc: "Receitas e faturas", icon: DollarSign, to: "/rank-rent/financial" },
            { label: "Performance", desc: "Por cliente", icon: BarChart3, to: "/rank-rent/performance" },
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
