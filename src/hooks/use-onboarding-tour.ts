import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TOUR_STEPS, STEP_INDEX_MAP } from "@/components/onboarding/tour/tour-steps";

interface OnboardingProgress {
  id: string;
  user_id: string;
  project_id: string;
  current_step: number;
  completed: boolean;
  skipped_ga4: boolean;
  completed_at: string | null;
}

export function useOnboardingTour(projectId: string | undefined) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const savingRef = useRef(false);

  const isActive = !!progress && !progress.completed;
  const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];

  // Load progress from DB
  useEffect(() => {
    if (!user?.id || !projectId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) {
        console.error("Error loading onboarding progress:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setProgress(data as any);
        setStepIndex(data.current_step || 0);
      } else {
        // Create new progress record
        const { data: newProgress, error: insertError } = await supabase
          .from("onboarding_progress")
          .insert({ user_id: user.id, project_id: projectId, current_step: 0, completed: false })
          .select()
          .single();

        if (!insertError && newProgress) {
          setProgress(newProgress as any);
          setStepIndex(0);
        }
      }
      setLoading(false);
    };

    load();
  }, [user?.id, projectId]);

  // Save step to DB
  const saveStep = useCallback(async (newStep: number, completed = false, skippedGa4?: boolean) => {
    if (!progress?.id || savingRef.current) return;
    savingRef.current = true;

    const updates: any = {
      current_step: newStep,
      completed,
      ...(completed ? { completed_at: new Date().toISOString() } : {}),
      ...(skippedGa4 !== undefined ? { skipped_ga4: skippedGa4 } : {}),
    };

    const { error } = await supabase
      .from("onboarding_progress")
      .update(updates)
      .eq("id", progress.id);

    if (!error) {
      setProgress(prev => prev ? { ...prev, ...updates } : null);
    }
    savingRef.current = false;
  }, [progress?.id]);

  // Advance to next step
  const advanceStep = useCallback((targetStepId?: string) => {
    let nextIndex: number;

    if (targetStepId) {
      nextIndex = STEP_INDEX_MAP.get(targetStepId) ?? stepIndex + 1;
    } else if (currentStep.nextStepId) {
      nextIndex = STEP_INDEX_MAP.get(currentStep.nextStepId) ?? stepIndex + 1;
    } else {
      nextIndex = stepIndex + 1;
    }

    if (nextIndex >= TOUR_STEPS.length) {
      // Tour complete
      saveStep(nextIndex, true);
      setStepIndex(nextIndex);
      return;
    }

    const nextStep = TOUR_STEPS[nextIndex];
    saveStep(nextIndex);
    setStepIndex(nextIndex);

    // Auto-navigate if step requires it
    if (nextStep.navigateTo) {
      const [path, hash] = nextStep.navigateTo.split('#');
      const currentPath = location.pathname;
      const currentHash = location.hash.replace('#', '');

      if (path && currentPath !== path) {
        navigate(nextStep.navigateTo);
      } else if (hash && currentHash !== hash) {
        window.history.replaceState(null, '', `#${hash}`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }
  }, [stepIndex, currentStep, saveStep, navigate, location]);

  // Handle choice (GA4 branching)
  const handleChoice = useCallback((value: string) => {
    const step = TOUR_STEPS[stepIndex];
    if (!step.choices) return;
    const choice = step.choices.find(c => c.value === value);
    if (!choice) return;

    if (value === 'no') {
      saveStep(stepIndex + 1, false, true);
    }

    advanceStep(choice.goToStepId);
  }, [stepIndex, advanceStep, saveStep]);

  // Complete tour
  const completeTour = useCallback(() => {
    saveStep(TOUR_STEPS.length, true);
    setProgress(prev => prev ? { ...prev, completed: true } : null);
  }, [saveStep]);

  // Reset tour
  const resetTour = useCallback(async () => {
    if (!progress?.id) return;
    await supabase
      .from("onboarding_progress")
      .update({ current_step: 0, completed: false, completed_at: null, skipped_ga4: false })
      .eq("id", progress.id);
    setProgress(prev => prev ? { ...prev, current_step: 0, completed: false, completed_at: null, skipped_ga4: false } : null);
    setStepIndex(0);
  }, [progress?.id]);

  return {
    isActive,
    loading,
    stepIndex,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    progress,
    advanceStep,
    handleChoice,
    completeTour,
    resetTour,
  };
}
