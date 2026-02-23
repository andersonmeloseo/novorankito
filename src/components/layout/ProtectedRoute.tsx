import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [checkingCheckout, setCheckingCheckout] = useState(true);

  useEffect(() => {
    if (!user) {
      setCheckingCheckout(false);
      return;
    }

    const pendingPriceId = localStorage.getItem("pending_checkout_price_id");
    if (pendingPriceId) {
      localStorage.removeItem("pending_checkout_price_id");
      // Redirect to Stripe checkout
      supabase.functions.invoke("create-checkout", {
        body: { priceId: pendingPriceId },
      }).then(({ data, error }) => {
        if (!error && data?.url) {
          window.location.href = data.url;
        } else {
          console.error("Checkout redirect error:", error);
          setCheckingCheckout(false);
        }
      });
    } else {
      setCheckingCheckout(false);
    }
  }, [user]);

  if (loading || checkingCheckout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children ?? <Outlet />}</>;
}
