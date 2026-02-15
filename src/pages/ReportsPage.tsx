import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, Mail, Webhook, Loader2, CheckCircle2 } from "lucide-react";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateSeoReport } from "@/lib/pdf-report";
import { toast } from "sonner";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  frequency: string;
  type: "seo" | "growth" | "conversions" | "ads";
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "seo-weekly", name: "Relatório Semanal de SEO", description: "Cliques, impressões, CTR, mudanças de posição, principais consultas e páginas", frequency: "Semanal", type: "seo" },
  { id: "growth-monthly", name: "Relatório Mensal de Crescimento", description: "Usuários, sessões, conversões, tendências e breakdown por canal", frequency: "Mensal", type: "growth" },
  { id: "conversions", name: "Relatório de Conversões", description: "Eventos de conversão, funis, atribuição, receita por origem", frequency: "Semanal", type: "conversions" },
  { id: "ads-cro", name: "Resumo de Ads + CRO", description: "Performance de campanhas, CPA, ROAS, análise de melhor horário", frequency: "Quinzenal", type: "ads" },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);
  
  const projectId = localStorage.getItem("rankito_current_project");

  const { data: project } = useQuery({
    queryKey: ["report-project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase.from("projects").select("id, name, domain").eq("id", projectId).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const { data: overviewData } = useQuery({
    queryKey: ["report-overview", projectId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_project_overview_v2", { p_project_id: projectId! });
      return data as any;
    },
    enabled: !!projectId,
  });

  const { data: ga4Data } = useQuery({
    queryKey: ["report-ga4", projectId],
    queryFn: async () => {
      try {
        const { data } = await supabase.functions.invoke("fetch-ga4-data", {
          body: { project_id: projectId, report_type: "overview", start_date: "28daysAgo", end_date: "yesterday" },
        });
        return data?.data || null;
      } catch { return null; }
    },
    enabled: !!projectId,
    retry: false,
  });

  const handleGeneratePdf = async (template: ReportTemplate) => {
    if (!project) {
      toast.error("Selecione um projeto primeiro");
      return;
    }

    setGenerating(template.id);
    
    try {
      // Small delay to show loading state
      await new Promise(r => setTimeout(r, 300));

      const formatCompact = (n: number) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
        return n.toLocaleString("pt-BR");
      };

      const totalClicks = overviewData?.total_clicks ?? 0;
      const totalImpressions = overviewData?.total_impressions ?? 0;
      const avgCtr = overviewData?.avg_ctr ?? 0;
      const avgPosition = overviewData?.avg_position ?? 0;
      const totalPages = overviewData?.total_urls ?? 0;
      const totalQueries = overviewData?.total_queries ?? 0;

      const kpis = [
        { label: "Cliques", value: formatCompact(totalClicks) },
        { label: "Impressões", value: formatCompact(totalImpressions) },
        { label: "CTR Médio", value: `${avgCtr.toFixed(2)}%` },
        { label: "Posição Média", value: avgPosition > 0 ? avgPosition.toFixed(1) : "—" },
        { label: "Páginas", value: formatCompact(totalPages) },
        { label: "Keywords", value: formatCompact(totalQueries) },
      ];

      generateSeoReport({
        projectName: project.name,
        domain: project.domain,
        dateRange: "Últimos 28 dias",
        generatedAt: new Date().toLocaleString("pt-BR"),
        kpis,
        topPages: overviewData?.top_pages?.slice(0, 15) || [],
        topQueries: overviewData?.top_queries?.slice(0, 15) || [],
        indexing: overviewData ? {
          submitted: overviewData.indexing?.submitted || 0,
          inspected: overviewData.indexing?.inspected || 0,
          failed: overviewData.indexing?.failed || 0,
          pending: (overviewData.indexing?.total_urls || 0) - (overviewData.indexing?.submitted || 0),
          total: overviewData.indexing?.total_urls || 0,
        } : undefined,
        ga4: ga4Data ? {
          users: ga4Data.totalUsers || 0,
          sessions: ga4Data.sessions || 0,
          bounceRate: ga4Data.bounceRate,
          avgDuration: ga4Data.avgSessionDuration,
        } : undefined,
      });

      toast.success("PDF gerado com sucesso!", { description: "O download iniciou automaticamente." });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erro ao gerar PDF", { description: "Tente novamente." });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <>
      <TopBar title="Relatórios" subtitle="Crie, exporte e agende relatórios personalizados" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Templates */}
        <AnimatedContainer>
          <div>
            <h2 className="text-sm font-bold font-display text-foreground mb-3">Modelos de Relatório</h2>
            <StaggeredGrid className="grid sm:grid-cols-2 gap-3">
              {REPORT_TEMPLATES.map((r) => {
                const isGenerating = generating === r.id;
                return (
                  <Card key={r.id} className="p-4 card-hover border-border/60 group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <h3 className="text-sm font-bold font-display text-foreground">{r.name}</h3>
                      </div>
                      <Badge variant="secondary" className="text-[10px] rounded-full font-normal">{r.frequency}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{r.description}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs gap-1.5 flex-1"
                        onClick={() => handleGeneratePdf(r)}
                        disabled={isGenerating || !project}
                      >
                        {isGenerating ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Gerando...</>
                        ) : (
                          <><Download className="h-3 w-3" /> Baixar PDF</>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </StaggeredGrid>
          </div>
        </AnimatedContainer>

        {/* Quick Info */}
        {project && overviewData && (
          <AnimatedContainer delay={0.1}>
            <Card className="p-4 border-border/60 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs font-bold font-display text-foreground">Dados disponíveis para relatório</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Projeto <span className="font-semibold text-foreground">{project.name}</span> — {overviewData.total_clicks?.toLocaleString("pt-BR") || 0} cliques, {overviewData.total_urls?.toLocaleString("pt-BR") || 0} páginas, {overviewData.total_queries?.toLocaleString("pt-BR") || 0} keywords nos últimos 28 dias.
                {ga4Data && ` GA4: ${ga4Data.totalUsers?.toLocaleString("pt-BR") || 0} usuários.`}
              </p>
            </Card>
          </AnimatedContainer>
        )}

        {/* Schedule */}
        <AnimatedContainer delay={0.15}>
          <Card className="p-5 border-border/60">
            <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Calendar className="h-3.5 w-3.5 text-primary" />
              </div>
              Agendamento
            </h3>
            <div className="space-y-2.5">
              {[
                { icon: Mail, label: "Entrega por e-mail", desc: "Enviar relatórios automaticamente para sua equipe", active: true },
                { icon: Webhook, label: "Webhook", desc: "POST automático para seu endpoint", active: false },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-border transition-colors">
                  <div className="p-1.5 rounded-lg bg-muted">
                    <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground">{s.label}</span>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                  </div>
                  <Badge variant={s.active ? "default" : "secondary"} className="text-[9px] rounded-full">
                    {s.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      </div>
    </>
  );
}
