-- Add UNIQUE constraint on project_id for gsc_connections
-- This is needed because the onboarding code uses upsert with onConflict: "project_id"
-- Without this constraint, the upsert silently fails
ALTER TABLE public.gsc_connections ADD CONSTRAINT gsc_connections_project_id_key UNIQUE (project_id);