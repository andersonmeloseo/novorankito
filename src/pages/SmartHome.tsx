import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SmartHome() {
  const { user, loading, subLoading, subscription } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["user-projects-count", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", user!.id)
        .limit(1);
      return data ?? [];
    },
    enabled: !!user && subscription.subscribed,
  });

  if (loading || isLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Not subscribed → billing (ProtectedRoute handles this too, but as safety)
  if (!subscription.subscribed) return <Navigate to="/account/billing" replace />;

  // Has projects → projects list
  if (projects && projects.length > 0) return <Navigate to="/projects" replace />;

  // No projects → onboarding to create first project
  return <Navigate to="/onboarding" replace />;
}
