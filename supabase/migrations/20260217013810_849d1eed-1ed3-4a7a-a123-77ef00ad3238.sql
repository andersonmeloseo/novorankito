
-- Table for semantic goals/metas within a semantic project
CREATE TABLE public.semantic_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_project_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'custom' CHECK (goal_type IN ('niche_template', 'seo_objective', 'custom')),
  name TEXT NOT NULL,
  description TEXT,
  template_key TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.semantic_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own semantic goals"
  ON public.semantic_goals FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own semantic goals"
  ON public.semantic_goals FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own semantic goals"
  ON public.semantic_goals FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own semantic goals"
  ON public.semantic_goals FOR DELETE
  USING (auth.uid() = owner_id);

-- Trigger for updated_at
CREATE TRIGGER update_semantic_goals_updated_at
  BEFORE UPDATE ON public.semantic_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
