import { useEffect, useState } from "react";
import { Check, Zap, Loader2, ExternalLink, CreditCard, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  stripe_annual_price_id: string | null;
  annual_price: number | null;
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
  trial_days: number;
  promo_price: number | null;
  promo_ends_at: string | null;
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
  f.push(`Rankito IA — ${p.ai_requests_limit === -1 ? "ilimitado" : `${fmt(p.ai_requests_limit)} req/mês`}`);
  f.push(`Orquestrador IA — ${p.orchestrator_executions_limit === -1 ? "ilimitado" : `${fmt(p.orchestrator_executions_limit)} exec/hora`}`);
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
  const [couponCode, setCouponCode] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_percent?: number; discount_amount?: number } | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Cupom não encontrado");
      if (data.valid_until && new Date(data.valid_until) < new Date()) throw new Error("Cupom expirado");
      if (data.max_uses && data.uses_count >= data.max_uses) throw new Error("Cupom esgotado");
      setAppliedCoupon({
        code: data.code,
        discount_percent: data.discount_percent,
        discount_amount: data.discount_amount,
      });
      toast({ title: "Cupom aplicado!", description: `${data.discount_percent ? data.discount_percent + "% de desconto" : "R$" + data.discount_amount + " de desconto"}` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Cupom inválido", variant: "destructive" });
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCheckout = async (plan: DbPlan) => {
    const isAnnual = billingInterval === "annual";
    const priceId = isAnnual && plan.stripe_annual_price_id ? plan.stripe_annual_price_id : plan.stripe_price_id;
    if (!priceId) return;
    setLoadingPlan(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId,
          trialDays: plan.trial_days || undefined,
          couponCode: appliedCoupon?.code || undefined,
          billingInterval,
        },
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

        {/* Coupon input */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Tag className="h-4 w-4 text-primary shrink-0" />
            <Input
              placeholder="Código do cupom"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              className="h-9 text-sm font-mono max-w-[200px]"
            />
            <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={validatingCoupon || !couponCode.trim()} className="text-xs">
              {validatingCoupon && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Aplicar
            </Button>
            {appliedCoupon && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                ✅ {appliedCoupon.code} — {appliedCoupon.discount_percent ? `${appliedCoupon.discount_percent}% off` : `R$${appliedCoupon.discount_amount} off`}
              </Badge>
            )}
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground">Planos Disponíveis</h2>
            <div className="inline-flex items-center gap-1 bg-muted rounded-full p-0.5">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${billingInterval === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingInterval("annual")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${billingInterval === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Anual
                <Badge variant="secondary" className="text-[9px] py-0">-17%</Badge>
              </button>
            </div>
          </div>
          {loadingPlans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className={`grid gap-4 ${plans.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
              {plans.map((plan) => {
                const isAnnual = billingInterval === "annual";
                const priceId = isAnnual && plan.stripe_annual_price_id ? plan.stripe_annual_price_id : plan.stripe_price_id;
                const isCurrent = currentPriceId === priceId;
                const features = buildFeatures(plan);

                const hasAnnualPrice = plan.annual_price != null && plan.annual_price > 0;
                const annualTotal = hasAnnualPrice ? plan.annual_price : plan.price * 10;
                const annualMonthly = annualTotal / 12;

                const hasPromo = !isAnnual && plan.promo_price != null && (!plan.promo_ends_at || new Date(plan.promo_ends_at) > new Date());

                let displayPrice: number;
                let originalPriceStr: string | undefined;

                if (isAnnual) {
                  displayPrice = Math.round(annualMonthly);
                  originalPriceStr = `R$ ${plan.price.toLocaleString("pt-BR")}`;
                } else {
                  displayPrice = hasPromo ? plan.promo_price! : plan.price;
                  originalPriceStr = hasPromo ? `R$ ${plan.price.toLocaleString("pt-BR")}` : undefined;
                }

                return (
                  <Card key={plan.id} className={`p-5 ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}>
                    {isCurrent && <Badge className="text-[9px] mb-3">Plano Atual</Badge>}
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <div className="mt-1 mb-2">
                      {originalPriceStr && (
                        <span className="text-sm text-muted-foreground line-through mr-2">{originalPriceStr}</span>
                      )}
                      <span className="text-2xl font-bold text-foreground">
                        R$ {Number(displayPrice).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-muted-foreground">/{isAnnual ? "mês no anual" : "mês"}</span>
                    </div>
                    {plan.trial_days > 0 && (
                      <Badge variant="secondary" className="text-[10px] mb-3 gap-1">🎁 {plan.trial_days} dias grátis</Badge>
                    )}
                    {hasPromo && plan.promo_ends_at && (
                      <p className="text-[10px] text-warning mb-2">⏰ Promoção até {new Date(plan.promo_ends_at).toLocaleDateString("pt-BR")}</p>
                    )}
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
                      disabled={isCurrent || !priceId || loadingPlan === priceId}
                      onClick={() => handleCheckout(plan)}
                    >
                      {loadingPlan === priceId && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      {isCurrent ? "Plano Atual" : plan.trial_days > 0 ? `Testar ${plan.trial_days} dias grátis` : "Assinar este plano"}
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
