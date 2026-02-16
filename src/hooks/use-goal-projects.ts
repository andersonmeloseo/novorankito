import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GoalProject {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  module: "goals" | "conversions";
  color: string;
  created_at: string;
  updated_at: string;
}

export function useGoalProjects(projectId: string | null | undefined, module: "goals" | "conversions") {
  const queryClient = useQueryClient();
  const queryKey = ["goal-projects", projectId, module];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<GoalProject[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("goal_projects" as any)
        .select("*")
        .eq("project_id", projectId)
        .eq("module", module)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GoalProject[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const createProject = useMutation({
    mutationFn: async (payload: { name: string; description?: string; color?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !projectId) throw new Error("Auth required");
      const { data, error } = await supabase
        .from("goal_projects" as any)
        .insert({
          project_id: projectId,
          owner_id: user.id,
          name: payload.name,
          description: payload.description || null,
          module,
          color: payload.color || "#6366f1",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GoalProject;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("goal_projects" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { ...query, createProject, deleteProject };
}
