
-- Offline campaigns table — groups conversions by campaign name
CREATE TABLE public.offline_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,                       -- Ex: "Lead Qualificado", "Venda Fechada" — must match Google Ads action name
  platform text NOT NULL DEFAULT 'google',  -- google | meta | both
  status text NOT NULL DEFAULT 'active',    -- active | paused | archived
  description text,
  conversion_action_name text,              -- exact name in Google Ads
  default_value numeric DEFAULT 0,
  default_currency text DEFAULT 'BRL',
  total_conversions integer DEFAULT 0,
  total_value numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offline_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own offline_campaigns"
  ON public.offline_campaigns FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Link conversions to a campaign
ALTER TABLE public.conversions
  ADD COLUMN IF NOT EXISTS offline_campaign_id uuid REFERENCES public.offline_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS conversion_action_name text;

-- Trigger to keep campaign counters in sync
CREATE OR REPLACE FUNCTION public.update_offline_campaign_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.offline_campaign_id IS NOT NULL THEN
    UPDATE public.offline_campaigns
    SET total_conversions = total_conversions + 1,
        total_value = total_value + COALESCE(NEW.value, 0),
        updated_at = now()
    WHERE id = NEW.offline_campaign_id;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.offline_campaign_id IS NOT NULL THEN
    UPDATE public.offline_campaigns
    SET total_conversions = GREATEST(total_conversions - 1, 0),
        total_value = GREATEST(total_value - COALESCE(OLD.value, 0), 0),
        updated_at = now()
    WHERE id = OLD.offline_campaign_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_offline_campaign_counters
  AFTER INSERT OR DELETE ON public.conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_offline_campaign_counters();
