import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Routes that DON'T require subscription (but still require login)
const SUBSCRIPTION_EXEMPT_ROUTES = [
  "/checkout-success",
  "/account/billing",
  "/account/profile",
];

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading, subscription } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Check if this route is exempt from subscription check
  const isExempt = SUBSCRIPTION_EXEMPT_ROUTES.some((r) =>
    location.pathname.startsWith(r)
  );

  if (isExempt) {
    return <>{children ?? <Outlet />}</>;
  }

  // Grace period: user just completed checkout, subscription may not be reflected yet
  const checkoutGrace = localStorage.getItem("checkout_completed_at");
  const graceValid = checkoutGrace && (Date.now() - Number(checkoutGrace)) < 5 * 60 * 1000; // 5 min grace

  if (!subscription.subscribed && !graceValid) {
    // User is logged in but has no active subscription → send to billing
    return <Navigate to="/account/billing" replace />;
  }

  // Clear grace flag once subscription is confirmed
  if (subscription.subscribed && checkoutGrace) {
    localStorage.removeItem("checkout_completed_at");
  }

  return <>{children ?? <Outlet />}</>;
}
