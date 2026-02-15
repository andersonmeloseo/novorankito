
-- Replace the overly permissive INSERT policy with one restricted to service role
DROP POLICY "Service role can insert tracking events" ON public.tracking_events;

-- Only allow inserts when there's no authenticated user (service role bypass) 
-- or restrict to project owners for manual inserts
CREATE POLICY "Project owners can insert tracking events"
  ON public.tracking_events FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );
