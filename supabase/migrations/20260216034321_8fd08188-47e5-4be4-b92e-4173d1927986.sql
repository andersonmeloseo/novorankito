
-- Update default plan in billing_subscriptions to match new slug
ALTER TABLE public.billing_subscriptions ALTER COLUMN plan SET DEFAULT 'start';

-- Update check_plan_limit to use 'start' as default instead of 'free'
CREATE OR REPLACE FUNCTION public.check_plan_limit(_user_id uuid, _limit_type text)
RETURNS json
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
BEGIN
  SELECT plan INTO _plan_slug
  FROM billing_subscriptions
  WHERE user_id = _user_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  IF _plan_slug IS NULL THEN
    _plan_slug := 'start';
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

-- Update plan_has_feature default
CREATE OR REPLACE FUNCTION public.plan_has_feature(_user_id uuid, _feature_key text)
RETURNS boolean
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
    _plan_slug := 'start';
  END IF;

  SELECT pf.enabled INTO _enabled
  FROM plan_features pf
  JOIN plans p ON p.id = pf.plan_id
  WHERE p.slug = _plan_slug AND pf.feature_key = _feature_key;

  RETURN COALESCE(_enabled, false);
END;
$$;
