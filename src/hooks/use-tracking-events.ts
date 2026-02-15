import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrackingEvent {
  id: string;
  event_type: string;
  page_url: string | null;
  page_title: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  referrer: string | null;
  session_id: string | null;
  visitor_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  cta_text: string | null;
  cta_selector: string | null;
  form_id: string | null;
  scroll_depth: number | null;
  time_on_page: number | null;
  product_id: string | null;
  product_name: string | null;
  product_price: number | null;
  cart_value: number | null;
  platform: string | null;
  language: string | null;
  screen_width: number | null;
  screen_height: number | null;
  metadata: any;
  created_at: string;
}

export function useTrackingEvents(projectId: string | null | undefined) {
  const queryClient = useQueryClient();

  // Subscribe to realtime inserts for this project
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`tracking-events-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tracking_events",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tracking-events", projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return useQuery({
    queryKey: ["tracking-events", projectId],
    queryFn: async (): Promise<TrackingEvent[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tracking_events")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as TrackingEvent[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

// Re-export constants (not mock data, just labels)
export const PLUGIN_EVENT_TYPES = [
  "page_view", "page_exit", "whatsapp_click", "phone_click", "email_click",
  "button_click", "form_submit", "product_view", "add_to_cart", "remove_from_cart",
  "begin_checkout", "purchase", "search",
] as const;

export type PluginEventType = typeof PLUGIN_EVENT_TYPES[number];

export const EVENT_LABELS: Record<string, string> = {
  page_view: "Visualização de Página",
  page_exit: "Saída da Página",
  whatsapp_click: "Clique WhatsApp",
  phone_click: "Clique Telefone",
  email_click: "Clique Email",
  button_click: "Clique Botão",
  form_submit: "Envio Formulário",
  product_view: "Visualização Produto",
  add_to_cart: "Adicionar ao Carrinho",
  remove_from_cart: "Remover do Carrinho",
  begin_checkout: "Início Checkout",
  purchase: "Compra",
  search: "Busca",
  click: "Clique",
};

export const EVENT_CATEGORIES = {
  tracking: ["page_view", "page_exit", "button_click", "click"],
  conversions: ["whatsapp_click", "phone_click", "email_click", "form_submit"],
  ecommerce: ["product_view", "add_to_cart", "remove_from_cart", "begin_checkout", "purchase", "search"],
};

// Helper: derive heatmap from events
export function buildHeatmap(events: TrackingEvent[]) {
  const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const grid: number[][] = DAYS.map(() => Array(24).fill(0));
  events.forEach((e) => {
    const d = new Date(e.created_at);
    const dayIdx = (d.getDay() + 6) % 7; // Mon=0
    grid[dayIdx][d.getHours()]++;
  });
  return DAYS.map((day, i) => ({
    day,
    hours: grid[i].map((value, hour) => ({ hour, value })),
  }));
}

// Helper: events grouped by day
export function eventsByDay(events: TrackingEvent[]) {
  const map = new Map<string, { tracking: number; conversions: number; ecommerce: number }>();
  events.forEach((e) => {
    const day = new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const entry = map.get(day) || { tracking: 0, conversions: 0, ecommerce: 0 };
    if (EVENT_CATEGORIES.ecommerce.includes(e.event_type)) entry.ecommerce++;
    else if (EVENT_CATEGORIES.conversions.includes(e.event_type)) entry.conversions++;
    else entry.tracking++;
    map.set(day, entry);
  });
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
}

// Helper: count by event type
export function eventTypeTotals(events: TrackingEvent[]) {
  const map = new Map<string, number>();
  events.forEach((e) => map.set(e.event_type, (map.get(e.event_type) || 0) + 1));
  return Array.from(map.entries())
    .map(([type, count]) => ({ type, label: EVENT_LABELS[type] || type, count }))
    .sort((a, b) => b.count - a.count);
}

// Helper: distribution by field
export function distributionBy(events: TrackingEvent[], field: keyof TrackingEvent) {
  const map = new Map<string, number>();
  events.forEach((e) => {
    const val = String(e[field] || "Desconhecido");
    map.set(val, (map.get(val) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
