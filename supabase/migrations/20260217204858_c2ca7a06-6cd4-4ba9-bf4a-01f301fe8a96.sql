
ALTER TABLE public.whitelabel_settings
  ADD COLUMN IF NOT EXISTS subtitle text DEFAULT 'SEO Intelligence',
  ADD COLUMN IF NOT EXISTS login_title text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS login_subtitle text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sidebar_bg_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS text_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS support_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS support_url text DEFAULT NULL;
