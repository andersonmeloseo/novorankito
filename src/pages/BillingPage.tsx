import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Zap, Loader2, ExternalLink, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STRIPE_PLANS = {
  start: {
    name: "Start",
    price: "R$ 97",
    period: "/mês",
    priceId: "price_1T1VifRvsu6nPBN1bgPaETX4",
    productId: "prod_TzUiyUrbaDCwAX",
    features: [
      "3 projetos",
      "1 conta GSC de indexação/projeto (200 URLs/dia)",
      "SEO + GA4 básicos",
      "Orquestrador IA — limitado (5 execuções/mês)",
      "Tracking Pixel básico",
      "1 usuário",
    ],
  },
  growth: {
    name: "Growth",
    price: "R$ 297",
    period: "/mês",
    priceId: "price_1T1VjfRvsu6nPBN1eAHvAPTy",
    productId: "prod_TzUjFnIptSNEkV",
    features: [
      "10 projetos",
      "Até 4 contas GSC de indexação/projeto (800 URLs/dia)",
      "SEO + GA4 completos",
      "Orquestrador IA — limitado (20 execuções/mês)",
      "Agente IA + relatórios WhatsApp",
      "Tracking Pixel v4.1 + Rank & Rent",
      "5 usuários",
    ],
  },
  unlimited: {
    name: "Unlimited",
    price: "R$ 697",
    period: "/mês",
    priceId: "price_1T1Vk6Rvsu6nPBN1Piw9lyMk",
    productId: "prod_TzUjdgygGogyta",
    features: [
      "Projetos ilimitados",
      "Contas GSC de indexação ilimitadas/projeto",
      "Orquestrador IA completo (ilimitado)",
      "White-label + domínio próprio",
      "API pública + Webhooks",
      "Usuários ilimitados",
      "Suporte prioritário + onboarding dedicado",
    ],
  },
};

const PLANS_LIST = [STRIPE_PLANS.start, STRIPE_PLANS.growth, STRIPE_PLANS.unlimited];

export default function BillingPage() {
  const { subscription, checkSubscription } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Check subscription on success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({ title: "Assinatura ativada!", description: "Seu plano foi atualizado com sucesso." });
      checkSubscription();
      window.history.replaceState({}, "", "/billing");
    }
  }, [checkSubscription]);

  const handleCheckout = async (priceId: string) => {
    setLoadingPlan(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao iniciar checkout", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao abrir portal", variant: "destructive" });
    } finally {
      setLoadingPortal(false);
    }
  };

  const currentProductId = subscription.product_id;

  return (
    <>
      <TopBar title="Billing & Planos" subtitle="Gerencie sua assinatura, faturas e uso de recursos" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Subscription Status */}
        {subscription.subscribed && (
          <Card className="p-5 border-success/30 bg-success/5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">Assinatura Ativa</p>
                  <p className="text-xs text-muted-foreground">
                    Renova em {subscription.subscription_end ? new Date(subscription.subscription_end).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                Gerenciar Assinatura
              </Button>
            </div>
          </Card>
        )}

        {/* Plans */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Planos Disponíveis</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS_LIST.map((plan) => {
              const isCurrent = currentProductId === plan.productId;
              return (
                <Card key={plan.name} className={`p-5 ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}>
                  {isCurrent && <Badge className="text-[9px] mb-3">Plano Atual</Badge>}
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
                    variant={isCurrent ? "outline" : "default"}
                    size="sm"
                    className="w-full text-xs"
                    disabled={isCurrent || loadingPlan === plan.priceId}
                    onClick={() => handleCheckout(plan.priceId)}
                  >
                    {loadingPlan === plan.priceId && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    {isCurrent ? "Plano Atual" : "Assinar este plano"}
                  </Button>
                </Card>
              );
            })}
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
      </div>
    </>
  );
}
