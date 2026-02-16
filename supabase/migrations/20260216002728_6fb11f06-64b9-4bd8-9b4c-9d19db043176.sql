
-- Sub-projects for grouping goals and offline conversions
CREATE TABLE public.goal_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL DEFAULT 'goals' CHECK (module IN ('goals', 'conversions')),
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goal_projects"
  ON public.goal_projects FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Add goal_project_id to tracking_goals
ALTER TABLE public.tracking_goals ADD COLUMN goal_project_id UUID REFERENCES public.goal_projects(id) ON DELETE SET NULL;

-- Add goal_project_id to conversions
ALTER TABLE public.conversions ADD COLUMN goal_project_id UUID REFERENCES public.goal_projects(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_goal_projects_updated_at
  BEFORE UPDATE ON public.goal_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
