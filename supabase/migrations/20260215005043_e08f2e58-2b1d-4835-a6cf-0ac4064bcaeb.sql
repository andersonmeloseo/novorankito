
-- Server-side aggregation function for the Overview dashboard
-- Replaces 10+ client-side queries with a single RPC call
CREATE OR REPLACE FUNCTION public.get_project_overview(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- Total site URLs (exact count)
  SELECT count(*) INTO v_total_urls FROM site_urls WHERE project_id = p_project_id;

  -- SEO aggregates from page dimension
  SELECT
    coalesce(sum(clicks), 0),
    coalesce(sum(impressions), 0),
    coalesce(avg(CASE WHEN position > 0 THEN position END), 0),
    coalesce(avg(ctr) * 100, 0)
  INTO v_total_clicks, v_total_impressions, v_avg_position, v_avg_ctr
  FROM seo_metrics
  WHERE project_id = p_project_id AND dimension_type = 'page';

  -- Total unique queries
  SELECT count(*) INTO v_total_queries
  FROM seo_metrics
  WHERE project_id = p_project_id AND dimension_type = 'query';

  -- Indexing stats
  SELECT
    count(*) FILTER (WHERE status = 'success'),
    count(*) FILTER (WHERE status IN ('failed', 'quota_exceeded')),
    count(*)
  INTO v_submitted, v_failed, v_total_requests
  FROM indexing_requests
  WHERE project_id = p_project_id;

  -- Coverage stats
  SELECT
    count(*),
    count(*) FILTER (WHERE verdict = 'PASS' OR indexing_state = 'INDEXING_ALLOWED')
  INTO v_inspected, v_indexed
  FROM index_coverage
  WHERE project_id = p_project_id;

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
    )
  );

  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_project_overview(uuid) TO authenticated;

-- Add index for faster aggregation queries
CREATE INDEX IF NOT EXISTS idx_seo_metrics_project_dimension 
ON seo_metrics(project_id, dimension_type);

CREATE INDEX IF NOT EXISTS idx_indexing_requests_project_status 
ON indexing_requests(project_id, status);

CREATE INDEX IF NOT EXISTS idx_index_coverage_project_verdict 
ON index_coverage(project_id, verdict);

CREATE INDEX IF NOT EXISTS idx_site_urls_project 
ON site_urls(project_id);
