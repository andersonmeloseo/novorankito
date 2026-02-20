ALTER TABLE public.whitelabel_settings 
  ADD COLUMN IF NOT EXISTS gradient_end_color text DEFAULT NULL;