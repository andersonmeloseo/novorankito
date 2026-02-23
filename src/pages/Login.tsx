import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Phone, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkLeakedPassword } from "@/lib/password-check";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const wl = useWhiteLabel();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const planFromUrl = searchParams.get("plan");

  const [isSignup, setIsSignup] = useState(!!planFromUrl);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(planFromUrl);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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

  const getSelectedPlanData = () => dbPlans.find((p) => p.slug === selectedPlan);
  const selectedPlanData = getSelectedPlanData();

  const redirectToCheckout = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout redirect error:", err);
      toast({ title: "Erro ao redirecionar para pagamento", description: err.message, variant: "destructive" });
      navigate("/onboarding");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      if (selectedPlan) localStorage.setItem("pending_plan_slug", selectedPlan);
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
        const pwCheck = await checkLeakedPassword(password);
        if (pwCheck.isLeaked) {
          setLeakedWarning(true);
          toast({
            title: "⚠️ Senha comprometida",
            description: `Esta senha já apareceu em ${pwCheck.occurrences.toLocaleString("pt-BR")} vazamentos. Escolha outra.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const planData = getSelectedPlanData();
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const { error } = await signUp(email, password, fullName, whatsapp || undefined);
        if (error) throw error;

        // Redirect to Stripe checkout immediately after signup
        // Pass email directly since session may not exist yet (email confirmation pending)
        if (planData?.stripe_price_id) {
          toast({ title: "Conta criada!", description: "Redirecionando para pagamento..." });
          try {
            const { data, error: checkoutError } = await supabase.functions.invoke("create-checkout", {
              body: { priceId: planData.stripe_price_id, email },
            });
            if (checkoutError) throw checkoutError;
            if (data?.url) {
              window.location.href = data.url;
              return; // Don't set loading to false, we're redirecting
            }
        } catch (err: any) {
            console.error("Checkout redirect error:", err);
            toast({ title: "Erro ao redirecionar para pagamento", description: err.message, variant: "destructive" });
            navigate("/onboarding");
          }
        } else {
          toast({ title: "Conta criada!" });
          navigate("/onboarding");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/projects");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card rounded-3xl shadow-2xl shadow-primary/5 border border-border/50 p-8 sm:p-10 space-y-6">
          {/* Logo + Title */}
          <div className="text-center space-y-2">
            {wl.logo_url ? (
              <img src={wl.logo_url} alt={wl.brand_name} className="h-14 w-14 rounded-2xl object-contain mx-auto" />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
                <span className="text-xl font-bold text-primary-foreground">{wl.brand_name.charAt(0)}</span>
              </div>
            )}
            <h1 className="text-xl font-bold text-foreground">
              {isSignup ? "Criar sua conta" : (wl.login_title || `Bem-vindo ao ${wl.brand_name}`)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignup
                ? selectedPlanData
                  ? <>para continuar com o plano <span className="font-semibold text-foreground">{selectedPlanData.name}</span></>
                  : `para continuar em ${wl.brand_name}`
                : (wl.login_subtitle || "Entre na sua conta")}
            </p>
            {isSignup && selectedPlanData && (
              <Badge variant="secondary" className="text-xs mt-1">
                R$ {Number(selectedPlanData.price).toLocaleString("pt-BR")}/mês
              </Badge>
            )}
          </div>

          {/* Social Login */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 text-sm gap-2 rounded-xl font-medium"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
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
              Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-xs text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nome</Label>
                    <Input
                      placeholder="João"
                      className="h-11 rounded-xl"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Sobrenome</Label>
                    <Input
                      placeholder="Silva"
                      className="h-11 rounded-xl"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> WhatsApp
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="+55 11 99999-9999"
                    className="h-11 rounded-xl"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Seu e-mail</Label>
              <Input
                type="email"
                placeholder="voce@empresa.com"
                className="h-11 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 rounded-xl pr-10"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLeakedWarning(false); }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {leakedWarning && (
                <p className="text-[11px] text-destructive flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  Esta senha foi exposta em vazamentos. Escolha outra.
                </p>
              )}
            </div>

            <Button
              className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all"
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isSignup ? "Continuar ▸" : "Entrar"}
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-sm text-center text-muted-foreground">
            {isSignup ? "Possui uma conta?" : "Não tem conta?"}{" "}
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? "Entrar" : "Criar conta"}
            </button>
          </p>

          {/* Footer links */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-2">
            <a href="#" className="hover:text-foreground transition-colors">Ajuda</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-foreground transition-colors">Termos de uso</a>
          </div>
        </div>
      </div>
    </div>
  );
}
