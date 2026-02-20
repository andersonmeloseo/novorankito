
-- ============================================
-- MATERIALIZED VIEWS FOR DASHBOARD PERFORMANCE
-- ============================================

-- 1. Daily KPIs per project (replaces client-side aggregation)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_daily_kpis AS
SELECT 
  project_id,
  metric_date,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  AVG(CASE WHEN position > 0 THEN position END) as avg_position,
  AVG(ctr) * 100 as avg_ctr,
  COUNT(DISTINCT url) as unique_pages,
  COUNT(DISTINCT query) as unique_queries
FROM seo_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY project_id, metric_date
ORDER BY project_id, metric_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_kpis_pk ON mv_project_daily_kpis (project_id, metric_date);

-- 2. Top pages per project (last 28 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_pages_28d AS
SELECT 
  project_id,
  url,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  AVG(CASE WHEN position > 0 THEN position END) as avg_position,
  AVG(ctr) as avg_ctr
FROM seo_metrics
WHERE dimension_type = 'page'
  AND metric_date >= CURRENT_DATE - INTERVAL '28 days'
  AND url IS NOT NULL
GROUP BY project_id, url
ORDER BY total_clicks DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_pages_pk ON mv_top_pages_28d (project_id, url);

-- 3. Top queries per project (last 28 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_queries_28d AS
SELECT 
  project_id,
  query,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  AVG(CASE WHEN position > 0 THEN position END) as avg_position,
  AVG(ctr) as avg_ctr
FROM seo_metrics
WHERE dimension_type = 'query'
  AND metric_date >= CURRENT_DATE - INTERVAL '28 days'
  AND query IS NOT NULL
GROUP BY project_id, query
ORDER BY total_clicks DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_queries_pk ON mv_top_queries_28d (project_id, query);

-- 4. Device breakdown per project
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_device_breakdown AS
SELECT 
  project_id,
  device,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions
FROM seo_metrics
WHERE dimension_type = 'device'
  AND metric_date >= CURRENT_DATE - INTERVAL '28 days'
  AND device IS NOT NULL
GROUP BY project_id, device
ORDER BY total_clicks DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_device_pk ON mv_device_breakdown (project_id, device);

-- 5. Country breakdown per project
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_country_breakdown AS
SELECT 
  project_id,
  country,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions
FROM seo_metrics
WHERE dimension_type = 'country'
  AND metric_date >= CURRENT_DATE - INTERVAL '28 days'
  AND country IS NOT NULL
GROUP BY project_id, country
ORDER BY total_clicks DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_country_pk ON mv_country_breakdown (project_id, country);

-- 6. App errors table for observability
CREATE TABLE IF NOT EXISTS public.app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  function_name TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  user_id UUID,
  project_id UUID,
  request_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own errors" ON public.app_errors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert errors" ON public.app_errors
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_app_errors_recent ON app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_project ON app_errors(project_id, created_at DESC);

-- 7. Sync jobs table for background processing
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  owner_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payload JSONB DEFAULT '{}',
  result JSONB,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync jobs" ON public.sync_jobs
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own sync jobs" ON public.sync_jobs
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_pending ON sync_jobs(status, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_sync_jobs_project ON sync_jobs(project_id, created_at DESC);

-- 8. Rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT, p_window_seconds INT, p_max_requests INT
) RETURNS BOOLEAN AS $$
DECLARE
  current_window TIMESTAMPTZ;
  current_count INT;
BEGIN
  current_window := date_trunc('minute', now());
  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, current_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO current_count;
  
  RETURN current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Enhanced get_project_overview to use MVs when available
CREATE OR REPLACE FUNCTION public.get_project_overview_v2(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  v_total_urls bigint;
  v_total_clicks bigint;
  v_total_impressions bigint;
  v_avg_position numeric;
  v_avg_ctr numeric;
  v_total_queries bigint;
  v_submitted bigint;
  v_failed bigint;
  v_inspected bigint;
  v_indexed bigint;
  v_total_requests bigint;
  v_top_pages jsonb;
  v_top_queries jsonb;
  v_devices jsonb;
  v_countries jsonb;
  v_daily_trend jsonb;
BEGIN
  -- Total site URLs
  SELECT count(*) INTO v_total_urls FROM site_urls WHERE project_id = p_project_id;

  -- SEO aggregates from MV
  SELECT
    coalesce(sum(total_clicks), 0),
    coalesce(sum(total_impressions), 0),
    coalesce(avg(avg_position), 0),
    coalesce(avg(avg_ctr), 0)
  INTO v_total_clicks, v_total_impressions, v_avg_position, v_avg_ctr
  FROM mv_project_daily_kpis
  WHERE project_id = p_project_id;

  -- Unique queries from MV
  SELECT count(*) INTO v_total_queries
  FROM mv_top_queries_28d WHERE project_id = p_project_id;

  -- Indexing stats
  SELECT
    count(*) FILTER (WHERE status = 'success'),
    count(*) FILTER (WHERE status IN ('failed', 'quota_exceeded')),
    count(*)
  INTO v_submitted, v_failed, v_total_requests
  FROM indexing_requests WHERE project_id = p_project_id;

  SELECT
    count(*),
    count(*) FILTER (WHERE verdict = 'PASS' OR indexing_state = 'INDEXING_ALLOWED')
  INTO v_inspected, v_indexed
  FROM index_coverage WHERE project_id = p_project_id;

  -- Top pages from MV (top 10)
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_top_pages
  FROM (
    SELECT url, total_clicks as clicks, total_impressions as impressions, 
           round(avg_position::numeric, 1) as position, round((avg_ctr * 100)::numeric, 1) as ctr
    FROM mv_top_pages_28d WHERE project_id = p_project_id
    ORDER BY total_clicks DESC LIMIT 10
  ) t;

  -- Top queries from MV (top 10)
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_top_queries
  FROM (
    SELECT query, total_clicks as clicks, total_impressions as impressions, 
           round(avg_position::numeric, 1) as position
    FROM mv_top_queries_28d WHERE project_id = p_project_id
    ORDER BY total_clicks DESC LIMIT 10
  ) t;

  -- Devices from MV
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_devices
  FROM (
    SELECT device, total_clicks as clicks, total_impressions as impressions
    FROM mv_device_breakdown WHERE project_id = p_project_id
    ORDER BY total_clicks DESC
  ) t;

  -- Countries from MV (top 10)
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_countries
  FROM (
    SELECT country, total_clicks as clicks, total_impressions as impressions
    FROM mv_country_breakdown WHERE project_id = p_project_id
    ORDER BY total_clicks DESC LIMIT 10
  ) t;

  -- Daily trend from MV (last 28 days)
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_daily_trend
  FROM (
    SELECT metric_date, total_clicks as clicks, total_impressions as impressions,
           round(avg_position::numeric, 1) as position, round(avg_ctr::numeric, 2) as ctr
    FROM mv_project_daily_kpis WHERE project_id = p_project_id
    AND metric_date >= CURRENT_DATE - INTERVAL '28 days'
    ORDER BY metric_date ASC
  ) t;

  result := jsonb_build_object(
    'total_urls', v_total_urls,
    'total_clicks', v_total_clicks,
    'total_impressions', v_total_impressions,
    'avg_position', round(v_avg_position::numeric, 1),
    'avg_ctr', round(v_avg_ctr::numeric, 2),
    'total_queries', v_total_queries,
    'indexing', jsonb_build_object(
      'submitted', v_submitted,
      'failed', v_failed,
      'inspected', v_inspected,
      'indexed', v_indexed,
      'total_requests', v_total_requests,
      'total_urls', v_total_urls
    ),
    'top_pages', v_top_pages,
    'top_queries', v_top_queries,
    'devices', v_devices,
    'countries', v_countries,
    'daily_trend', v_daily_trend
  );

  RETURN result;
END;
$function$;

-- 10. pg_cron schedules for MV refresh
-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Refresh KPIs every 6 hours
SELECT cron.schedule('refresh-mv-daily-kpis', '0 */6 * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_daily_kpis');

-- Refresh top pages daily at 3 AM
SELECT cron.schedule('refresh-mv-top-pages', '0 3 * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_pages_28d');

-- Refresh top queries daily at 3:10 AM
SELECT cron.schedule('refresh-mv-top-queries', '10 3 * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_queries_28d');

-- Refresh devices daily at 3:20 AM
SELECT cron.schedule('refresh-mv-devices', '20 3 * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_device_breakdown');

-- Refresh countries daily at 3:30 AM
SELECT cron.schedule('refresh-mv-countries', '30 3 * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_country_breakdown');

-- Cleanup rate limits every day at 4 AM
SELECT cron.schedule('cleanup-rate-limits', '0 4 * * *',
  'DELETE FROM rate_limits WHERE window_start < now() - interval ''1 hour''');

-- Cleanup old app errors (keep 30 days)
SELECT cron.schedule('cleanup-app-errors', '0 5 * * *',
  'DELETE FROM app_errors WHERE created_at < now() - interval ''30 days''');
