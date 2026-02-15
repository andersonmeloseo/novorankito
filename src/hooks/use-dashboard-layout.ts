import { useState, useCallback, useEffect } from "react";
import type { WidgetConfig } from "@/components/dashboard/WidgetConfigPanel";

const STORAGE_KEY = "rankito_dashboard_layout";

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "welcome", title: "Boas-vindas", visible: true, colSpan: "col-span-full" },
  { id: "kpis", title: "KPIs Principais", visible: true, colSpan: "col-span-full" },
  { id: "indexing", title: "Indexação", visible: true, colSpan: "col-span-full" },
  { id: "ga4", title: "GA4 / Analytics", visible: true, colSpan: "col-span-full" },
  { id: "trend", title: "Gráfico de Tendências", visible: true, colSpan: "col-span-full" },
  { id: "devices", title: "Dispositivos & Países", visible: true, colSpan: "col-span-full" },
  { id: "tables", title: "Top Páginas & Consultas", visible: true, colSpan: "col-span-full" },
  { id: "sync", title: "Jobs de Sincronização", visible: true, colSpan: "col-span-full" },
  { id: "health", title: "Saúde do Sistema", visible: true, colSpan: "col-span-full" },
];

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetConfig[];
        // Merge with defaults to handle new widgets
        const ids = new Set(parsed.map(w => w.id));
        const merged = [...parsed];
        for (const def of DEFAULT_WIDGETS) {
          if (!ids.has(def.id)) merged.push(def);
        }
        return merged;
      }
    } catch {}
    return DEFAULT_WIDGETS;
  });

  const [isEditing, setIsEditing] = useState(false);

  const updateWidgets = useCallback((newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
  }, []);

  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleEdit = useCallback(() => setIsEditing(prev => !prev), []);

  const moveWidget = useCallback((fromId: string, toId: string) => {
    setWidgets(prev => {
      const fromIdx = prev.findIndex(w => w.id === fromId);
      const toIdx = prev.findIndex(w => w.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isVisible = useCallback((id: string) => {
    return widgets.find(w => w.id === id)?.visible ?? true;
  }, [widgets]);

  return { widgets, isEditing, updateWidgets, resetLayout, toggleEdit, moveWidget, isVisible };
}
