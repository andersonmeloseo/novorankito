-- Drop unique constraint on project_id to allow multiple GSC connections per project
DROP INDEX IF EXISTS public.idx_gsc_connections_project;

-- Create a non-unique index for performance
CREATE INDEX idx_gsc_connections_project_id ON public.gsc_connections (project_id);
