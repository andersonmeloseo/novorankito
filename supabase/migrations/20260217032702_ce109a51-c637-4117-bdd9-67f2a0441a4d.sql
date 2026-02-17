
CREATE TABLE public.semantic_implementation_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  goal_project_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, goal_project_id)
);

ALTER TABLE public.semantic_implementation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans"
  ON public.semantic_implementation_plans FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own plans"
  ON public.semantic_implementation_plans FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own plans"
  ON public.semantic_implementation_plans FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own plans"
  ON public.semantic_implementation_plans FOR DELETE
  USING (auth.uid() = owner_id);
