import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { mockConversions } from "@/lib/mock-data";
import { ArrowRight } from "lucide-react";

const FUNNEL_STEPS = [
  { label: "Visualizações", value: 18420, pct: 100 },
  { label: "Clique no CTA", value: 4280, pct: 23 },
  { label: "Envio de Formulário", value: 1240, pct: 7 },
  { label: "Página de Obrigado", value: 842, pct: 5 },
];

export default function ConversionsPage() {
  return (
    <>
      <TopBar title="Conversões" subtitle="Acompanhe suas metas, funis e taxas de conversão" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total de Conversões" value={842} change={22.3} />
          <KpiCard label="Taxa de Conversão" value={4.57} change={3.1} suffix="%" />
          <KpiCard label="Receita" value={48290} change={18.6} prefix="R$" />
          <KpiCard label="Valor Médio" value={57.35} change={5.2} prefix="R$" />
        </div>

        {/* Funnel */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Funil de Conversão</h3>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {FUNNEL_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                <div className="flex-1">
                  <div
                    className="bg-primary/10 rounded-lg p-3 text-center"
                    style={{ opacity: 0.4 + (step.pct / 100) * 0.6 }}
                  >
                    <div className="text-lg font-bold text-primary">{step.value.toLocaleString("pt-BR")}</div>
                    <div className="text-[10px] text-muted-foreground">{step.label}</div>
                    <div className="text-[10px] font-medium text-primary">{step.pct}%</div>
                  </div>
                </div>
                {i < FUNNEL_STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </Card>

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
                {mockConversions.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{c.event === "purchase" ? "compra" : c.event === "lead_form" ? "formulário" : "newsletter"}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{c.page}</td>
                    <td className="px-4 py-3 text-xs text-foreground font-medium">{c.value ? `R$ ${c.value.toFixed(2).replace(".", ",")}` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.source}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.device === "mobile" ? "Celular" : "Desktop"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
