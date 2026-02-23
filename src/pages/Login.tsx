import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, Check, Star, ShieldAlert, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { checkLeakedPassword } from "@/lib/password-check";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const planFromUrl = searchParams.get("plan");
  const [isSignup, setIsSignup] = useState(!!planFromUrl);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(planFromUrl);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [leakedWarning, setLeakedWarning] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => { if (data) setDbPlans(data); });
  }, []);

  const getSelectedPlanData = () => {
    return dbPlans.find((p) => p.slug === selectedPlan);
  };

  const redirectToCheckout = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout redirect error:", err);
      toast({
        title: "Erro ao redirecionar para pagamento",
        description: err.message,
        variant: "destructive",
      });
      navigate("/onboarding");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // Store selected plan in localStorage so we can redirect after OAuth
      if (selectedPlan) {
        localStorage.setItem("pending_plan_slug", selectedPlan);
      }
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  // Handle pending plan checkout after OAuth redirect
  useEffect(() => {
    const pendingPlan = localStorage.getItem("pending_plan_slug");
    if (pendingPlan && dbPlans.length > 0) {
      const plan = dbPlans.find((p) => p.slug === pendingPlan);
      if (plan?.stripe_price_id) {
        localStorage.removeItem("pending_plan_slug");
        redirectToCheckout(plan.stripe_price_id);
      } else {
        localStorage.removeItem("pending_plan_slug");
      }
    }
  }, [dbPlans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLeakedWarning(false);
    try {
      if (isSignup) {
        if (!selectedPlan) {
          toast({
            title: "Selecione um plano",
            description: "Escolha um plano abaixo antes de criar sua conta.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const pwCheck = await checkLeakedPassword(password);
        if (pwCheck.isLeaked) {
          setLeakedWarning(true);
          toast({
            title: "⚠️ Senha comprometida",
            description: `Esta senha já apareceu em ${pwCheck.occurrences.toLocaleString("pt-BR")} vazamentos de dados. Escolha outra senha para sua segurança.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name, whatsapp || undefined);
        if (error) throw error;

        // Store selected plan so checkout happens after email confirmation + login
        const planData = getSelectedPlanData();
        if (planData?.stripe_price_id) {
          localStorage.setItem("pending_checkout_price_id", planData.stripe_price_id);
        }

        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar a conta. Após confirmar, faça login para ser redirecionado ao pagamento.",
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;

        // Check if there's a pending checkout from a previous signup
        const pendingPriceId = localStorage.getItem("pending_checkout_price_id");
        if (pendingPriceId) {
          localStorage.removeItem("pending_checkout_price_id");
          toast({ title: "Redirecionando para pagamento..." });
          await redirectToCheckout(pendingPriceId);
          return;
        }

        navigate("/projects");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const wl = useWhiteLabel();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        {wl.logo_url ? (
          <img src={wl.logo_url} alt={wl.brand_name} className="h-9 w-9 rounded-xl object-contain" />
        ) : (
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">{wl.brand_name.charAt(0)}</span>
          </div>
        )}
        <div>
          <h1 className="text-lg font-semibold text-foreground">{wl.brand_name}</h1>
          <p className="text-[10px] text-muted-foreground">{wl.subtitle}</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-8 overflow-y-auto">
        {/* Plans Section - visible on signup, ABOVE the form */}
        {isSignup && (
          <div className="w-full max-w-4xl space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">1. Escolha seu plano</h2>
              <p className="text-sm text-muted-foreground">Selecione o plano ideal para você</p>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${dbPlans.length >= 4 ? 'lg:grid-cols-4' : dbPlans.length === 3 ? 'lg:grid-cols-3' : ''}`}>
              {dbPlans.map((plan) => {
                const isPopular = plan.slug === "growth";
                const isSelected = selectedPlan === plan.slug;
                const features: string[] = [
                  `${plan.projects_limit === -1 ? "Projetos ilimitados" : plan.projects_limit + " projeto" + (plan.projects_limit > 1 ? "s" : "")}`,
                  `Indexação — ${plan.indexing_daily_limit === -1 ? "sem limites" : plan.indexing_daily_limit + " URLs/dia"}`,
                  plan.ga4_enabled ? "Integrações GSC + GA4" : "SEO via GSC",
                  `${plan.members_limit === -1 ? "Usuários ilimitados" : plan.members_limit + " usuário" + (plan.members_limit > 1 ? "s" : "")}`,
                  plan.whatsapp_reports_enabled ? "Relatórios via WhatsApp" : null,
                  plan.white_label_enabled ? "White-label" : null,
                  plan.api_access_enabled ? "API dedicada" : null,
                ].filter(Boolean) as string[];

                return (
                  <Card
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.slug)}
                    className={cn(
                      "p-4 relative transition-all hover:shadow-md cursor-pointer",
                      isSelected
                        ? "border-primary ring-2 ring-primary bg-primary/5"
                        : isPopular
                          ? "border-primary/50 ring-1 ring-primary/50"
                          : ""
                    )}
                  >
                    {isSelected && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] gap-1">
                        <Check className="h-2.5 w-2.5" /> Selecionado
                      </Badge>
                    )}
                    {isPopular && !isSelected && (
                      <Badge variant="secondary" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] gap-1">
                        <Star className="h-2.5 w-2.5" /> Popular
                      </Badge>
                    )}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{plan.description}</p>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-bold text-foreground">R$ {Number(plan.price).toLocaleString("pt-BR")}</span>
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </div>
                      <ul className="space-y-1.5">
                        {features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Check className="h-3 w-3 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Login / Signup Form */}
        <Card className="w-full max-w-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {isSignup ? (selectedPlan ? "2. Crie sua conta" : "Criar conta") : (wl.login_title || `Bem-vindo ao ${wl.brand_name}`)}
            </CardTitle>
            <CardDescription className="text-xs">
              {isSignup
                ? selectedPlan
                  ? `Plano selecionado: ${dbPlans.find(p => p.slug === selectedPlan)?.name || selectedPlan}. Após criar a conta, você será redirecionado para o pagamento.`
                  : "Selecione um plano acima para continuar"
                : (wl.login_subtitle || "Entre na sua conta")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome</Label>
                    <Input placeholder="Seu nome" className="h-9 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> WhatsApp
                    </Label>
                    <Input
                      type="tel"
                      placeholder="+55 11 99999-9999"
                      className="h-9 text-sm"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Inclua o código do país (ex: +55 para Brasil, +1 para EUA)
                    </p>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="voce@empresa.com" className="h-9 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha</Label>
                <Input type="password" placeholder="••••••••" className="h-9 text-sm" value={password} onChange={(e) => { setPassword(e.target.value); setLeakedWarning(false); }} required minLength={6} />
                {leakedWarning && (
                  <p className="text-[11px] text-destructive flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    Esta senha foi exposta em vazamentos. Escolha outra.
                  </p>
                )}
              </div>
              <Button className="w-full h-9 text-sm" type="submit" disabled={loading || (isSignup && !selectedPlan)}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSignup
                  ? selectedPlan
                    ? "Criar conta e ir para pagamento →"
                    : "Selecione um plano acima"
                  : "Entrar"}
              </Button>

              <div className="relative my-2">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[10px] text-muted-foreground">
                  ou
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-9 text-sm gap-2"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || (isSignup && !selectedPlan)}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continuar com Google
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {isSignup ? "Já tem uma conta?" : "Não tem conta?"}{" "}
                <button type="button" className="text-primary font-medium hover:underline" onClick={() => setIsSignup(!isSignup)}>
                  {isSignup ? "Entrar" : "Criar conta"}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
