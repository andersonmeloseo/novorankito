
-- Drop the overly permissive policy and replace with a restrictive one
DROP POLICY IF EXISTS "Service can manage billing notifications" ON public.billing_notifications;

-- Allow inserts from authenticated users (edge functions use service_role which bypasses RLS)
-- So we just need the admin and user policies which are already in place
-- Add delete for admins
CREATE POLICY "Admins can delete billing notifications"
  ON public.billing_notifications FOR DELETE
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
