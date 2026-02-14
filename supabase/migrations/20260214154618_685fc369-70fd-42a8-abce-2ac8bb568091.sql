
-- Table to track indexing requests submitted via Google Indexing API
CREATE TABLE public.indexing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  url TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'URL_UPDATED', -- URL_UPDATED or URL_DELETED
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, quota_exceeded
  response_code INT,
  response_message TEXT,
  retries INT NOT NULL DEFAULT 0,
  fail_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.indexing_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own indexing requests"
  ON public.indexing_requests FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create indexing requests"
  ON public.indexing_requests FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own indexing requests"
  ON public.indexing_requests FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own indexing requests"
  ON public.indexing_requests FOR DELETE
  USING (owner_id = auth.uid());

-- Timestamp trigger
CREATE TRIGGER update_indexing_requests_updated_at
  BEFORE UPDATE ON public.indexing_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_indexing_requests_project ON public.indexing_requests(project_id, status);
CREATE INDEX idx_indexing_requests_owner ON public.indexing_requests(owner_id);
