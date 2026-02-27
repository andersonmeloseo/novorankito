
-- Add capture_method to conversions to track origin
ALTER TABLE public.conversions
ADD COLUMN IF NOT EXISTS capture_method text NOT NULL DEFAULT 'manual';

-- Add utm_campaign_match to offline_campaigns for auto-linking pixel conversions
ALTER TABLE public.offline_campaigns
ADD COLUMN IF NOT EXISTS utm_campaign_match text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.conversions.capture_method IS 'Origin: manual, pixel, api, import';
COMMENT ON COLUMN public.offline_campaigns.utm_campaign_match IS 'UTM campaign names that auto-link pixel conversions to this campaign';
