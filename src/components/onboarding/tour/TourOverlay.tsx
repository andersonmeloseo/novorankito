import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  targetSelector: string | null;
  active: boolean;
  onOverlayClick?: () => void;
}

export function TourOverlay({ targetSelector, active, onOverlayClick }: TourOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !targetSelector) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(targetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        const padding = 6;
        setRect({
          top: r.top - padding,
          left: r.left - padding,
          width: r.width + padding * 2,
          height: r.height + padding * 2,
        });
      } else {
        setRect(null);
      }
      rafRef.current = requestAnimationFrame(updateRect);
    };

    rafRef.current = requestAnimationFrame(updateRect);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetSelector, active]);

  if (!active) return null;

  // No target = full overlay for modal steps
  if (!targetSelector) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={onOverlayClick}
      />
    );
  }

  return (
    <>
      {/* Top overlay */}
      {rect && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* Four panels around the spotlight to create the cutout */}
          <div className="fixed inset-0 z-[9998] pointer-events-none">
            {/* Top */}
            <div
              className="absolute left-0 right-0 top-0 bg-black/70 pointer-events-auto"
              style={{ height: rect.top }}
              onClick={onOverlayClick}
            />
            {/* Bottom */}
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/70 pointer-events-auto"
              style={{ top: rect.top + rect.height }}
              onClick={onOverlayClick}
            />
            {/* Left */}
            <div
              className="absolute left-0 bg-black/70 pointer-events-auto"
              style={{ top: rect.top, height: rect.height, width: rect.left }}
              onClick={onOverlayClick}
            />
            {/* Right */}
            <div
              className="absolute right-0 bg-black/70 pointer-events-auto"
              style={{ top: rect.top, height: rect.height, left: rect.left + rect.width }}
              onClick={onOverlayClick}
            />
          </div>

          {/* Pulse ring around spotlight - pointer-events none so clicks go to target */}
          <div
            className="fixed z-[9998] rounded-lg animate-pulse pointer-events-none"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              boxShadow: "0 0 0 3px hsl(var(--primary) / 0.5), 0 0 20px hsl(var(--primary) / 0.3)",
            }}
          />
        </motion.div>
      )}
    </>
  );
}
