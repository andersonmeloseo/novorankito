
-- Store onboarding progress per project
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
