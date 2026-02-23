
-- Add whatsapp_phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- Create lifecycle notification log table
CREATE TABLE public.billing_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_type text NOT NULL, -- welcome, expiring_7d, expiring_3d, expiring_1d, expired, payment_reminder
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all
CREATE POLICY "Admins can view all billing notifications"
  ON public.billing_notifications FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert
CREATE POLICY "Admins can insert billing notifications"
  ON public.billing_notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Service role can do everything (for edge functions)
CREATE POLICY "Service can manage billing notifications"
  ON public.billing_notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can see their own
CREATE POLICY "Users can view own billing notifications"
  ON public.billing_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Update handle_new_user to save whatsapp
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, whatsapp_phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'whatsapp'
  );
  RETURN NEW;
END;
$function$;

-- Index for fast lookups
CREATE INDEX idx_billing_notifications_user_type ON public.billing_notifications (user_id, notification_type);
CREATE INDEX idx_billing_notifications_created ON public.billing_notifications (created_at DESC);
