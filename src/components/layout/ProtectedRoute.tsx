import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Routes that require an active subscription before access
const SUBSCRIPTION_REQUIRED_ROUTES = ["/onboarding"];

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

  // Block access to onboarding if user hasn't paid yet
  const needsSub = SUBSCRIPTION_REQUIRED_ROUTES.some((r) =>
    location.pathname.startsWith(r)
  );

  if (needsSub && !subscription.subscribed) {
    // Allow /checkout-success through (user just paid, webhook may be slow)
    if (location.pathname === "/checkout-success") {
      return <>{children ?? <Outlet />}</>;
    }
    return <Navigate to="/landing?requires_plan=1" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
