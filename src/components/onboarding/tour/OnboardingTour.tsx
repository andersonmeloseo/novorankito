import { useEffect, useCallback, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { TourOverlay } from "./TourOverlay";
import { TourTooltip } from "./TourTooltip";
import { TourProgressBar } from "./TourProgressBar";
import { useOnboardingTour } from "@/hooks/use-onboarding-tour";
import { TOUR_STEPS } from "./tour-steps";

interface OnboardingTourProps {
  projectId: string | undefined;
}

export function OnboardingTour({ projectId }: OnboardingTourProps) {
  const {
    isActive,
    loading,
    stepIndex,
    currentStep,
    totalSteps,
    advanceStep,
    handleChoice,
    completeTour,
  } = useOnboardingTour(projectId);

  const navigate = useNavigate();
  const location = useLocation();
  const [isWaiting, setIsWaiting] = useState(false);
  const listenerRef = useRef<(() => void) | null>(null);

  // Listen for click on target element for requiresAction steps
  useEffect(() => {
    if (!isActive || !currentStep.requiresAction || currentStep.action === 'choice') return;

    const selector = currentStep.targetSelector;
    if (!selector) return;

    // Wait for element to appear
    const checkInterval = setInterval(() => {
      const el = document.querySelector(selector);
      if (!el) return;

      clearInterval(checkInterval);

      const handler = () => {
        if (currentStep.action === 'click') {
          // For simple click, advance after a small delay
          setTimeout(() => advanceStep(), 300);
        } else if (currentStep.action === 'click_and_wait') {
          setIsWaiting(true);
          // We'll listen for custom events dispatched by the app
          const waitHandler = () => {
            setIsWaiting(false);
            advanceStep();
            window.removeEventListener('tour-action-complete', waitHandler);
          };
          window.addEventListener('tour-action-complete', waitHandler);

          // Timeout fallback — 30s
          setTimeout(() => {
            setIsWaiting(false);
            advanceStep();
            window.removeEventListener('tour-action-complete', waitHandler);
          }, 30000);
        }
      };

      // Make the target element clickable above overlay
      (el as HTMLElement).style.position = 'relative';
      (el as HTMLElement).style.zIndex = '9999';
      el.addEventListener('click', handler, { once: true });

      listenerRef.current = () => {
        el.removeEventListener('click', handler);
        (el as HTMLElement).style.zIndex = '';
      };
    }, 200);

    return () => {
      clearInterval(checkInterval);
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, [isActive, stepIndex, currentStep]);

  // Auto-navigate for steps with navigateTo
  useEffect(() => {
    if (!isActive || !currentStep.navigateTo) return;

    const [path, hash] = currentStep.navigateTo.split('#');
    const currentPath = location.pathname;
    const currentHash = location.hash.replace('#', '');

    if (path && currentPath !== path) {
      navigate(currentStep.navigateTo);
    } else if (hash && currentHash !== hash) {
      window.history.replaceState(null, '', `${location.pathname}#${hash}`);
      // Trigger hash change detection
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }, [isActive, stepIndex]);

  // Block navigation while tour is active (add CSS class)
  useEffect(() => {
    if (isActive) {
      document.body.classList.add('tour-active');
    } else {
      document.body.classList.remove('tour-active');
    }
    return () => document.body.classList.remove('tour-active');
  }, [isActive]);

  // Handle advance for non-action steps
  const handleAdvance = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      completeTour();
    } else {
      advanceStep();
    }
  }, [stepIndex, totalSteps, completeTour, advanceStep]);

  if (loading || !isActive || stepIndex >= TOUR_STEPS.length) return null;

  return (
    <AnimatePresence mode="wait">
      <TourProgressBar stepIndex={stepIndex} totalSteps={totalSteps} />
      <TourOverlay
        targetSelector={currentStep.targetSelector}
        active={isActive}
      />
      <TourTooltip
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onAdvance={handleAdvance}
        onChoice={handleChoice}
        isWaiting={isWaiting}
      />
    </AnimatePresence>
  );
}
