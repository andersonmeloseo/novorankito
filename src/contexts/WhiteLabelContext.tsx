import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WhiteLabelConfig {
  brand_name: string;
  subtitle: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  sidebar_bg_color: string | null;
  text_color: string | null;
  footer_text: string | null;
  hide_powered_by: boolean;
  custom_domain: string | null;
  login_title: string | null;
  login_subtitle: string | null;
  support_email: string | null;
  support_url: string | null;
  gradient_end_color: string | null;
}

const defaults: WhiteLabelConfig = {
  brand_name: "Rankito",
  subtitle: "SEO Intelligence",
  logo_url: null,
  favicon_url: null,
  primary_color: null,
  accent_color: null,
  sidebar_bg_color: null,
  text_color: null,
  footer_text: null,
  hide_powered_by: false,
  custom_domain: null,
  login_title: null,
  login_subtitle: null,
  support_email: null,
  support_url: null,
  gradient_end_color: null,
};

const WhiteLabelContext = createContext<WhiteLabelConfig>(defaults);

export const useWhiteLabel = () => useContext(WhiteLabelContext);

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyHslVar(root: HTMLElement, varName: string, hex: string | null) {
  if (hex) {
    const hsl = hexToHsl(hex);
    if (hsl) root.style.setProperty(varName, hsl);
  } else {
    root.style.removeProperty(varName);
  }
}

export function WhiteLabelProvider({ projectId, children }: { projectId: string | undefined; children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ["whitelabel-runtime", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from("whitelabel_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const config = useMemo<WhiteLabelConfig>(() => {
    if (!data) return defaults;
    const d = data as any;
    return {
      brand_name: d.brand_name || defaults.brand_name,
      subtitle: d.subtitle || defaults.subtitle,
      logo_url: d.logo_url,
      favicon_url: d.favicon_url,
      primary_color: d.primary_color,
      accent_color: d.accent_color,
      sidebar_bg_color: d.sidebar_bg_color,
      text_color: d.text_color,
      footer_text: d.footer_text,
      hide_powered_by: d.hide_powered_by ?? false,
      custom_domain: d.custom_domain,
      login_title: d.login_title,
      login_subtitle: d.login_subtitle,
      support_email: d.support_email,
      support_url: d.support_url,
      gradient_end_color: d.gradient_end_color,
    };
  }, [data]);

  useEffect(() => {
    const root = document.documentElement;

    applyHslVar(root, "--primary", config.primary_color);
    applyHslVar(root, "--sidebar-primary", config.primary_color);
    applyHslVar(root, "--accent", config.accent_color);
    applyHslVar(root, "--sidebar", config.sidebar_bg_color);
    applyHslVar(root, "--foreground", config.text_color);
    applyHslVar(root, "--sidebar-foreground", config.text_color);

    // Gradient end color
    if (config.gradient_end_color) {
      const hsl = hexToHsl(config.gradient_end_color);
      if (hsl) root.style.setProperty("--gradient-end", hsl);
    } else {
      root.style.removeProperty("--gradient-end");
    }

    // Favicon
    if (config.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = config.favicon_url;
    }

    // Page title
    if (config.brand_name && config.brand_name !== "Rankito") {
      document.title = config.brand_name;
    }

    return () => {
      ["--primary", "--sidebar-primary", "--accent", "--sidebar", "--foreground", "--sidebar-foreground", "--gradient-end"].forEach(v => root.style.removeProperty(v));
    };
  }, [config]);

  return (
    <WhiteLabelContext.Provider value={config}>
      {children}
    </WhiteLabelContext.Provider>
  );
}
