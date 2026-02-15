-- Fix overly permissive INSERT policy on notifications
-- Notifications are created by service role (edge functions), 
-- but we also allow users to insert for their own user_id
DROP POLICY "System can create notifications" ON public.notifications;

CREATE POLICY "Users can create own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);