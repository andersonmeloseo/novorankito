import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { supabase } from "@/integrations/supabase/client";

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscription, checkSubscription } = useAuth();
  const wl = useWhiteLabel();
  const [confirmed, setConfirmed] = useState(false);
  const [pollStatus, setPollStatus] = useState<string>("checking");

  const paramPaymentId = searchParams.get("paymentId");
  const paramGateway = searchParams.get("gateway");

  // Fallback to localStorage if URL params missing
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem("pending_payment") || "{}"); } catch { return {}; }
  })();
  const paymentId = paramPaymentId || stored.paymentId;
  const gateway = paramGateway || stored.gateway || "asaas";

  // Set grace flag immediately so ProtectedRoute allows onboarding access
  useEffect(() => {
    localStorage.setItem("checkout_completed_at", String(Date.now()));
  }, []);

  const pollPayment = useCallback(async () => {
    if (!paymentId || gateway === "abacatepay") {
      // AbacatePay uses webhook, just check subscription
      await checkSubscription();
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-payment-status", {
        body: { paymentId, gateway },
      });
      if (error) throw error;

      setPollStatus(data?.status || "PENDING");
      if (data?.paid) {
        setConfirmed(true);
        await checkSubscription();
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, [paymentId, gateway, checkSubscription]);

  useEffect(() => {
    let attempts = 0;
    const verify = async () => {
      await pollPayment();
      attempts++;
      if (attempts >= 10) setConfirmed(true);
    };
    verify();
    const interval = setInterval(verify, 4000);
    const timeout = setTimeout(() => {
      setConfirmed(true);
      clearInterval(interval);
    }, 45000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [pollPayment]);

  // Auto-confirm when subscription is detected
  useEffect(() => {
    if (subscription.subscribed) {
      setConfirmed(true);
    }
  }, [subscription.subscribed]);

  const isPending = !confirmed && pollStatus !== "CONFIRMED" && pollStatus !== "RECEIVED";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-card rounded-3xl shadow-2xl shadow-primary/5 border border-border/50 p-10 space-y-6">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${
            confirmed ? "bg-green-500/10" : "bg-amber-500/10"
          }`}>
            {confirmed ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <Clock className="h-8 w-8 text-amber-500 animate-pulse" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {confirmed ? "Pagamento confirmado! 🎉" : "Aguardando pagamento..."}
            </h1>
            <p className="text-muted-foreground text-sm">
              {confirmed ? (
                <>Obrigado por assinar o <span className="font-semibold text-foreground">{wl.brand_name}</span>. Sua conta está pronta para uso.</>
              ) : (
                <>Estamos verificando seu pagamento automaticamente. Assim que confirmado, sua conta será ativada.</>
              )}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
            <p>{confirmed ? "✅" : "⏳"} Assinatura {confirmed ? "ativada" : "pendente"}</p>
            <p>{confirmed ? "✅" : "⏳"} Conta {confirmed ? "criada com sucesso" : "aguardando confirmação"}</p>
            <p>🚀 Próximo passo: criar seu primeiro projeto</p>
          </div>

          {!isPending && confirmed ? (
            <Button
              className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
              onClick={() => navigate("/onboarding?new=1")}
            >
              Criar meu primeiro projeto <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="space-y-3">
              <Button disabled className="w-full h-12 text-sm font-semibold rounded-xl">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verificando pagamento...
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Verificação automática a cada 4 segundos. Se já pagou, aguarde a confirmação.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
