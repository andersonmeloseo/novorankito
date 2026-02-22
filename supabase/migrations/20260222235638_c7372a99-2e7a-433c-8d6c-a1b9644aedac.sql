-- Allow anyone (including anonymous/unauthenticated visitors) to read active plans
CREATE POLICY "Plans are publicly readable"
ON public.plans
FOR SELECT
USING (is_active = true);
