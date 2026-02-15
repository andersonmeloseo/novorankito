import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrackingGoal {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  goal_type: "pages_visited" | "event_count" | "page_value";
  target_value: number;
  target_urls: string[];
  target_events: string[];
  currency_value: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const GOAL_TYPES = [
  { value: "pages_visited" as const, label: "Páginas Visitadas", desc: "Meta cumprida ao visitar X páginas específicas" },
  { value: "event_count" as const, label: "Contagem de Eventos", desc: "Meta cumprida ao atingir X eventos" },
  { value: "page_value" as const, label: "Valor por Página", desc: "Atribuir valor monetário a visualizações" },
] as const;

export function useTrackingGoals(projectId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["tracking-goals", projectId];

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`tracking-goals-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tracking_goals", filter: `project_id=eq.${projectId}` }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<TrackingGoal[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tracking_goals" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TrackingGoal[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: Omit<TrackingGoal, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("tracking_goals" as any)
        .insert(goal as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("tracking_goals" as any)
        .update(fields as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tracking_goals" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const toggleGoal = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("tracking_goals" as any)
        .update({ enabled } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { ...query, createGoal, updateGoal, deleteGoal, toggleGoal };
}
