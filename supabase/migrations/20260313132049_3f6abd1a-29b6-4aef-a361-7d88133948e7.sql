-- Remove duplicate index (same as idx_seo_metrics_dimension_type)
DROP INDEX IF EXISTS idx_seo_metrics_project_dimension;

-- Add a more useful composite index for common queries
CREATE INDEX IF NOT EXISTS idx_seo_metrics_project_date_dimension 
ON public.seo_metrics (project_id, dimension_type, metric_date DESC);