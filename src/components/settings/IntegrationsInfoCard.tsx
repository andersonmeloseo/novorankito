import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, ArrowRight, Workflow, Database, Globe } from "lucide-react";

const INTEGRATIONS = [
  {
    name: "n8n",
    desc: "Conecte workflows do n8n para automação avançada. Use webhooks como trigger ou a API para consultar dados.",
    how: "Crie um webhook no n8n → cole a URL acima → escolha o evento desejado.",
    badge: "Automação",
  },
  {
    name: "Zapier / Make",
    desc: "Use webhooks como trigger de Zaps ou cenários no Make para conectar com +5000 apps.",
    how: "Copie a URL de webhook do Zapier → cole aqui → selecione os eventos.",
    badge: "Automação",
  },
  {
    name: "Slack / Discord",
    desc: "Receba notificações em canais quando jobs completam, URLs são indexadas ou métricas atualizam.",
    how: "Crie um Incoming Webhook no Slack/Discord → cole a URL aqui → selecione eventos.",
    badge: "Notificações",
  },
  {
    name: "Power BI / Grafana",
    desc: "Puxe dados de SEO e analytics via API para criar dashboards visuais personalizados.",
    how: "Use a API Key + endpoint /metrics no conector REST do Power BI ou Grafana.",
    badge: "BI & Analytics",
  },
  {
    name: "CRM (Pipedrive, HubSpot)",
    desc: "Sincronize leads e conversões do Rank & Rent automaticamente com seu CRM.",
    how: "Use a API para consultar conversões ou webhooks para enviar leads em tempo real.",
    badge: "Vendas",
  },
];

export function IntegrationsInfoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Plug className="h-4 w-4" />
          Integrações possíveis
        </CardTitle>
        <CardDescription className="text-xs">
          Combine API Keys + Webhooks para conectar o Rankito com suas ferramentas favoritas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {INTEGRATIONS.map((int) => (
            <div key={int.name} className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{int.name}</span>
                <Badge variant="outline" className="text-[9px]">{int.badge}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{int.desc}</p>
              <div className="flex items-start gap-1.5 text-[10px] text-primary">
                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{int.how}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1.5">
            <Workflow className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">Fluxo típico</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
            <Badge variant="secondary" className="text-[9px]">Evento ocorre</Badge>
            <ArrowRight className="h-2.5 w-2.5" />
            <Badge variant="secondary" className="text-[9px]">Webhook dispara</Badge>
            <ArrowRight className="h-2.5 w-2.5" />
            <Badge variant="secondary" className="text-[9px]">n8n/Zapier processa</Badge>
            <ArrowRight className="h-2.5 w-2.5" />
            <Badge variant="secondary" className="text-[9px]">API consulta dados</Badge>
            <ArrowRight className="h-2.5 w-2.5" />
            <Badge variant="secondary" className="text-[9px]">Ação final</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
