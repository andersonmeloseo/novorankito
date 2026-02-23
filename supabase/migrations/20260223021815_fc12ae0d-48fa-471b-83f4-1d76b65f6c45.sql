
-- Table to persist all Stripe transaction history
CREATE TABLE public.stripe_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id text UNIQUE NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  customer_email text,
  customer_name text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'brl',
  status text NOT NULL DEFAULT 'pending',
  paid boolean NOT NULL DEFAULT false,
  description text,
  plan_name text,
  invoice_pdf text,
  hosted_invoice_url text,
  error_message text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  stripe_created_at timestamp with time zone NOT NULL DEFAULT now(),
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_stripe_transactions_status ON public.stripe_transactions(status);
CREATE INDEX idx_stripe_transactions_email ON public.stripe_transactions(customer_email);
CREATE INDEX idx_stripe_transactions_created ON public.stripe_transactions(stripe_created_at DESC);

-- Enable RLS
ALTER TABLE public.stripe_transactions ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage
CREATE POLICY "Admins can view all transactions"
  ON public.stripe_transactions FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert transactions"
  ON public.stripe_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update transactions"
  ON public.stripe_transactions FOR UPDATE
  USING (true);
