-- Table for detected anomalies / insights pushed to Claude
CREATE TABLE public.mcp_anomalies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  anomaly_type TEXT NOT NULL, -- 'traffic_drop', 'indexing_error', 'ctr_spike', 'position_change', 'opportunity'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  metric_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'sent_to_claude', 'actioned', 'dismissed'
  claude_response TEXT,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own anomalies" ON public.mcp_anomalies
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can update own anomalies" ON public.mcp_anomalies
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Service can insert anomalies" ON public.mcp_anomalies
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_mcp_anomalies_project ON public.mcp_anomalies(project_id, created_at DESC);
CREATE INDEX idx_mcp_anomalies_status ON public.mcp_anomalies(status, severity);

-- Table for MCP action history
CREATE TABLE public.mcp_action_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID,
  tool_name TEXT NOT NULL,
  tool_args JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'claude', -- 'claude', 'command_center', 'cron'
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error'
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action logs" ON public.mcp_action_log
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Service can insert action logs" ON public.mcp_action_log
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_mcp_action_log_project ON public.mcp_action_log(project_id, created_at DESC);

-- Trigger for updated_at on anomalies
CREATE TRIGGER update_mcp_anomalies_updated_at
  BEFORE UPDATE ON public.mcp_anomalies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();