import { useParams, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calculateValuation, type ValuationResult } from "@/lib/valuation-engine";
import {
  Globe, DollarSign, Users, Layers, TrendingUp, Lightbulb,
  Pencil, ArrowRight, Building2, FileSignature
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const MONETIZATION_STATUS: Record<string, { label: string; color: string }> = {
  disponivel: { label: "Disponível", color: "bg-success/10 text-success" },
  em_negociacao: { label: "Em negociação", color: "bg-warning/10 text-warning" },
  alugado: { label: "Alugado", color: "bg-primary/10 text-primary" },
  suspenso: { label: "Suspenso", color: "bg-destructive/10 text-destructive" },
  encerrado: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

const PAGE_STATUS: Record<string, { label: string; color: string }> = {
  disponivel: { label: "Disponível", color: "bg-success/10 text-success" },
  alugada: { label: "Alugada", color: "bg-primary/10 text-primary" },
  reservada: { label: "Reservada", color: "bg-warning/10 text-warning" },
};

export default function RRProjectMonetizationPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["rr-project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId!).single();
      return data;
    },
    enabled: !!projectId,
  });

  const { data: contracts } = useQuery({
    queryKey: ["rr-project-contracts", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("rr_contracts").select("*, rr_clients(company_name)").eq("project_id", projectId!);
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: pages } = useQuery({
    queryKey: ["rr-project-pages", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("rr_pages").select("*, rr_clients(company_name)").eq("project_id", projectId!);
      return data || [];
    },
    enabled: !!projectId,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("projects").update({ monetization_status: status }).eq("id", projectId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-project", projectId] });
      toast.success("Status atualizado!");
    },
  });

  if (!project) return null;

  const activeContracts = contracts?.filter(c => c.status === "active") || [];
  const totalRevenue = activeContracts.reduce((s, c) => s + Number(c.monthly_value), 0);
  const totalTraffic = pages?.reduce((s, p) => s + p.traffic, 0) || 0;
  const totalLeads = pages?.reduce((s, p) => s + p.leads, 0) || 0;
  const totalConv = pages?.reduce((s, p) => s + p.conversions, 0) || 0;
  const rentedCount = pages?.filter(p => p.status === "alugada").length || 0;
  const occupancy = (pages?.length || 0) > 0 ? (rentedCount / pages!.length) * 100 : 0;

  const projectValuation = calculateValuation({
    traffic: totalTraffic,
    leads: totalLeads,
    conversions: totalConv,
    niche: project.site_type,
    currentMonthlyRevenue: totalRevenue,
  });

  const st = MONETIZATION_STATUS[project.monetization_status] || MONETIZATION_STATUS.disponivel;

  return (
    <>
      <TopBar title={`Monetização — ${project.name}`} subtitle={`${project.domain} · Gestão de aluguel do projeto`} />
      <div className="p-4 sm:p-6 space-y-5 overflow-auto">
        {/* Status & Valuation Header */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4 border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Status de Monetização</p>
              <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
            </div>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(MONETIZATION_STATUS).map(([key, val]) => (
                <Button
                  key={key}
                  variant={project.monetization_status === key ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => updateStatus.mutate(key)}
                >
                  {val.label}
                </Button>
              ))}
            </div>
          </Card>
          <KpiCard label="Receita Mensal" value={totalRevenue} change={0} prefix="R$" />
          <KpiCard label="Ocupação" value={Number(occupancy.toFixed(1))} change={0} suffix="%" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Valor Estimado</p>
              </div>
              <span className="text-lg font-bold text-foreground">
                R$ {projectValuation.suggestedMinPrice.toLocaleString("pt-BR")} – {projectValuation.suggestedMaxPrice.toLocaleString("pt-BR")}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">CPC: ${projectValuation.cpcUsed} · Multiplicador: {projectValuation.multiplier.toFixed(2)}x</p>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="pages">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="pages" className="text-xs">Aluguel por Páginas</TabsTrigger>
            <TabsTrigger value="project" className="text-xs">Aluguel do Projeto</TabsTrigger>
            <TabsTrigger value="valuation" className="text-xs">Valuation</TabsTrigger>
          </TabsList>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{pages?.length || 0} páginas neste projeto</p>
              <Button size="sm" className="text-xs" onClick={() => navigate("/rank-rent/pages")}>
                Gerenciar Páginas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground p-3">URL</th>
                        <th className="text-left font-medium text-muted-foreground p-3">Status</th>
                        <th className="text-right font-medium text-muted-foreground p-3">Tráfego</th>
                        <th className="text-right font-medium text-muted-foreground p-3">Leads</th>
                        <th className="text-right font-medium text-muted-foreground p-3">Valor</th>
                        <th className="text-left font-medium text-muted-foreground p-3">Cliente</th>
                        <th className="text-right font-medium text-muted-foreground p-3">Preço Sugerido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages?.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma página cadastrada</td></tr>
                      )}
                      {pages?.map((pg: any) => {
                        const pgSt = PAGE_STATUS[pg.status] || PAGE_STATUS.disponivel;
                        const pgVal = calculateValuation({ traffic: pg.traffic, leads: pg.leads, conversions: pg.conversions, niche: pg.niche || project.site_type });
                        return (
                          <tr key={pg.id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3 font-medium text-primary truncate max-w-[180px]">{pg.url}</td>
                            <td className="p-3"><Badge variant="outline" className={`text-[10px] ${pgSt.color}`}>{pgSt.label}</Badge></td>
                            <td className="p-3 text-right tabular-nums">{pg.traffic.toLocaleString()}</td>
                            <td className="p-3 text-right tabular-nums">{pg.leads}</td>
                            <td className="p-3 text-right tabular-nums font-medium">
                              {Number(pg.monthly_value) > 0 ? `R$ ${Number(pg.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                            </td>
                            <td className="p-3 text-muted-foreground">{pg.rr_clients?.company_name || "—"}</td>
                            <td className="p-3 text-right">
                              <span className="text-primary tabular-nums font-medium">
                                R$ {pgVal.suggestedMinPrice.toLocaleString("pt-BR")} – {pgVal.suggestedMaxPrice.toLocaleString("pt-BR")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project rental tab */}
          <TabsContent value="project" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{activeContracts.length} contratos ativos</p>
              <Button size="sm" className="text-xs" onClick={() => navigate("/rank-rent/contracts")}>
                Gerenciar Contratos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            {activeContracts.length === 0 ? (
              <Card className="p-8 text-center">
                <FileSignature className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum contrato ativo. Crie um contrato para alugar este projeto inteiro.</p>
                <Button size="sm" className="mt-3 text-xs" onClick={() => navigate("/rank-rent/contracts")}>Criar Contrato</Button>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {activeContracts.map((c: any) => (
                  <Card key={c.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.rr_clients?.company_name || "Sem cliente"}</p>
                          <p className="text-[10px] text-muted-foreground">Contrato {c.contract_type === "project" ? "Projeto inteiro" : "Por página"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-success/10 text-success">Ativo</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-[10px] text-muted-foreground">Valor Mensal</p>
                        <p className="font-semibold">R$ {Number(c.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-[10px] text-muted-foreground">Próx. Cobrança</p>
                        <p className="font-semibold">{c.next_billing ? new Date(c.next_billing).toLocaleDateString("pt-BR") : "—"}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Valuation tab */}
          <TabsContent value="valuation" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Valuation Engine</h3>
                  <p className="text-xs text-muted-foreground">Cálculo automático do valor do ativo baseado em dados reais</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tráfego Total</p>
                  <p className="text-lg font-bold text-foreground">{totalTraffic.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Valor: R$ {projectValuation.trafficValue.toLocaleString("pt-BR")}/mês</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Leads Gerados</p>
                  <p className="text-lg font-bold text-foreground">{totalLeads}</p>
                  <p className="text-[10px] text-muted-foreground">Valor: R$ {projectValuation.leadValue.toLocaleString("pt-BR")}/mês</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversões</p>
                  <p className="text-lg font-bold text-foreground">{totalConv}</p>
                  <p className="text-[10px] text-muted-foreground">Potencial: R$ {projectValuation.conversionPotential.toLocaleString("pt-BR")}/mês</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CPC do Nicho</p>
                  <p className="text-lg font-bold text-primary">${projectValuation.cpcUsed.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">Nicho: {project.site_type || "padrão"}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <p className="text-sm font-semibold text-foreground">Preço Sugerido pela IA</p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  R$ {projectValuation.suggestedMinPrice.toLocaleString("pt-BR")} – R$ {projectValuation.suggestedMaxPrice.toLocaleString("pt-BR")}/mês
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Este valor é calculado com base no tráfego ({totalTraffic.toLocaleString()} visitas), {totalLeads} leads gerados,
                  CPC médio do nicho (${projectValuation.cpcUsed}) e potencial de conversão. Multiplicador aplicado: {projectValuation.multiplier.toFixed(2)}x.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
