import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, Check, Star, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { checkLeakedPassword } from "@/lib/password-check";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";

const PLANS = [
  {
    name: "Free",
    price: "R$ 0",
    period: "/mês",
    description: "Para testar a plataforma",
    features: ["1 projeto", "100 URLs monitoradas", "Relatórios básicos", "7 dias de histórico"],
    popular: false,
  },
  {
    name: "Starter",
    price: "R$ 97",
    period: "/mês",
    description: "Para freelancers e sites pequenos",
    features: ["3 projetos", "1.000 URLs monitoradas", "Integrações GSC + GA4", "30 dias de histórico", "Agente IA básico"],
    popular: false,
  },
  {
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    description: "Para agências e profissionais",
    features: ["10 projetos", "10.000 URLs monitoradas", "Todas as integrações", "Histórico ilimitado", "Agente IA avançado", "Rank & Rent"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "R$ 497",
    period: "/mês",
    description: "Para grandes operações",
    features: ["Projetos ilimitados", "URLs ilimitadas", "White-label", "API dedicada", "Suporte prioritário", "SLA garantido"],
    popular: false,
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [leakedWarning, setLeakedWarning] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLeakedWarning(false);
    try {
      if (isSignup) {
        // Check for leaked password before signup
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

        const { error } = await signUp(email, password, name);
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Você já está logado." });
        navigate("/onboarding");
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
        {/* Login / Signup Form */}
        <Card className="w-full max-w-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{isSignup ? "Criar conta" : (wl.login_title || `Bem-vindo ao ${wl.brand_name}`)}</CardTitle>
            <CardDescription className="text-xs">
              {isSignup ? "Comece a analisar seus sites" : (wl.login_subtitle || "Entre na sua conta")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input placeholder="Seu nome" className="h-9 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
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
              <Button className="w-full h-9 text-sm" type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSignup ? "Criar conta" : "Entrar"}
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

        {/* Plans Section - visible on signup */}
        {isSignup && (
          <div className="w-full max-w-4xl space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">Escolha seu plano</h2>
              <p className="text-sm text-muted-foreground">Comece grátis e faça upgrade quando quiser</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PLANS.map((plan) => (
                <Card
                  key={plan.name}
                  className={cn(
                    "p-4 relative transition-all hover:shadow-md",
                    plan.popular && "border-primary ring-1 ring-primary"
                  )}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] gap-1">
                      <Star className="h-2.5 w-2.5" /> Popular
                    </Badge>
                  )}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Check className="h-3 w-3 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
