
-- Table for SEO performance chart annotations/notes
CREATE TABLE public.seo_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  annotation_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  color TEXT DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, annotation_date, title)
);

ALTER TABLE public.seo_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own annotations"
ON public.seo_annotations FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can create annotations"
ON public.seo_annotations FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own annotations"
ON public.seo_annotations FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own annotations"
ON public.seo_annotations FOR DELETE
USING (owner_id = auth.uid());

CREATE TRIGGER update_seo_annotations_updated_at
BEFORE UPDATE ON public.seo_annotations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_seo_annotations_project_date ON public.seo_annotations(project_id, annotation_date);
