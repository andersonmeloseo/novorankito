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
      {/* Overlay with spotlight cutout using box-shadow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] pointer-events-auto"
        onClick={onOverlayClick}
      >
        {rect && (
          <div
            className="absolute transition-all duration-300 ease-out rounded-lg"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
              pointerEvents: "none",
            }}
          >
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-lg animate-pulse"
              style={{
                boxShadow: "0 0 0 3px hsl(var(--primary) / 0.5), 0 0 20px hsl(var(--primary) / 0.3)",
              }}
            />
          </div>
        )}
      </motion.div>

      {/* Allow clicks on the target element */}
      {rect && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}
    </>
  );
}
