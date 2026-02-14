import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Announcements ──
export function useAnnouncements() {
  return useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (announcement: { title: string; content: string; type: string; created_by: string }) => {
      const { error } = await supabase.from("system_announcements").insert(announcement);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });
}

export function useToggleAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("system_announcements").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("system_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });
}

// ── Feature Flags ──
export function useFeatureFlags() {
  return useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (flag: { key: string; name: string; description?: string; enabled: boolean; allowed_plans: string[] }) => {
      const { error } = await supabase.from("feature_flags").insert(flag);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-feature-flags"] }),
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("feature_flags").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-feature-flags"] }),
  });
}

export function useDeleteFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feature_flags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-feature-flags"] }),
  });
}

// ── Admin Stats (aggregate counts) ──
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profilesRes, projectsRes, billingRes, logsRes, rolesRes, urlsRes, metricsRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("projects").select("id, created_at, status", { count: "exact" }),
        supabase.from("billing_subscriptions").select("*"),
        supabase.from("audit_logs").select("id, created_at, status", { count: "exact" }).order("created_at", { ascending: false }).limit(500),
        supabase.from("user_roles").select("*"),
        supabase.from("site_urls").select("id", { count: "exact" }),
        supabase.from("seo_metrics").select("id", { count: "exact" }),
      ]);

      const billing = billingRes.data || [];
      const totalMrr = billing.reduce((s, b) => s + Number(b.mrr), 0);
      const activeSubs = billing.filter(b => b.status === "active").length;
      const cancelledSubs = billing.filter(b => b.status === "cancelled").length;

      return {
        totalUsers: profilesRes.count || 0,
        totalProjects: projectsRes.count || 0,
        totalMrr,
        activeSubs,
        cancelledSubs,
        arpu: activeSubs > 0 ? Math.round(totalMrr / activeSubs) : 0,
        totalRoles: (rolesRes.data || []).length,
        failedLogs: (logsRes.data || []).filter(l => l.status === "failed").length,
        totalUrls: urlsRes.count || 0,
        totalMetrics: metricsRes.count || 0,
        churnRate: activeSubs + cancelledSubs > 0 ? ((cancelledSubs / (activeSubs + cancelledSubs)) * 100).toFixed(1) : "0",
        billing,
      };
    },
  });
}
