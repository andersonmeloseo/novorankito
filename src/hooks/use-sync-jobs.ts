import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export type SyncJobType = "gsc_sync" | "ga4_sync" | "indexing_batch" | "url_discovery";

interface EnqueueJobParams {
  projectId: string;
  jobType: SyncJobType;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
}

/**
 * Hook for enqueuing background sync jobs.
 * Jobs are stored in sync_jobs and processed by the process-jobs edge function.
 */
export function useEnqueueJob() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, jobType, payload, maxAttempts = 3 }: EnqueueJobParams) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("sync_jobs")
        .insert({
          project_id: projectId,
          owner_id: user.id,
          job_type: jobType,
          payload: (payload ?? {}) as Json,
          max_attempts: maxAttempts,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync-jobs"] });
    },
  });
}

/**
 * Hook for listing sync jobs for a project.
 */
export function useSyncJobs(projectId?: string) {
  const { user } = useAuth();

  return {
    queryKey: ["sync-jobs", projectId],
    queryFn: async () => {
      let q = supabase
        .from("sync_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  };
}
