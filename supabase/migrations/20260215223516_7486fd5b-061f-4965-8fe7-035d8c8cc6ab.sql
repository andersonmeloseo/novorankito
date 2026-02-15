-- Fix the permissive INSERT policy to restrict to service role pattern
-- The edge function uses service_role key which bypasses RLS anyway,
-- so we can make this policy restrictive for regular users
DROP POLICY "Service role can insert recordings" ON public.session_recordings;

-- Only project owners can insert (edge function bypasses RLS with service_role)
CREATE POLICY "Project owners can insert recordings"
ON public.session_recordings FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
  )
);