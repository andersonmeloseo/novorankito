import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GoalStep {
  id: string;
  title: string;
  description: string;
  type: "entity" | "relation" | "schema" | "custom";
  target_entity_type?: string;
  target_count?: number;
  completed: boolean;
}

export interface SemanticGoal {
  id: string;
  goal_project_id: string;
  project_id: string;
  owner_id: string;
  goal_type: "niche_template" | "seo_objective" | "custom";
  name: string;
  description: string | null;
  template_key: string | null;
  steps: GoalStep[];
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export function useSemanticGoals(projectId: string | null, goalProjectId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["semantic-goals", projectId, goalProjectId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<SemanticGoal[]> => {
      if (!projectId || !goalProjectId) return [];
      const { data, error } = await supabase
        .from("semantic_goals" as any)
        .select("*")
        .eq("project_id", projectId)
        .eq("goal_project_id", goalProjectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SemanticGoal[];
    },
    enabled: !!projectId && !!goalProjectId,
    staleTime: 15_000,
  });

  const createGoal = useMutation({
    mutationFn: async (payload: {
      goal_type: SemanticGoal["goal_type"];
      name: string;
      description?: string;
      template_key?: string;
      steps: GoalStep[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !projectId || !goalProjectId) throw new Error("Auth required");
      const { data, error } = await supabase
        .from("semantic_goals" as any)
        .insert({
          project_id: projectId,
          goal_project_id: goalProjectId,
          owner_id: user.id,
          goal_type: payload.goal_type,
          name: payload.name,
          description: payload.description || null,
          template_key: payload.template_key || null,
          steps: JSON.parse(JSON.stringify(payload.steps)),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SemanticGoal;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateGoalSteps = useMutation({
    mutationFn: async ({ goalId, steps }: { goalId: string; steps: GoalStep[] }) => {
      const allDone = steps.every(s => s.completed);
      const { error } = await supabase
        .from("semantic_goals" as any)
        .update({
          steps: JSON.parse(JSON.stringify(steps)),
          status: allDone ? "completed" : "active",
        } as any)
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("semantic_goals" as any)
        .delete()
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { ...query, createGoal, updateGoalSteps, deleteGoal };
}
