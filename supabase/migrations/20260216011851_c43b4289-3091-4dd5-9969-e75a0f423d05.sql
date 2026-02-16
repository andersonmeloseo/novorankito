-- Fix: allow project members to view session recordings (not just owner)
DROP POLICY IF EXISTS "Users can view recordings for their projects" ON public.session_recordings;

CREATE POLICY "Users can view recordings for their projects"
ON public.session_recordings
FOR SELECT
USING (
  project_id IN (
    SELECT projects.id FROM projects WHERE projects.owner_id = auth.uid()
    UNION
    SELECT project_members.project_id FROM project_members WHERE project_members.user_id = auth.uid()
  )
);

-- Also fix DELETE policy for consistency
DROP POLICY IF EXISTS "Project owners can delete session recordings" ON public.session_recordings;

CREATE POLICY "Project members can delete session recordings"
ON public.session_recordings
FOR DELETE
USING (
  project_id IN (
    SELECT projects.id FROM projects WHERE projects.owner_id = auth.uid()
    UNION
    SELECT project_members.project_id FROM project_members WHERE project_members.user_id = auth.uid()
  )
);