import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GoalConfig {
  // CTA click
  cta_selectors?: string[];
  cta_text_patterns?: string[];
  cta_match_mode?: "exact" | "partial";
  // Page destination
  destination_urls?: string[];
  url_match_mode?: "exact" | "contains" | "pattern";
  // URL pattern (link clicks)
  link_url_patterns?: string[];
  link_text_patterns?: string[];
  // Scroll depth
  scroll_threshold?: number; // 25, 50, 75, 100
  // Time on page
  min_seconds?: number;
  // Combined
  conditions?: Array<{
    type: string;
    config: GoalConfig;
  }>;
  // Manual CTA entry
  manual_cta_label?: string;
}

export interface TrackingGoal {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  goal_type: "cta_click" | "page_destination" | "url_pattern" | "scroll_depth" | "time_on_page" | "combined" | "pages_visited" | "event_count" | "page_value";
  target_value: number;
  target_urls: string[];
  target_events: string[];
  currency_value: number;
  config: GoalConfig;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const GOAL_TYPES = [
  { value: "cta_click" as const, label: "Clique em CTA", desc: "Conversão ao clicar em CTAs específicos (botões, links). Auto-detecta ou manual.", icon: "MousePointerClick" },
  { value: "page_destination" as const, label: "Página de Destino", desc: "Conversão ao chegar em uma página específica (ex: /obrigado).", icon: "Globe" },
  { value: "url_pattern" as const, label: "Padrão de URL", desc: "Conversão ao clicar em links com padrão específico (wa.me, tel:).", icon: "Link" },
  { value: "scroll_depth" as const, label: "Profundidade de Scroll", desc: "Conversão ao rolar a página até uma profundidade mínima.", icon: "ArrowDown" },
  { value: "time_on_page" as const, label: "Tempo na Página", desc: "Conversão ao permanecer na página por um tempo mínimo.", icon: "Clock" },
  { value: "combined" as const, label: "Combinada", desc: "Combine múltiplos critérios para definir uma conversão complexa.", icon: "Layers" },
] as const;

export const SCROLL_THRESHOLDS = [
  { value: 25, label: "25% — Início da página" },
  { value: 50, label: "50% — Metade" },
  { value: 75, label: "75% — Maior parte" },
  { value: 100, label: "100% — Final completo" },
];

export const TIME_PRESETS = [
  { value: 30, label: "30s — Landing pages" },
  { value: 60, label: "1min — Artigos curtos" },
  { value: 120, label: "2min — Artigos médios" },
  { value: 180, label: "3min — Conteúdo longo" },
];

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
      return (data || []).map((d: any) => ({
        ...d,
        config: d.config || {},
        target_urls: d.target_urls || [],
        target_events: d.target_events || [],
      })) as TrackingGoal[];
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
