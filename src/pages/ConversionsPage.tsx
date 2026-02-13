import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useConversions } from "@/hooks/use-data-modules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

const EVENT_LABELS: Record<string, string> = {
  form: "Formulário",
  call: "Ligação",
  cta_click: "Clique CTA",
  purchase: "Compra",
  lead: "Lead",
  newsletter: "Newsletter",
};

export default function ConversionsPage() {
  const { user } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id").limit(1);
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;
  const { data: conversions = [], isLoading } = useConversions(projectId);

  const totalConversions = conversions.length;
  const totalRevenue = conversions.reduce((s: number, c: any) => s + Number(c.value || 0), 0);
  const avgValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;

  // Funnel - count by event_type
  const formCount = conversions.filter((c: any) => c.event_type === "form").length;
  const ctaCount = conversions.filter((c: any) => c.event_type === "cta_click").length;
  const leadCount = conversions.filter((c: any) => c.event_type === "lead" || c.event_type === "form").length;
  const purchaseCount = conversions.filter((c: any) => c.event_type === "purchase").length;

  const funnelSteps = [
    { label: "Cliques CTA", value: ctaCount || 0, pct: 100 },
    { label: "Formulários", value: formCount || 0, pct: ctaCount ? Math.round((formCount / ctaCount) * 100) : 0 },
    { label: "Leads", value: leadCount || 0, pct: ctaCount ? Math.round((leadCount / ctaCount) * 100) : 0 },
    { label: "Compras", value: purchaseCount || 0, pct: ctaCount ? Math.round((purchaseCount / ctaCount) * 100) : 0 },
  ];

  return (
    <>
      <TopBar title="Conversões" subtitle="Acompanhe suas metas, funis e taxas de conversão" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total de Conversões" value={totalConversions} change={0} />
          <KpiCard label="Taxa de Conversão" value={0} change={0} suffix="%" />
          <KpiCard label="Receita" value={totalRevenue} change={0} prefix="R$" />
          <KpiCard label="Valor Médio" value={Number(avgValue.toFixed(2))} change={0} prefix="R$" />
        </div>

        {/* Funnel */}
        {totalConversions > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Funil de Conversão</h3>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {funnelSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                  <div className="flex-1">
                    <div className="bg-primary/10 rounded-lg p-3 text-center" style={{ opacity: 0.4 + (step.pct / 100) * 0.6 }}>
                      <div className="text-lg font-bold text-primary">{step.value.toLocaleString("pt-BR")}</div>
                      <div className="text-[10px] text-muted-foreground">{step.label}</div>
                      <div className="text-[10px] font-medium text-primary">{step.pct}%</div>
                    </div>
                  </div>
                  {i < funnelSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Conversions Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Conversões Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Evento", "Página", "Valor", "Origem", "Dispositivo", "Data"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">Carregando...</td></tr>
                ) : conversions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma conversão registrada.</td></tr>
                ) : (
                  conversions.map((c: any) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{EVENT_LABELS[c.event_type] || c.event_type}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{c.page || "—"}</td>
                      <td className="px-4 py-3 text-xs text-foreground font-medium">{c.value ? `R$ ${Number(c.value).toFixed(2).replace(".", ",")}` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.source || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.device || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(c.converted_at), "dd/MM HH:mm")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
