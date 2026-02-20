-- Create table for session recordings (rrweb-style)
CREATE TABLE public.session_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  page_url TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  duration_ms INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  recording_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

-- RLS: users can view recordings for projects they own
CREATE POLICY "Users can view recordings for their projects"
ON public.session_recordings FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
  )
);

-- Index for efficient queries
CREATE INDEX idx_session_recordings_project_id ON public.session_recordings(project_id);
CREATE INDEX idx_session_recordings_session_id ON public.session_recordings(session_id);
CREATE INDEX idx_session_recordings_created_at ON public.session_recordings(created_at DESC);

-- Allow edge function (service role) to insert
CREATE POLICY "Service role can insert recordings"
ON public.session_recordings FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_recordings;