
-- Goals/Metas table for tracking goal completion
CREATE TABLE public.tracking_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'pages_visited', -- pages_visited, event_count, page_value
  target_value NUMERIC NOT NULL DEFAULT 1,
  target_urls TEXT[] DEFAULT '{}',
  target_events TEXT[] DEFAULT '{}',
  currency_value NUMERIC DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.tracking_goals
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own goals" ON public.tracking_goals
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own goals" ON public.tracking_goals
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own goals" ON public.tracking_goals
  FOR DELETE USING (owner_id = auth.uid());

CREATE TRIGGER update_tracking_goals_updated_at
  BEFORE UPDATE ON public.tracking_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_goals;
