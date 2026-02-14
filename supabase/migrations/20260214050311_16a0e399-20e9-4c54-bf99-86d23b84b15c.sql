
-- Table to store batch URL inspection results for index coverage
CREATE TABLE public.index_coverage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  url TEXT NOT NULL,
  verdict TEXT, -- e.g. PASS, NEUTRAL, FAIL, VERDICT_UNSPECIFIED
  coverage_state TEXT, -- e.g. Submitted and indexed, Crawled - currently not indexed, etc.
  robotstxt_state TEXT,
  indexing_state TEXT,
  page_fetch_state TEXT,
  crawled_as TEXT,
  last_crawl_time TIMESTAMPTZ,
  referring_urls TEXT[],
  sitemap TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, url)
);

ALTER TABLE public.index_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own index coverage"
  ON public.index_coverage FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own index coverage"
  ON public.index_coverage FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own index coverage"
  ON public.index_coverage FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own index coverage"
  ON public.index_coverage FOR DELETE
  USING (auth.uid() = owner_id);

CREATE INDEX idx_index_coverage_project ON public.index_coverage(project_id);
CREATE INDEX idx_index_coverage_verdict ON public.index_coverage(project_id, verdict);
