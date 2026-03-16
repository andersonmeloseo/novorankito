
CREATE TABLE public.project_goals_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  focus TEXT NOT NULL DEFAULT 'seo_growth',
  clicks_goal INTEGER NOT NULL DEFAULT 30000,
  impressions_goal INTEGER NOT NULL DEFAULT 500000,
  position_goal INTEGER NOT NULL DEFAULT 8,
  whatsapp_phone TEXT DEFAULT '',
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.project_goals_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own project goals"
  ON public.project_goals_alerts FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own project goals"
  ON public.project_goals_alerts FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own project goals"
  ON public.project_goals_alerts FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER update_project_goals_alerts_updated_at
  BEFORE UPDATE ON public.project_goals_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
