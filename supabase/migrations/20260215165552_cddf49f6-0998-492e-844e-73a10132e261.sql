
-- Table to store tracking events from external websites via the Rankito script
CREATE TABLE public.tracking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'page_view',
  page_url text,
  page_title text,
  referrer text,
  device text,
  browser text,
  os text,
  screen_width integer,
  screen_height integer,
  language text,
  country text,
  city text,
  state text,
  platform text,
  cta_text text,
  cta_selector text,
  session_id text,
  visitor_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  fbclid text,
  scroll_depth integer,
  time_on_page integer,
  form_id text,
  product_id text,
  product_name text,
  product_price numeric,
  cart_value numeric,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_tracking_events_project ON public.tracking_events(project_id, created_at DESC);
CREATE INDEX idx_tracking_events_type ON public.tracking_events(project_id, event_type);
CREATE INDEX idx_tracking_events_session ON public.tracking_events(session_id);

-- Enable RLS
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own project events
CREATE POLICY "Users can read tracking events for their projects"
  ON public.tracking_events FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- Service role inserts (from edge function)
CREATE POLICY "Service role can insert tracking events"
  ON public.tracking_events FOR INSERT
  WITH CHECK (true);
