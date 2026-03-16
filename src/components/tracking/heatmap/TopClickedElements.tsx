import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { TrackingEvent } from "@/hooks/use-tracking-events";

export function TopClickedElements({ events }: { events: TrackingEvent[] }) {
  const elements = useMemo(() => {
    const map = new Map<string, { selector: string; text: string; count: number }>();
    events.forEach((e) => {
      if (!e.cta_selector) return;
      const key = e.cta_selector;
      const entry = map.get(key) || { selector: key, text: e.cta_text || "—", count: 0 };
      entry.count++;
      if (e.cta_text && e.cta_text.length > entry.text.length) entry.text = e.cta_text;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [events]);
  const maxCount = elements[0]?.count || 1;
  return (
    <div className="space-y-1.5">
      {elements.map((el, i) => (
        <div key={el.selector + i} className="flex items-center gap-3 group">
          <span className="text-[10px] font-mono text-muted-foreground w-6 text-right shrink-0">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="relative h-7 rounded overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${(el.count / maxCount) * 100}%`, background: `color-mix(in srgb, hsl(var(--primary)) ${Math.round((el.count / maxCount) * 100)}%, hsl(var(--muted)))`, opacity: 0.2 }} />
              <div className="relative flex items-center h-full px-2.5 gap-2">
                <code className="text-[9px] text-muted-foreground font-mono truncate max-w-[120px]">{el.selector}</code>
                <span className="text-[10px] text-foreground truncate flex-1">{el.text}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-[9px] shrink-0">{el.count}</Badge>
        </div>
      ))}
      {!elements.length && <p className="text-xs text-muted-foreground text-center py-4">Nenhum elemento com cliques registrados.</p>}
    </div>
  );
}
