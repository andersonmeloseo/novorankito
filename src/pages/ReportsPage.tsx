import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, Mail, Webhook } from "lucide-react";

const REPORT_TEMPLATES = [
  { name: "Relatório Semanal de SEO", description: "Cliques, impressões, CTR, mudanças de posição, principais consultas", frequency: "Semanal", lastGenerated: "2026-02-10" },
  { name: "Relatório Mensal de Crescimento", description: "Usuários, sessões, conversões, tendências de receita, breakdown por canal", frequency: "Mensal", lastGenerated: "2026-02-01" },
  { name: "Relatório de Conversões", description: "Eventos de conversão, funis, atribuição, receita por origem", frequency: "Semanal", lastGenerated: "2026-02-10" },
  { name: "Resumo de Ads + CRO", description: "Performance de campanhas, CPA, ROAS, análise de melhor horário", frequency: "Quinzenal", lastGenerated: "2026-02-03" },
];

export default function ReportsPage() {
  return (
    <>
      <TopBar title="Relatórios" subtitle="Exportação & Agendamento" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Templates */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Modelos de Relatório</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {REPORT_TEMPLATES.map((r) => (
              <Card key={r.name} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">{r.name}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{r.frequency}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{r.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Último: {r.lastGenerated}</span>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                      <Download className="h-3 w-3" /> XLSX
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Agendamento
          </h3>
          <div className="space-y-3">
            {[
              { icon: Mail, label: "Entrega por e-mail", desc: "Enviar relatórios para team@acme.com toda segunda-feira às 9h", active: true },
              { icon: Webhook, label: "Webhook", desc: "POST para https://hooks.acme.com/reports", active: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-foreground">{s.label}</span>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
                <Badge variant={s.active ? "default" : "secondary"} className="text-[9px]">
                  {s.active ? "Ativo" : "Desativado"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
