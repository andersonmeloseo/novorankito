
-- Create payment_transactions table to store Asaas and AbacatePay payments
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT NOT NULL CHECK (gateway IN ('asaas', 'abacatepay', 'stripe', 'manual')),
  gateway_payment_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  plan_slug TEXT,
  billing_interval TEXT,
  payment_method TEXT,
  gateway_customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gateway, gateway_payment_id)
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can view all payment transactions"
ON public.payment_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payment transactions"
ON public.payment_transactions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access"
ON public.payment_transactions FOR ALL
USING (auth.role() = 'service_role');

-- Index for quick lookups
CREATE INDEX idx_payment_transactions_gateway ON public.payment_transactions(gateway);
CREATE INDEX idx_payment_transactions_paid_at ON public.payment_transactions(paid_at DESC);
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
