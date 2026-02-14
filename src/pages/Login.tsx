import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, Check, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
          <Zap className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Rankito</h1>
          <p className="text-[10px] text-muted-foreground">SEO & Analytics Intelligence</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-8 overflow-y-auto">
        {/* Login / Signup Form */}
        <Card className="w-full max-w-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{isSignup ? "Criar conta" : "Bem-vindo de volta"}</CardTitle>
            <CardDescription className="text-xs">
              {isSignup ? "Comece a analisar seus sites" : "Entre na sua conta"}
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
                <Input type="password" placeholder="••••••••" className="h-9 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button className="w-full h-9 text-sm" type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSignup ? "Criar conta" : "Entrar"}
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
