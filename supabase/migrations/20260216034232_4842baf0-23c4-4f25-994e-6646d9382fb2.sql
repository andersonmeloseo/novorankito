
-- Allow owner role (in addition to admin) to manage plans
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins and owners can manage plans"
ON public.plans FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Admins can manage plan features" ON public.plan_features;
CREATE POLICY "Admins and owners can manage plan features"
ON public.plan_features FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Admins can manage usage" ON public.plan_usage;
CREATE POLICY "Admins and owners can manage usage"
ON public.plan_usage FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Admins can read all usage" ON public.plan_usage;
CREATE POLICY "Admins and owners can read all usage"
ON public.plan_usage FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
