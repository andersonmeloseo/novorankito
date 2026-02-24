-- Fix: Replace overly permissive INSERT policies with service-role-only insert
-- Service role bypasses RLS, so we can drop these INSERT policies entirely
-- (edge functions use service role key, not user JWT for inserts)

DROP POLICY "Service can insert anomalies" ON public.mcp_anomalies;
DROP POLICY "Service can insert action logs" ON public.mcp_action_log;

-- Users can insert their own anomalies if needed from UI
CREATE POLICY "Users can insert own anomalies" ON public.mcp_anomalies
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can insert own action logs" ON public.mcp_action_log
  FOR INSERT WITH CHECK (auth.uid() = owner_id);