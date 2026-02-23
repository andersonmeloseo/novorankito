
-- Preço anual por plano (10 meses = 2 meses grátis)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS annual_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id text DEFAULT NULL;

-- Duração do cupom no Stripe
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS duration text NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS duration_in_months integer DEFAULT NULL;
