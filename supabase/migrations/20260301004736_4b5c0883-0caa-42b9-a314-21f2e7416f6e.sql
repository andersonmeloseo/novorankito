
-- Drop old columns and add lead-sales focused ones
ALTER TABLE public.rr_leads
  ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_to_client_id UUID REFERENCES public.rr_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_status TEXT DEFAULT 'captured',
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE;

-- Drop the old status column default and update
ALTER TABLE public.rr_leads ALTER COLUMN status SET DEFAULT 'captured';
