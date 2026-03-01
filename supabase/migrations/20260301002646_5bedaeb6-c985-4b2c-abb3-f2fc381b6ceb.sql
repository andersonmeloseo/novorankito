
-- Add lead and ROI columns to rr_pages
ALTER TABLE public.rr_pages 
  ADD COLUMN IF NOT EXISTS avg_leads_month numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_lead_value numeric DEFAULT 0;
