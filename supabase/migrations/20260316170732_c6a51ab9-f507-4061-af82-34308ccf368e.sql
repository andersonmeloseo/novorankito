
-- Add payment_gateway column to plans table
-- Values: 'asaas', 'abacatepay', 'stripe'
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS payment_gateway text NOT NULL DEFAULT 'asaas';

-- Update existing plans to use abacatepay (since that was the previous default)
UPDATE public.plans SET payment_gateway = 'abacatepay' WHERE payment_gateway = 'asaas';

-- Now set default to asaas for new plans going forward
ALTER TABLE public.plans ALTER COLUMN payment_gateway SET DEFAULT 'asaas';
