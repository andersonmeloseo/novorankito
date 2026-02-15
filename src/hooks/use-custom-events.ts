import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomEventConfig {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  display_name: string;
  trigger_type: "click" | "submit" | "visible" | "scroll" | "timer";
  selector: string;
  conditions: { field: string; operator: string; value: string }[];
  metadata: { key: string; value: string }[];
  enabled: boolean;
  fires_count: number;
  created_at: string;
  updated_at: string;
}

export const TRIGGER_OPTIONS = [
  { value: "click" as const, label: "Clique", desc: "Dispara quando o elemento é clicado" },
  { value: "submit" as const, label: "Formulário", desc: "Dispara quando o formulário é enviado" },
  { value: "visible" as const, label: "Visibilidade", desc: "Dispara quando o elemento entra na viewport" },
  { value: "scroll" as const, label: "Scroll", desc: "Dispara em uma profundidade de scroll específica" },
  { value: "timer" as const, label: "Tempo", desc: "Dispara após X segundos na página" },
] as const;

export const PRESET_EVENTS: Omit<CustomEventConfig, "id" | "project_id" | "owner_id" | "fires_count" | "created_at" | "updated_at">[] = [
  { name: "cta_hero_click", display_name: "Clique CTA Hero", trigger_type: "click", selector: "#hero-cta, .btn-hero, [data-rk-track='hero']", conditions: [], metadata: [{ key: "section", value: "hero" }], enabled: false },
  { name: "cta_footer_click", display_name: "Clique CTA Footer", trigger_type: "click", selector: "#footer-cta, .footer-cta, footer a.btn", conditions: [], metadata: [{ key: "section", value: "footer" }], enabled: false },
  { name: "cta_header_click", display_name: "Clique CTA Header", trigger_type: "click", selector: "header .btn, nav .btn, .navbar-cta", conditions: [], metadata: [{ key: "section", value: "header" }], enabled: false },
  { name: "newsletter_submit", display_name: "Newsletter Enviado", trigger_type: "submit", selector: "#newsletter-form, .newsletter-form, [data-rk-track='newsletter']", conditions: [], metadata: [{ key: "source", value: "newsletter" }], enabled: false },
  { name: "contact_form_submit", display_name: "Formulário de Contato", trigger_type: "submit", selector: "#contact-form, .contact-form, [data-rk-track='contact']", conditions: [], metadata: [{ key: "source", value: "contact" }], enabled: false },
  { name: "pricing_view", display_name: "Seção Preços Visível", trigger_type: "visible", selector: "#pricing, .pricing-section, [data-rk-track='pricing']", conditions: [], metadata: [{ key: "section", value: "pricing" }], enabled: false },
  { name: "testimonials_view", display_name: "Depoimentos Visíveis", trigger_type: "visible", selector: "#testimonials, .testimonials, [data-rk-track='testimonials']", conditions: [], metadata: [{ key: "section", value: "testimonials" }], enabled: false },
  { name: "faq_view", display_name: "FAQ Visível", trigger_type: "visible", selector: "#faq, .faq-section, [data-rk-track='faq']", conditions: [], metadata: [{ key: "section", value: "faq" }], enabled: false },
  { name: "scroll_25", display_name: "Scroll 25%", trigger_type: "scroll", selector: "25", conditions: [], metadata: [{ key: "threshold", value: "25%" }], enabled: false },
  { name: "scroll_50", display_name: "Scroll 50%", trigger_type: "scroll", selector: "50", conditions: [], metadata: [{ key: "threshold", value: "50%" }], enabled: false },
  { name: "scroll_75", display_name: "Scroll 75%", trigger_type: "scroll", selector: "75", conditions: [], metadata: [{ key: "threshold", value: "75%" }], enabled: false },
  { name: "scroll_100", display_name: "Scroll 100%", trigger_type: "scroll", selector: "100", conditions: [], metadata: [{ key: "threshold", value: "100%" }], enabled: false },
  { name: "engaged_15s", display_name: "Engajado 15s", trigger_type: "timer", selector: "15", conditions: [], metadata: [{ key: "threshold_seconds", value: "15" }], enabled: false },
  { name: "engaged_30s", display_name: "Engajado 30s", trigger_type: "timer", selector: "30", conditions: [], metadata: [{ key: "threshold_seconds", value: "30" }], enabled: false },
  { name: "engaged_60s", display_name: "Engajado 60s", trigger_type: "timer", selector: "60", conditions: [], metadata: [{ key: "threshold_seconds", value: "60" }], enabled: false },
  { name: "video_play_click", display_name: "Play de Vídeo", trigger_type: "click", selector: "video, .video-play, [data-rk-track='video']", conditions: [], metadata: [{ key: "action", value: "video_play" }], enabled: false },
  { name: "social_click", display_name: "Clique Redes Sociais", trigger_type: "click", selector: "a[href*='instagram'], a[href*='facebook'], a[href*='twitter'], a[href*='linkedin'], a[href*='tiktok']", conditions: [], metadata: [{ key: "action", value: "social" }], enabled: false },
  { name: "download_click", display_name: "Clique Download", trigger_type: "click", selector: "a[href$='.pdf'], a[href$='.zip'], a[href$='.xlsx'], a[download]", conditions: [], metadata: [{ key: "action", value: "download" }], enabled: false },
];

export function useCustomEvents(projectId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["custom-event-configs", projectId];

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`custom-events-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_event_configs", filter: `project_id=eq.${projectId}` }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CustomEventConfig[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("custom_event_configs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CustomEventConfig[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const createEvent = useMutation({
    mutationFn: async (event: Omit<CustomEventConfig, "id" | "fires_count" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("custom_event_configs")
        .insert(event as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const toggleEvent = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("custom_event_configs")
        .update({ enabled } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_event_configs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("custom_event_configs")
        .update({
          name: fields.name,
          display_name: fields.display_name,
          trigger_type: fields.trigger_type,
          selector: fields.selector,
          conditions: fields.conditions,
          metadata: fields.metadata,
          enabled: fields.enabled,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const seedPresets = useMutation({
    mutationFn: async ({ projectId: pid, ownerId }: { projectId: string; ownerId: string }) => {
      const rows = PRESET_EVENTS.map(e => ({ ...e, project_id: pid, owner_id: ownerId }));
      const { error } = await supabase
        .from("custom_event_configs")
        .insert(rows as any[]);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { ...query, createEvent, toggleEvent, deleteEvent, updateEvent, seedPresets };
}
