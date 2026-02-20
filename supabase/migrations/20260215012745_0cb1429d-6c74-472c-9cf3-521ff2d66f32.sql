-- White-label settings per project
CREATE TABLE public.whitelabel_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  brand_name TEXT DEFAULT 'Rankito',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  accent_color TEXT DEFAULT '#22c55e',
  custom_domain TEXT,
  footer_text TEXT,
  hide_powered_by BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.whitelabel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage whitelabel" ON public.whitelabel_settings
  FOR ALL USING (auth.uid() = owner_id);

-- API keys for public REST access
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- first 8 chars for display
  name TEXT NOT NULL DEFAULT 'Default',
  scopes TEXT[] DEFAULT ARRAY['read'],
  rate_limit_per_minute INT DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage api keys" ON public.api_keys
  FOR ALL USING (auth.uid() = owner_id);

-- Webhook endpoints
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- HMAC signing secret
  events TEXT[] DEFAULT ARRAY['*'],
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage webhooks" ON public.webhooks
  FOR ALL USING (auth.uid() = owner_id);

-- Webhook delivery log
CREATE TABLE public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view webhook deliveries" ON public.webhook_deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.webhooks w WHERE w.id = webhook_id AND w.owner_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_api_keys_project ON public.api_keys (project_id, is_active);
CREATE INDEX idx_api_keys_hash ON public.api_keys (key_hash) WHERE is_active = true;
CREATE INDEX idx_webhooks_project ON public.webhooks (project_id, is_active);
CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries (webhook_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_whitelabel_updated_at BEFORE UPDATE ON public.whitelabel_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();