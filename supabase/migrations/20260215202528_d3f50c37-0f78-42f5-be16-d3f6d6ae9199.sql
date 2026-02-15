
-- Table to store custom event configurations per project
CREATE TABLE public.custom_event_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'click',
  selector TEXT NOT NULL DEFAULT '',
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  fires_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by project
CREATE INDEX idx_custom_event_configs_project ON public.custom_event_configs(project_id);

-- Enable RLS
ALTER TABLE public.custom_event_configs ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can view their own event configs"
  ON public.custom_event_configs FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create event configs"
  ON public.custom_event_configs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own event configs"
  ON public.custom_event_configs FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own event configs"
  ON public.custom_event_configs FOR DELETE
  USING (auth.uid() = owner_id);

-- Public read policy for the pixel script to fetch configs (anon key)
CREATE POLICY "Anon can read enabled event configs by project"
  ON public.custom_event_configs FOR SELECT
  USING (enabled = true);

-- Timestamp trigger
CREATE TRIGGER update_custom_event_configs_updated_at
  BEFORE UPDATE ON public.custom_event_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_event_configs;
