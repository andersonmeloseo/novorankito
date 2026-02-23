
-- Fix RLS: restrict insert/update to service role context only
DROP POLICY "Service role can insert transactions" ON public.stripe_transactions;
DROP POLICY "Service role can update transactions" ON public.stripe_transactions;

-- These will only work via service_role key (edge functions), not anon key
CREATE POLICY "Service role inserts transactions"
  ON public.stripe_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates transactions"
  ON public.stripe_transactions FOR UPDATE
  USING (auth.role() = 'service_role');
