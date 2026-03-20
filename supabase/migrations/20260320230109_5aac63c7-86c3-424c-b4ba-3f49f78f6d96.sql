
-- Add target_urls column to indexing_schedules for storing specific URLs to index on schedule
ALTER TABLE public.indexing_schedules ADD COLUMN IF NOT EXISTS target_urls text[] DEFAULT '{}';

-- Add a label/name column so users can identify their URL lists
ALTER TABLE public.indexing_schedules ADD COLUMN IF NOT EXISTS label text;

COMMENT ON COLUMN public.indexing_schedules.target_urls IS 'Specific URLs to send for indexing. When set, the schedule only processes these URLs instead of picking from inventory.';
COMMENT ON COLUMN public.indexing_schedules.label IS 'User-friendly label for this schedule.';
