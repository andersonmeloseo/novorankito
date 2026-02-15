-- Performance indexes for heavy queries
-- seo_metrics: most queried table, needs composite indexes
CREATE INDEX IF NOT EXISTS idx_seo_metrics_project_date 
  ON public.seo_metrics (project_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_seo_metrics_project_dimension 
  ON public.seo_metrics (project_id, dimension_type, metric_date DESC);

-- site_urls: frequently filtered by project + status
CREATE INDEX IF NOT EXISTS idx_site_urls_project_status 
  ON public.site_urls (project_id, status);

CREATE INDEX IF NOT EXISTS idx_site_urls_project_group 
  ON public.site_urls (project_id, url_group);

-- indexing_requests: filtered by project + status
CREATE INDEX IF NOT EXISTS idx_indexing_requests_project_status 
  ON public.indexing_requests (project_id, status, submitted_at DESC);

-- sync_jobs: job processor queries by status + created_at
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_created 
  ON public.sync_jobs (status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_project 
  ON public.sync_jobs (project_id, created_at DESC);

-- analytics_sessions: date range queries
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_project_date 
  ON public.analytics_sessions (project_id, session_date DESC);

-- conversions: date range queries  
CREATE INDEX IF NOT EXISTS idx_conversions_project_date 
  ON public.conversions (project_id, converted_at DESC);

-- app_errors: recent errors lookup
CREATE INDEX IF NOT EXISTS idx_app_errors_created 
  ON public.app_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_errors_project 
  ON public.app_errors (project_id, created_at DESC);

-- index_coverage: project lookups
CREATE INDEX IF NOT EXISTS idx_index_coverage_project 
  ON public.index_coverage (project_id, inspected_at DESC);

-- audit_logs: recent activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
  ON public.audit_logs (user_id, created_at DESC);