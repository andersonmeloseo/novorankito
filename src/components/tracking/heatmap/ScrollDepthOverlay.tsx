import { useMemo } from "react";
import type { TrackingEvent } from "@/hooks/use-tracking-events";

export function ScrollDepthOverlay({ events, iframeHeight }: { events: TrackingEvent[]; iframeHeight: number }) {
  const scrollData = useMemo(() => {
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const total = events.length || 1;
    const counts = buckets.map(() => 0);
    events.forEach((e) => {
      const depth = e.scroll_depth ?? 0;
      for (let i = 0; i < buckets.length; i++) { if (depth >= buckets[i]) counts[i]++; }
    });
    return buckets.map((pct, i) => ({ pct, count: counts[i], ratio: counts[i] / total }));
  }, [events]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {scrollData.map((d, i) => {
        const top = (d.pct / 100) * iframeHeight;
        const opacity = 1 - d.ratio;
        return (
          <div key={d.pct} className="absolute left-0 right-0 flex items-center" style={{ top }}>
            <div className="absolute left-0 right-0" style={{ height: i < scrollData.length - 1 ? `${iframeHeight / scrollData.length}px` : "20px", background: `rgba(255, 69, 0, ${opacity * 0.35})` }} />
            <div className="relative z-20 flex items-center gap-1.5 ml-2">
              <div className="h-0.5 w-8" style={{ background: `color-mix(in srgb, hsl(var(--destructive)) ${Math.round((1 - d.ratio) * 100)}%, hsl(var(--success)))` }} />
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-background/80 backdrop-blur-sm border border-border/50 text-foreground">
                {d.pct}% — {Math.round(d.ratio * 100)}% dos usuários
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
