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

// ── Standard event types recognized by GA4, GSC, Meta Ads, Google Ads ──
export const PLUGIN_EVENT_TYPES = [
  // GA4 — Automatically collected
  "page_view", "first_visit", "session_start", "user_engagement",
  "scroll", "click", "file_download", "video_start", "video_progress", "video_complete",
  "view_search_results",
  // GA4 — E-commerce (recommended)
  "view_item", "view_item_list", "select_item", "add_to_cart", "remove_from_cart",
  "view_cart", "begin_checkout", "add_shipping_info", "add_payment_info", "purchase", "refund",
  // GA4 — Engagement (recommended)
  "sign_up", "login", "share", "search", "select_content", "select_promotion", "view_promotion",
  "generate_lead", "earn_virtual_currency", "spend_virtual_currency",
  // Google Ads — Conversion actions
  "conversion", "enhanced_conversion",
  // Meta Ads (Facebook Pixel) — Standard events
  "PageView", "Lead", "CompleteRegistration", "AddToCart", "InitiateCheckout",
  "Purchase", "AddPaymentInfo", "AddToWishlist", "ViewContent", "Search",
  "Contact", "CustomizeProduct", "Donate", "FindLocation", "Schedule",
  "StartTrial", "SubmitApplication", "Subscribe",
  // Rankito custom (CTA tracking)
  "whatsapp_click", "phone_click", "email_click", "button_click", "form_submit",
  "page_exit", "heatmap_click",
] as const;

export type PluginEventType = typeof PLUGIN_EVENT_TYPES[number];

export const EVENT_LABELS: Record<string, string> = {
  // GA4 — Auto
  page_view: "Page View",
  first_visit: "First Visit",
  session_start: "Session Start",
  user_engagement: "User Engagement",
  scroll: "Scroll",
  click: "Click",
  file_download: "File Download",
  video_start: "Video Start",
  video_progress: "Video Progress",
  video_complete: "Video Complete",
  view_search_results: "View Search Results",
  // GA4 — E-commerce
  view_item: "View Item",
  view_item_list: "View Item List",
  select_item: "Select Item",
  add_to_cart: "Add to Cart",
  remove_from_cart: "Remove from Cart",
  view_cart: "View Cart",
  begin_checkout: "Begin Checkout",
  add_shipping_info: "Add Shipping Info",
  add_payment_info: "Add Payment Info",
  purchase: "Purchase",
  refund: "Refund",
  // GA4 — Engagement
  sign_up: "Sign Up",
  login: "Login",
  share: "Share",
  search: "Search",
  select_content: "Select Content",
  select_promotion: "Select Promotion",
  view_promotion: "View Promotion",
  generate_lead: "Generate Lead",
  earn_virtual_currency: "Earn Virtual Currency",
  spend_virtual_currency: "Spend Virtual Currency",
  // Google Ads
  conversion: "Conversion (Google Ads)",
  enhanced_conversion: "Enhanced Conversion",
  // Meta Ads (Facebook Pixel)
  PageView: "PageView (Meta)",
  Lead: "Lead (Meta)",
  CompleteRegistration: "Complete Registration (Meta)",
  AddToCart: "AddToCart (Meta)",
  InitiateCheckout: "Initiate Checkout (Meta)",
  Purchase: "Purchase (Meta)",
  AddPaymentInfo: "Add Payment Info (Meta)",
  AddToWishlist: "Add to Wishlist (Meta)",
  ViewContent: "View Content (Meta)",
  Search: "Search (Meta)",
  Contact: "Contact (Meta)",
  CustomizeProduct: "Customize Product (Meta)",
  Donate: "Donate (Meta)",
  FindLocation: "Find Location (Meta)",
  Schedule: "Schedule (Meta)",
  StartTrial: "Start Trial (Meta)",
  SubmitApplication: "Submit Application (Meta)",
  Subscribe: "Subscribe (Meta)",
  // Rankito CTA tracking
  whatsapp_click: "Clique WhatsApp",
  phone_click: "Clique Telefone",
  email_click: "Clique Email",
  button_click: "Clique Botão",
  form_submit: "Envio Formulário",
  page_exit: "Page Exit",
  heatmap_click: "Clique (Heatmap)",
};

export const EVENT_CATEGORIES = {
  tracking: [
    "page_view", "first_visit", "session_start", "user_engagement",
    "scroll", "click", "file_download", "page_exit",
    "video_start", "video_progress", "video_complete", "view_search_results",
  ],
  conversions: [
    "whatsapp_click", "phone_click", "email_click", "form_submit", "button_click",
    "generate_lead", "sign_up", "login", "share", "select_content",
    "conversion", "enhanced_conversion",
    "Lead", "CompleteRegistration", "Contact", "Schedule",
    "StartTrial", "SubmitApplication", "Subscribe", "Donate",
  ],
  ecommerce: [
    "view_item", "view_item_list", "select_item", "add_to_cart", "remove_from_cart",
    "view_cart", "begin_checkout", "add_shipping_info", "add_payment_info", "purchase", "refund",
    "search", "select_promotion", "view_promotion",
    "PageView", "AddToCart", "InitiateCheckout", "Purchase", "AddPaymentInfo",
    "AddToWishlist", "ViewContent", "Search", "CustomizeProduct", "FindLocation",
  ],
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
