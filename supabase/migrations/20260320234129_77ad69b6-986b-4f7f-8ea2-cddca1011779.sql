
-- Table to store Google Ads account connections per project
CREATE TABLE public.google_ads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL DEFAULT '',
  customer_id TEXT NOT NULL,
  developer_token TEXT,
  client_id TEXT,
  client_secret TEXT,
  refresh_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_ads_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own google ads connections"
  ON public.google_ads_connections FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_google_ads_connections_updated_at
  BEFORE UPDATE ON public.google_ads_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Also for Meta Ads
CREATE TABLE public.meta_ads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL DEFAULT '',
  pixel_id TEXT NOT NULL,
  access_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_ads_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own meta ads connections"
  ON public.meta_ads_connections FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_meta_ads_connections_updated_at
  BEFORE UPDATE ON public.meta_ads_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
