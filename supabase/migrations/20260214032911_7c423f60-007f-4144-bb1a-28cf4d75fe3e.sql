
-- Add dimension_type column to seo_metrics to distinguish data fetched per dimension
ALTER TABLE public.seo_metrics ADD COLUMN dimension_type TEXT NOT NULL DEFAULT 'combined';

-- Create index for efficient filtering
CREATE INDEX idx_seo_metrics_dimension_type ON public.seo_metrics(project_id, dimension_type);
