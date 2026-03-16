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

  // Use refs to hold latest values for the delegated click handler
  const stepRef = useRef(currentStep);
  const advanceRef = useRef(advanceStep);
  stepRef.current = currentStep;
  advanceRef.current = advanceStep;

  // Listen for clicks via event delegation (robust against React re-renders)
  useEffect(() => {
    if (!isActive || !currentStep.requiresAction || currentStep.action === 'choice') return;

    const selector = currentStep.targetSelector;
    if (!selector) return;

    let handled = false;

    // Elevate matching element when found
    const elevateInterval = setInterval(() => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        el.style.position = 'relative';
        el.style.zIndex = '10000';
        el.style.pointerEvents = 'auto';
      }
    }, 300);

    const handler = (e: MouseEvent) => {
      if (handled) return;
      const target = e.target as HTMLElement;
      const matched = target.closest(selector);
      if (!matched) return;

      handled = true;
      const step = stepRef.current;

      if (step.action === 'click') {
        setTimeout(() => advanceRef.current(), 300);
      } else if (step.action === 'click_and_wait') {
        setIsWaiting(true);
        const waitHandler = () => {
          setIsWaiting(false);
          advanceRef.current();
          window.removeEventListener('tour-action-complete', waitHandler);
        };
        window.addEventListener('tour-action-complete', waitHandler);

        // Timeout fallback — 30s
        setTimeout(() => {
          setIsWaiting(false);
          advanceRef.current();
          window.removeEventListener('tour-action-complete', waitHandler);
        }, 30000);
      }
    };

    document.addEventListener('click', handler, true); // capture phase

    return () => {
      clearInterval(elevateInterval);
      document.removeEventListener('click', handler, true);
      // Reset elevated elements
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        el.style.zIndex = '';
        el.style.pointerEvents = '';
      }
    };
  }, [isActive, stepIndex, currentStep]);

  // Auto-navigate for steps with navigateTo + auto-advance when route objective is already reached
  useEffect(() => {
    if (!isActive || !currentStep.navigateTo) return;

    const [path, hash] = currentStep.navigateTo.split('#');
    const currentPath = location.pathname;
    const currentHash = location.hash.replace('#', '');

    if (path && currentPath !== path) {
      navigate(currentStep.navigateTo);
      return;
    }

    if (hash && currentHash !== hash) {
      window.history.replaceState(null, '', `${location.pathname}#${hash}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    const reachedNavigationGoal =
      currentStep.requiresAction &&
      currentStep.action === 'click' &&
      (!!path ? currentPath === path : true) &&
      (!!hash ? currentHash === hash : true);

    if (reachedNavigationGoal) {
      const autoAdvanceTimer = window.setTimeout(() => {
        advanceStep();
      }, 250);
      return () => window.clearTimeout(autoAdvanceTimer);
    }
  }, [isActive, stepIndex, currentStep, location.pathname, location.hash, navigate, advanceStep]);

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
