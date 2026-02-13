
-- 1. Site URLs inventory table
CREATE TABLE public.site_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  url TEXT NOT NULL,
  url_type TEXT NOT NULL DEFAULT 'page',
  url_group TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  last_crawl TIMESTAMP WITH TIME ZONE,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, url)
);

ALTER TABLE public.site_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view site_urls" ON public.site_urls FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert site_urls" ON public.site_urls FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update site_urls" ON public.site_urls FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete site_urls" ON public.site_urls FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_site_urls_project ON public.site_urls(project_id);

-- 2. SEO metrics table (Search Console data)
CREATE TABLE public.seo_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  url TEXT,
  query TEXT,
  country TEXT,
  device TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  position NUMERIC NOT NULL DEFAULT 0,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view seo_metrics" ON public.seo_metrics FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert seo_metrics" ON public.seo_metrics FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update seo_metrics" ON public.seo_metrics FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete seo_metrics" ON public.seo_metrics FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_seo_metrics_project_date ON public.seo_metrics(project_id, metric_date DESC);

-- 3. Conversions table
CREATE TABLE public.conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'form',
  page TEXT,
  value NUMERIC DEFAULT 0,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  device TEXT,
  location TEXT,
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view conversions" ON public.conversions FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert conversions" ON public.conversions FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update conversions" ON public.conversions FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete conversions" ON public.conversions FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_conversions_project ON public.conversions(project_id, converted_at DESC);

-- 4. Analytics sessions table (GA4-style data)
CREATE TABLE public.analytics_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  channel TEXT,
  source TEXT,
  medium TEXT,
  landing_page TEXT,
  device TEXT,
  country TEXT,
  users_count INTEGER NOT NULL DEFAULT 0,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  bounce_rate NUMERIC DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view analytics_sessions" ON public.analytics_sessions FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert analytics_sessions" ON public.analytics_sessions FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update analytics_sessions" ON public.analytics_sessions FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete analytics_sessions" ON public.analytics_sessions FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_analytics_sessions_project ON public.analytics_sessions(project_id, session_date DESC);

-- Triggers for updated_at
CREATE TRIGGER update_site_urls_updated_at BEFORE UPDATE ON public.site_urls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
