
-- Add config column for flexible goal configuration
ALTER TABLE public.tracking_goals 
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Remove the check constraint on goal_type to allow new values
-- (the column is just text, new types: cta_click, page_destination, url_pattern, scroll_depth, time_on_page, combined)
-- No constraint exists so we just need to ensure the column accepts any text value

COMMENT ON COLUMN public.tracking_goals.config IS 'Flexible config for goal rules: cta_patterns, url_patterns, scroll_threshold, time_threshold, conditions, match_mode, etc.';
