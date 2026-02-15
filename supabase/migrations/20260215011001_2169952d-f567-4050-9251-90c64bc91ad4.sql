
-- Fix RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits should only be managed by the check_rate_limit function (SECURITY DEFINER)
-- No direct access needed
CREATE POLICY "No direct access to rate_limits" ON public.rate_limits
  FOR ALL USING (false);

-- Fix app_errors insert policy to require auth
DROP POLICY IF EXISTS "Service role can insert errors" ON public.app_errors;
CREATE POLICY "Authenticated users can insert errors" ON public.app_errors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Move materialized views to a non-public schema to avoid API exposure
CREATE SCHEMA IF NOT EXISTS analytics;

-- Recreate MVs in analytics schema
DROP MATERIALIZED VIEW IF EXISTS public.mv_project_daily_kpis;
DROP MATERIALIZED VIEW IF EXISTS public.mv_top_pages_28d;
DROP MATERIALIZED VIEW IF EXISTS public.mv_top_queries_28d;
DROP MATERIALIZED VIEW IF EXISTS public.mv_device_breakdown;
DROP MATERIALIZED VIEW IF EXISTS public.mv_country_breakdown;

CREATE MATERIALIZED VIEW analytics.mv_project_daily_kpis AS
SELECT project_id, metric_date,
  SUM(clicks) as total_clicks, SUM(impressions) as total_impressions,
  AVG(CASE WHEN position > 0 THEN position END) as avg_position,
  AVG(ctr) * 100 as avg_ctr,
  COUNT(DISTINCT url) as unique_pages, COUNT(DISTINCT query) as unique_queries
FROM public.seo_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY project_id, metric_date;

CREATE UNIQUE INDEX ON analytics.mv_project_daily_kpis (project_id, metric_date);

CREATE MATERIALIZED VIEW analytics.mv_top_pages_28d AS
SELECT project_id, url,
  SUM(clicks) as total_clicks, SUM(impressions) as total_impressions,
  AVG(CASE WHEN position > 0 THEN position END) as avg_position, AVG(ctr) as avg_ctr
FROM public.seo_metrics
WHERE dimension_type = 'page' AND metric_date >= CURRENT_DATE - INTERVAL '28 days' AND url IS NOT NULL
GROUP BY project_id, url;

CREATE UNIQUE INDEX ON analytics.mv_top_pages_28d (project_id, url);

CREATE MATERIALIZED VIEW analytics.mv_top_queries_28d AS
SELECT project_id, query,
  SUM(clicks) as total_clicks, SUM(impressions) as total_impressions,
  AVG(CASE WHEN position > 0 THEN position END) as avg_position, AVG(ctr) as avg_ctr
FROM public.seo_metrics
WHERE dimension_type = 'query' AND metric_date >= CURRENT_DATE - INTERVAL '28 days' AND query IS NOT NULL
GROUP BY project_id, query;

CREATE UNIQUE INDEX ON analytics.mv_top_queries_28d (project_id, query);

CREATE MATERIALIZED VIEW analytics.mv_device_breakdown AS
SELECT project_id, device,
  SUM(clicks) as total_clicks, SUM(impressions) as total_impressions
FROM public.seo_metrics
WHERE dimension_type = 'device' AND metric_date >= CURRENT_DATE - INTERVAL '28 days' AND device IS NOT NULL
GROUP BY project_id, device;

CREATE UNIQUE INDEX ON analytics.mv_device_breakdown (project_id, device);

CREATE MATERIALIZED VIEW analytics.mv_country_breakdown AS
SELECT project_id, country,
  SUM(clicks) as total_clicks, SUM(impressions) as total_impressions
FROM public.seo_metrics
WHERE dimension_type = 'country' AND metric_date >= CURRENT_DATE - INTERVAL '28 days' AND country IS NOT NULL
GROUP BY project_id, country;

CREATE UNIQUE INDEX ON analytics.mv_country_breakdown (project_id, country);

-- Update the RPC function to use analytics schema
CREATE OR REPLACE FUNCTION public.get_project_overview_v2(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'analytics'
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
  SELECT count(*) INTO v_total_urls FROM public.site_urls WHERE project_id = p_project_id;

  SELECT coalesce(sum(total_clicks), 0), coalesce(sum(total_impressions), 0),
    coalesce(avg(avg_position), 0), coalesce(avg(avg_ctr), 0)
  INTO v_total_clicks, v_total_impressions, v_avg_position, v_avg_ctr
  FROM analytics.mv_project_daily_kpis WHERE project_id = p_project_id;

  SELECT count(*) INTO v_total_queries FROM analytics.mv_top_queries_28d WHERE project_id = p_project_id;

  SELECT count(*) FILTER (WHERE status = 'success'),
    count(*) FILTER (WHERE status IN ('failed', 'quota_exceeded')), count(*)
  INTO v_submitted, v_failed, v_total_requests
  FROM public.indexing_requests WHERE project_id = p_project_id;

  SELECT count(*), count(*) FILTER (WHERE verdict = 'PASS' OR indexing_state = 'INDEXING_ALLOWED')
  INTO v_inspected, v_indexed FROM public.index_coverage WHERE project_id = p_project_id;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_top_pages
  FROM (SELECT url, total_clicks as clicks, total_impressions as impressions,
    round(avg_position::numeric, 1) as position, round((avg_ctr * 100)::numeric, 1) as ctr
    FROM analytics.mv_top_pages_28d WHERE project_id = p_project_id ORDER BY total_clicks DESC LIMIT 10) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_top_queries
  FROM (SELECT query, total_clicks as clicks, total_impressions as impressions,
    round(avg_position::numeric, 1) as position
    FROM analytics.mv_top_queries_28d WHERE project_id = p_project_id ORDER BY total_clicks DESC LIMIT 10) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_devices
  FROM (SELECT device, total_clicks as clicks, total_impressions as impressions
    FROM analytics.mv_device_breakdown WHERE project_id = p_project_id ORDER BY total_clicks DESC) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_countries
  FROM (SELECT country, total_clicks as clicks, total_impressions as impressions
    FROM analytics.mv_country_breakdown WHERE project_id = p_project_id ORDER BY total_clicks DESC LIMIT 10) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_daily_trend
  FROM (SELECT metric_date, total_clicks as clicks, total_impressions as impressions,
    round(avg_position::numeric, 1) as position, round(avg_ctr::numeric, 2) as ctr
    FROM analytics.mv_project_daily_kpis WHERE project_id = p_project_id
    AND metric_date >= CURRENT_DATE - INTERVAL '28 days' ORDER BY metric_date ASC) t;

  result := jsonb_build_object(
    'total_urls', v_total_urls, 'total_clicks', v_total_clicks,
    'total_impressions', v_total_impressions, 'avg_position', round(v_avg_position::numeric, 1),
    'avg_ctr', round(v_avg_ctr::numeric, 2), 'total_queries', v_total_queries,
    'indexing', jsonb_build_object('submitted', v_submitted, 'failed', v_failed,
      'inspected', v_inspected, 'indexed', v_indexed, 'total_requests', v_total_requests, 'total_urls', v_total_urls),
    'top_pages', v_top_pages, 'top_queries', v_top_queries,
    'devices', v_devices, 'countries', v_countries, 'daily_trend', v_daily_trend
  );
  RETURN result;
END;
$function$;

-- Update cron jobs to use analytics schema
SELECT cron.unschedule('refresh-mv-daily-kpis');
SELECT cron.unschedule('refresh-mv-top-pages');
SELECT cron.unschedule('refresh-mv-top-queries');
SELECT cron.unschedule('refresh-mv-devices');
SELECT cron.unschedule('refresh-mv-countries');

SELECT cron.schedule('refresh-mv-daily-kpis', '0 */6 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_project_daily_kpis');
SELECT cron.schedule('refresh-mv-top-pages', '0 3 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_top_pages_28d');
SELECT cron.schedule('refresh-mv-top-queries', '10 3 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_top_queries_28d');
SELECT cron.schedule('refresh-mv-devices', '20 3 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_device_breakdown');
SELECT cron.schedule('refresh-mv-countries', '30 3 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_country_breakdown');
