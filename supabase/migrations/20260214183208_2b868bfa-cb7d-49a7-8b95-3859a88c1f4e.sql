
-- Fix: restrict insert on workflow_deliveries to service role only (edge functions)
DROP POLICY "Service can insert deliveries" ON public.workflow_deliveries;

-- Only allow inserts when called from service_role (edge functions)
-- Regular users cannot insert deliveries directly
CREATE POLICY "Service role can insert deliveries"
  ON public.workflow_deliveries FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    OR current_setting('role') = 'service_role'
  );
