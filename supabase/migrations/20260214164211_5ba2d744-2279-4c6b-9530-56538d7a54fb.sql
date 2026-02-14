
-- Table for indexing schedules (both cron config and manual scheduled jobs)
CREATE TABLE public.indexing_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'cron' CHECK (schedule_type IN ('cron', 'manual')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  cron_time TEXT, -- HH:mm for daily cron
  actions TEXT[] NOT NULL DEFAULT '{}', -- 'indexing', 'inspection'
  max_urls INTEGER NOT NULL DEFAULT 200,
  scheduled_at TIMESTAMPTZ, -- for manual schedules
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'failed')),
  last_run_at TIMESTAMPTZ,
  last_run_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.indexing_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own schedules"
  ON public.indexing_schedules FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Only one cron config per project
CREATE UNIQUE INDEX idx_indexing_schedules_cron_unique
  ON public.indexing_schedules (project_id)
  WHERE schedule_type = 'cron';

CREATE TRIGGER update_indexing_schedules_updated_at
  BEFORE UPDATE ON public.indexing_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
