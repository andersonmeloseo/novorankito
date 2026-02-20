
-- Create ga4_connections table (mirrors gsc_connections pattern)
CREATE TABLE public.ga4_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  connection_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  private_key TEXT NOT NULL,
  property_id TEXT,
  property_name TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ga4_connections_project_id_key UNIQUE (project_id)
);

ALTER TABLE public.ga4_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ga4 connections"
  ON public.ga4_connections FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own ga4 connections"
  ON public.ga4_connections FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own ga4 connections"
  ON public.ga4_connections FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own ga4 connections"
  ON public.ga4_connections FOR DELETE
  USING (owner_id = auth.uid());

CREATE TRIGGER update_ga4_connections_updated_at
  BEFORE UPDATE ON public.ga4_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
