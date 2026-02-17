import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WhiteLabelConfig {
  brand_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  footer_text: string | null;
  hide_powered_by: boolean;
  custom_domain: string | null;
}

const defaults: WhiteLabelConfig = {
  brand_name: "Rankito",
  logo_url: null,
  favicon_url: null,
  primary_color: null,
  accent_color: null,
  footer_text: null,
  hide_powered_by: false,
  custom_domain: null,
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
    return {
      brand_name: data.brand_name || defaults.brand_name,
      logo_url: data.logo_url,
      favicon_url: data.favicon_url,
      primary_color: data.primary_color,
      accent_color: data.accent_color,
      footer_text: data.footer_text,
      hide_powered_by: data.hide_powered_by ?? false,
      custom_domain: data.custom_domain,
    };
  }, [data]);

  // Apply CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    if (config.primary_color) {
      const hsl = hexToHsl(config.primary_color);
      if (hsl) {
        root.style.setProperty("--primary", hsl);
        root.style.setProperty("--sidebar-primary", hsl);
      }
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--sidebar-primary");
    }

    if (config.accent_color) {
      const hsl = hexToHsl(config.accent_color);
      if (hsl) {
        root.style.setProperty("--accent", hsl);
      }
    } else {
      root.style.removeProperty("--accent");
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
      root.style.removeProperty("--primary");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--accent");
    };
  }, [config]);

  return (
    <WhiteLabelContext.Provider value={config}>
      {children}
    </WhiteLabelContext.Provider>
  );
}
