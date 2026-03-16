
-- Add permissions and invited_email to project_members for granular access control
ALTER TABLE public.project_members 
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS invited_email TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
