
-- Create table for on-page audit tasks
CREATE TABLE public.onpage_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  task_id TEXT,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  crawl_progress NUMERIC NOT NULL DEFAULT 0,
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  pages_total INTEGER NOT NULL DEFAULT 0,
  summary JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for on-page audit page results
CREATE TABLE public.onpage_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.onpage_audits(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER,
  checks JSONB DEFAULT '{}'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  h1 TEXT,
  page_score NUMERIC,
  load_time NUMERIC,
  size INTEGER,
  internal_links_count INTEGER DEFAULT 0,
  external_links_count INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  images_without_alt INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_onpage_audits_project ON public.onpage_audits(project_id);
CREATE INDEX idx_onpage_audits_status ON public.onpage_audits(status);
CREATE INDEX idx_onpage_pages_audit ON public.onpage_pages(audit_id);
CREATE INDEX idx_onpage_pages_project ON public.onpage_pages(project_id);

-- RLS for onpage_audits
ALTER TABLE public.onpage_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audits"
  ON public.onpage_audits FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own audits"
  ON public.onpage_audits FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own audits"
  ON public.onpage_audits FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own audits"
  ON public.onpage_audits FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS for onpage_pages
ALTER TABLE public.onpage_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit pages"
  ON public.onpage_pages FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own audit pages"
  ON public.onpage_pages FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own audit pages"
  ON public.onpage_pages FOR DELETE
  USING (auth.uid() = owner_id);

-- Trigger for updated_at on onpage_audits
CREATE TRIGGER update_onpage_audits_updated_at
  BEFORE UPDATE ON public.onpage_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
