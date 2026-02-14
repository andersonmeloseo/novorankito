
-- Table to store GSC Service Account credentials per project
CREATE TABLE public.gsc_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  connection_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  private_key TEXT NOT NULL,
  site_url TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gsc_connections ENABLE ROW LEVEL SECURITY;

-- Only owners can manage their connections
CREATE POLICY "Users can view their own GSC connections"
ON public.gsc_connections FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own GSC connections"
ON public.gsc_connections FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own GSC connections"
ON public.gsc_connections FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own GSC connections"
ON public.gsc_connections FOR DELETE
USING (auth.uid() = owner_id);

-- Trigger for updated_at
CREATE TRIGGER update_gsc_connections_updated_at
BEFORE UPDATE ON public.gsc_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint: one connection per project
CREATE UNIQUE INDEX idx_gsc_connections_project ON public.gsc_connections(project_id);
