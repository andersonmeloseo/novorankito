
-- Automation rules: map anomaly types to automated task creation
CREATE TABLE public.mcp_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'anomaly',
  trigger_filter JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL DEFAULT 'create_task',
  action_config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  runs_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own automation rules"
  ON public.mcp_automation_rules FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_mcp_automation_rules_updated_at
  BEFORE UPDATE ON public.mcp_automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
