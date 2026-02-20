
-- Table to store competitor schema analysis history
CREATE TABLE public.competitor_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Análise sem título',
  urls TEXT[] NOT NULL DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '[]',
  schemas_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON public.competitor_analyses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own analyses"
  ON public.competitor_analyses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own analyses"
  ON public.competitor_analyses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own analyses"
  ON public.competitor_analyses FOR DELETE
  USING (auth.uid() = owner_id);

CREATE INDEX idx_competitor_analyses_project ON public.competitor_analyses(project_id);
CREATE INDEX idx_competitor_analyses_owner ON public.competitor_analyses(owner_id);
