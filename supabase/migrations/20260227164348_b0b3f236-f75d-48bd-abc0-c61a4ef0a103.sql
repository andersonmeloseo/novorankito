-- Fix: Remove overly permissive plans SELECT policy that exposes all plans including Stripe data
DROP POLICY IF EXISTS "Plans are readable by authenticated users" ON public.plans;

-- The existing "Plans are publicly readable" with (is_active = true) is fine for listing active plans.
-- But we need to restrict which columns are visible. Since RLS can't filter columns,
-- create a secure view that hides sensitive Stripe data for non-admins.

-- Create a safe public view for plans (no Stripe secrets)
CREATE OR REPLACE VIEW public.plans_public AS
SELECT 
  id, slug, name, description, price, currency, billing_interval,
  projects_limit, events_limit, ai_requests_limit, members_limit,
  indexing_daily_limit, is_active, is_default, sort_order,
  created_at, updated_at, payment_methods,
  gsc_accounts_per_project, orchestrator_executions_limit,
  pixel_tracking_enabled, whatsapp_reports_enabled, white_label_enabled,
  api_access_enabled, rank_rent_enabled, ga4_enabled, advanced_analytics_enabled,
  webhooks_enabled, trial_days, promo_price, promo_ends_at, annual_price
FROM public.plans
WHERE is_active = true;