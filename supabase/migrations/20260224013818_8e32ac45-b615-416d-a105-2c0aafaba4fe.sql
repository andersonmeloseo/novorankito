
-- Table to store project data sync snapshots for Claude Mode context
CREATE TABLE public.mcp_sync_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sections_synced TEXT[] NOT NULL DEFAULT '{}'::text[],
  total_records INTEGER NOT NULL DEFAULT 0,
  sync_duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mcp_sync_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own sync snapshots"
  ON public.mcp_sync_snapshots FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own sync snapshots"
  ON public.mcp_sync_snapshots FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own sync snapshots"
  ON public.mcp_sync_snapshots FOR DELETE
  USING (auth.uid() = owner_id);

-- Index for fast lookups
CREATE INDEX idx_mcp_sync_snapshots_project ON public.mcp_sync_snapshots(project_id, created_at DESC);
