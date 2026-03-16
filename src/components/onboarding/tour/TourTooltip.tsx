import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import type { TourStep } from "./tour-steps";

interface TourTooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onAdvance: () => void;
  onChoice?: (value: string) => void;
  isWaiting?: boolean;
}

export function TourTooltip({ step, stepIndex, totalSteps, onAdvance, onChoice, isWaiting }: TourTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number; placement: string }>({ top: 0, left: 0, placement: "bottom" });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!step.targetSelector) {
      // Center on screen
      setPosition({ top: 0, left: 0, placement: "center" });
      return;
    }

    const updatePosition = () => {
      const el = document.querySelector(step.targetSelector!);
      const tooltip = tooltipRef.current;
      if (!el || !tooltip) return;

      const elRect = el.getBoundingClientRect();
      const ttRect = tooltip.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 16;

      let top = elRect.bottom + gap;
      let left = elRect.left + elRect.width / 2 - ttRect.width / 2;
      let placement = "bottom";

      // If doesn't fit below, try above
      if (top + ttRect.height > vh - 20) {
        top = elRect.top - ttRect.height - gap;
        placement = "top";
      }

      // If doesn't fit above either, put to the right
      if (top < 20) {
        top = elRect.top + elRect.height / 2 - ttRect.height / 2;
        left = elRect.right + gap;
        placement = "right";

        if (left + ttRect.width > vw - 20) {
          left = elRect.left - ttRect.width - gap;
          placement = "left";
        }
      }

      // Clamp within viewport
      left = Math.max(12, Math.min(left, vw - ttRect.width - 12));
      top = Math.max(12, Math.min(top, vh - ttRect.height - 12));

      setPosition({ top, left, placement });
    };

    // Wait for element to render
    const timer = setTimeout(updatePosition, 100);
    const interval = setInterval(updatePosition, 500);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [step.targetSelector, stepIndex]);

  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;
  const isCentered = !step.targetSelector;
  const buttonLabel = stepIndex === 0 ? "Começar Configuração" :
    stepIndex === totalSteps - 1 ? "Começar a usar!" : "Entendi, continuar";

  return (
    <motion.div
      ref={tooltipRef}
      key={stepIndex}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`z-[10000] w-[92vw] max-w-[400px] ${isCentered ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : "fixed"}`}
      style={isCentered ? undefined : { top: position.top, left: position.left }}
    >
      <div className="rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden bg-card border-l-4 border-l-primary border border-border">
        <div className="p-5">
          {/* Step counter */}
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">
            Passo {stepIndex + 1} de {totalSteps}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-foreground mb-2">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">
            {step.description}
          </p>

          {/* Waiting state */}
          {isWaiting && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-primary font-medium">Aguardando conclusão...</span>
            </div>
          )}

          {/* Choices (GA4 question) */}
          {step.action === 'choice' && step.choices && (
            <div className="flex flex-col gap-2 mb-4">
              {step.choices.map(choice => (
                <Button
                  key={choice.value}
                  variant={choice.value === 'yes' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full text-xs h-9"
                  onClick={() => onChoice?.(choice.value)}
                >
                  {choice.label}
                </Button>
              ))}
            </div>
          )}

          {/* Action button for non-choice, non-action steps */}
          {step.action !== 'choice' && !step.requiresAction && !isWaiting && (
            <Button size="sm" className="w-full text-xs h-9 gap-1.5" onClick={onAdvance}>
              {buttonLabel}
            </Button>
          )}

          {/* Hint + manual fallback for action steps */}
          {step.requiresAction && !isWaiting && step.action !== 'choice' && (
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground text-center italic">
                👆 Clique no elemento destacado para continuar
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={onAdvance}>
                Já concluí, continuar
              </Button>
            </div>
          )}

          {/* Progress */}
          <div className="mt-4">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
