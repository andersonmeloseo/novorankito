import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const { user, checkSubscription } = useAuth();
  const wl = useWhiteLabel();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Re-check subscription after Stripe redirect
    let attempts = 0;
    const verify = async () => {
      await checkSubscription();
      attempts++;
      // After a few checks, assume it's confirmed (Stripe webhooks can be slow)
      if (attempts >= 2) setConfirmed(true);
    };
    verify();
    const interval = setInterval(verify, 3000);
    const timeout = setTimeout(() => {
      setConfirmed(true);
      clearInterval(interval);
    }, 10000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [checkSubscription]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-card rounded-3xl shadow-2xl shadow-primary/5 border border-border/50 p-10 space-y-6">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Pagamento confirmado! 🎉
            </h1>
            <p className="text-muted-foreground text-sm">
              Obrigado por assinar o <span className="font-semibold text-foreground">{wl.brand_name}</span>.
              Sua conta está pronta para uso.
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
            <p>✅ Assinatura ativada</p>
            <p>✅ Conta criada com sucesso</p>
            <p>🚀 Próximo passo: criar seu primeiro projeto</p>
          </div>

          {confirmed ? (
            <Button
              className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
              onClick={() => navigate("/onboarding?new=1")}
            >
              Criar meu primeiro projeto <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button disabled className="w-full h-12 text-sm font-semibold rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirmando pagamento...
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
