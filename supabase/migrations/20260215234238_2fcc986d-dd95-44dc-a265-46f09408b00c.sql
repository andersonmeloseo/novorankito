-- Allow project owners to delete their tracking events
CREATE POLICY "Project owners can delete tracking events"
ON public.tracking_events
FOR DELETE
USING (project_id IN (
  SELECT id FROM projects WHERE owner_id = auth.uid()
));

-- Allow project owners to delete their session recordings
CREATE POLICY "Project owners can delete session recordings"
ON public.session_recordings
FOR DELETE
USING (project_id IN (
  SELECT id FROM projects WHERE owner_id = auth.uid()
));