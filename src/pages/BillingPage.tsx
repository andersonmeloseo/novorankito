import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "R$ 97",
    period: "/mês",
    features: ["1 projeto", "5.000 eventos/mês", "GSC + GA4", "Relatórios básicos", "1 usuário"],
    current: false,
  },
  {
    name: "Pro",
    price: "R$ 247",
    period: "/mês",
    features: ["5 projetos", "50.000 eventos/mês", "Todas integrações", "Agente IA", "5 usuários", "Indexação GSC API"],
    current: true,
  },
  {
    name: "Business",
    price: "R$ 497",
    period: "/mês",
    features: ["Projetos ilimitados", "500.000 eventos/mês", "Todas integrações", "Agente IA avançado", "Usuários ilimitados", "API + Webhooks", "Suporte prioritário"],
    current: false,
  },
];

const INVOICES = [
  { date: "01/02/2026", plan: "Pro", amount: "R$ 247,00", status: "pago" },
  { date: "01/01/2026", plan: "Pro", amount: "R$ 247,00", status: "pago" },
  { date: "01/12/2025", plan: "Starter", amount: "R$ 97,00", status: "pago" },
];

export default function BillingPage() {
  return (
    <>
      <TopBar title="Billing & Planos" subtitle="Gerencie sua assinatura, faturas e uso de recursos" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Plans */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Planos Disponíveis</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <Card key={plan.name} className={`p-5 ${plan.current ? "border-primary ring-1 ring-primary" : ""}`}>
                {plan.current && (
                  <Badge className="text-[9px] mb-3">Plano Atual</Badge>
                )}
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-1 mb-4">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-success flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.current ? "outline" : "default"}
                  size="sm"
                  className="w-full text-xs"
                  disabled={plan.current}
                >
                  {plan.current ? "Plano Atual" : "Mudar para este plano"}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Usage */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Consumo Atual
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Projetos", used: 2, limit: 5 },
              { label: "Eventos/mês", used: 18420, limit: 50000 },
              { label: "Usuários", used: 3, limit: 5 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground font-medium">{item.used.toLocaleString()} / {item.limit.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(item.used / item.limit) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Invoices */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Histórico de Faturas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Data", "Plano", "Valor", "Status", ""].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-foreground">{inv.date}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.plan}</td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">{inv.amount}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="text-[10px] bg-success/10 text-success border-0">{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="text-xs h-7">PDF</Button>
                    </td>
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
