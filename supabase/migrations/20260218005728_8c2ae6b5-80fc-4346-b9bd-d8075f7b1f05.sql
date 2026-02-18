
CREATE TABLE public.team_hub_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES public.orchestrator_deployments(id) ON DELETE CASCADE,
  project_id UUID,
  owner_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notify_whatsapp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_hub_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own hub entries"
  ON public.team_hub_entries
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER update_team_hub_entries_updated_at
  BEFORE UPDATE ON public.team_hub_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
