
-- ═══════════════════════════════════════════════════
-- Plans Management System
-- ═══════════════════════════════════════════════════

-- Central plan definitions table
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE, -- free, growth, unlimited
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  billing_interval TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  -- Hard limits
  projects_limit INT NOT NULL DEFAULT 1,
  events_limit INT NOT NULL DEFAULT 10000,
  ai_requests_limit INT NOT NULL DEFAULT 50,
  members_limit INT NOT NULL DEFAULT 1,
  indexing_daily_limit INT NOT NULL DEFAULT 200,
  -- Flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Features that can be toggled per plan
CREATE TABLE public.plan_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL, -- e.g. 'seo', 'ga4', 'tracking', 'heatmaps', 'rankito_ai', 'ads', 'rank_rent', 'api_access', 'white_label', 'reports'
  feature_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

-- Usage tracking per user per month
CREATE TABLE public.plan_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period TEXT NOT NULL, -- '2026-02' format
  ai_requests_used INT NOT NULL DEFAULT 0,
  events_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, period)
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_usage ENABLE ROW LEVEL SECURITY;

-- Plans are readable by all authenticated users
CREATE POLICY "Plans are readable by authenticated users"
ON public.plans FOR SELECT TO authenticated
USING (true);

-- Plan features are readable by all authenticated users
CREATE POLICY "Plan features are readable by authenticated users"
ON public.plan_features FOR SELECT TO authenticated
USING (true);

-- Only admins can manage plans
CREATE POLICY "Admins can manage plans"
ON public.plans FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage plan features"
ON public.plan_features FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can read their own usage
CREATE POLICY "Users can read own usage"
ON public.plan_usage FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admins can read all usage
CREATE POLICY "Admins can read all usage"
ON public.plan_usage FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert/update usage (via edge functions)
CREATE POLICY "Admins can manage usage"
ON public.plan_usage FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own usage"
ON public.plan_usage FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own usage"
ON public.plan_usage FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Function to check plan limits
CREATE OR REPLACE FUNCTION public.check_plan_limit(
  _user_id UUID,
  _limit_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_slug TEXT;
  _limit INT;
  _used INT;
  _period TEXT;
  _result JSON;
BEGIN
  -- Get user's plan slug from billing_subscriptions
  SELECT plan INTO _plan_slug
  FROM billing_subscriptions
  WHERE user_id = _user_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  IF _plan_slug IS NULL THEN
    _plan_slug := 'free';
  END IF;

  _period := to_char(now(), 'YYYY-MM');

  CASE _limit_type
    WHEN 'projects' THEN
      SELECT projects_limit INTO _limit FROM plans WHERE slug = _plan_slug;
      SELECT count(*) INTO _used FROM projects WHERE owner_id = _user_id;
    WHEN 'events' THEN
      SELECT events_limit INTO _limit FROM plans WHERE slug = _plan_slug;
      SELECT COALESCE(events_used, 0) INTO _used FROM plan_usage WHERE user_id = _user_id AND period = _period;
    WHEN 'ai_requests' THEN
      SELECT ai_requests_limit INTO _limit FROM plans WHERE slug = _plan_slug;
      SELECT COALESCE(ai_requests_used, 0) INTO _used FROM plan_usage WHERE user_id = _user_id AND period = _period;
    WHEN 'members' THEN
      SELECT members_limit INTO _limit FROM plans WHERE slug = _plan_slug;
      SELECT count(DISTINCT pm.user_id) INTO _used 
      FROM project_members pm 
      JOIN projects p ON p.id = pm.project_id 
      WHERE p.owner_id = _user_id;
    ELSE
      RETURN json_build_object('allowed', true, 'limit', 0, 'used', 0, 'plan', _plan_slug);
  END CASE;

  IF _limit IS NULL THEN _limit := 0; END IF;
  IF _used IS NULL THEN _used := 0; END IF;

  RETURN json_build_object(
    'allowed', _used < _limit,
    'limit', _limit,
    'used', _used,
    'remaining', GREATEST(0, _limit - _used),
    'plan', _plan_slug
  );
END;
$$;

-- Function to check if user's plan has a specific feature
CREATE OR REPLACE FUNCTION public.plan_has_feature(
  _user_id UUID,
  _feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_slug TEXT;
  _enabled BOOLEAN;
BEGIN
  SELECT plan INTO _plan_slug
  FROM billing_subscriptions
  WHERE user_id = _user_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  IF _plan_slug IS NULL THEN
    _plan_slug := 'free';
  END IF;

  SELECT pf.enabled INTO _enabled
  FROM plan_features pf
  JOIN plans p ON p.id = pf.plan_id
  WHERE p.slug = _plan_slug AND pf.feature_key = _feature_key;

  RETURN COALESCE(_enabled, false);
END;
$$;

-- Trigger for updated_at on plans
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on plan_usage
CREATE TRIGGER update_plan_usage_updated_at
BEFORE UPDATE ON public.plan_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 3 default plans
INSERT INTO public.plans (slug, name, description, price, projects_limit, events_limit, ai_requests_limit, members_limit, indexing_daily_limit, is_default, sort_order) VALUES
('free', 'Free', 'Para começar a explorar o Rankito', 0, 1, 10000, 50, 1, 100, true, 0),
('growth', 'Growth', 'Para profissionais e times em crescimento', 97, 10, 100000, 500, 5, 200, false, 1),
('unlimited', 'Unlimited', 'Para agências e operações de grande porte', 297, -1, 1000000, -1, -1, 200, false, 2);

-- Seed features for each plan (-1 = unlimited)
-- Feature keys: seo, ga4, tracking, heatmaps, session_replay, rankito_ai, ads, rank_rent, api_access, white_label, reports, custom_events, consent_mode, offline_conversions

-- Free plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, enabled)
SELECT p.id, f.key, f.name, f.enabled
FROM plans p,
(VALUES
  ('seo', 'SEO & Search Console', true),
  ('ga4', 'Google Analytics 4', true),
  ('tracking', 'Analítica Rankito (Básico)', true),
  ('heatmaps', 'Heatmaps', false),
  ('session_replay', 'Session Replay', false),
  ('rankito_ai', 'Rankito IA', false),
  ('ads', 'Gestão de Ads', false),
  ('rank_rent', 'Rank & Rent', false),
  ('api_access', 'Acesso à API', false),
  ('white_label', 'White Label', false),
  ('reports', 'Relatórios PDF', false),
  ('custom_events', 'Eventos Personalizados', false),
  ('consent_mode', 'Consent Mode & LGPD', true),
  ('offline_conversions', 'Conversões Offline', false)
) AS f(key, name, enabled)
WHERE p.slug = 'free';

-- Growth plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, enabled)
SELECT p.id, f.key, f.name, f.enabled
FROM plans p,
(VALUES
  ('seo', 'SEO & Search Console', true),
  ('ga4', 'Google Analytics 4', true),
  ('tracking', 'Analítica Rankito', true),
  ('heatmaps', 'Heatmaps', true),
  ('session_replay', 'Session Replay', true),
  ('rankito_ai', 'Rankito IA', true),
  ('ads', 'Gestão de Ads', true),
  ('rank_rent', 'Rank & Rent', false),
  ('api_access', 'Acesso à API', true),
  ('white_label', 'White Label', false),
  ('reports', 'Relatórios PDF', true),
  ('custom_events', 'Eventos Personalizados', true),
  ('consent_mode', 'Consent Mode & LGPD', true),
  ('offline_conversions', 'Conversões Offline', true)
) AS f(key, name, enabled)
WHERE p.slug = 'growth';

-- Unlimited plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, enabled)
SELECT p.id, f.key, f.name, f.enabled
FROM plans p,
(VALUES
  ('seo', 'SEO & Search Console', true),
  ('ga4', 'Google Analytics 4', true),
  ('tracking', 'Analítica Rankito', true),
  ('heatmaps', 'Heatmaps', true),
  ('session_replay', 'Session Replay', true),
  ('rankito_ai', 'Rankito IA', true),
  ('ads', 'Gestão de Ads', true),
  ('rank_rent', 'Rank & Rent', true),
  ('api_access', 'Acesso à API', true),
  ('white_label', 'White Label', true),
  ('reports', 'Relatórios PDF', true),
  ('custom_events', 'Eventos Personalizados', true),
  ('consent_mode', 'Consent Mode & LGPD', true),
  ('offline_conversions', 'Conversões Offline', true)
) AS f(key, name, enabled)
WHERE p.slug = 'unlimited';
