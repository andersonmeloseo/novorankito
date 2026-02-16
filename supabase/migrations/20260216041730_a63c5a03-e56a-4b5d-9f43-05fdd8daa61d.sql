
-- Add payment integration fields to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_id text DEFAULT NULL;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_checkout_url text DEFAULT NULL;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS payment_methods text[] DEFAULT ARRAY['stripe']::text[];
