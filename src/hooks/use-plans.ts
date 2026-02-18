import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: string;
  projects_limit: number;
  events_limit: number;
  ai_requests_limit: number;
  members_limit: number;
  indexing_daily_limit: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  stripe_price_id: string | null;
  stripe_checkout_url: string | null;
  payment_methods: string[];
  // Granular feature controls
  gsc_accounts_per_project: number;
  orchestrator_executions_limit: number;
  pixel_tracking_enabled: boolean;
  whatsapp_reports_enabled: boolean;
  white_label_enabled: boolean;
  api_access_enabled: boolean;
  rank_rent_enabled: boolean;
  ga4_enabled: boolean;
  advanced_analytics_enabled: boolean;
  webhooks_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_key: string;
  feature_name: string;
  enabled: boolean;
  created_at: string;
}

export interface PlanUsage {
  id: string;
  user_id: string;
  period: string;
  ai_requests_used: number;
  events_used: number;
}

export interface PlanLimit {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  plan: string;
}

// ─── Admin hooks ───

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Plan[];
    },
  });
}

export function useAdminPlanFeatures(planId?: string) {
  return useQuery({
    queryKey: ["admin-plan-features", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_features")
        .select("*")
        .eq("plan_id", planId!)
        .order("feature_key");
      if (error) throw error;
      return data as PlanFeature[];
    },
    enabled: !!planId,
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Plan> & { id: string }) => {
      const { error } = await supabase.from("plans").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: { slug: string; name: string; description?: string; price?: number; sort_order?: number }) => {
      const { error } = await supabase.from("plans").insert(plan);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete features first
      await supabase.from("plan_features").delete().eq("plan_id", id);
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
    },
  });
}

export function useTogglePlanFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ featureId, enabled }: { featureId: string; enabled: boolean }) => {
      const { error } = await supabase.from("plan_features").update({ enabled }).eq("id", featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
    },
  });
}

export function useCreatePlanFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feature: { plan_id: string; feature_key: string; feature_name: string; enabled?: boolean }) => {
      const { error } = await supabase.from("plan_features").insert(feature);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
    },
  });
}

export function useDeletePlanFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_features").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
    },
  });
}

// ─── User-facing hooks ───

export function useCurrentPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-plan", user?.id],
    queryFn: async () => {
      const { data: sub } = await supabase
        .from("billing_subscriptions")
        .select("plan")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const planSlug = sub?.plan || "start";

      const { data: plan } = await supabase
        .from("plans")
        .select("*")
        .eq("slug", planSlug)
        .single();

      const { data: features } = await supabase
        .from("plan_features")
        .select("*")
        .eq("plan_id", plan?.id || "");

      return {
        plan: plan as Plan | null,
        features: (features || []) as PlanFeature[],
        slug: planSlug,
      };
    },
    enabled: !!user,
  });
}

export function useCheckPlanLimit(limitType: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan-limit", user?.id, limitType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_plan_limit", {
        _user_id: user!.id,
        _limit_type: limitType,
      });
      if (error) throw error;
      return data as unknown as PlanLimit;
    },
    enabled: !!user,
  });
}

export function usePlanHasFeature(featureKey: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan-feature", user?.id, featureKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("plan_has_feature", {
        _user_id: user!.id,
        _feature_key: featureKey,
      });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!user,
  });
}
