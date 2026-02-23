import { useEffect, useState } from "react";
import { Check, Zap, Loader2, ExternalLink, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DbPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  billing_interval: string;
  stripe_price_id: string | null;
  projects_limit: number;
  members_limit: number;
  events_limit: number;
  ai_requests_limit: number;
  gsc_accounts_per_project: number;
  indexing_daily_limit: number;
  orchestrator_executions_limit: number;
  ga4_enabled: boolean;
  pixel_tracking_enabled: boolean;
  whatsapp_reports_enabled: boolean;
  api_access_enabled: boolean;
  webhooks_enabled: boolean;
  white_label_enabled: boolean;
  rank_rent_enabled: boolean;
  advanced_analytics_enabled: boolean;
  sort_order: number;
}

function fmt(v: number, suffix = ""): string {
  if (v === -1) return "Ilimitado";
  return v.toLocaleString("pt-BR") + suffix;
}

function buildFeatures(p: DbPlan): string[] {
  const f: string[] = [];
  f.push(`${fmt(p.projects_limit)} projeto${p.projects_limit !== 1 ? "s" : ""}`);
  f.push(`${fmt(p.gsc_accounts_per_project)} conta${p.gsc_accounts_per_project !== 1 ? "s" : ""} GSC/projeto (${fmt(p.indexing_daily_limit)} URLs/dia)`);
  f.push(p.advanced_analytics_enabled ? "SEO + GA4 completos" : "SEO + GA4 básicos");
  f.push(`Orquestrador IA — ${p.orchestrator_executions_limit === -1 ? "ilimitado" : `${fmt(p.orchestrator_executions_limit)} exec/mês`}`);
  if (p.whatsapp_reports_enabled) f.push("Relatórios WhatsApp");
  if (p.pixel_tracking_enabled) f.push("Tracking Pixel");
  if (p.rank_rent_enabled) f.push("Rank & Rent");
  if (p.white_label_enabled) f.push("White-label + domínio próprio");
  if (p.api_access_enabled) f.push("API pública");
  if (p.webhooks_enabled) f.push("Webhooks");
  f.push(`${fmt(p.members_limit)} usuário${p.members_limit !== 1 ? "s" : ""}`);
  return f;
}

export default function BillingPage() {
  const { subscription, checkSubscription } = useAuth();
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setPlans(data as DbPlan[]);
        setLoadingPlans(false);
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({ title: "Assinatura ativada!", description: "Seu plano foi atualizado com sucesso." });
      checkSubscription();
      window.history.replaceState({}, "", "/account/billing");
    }
  }, [checkSubscription]);

  const handleCheckout = async (priceId: string) => {
    setLoadingPlan(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
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
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao abrir portal", variant: "destructive" });
    } finally {
      setLoadingPortal(false);
    }
  };

  const currentPriceId = subscription.price_id;

  return (
    <div className="flex-1 bg-background">
      <header className="border-b p-4 sm:p-6">
        <h1 className="text-lg font-semibold text-foreground">Billing & Planos</h1>
        <p className="text-xs text-muted-foreground">Gerencie sua assinatura, faturas e uso de recursos</p>
      </header>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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

        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Planos Disponíveis</h2>
          {loadingPlans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className={`grid gap-4 ${plans.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
              {plans.map((plan) => {
                const isCurrent = currentPriceId === plan.stripe_price_id;
                const features = buildFeatures(plan);
                return (
                  <Card key={plan.id} className={`p-5 ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}>
                    {isCurrent && <Badge className="text-[9px] mb-3">Plano Atual</Badge>}
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <div className="mt-1 mb-4">
                      <span className="text-2xl font-bold text-foreground">
                        R$ {plan.price.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-muted-foreground">/{plan.billing_interval === "yearly" ? "ano" : "mês"}</span>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {features.map((f) => (
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
                      disabled={isCurrent || !plan.stripe_price_id || loadingPlan === plan.stripe_price_id}
                      onClick={() => plan.stripe_price_id && handleCheckout(plan.stripe_price_id)}
                    >
                      {loadingPlan === plan.stripe_price_id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      {isCurrent ? "Plano Atual" : "Assinar este plano"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

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
    </div>
  );
}
