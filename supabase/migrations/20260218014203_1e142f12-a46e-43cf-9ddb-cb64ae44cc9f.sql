
-- Remove overly permissive service role policy and replace with proper approach
DROP POLICY IF EXISTS "Service role full access" ON public.orchestrator_tasks;
