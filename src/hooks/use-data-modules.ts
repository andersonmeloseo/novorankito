import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllPaginated } from "@/lib/supabase-helpers";
import type { Tables } from "@/integrations/supabase/types";

// ─── Site URLs ───
export function useSiteUrls(projectId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["site-urls", projectId],
    queryFn: async () => {
      return fetchAllPaginated("site_urls", {
        filters: projectId ? { project_id: projectId } : {},
        orderBy: { column: "created_at", ascending: false },
        maxRows: 20000,
      });
    },
    enabled: !!user,
  });
}

export function useAddSiteUrl() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (row: { project_id: string; url: string; url_type?: string; url_group?: string; status?: string; priority?: string }) => {
      const { error } = await supabase.from("site_urls").insert({ ...row, owner_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-urls"] }),
  });
}

export function useUpdateSiteUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("site_urls").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-urls"] }),
  });
}

export function useDeleteSiteUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_urls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-urls"] }),
  });
}

// ─── SEO Metrics ───
export function useSeoMetrics(projectId?: string, dimensionType?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["seo-metrics", projectId, dimensionType],
    queryFn: async () => {
      const filters: Record<string, string> = {};
      if (projectId) filters.project_id = projectId;
      if (dimensionType) filters.dimension_type = dimensionType;

      return fetchAllPaginated("seo_metrics", {
        filters,
        orderBy: { column: "metric_date", ascending: false },
        maxRows: 30000,
      });
    },
    enabled: !!user,
  });
}

// ─── Conversions ───
export function useConversions(projectId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversions", projectId],
    queryFn: async () => {
      let q = supabase.from("conversions").select("*").order("converted_at", { ascending: false }).limit(200);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useAddConversion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (row: { project_id: string; event_type: string; page?: string; value?: number; source?: string; device?: string }) => {
      const { error } = await supabase.from("conversions").insert({ ...row, owner_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversions"] }),
  });
}

// ─── Analytics Sessions ───
export function useAnalyticsSessions(projectId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics-sessions", projectId],
    queryFn: async () => {
      let q = supabase.from("analytics_sessions").select("*").order("session_date", { ascending: false }).limit(500);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}
