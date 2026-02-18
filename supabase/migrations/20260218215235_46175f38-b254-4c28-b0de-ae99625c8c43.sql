
-- Adiciona colunas individuais de controle de features na tabela plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS gsc_accounts_per_project integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS orchestrator_executions_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pixel_tracking_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_reports_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS white_label_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS api_access_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rank_rent_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ga4_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS advanced_analytics_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhooks_enabled boolean NOT NULL DEFAULT false;

-- Atualizar plano start (slug=start)
UPDATE public.plans SET
  gsc_accounts_per_project = 1,
  orchestrator_executions_limit = 5,
  pixel_tracking_enabled = true,
  whatsapp_reports_enabled = false,
  white_label_enabled = false,
  api_access_enabled = false,
  rank_rent_enabled = false,
  ga4_enabled = true,
  advanced_analytics_enabled = false,
  webhooks_enabled = false
WHERE slug = 'start';

-- Atualizar plano growth
UPDATE public.plans SET
  gsc_accounts_per_project = 4,
  orchestrator_executions_limit = 20,
  pixel_tracking_enabled = true,
  whatsapp_reports_enabled = true,
  white_label_enabled = false,
  api_access_enabled = false,
  rank_rent_enabled = true,
  ga4_enabled = true,
  advanced_analytics_enabled = true,
  webhooks_enabled = false
WHERE slug = 'growth';

-- Atualizar plano unlimited
UPDATE public.plans SET
  gsc_accounts_per_project = -1,
  orchestrator_executions_limit = -1,
  pixel_tracking_enabled = true,
  whatsapp_reports_enabled = true,
  white_label_enabled = true,
  api_access_enabled = true,
  rank_rent_enabled = true,
  ga4_enabled = true,
  advanced_analytics_enabled = true,
  webhooks_enabled = true
WHERE slug = 'unlimited';
