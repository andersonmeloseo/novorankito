-- Remove the UNIQUE constraint we just added, since the system supports multiple GSC connections per project
-- The onboarding code will be changed to use insert instead of upsert
ALTER TABLE public.gsc_connections DROP CONSTRAINT gsc_connections_project_id_key;