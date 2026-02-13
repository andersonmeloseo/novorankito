import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
      navigate("/overview");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Rankito</h1>
          <p className="text-sm text-muted-foreground">SEO & Analytics Intelligence</p>
        </div>

        <Card>
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
      </div>
    </div>
  );
}
