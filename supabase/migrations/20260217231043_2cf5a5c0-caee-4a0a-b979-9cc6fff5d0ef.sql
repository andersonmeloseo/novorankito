
-- Table to store deployed orchestrators (autonomous agent teams)
CREATE TABLE public.orchestrator_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, stopped
  roles JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of role configs with routines
  hierarchy JSONB NOT NULL DEFAULT '{}'::jsonb, -- reporting structure
  delivery_channels JSONB NOT NULL DEFAULT '["notification"]'::jsonb,
  delivery_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- email, whatsapp configs
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to store orchestrator execution runs and agent results
CREATE TABLE public.orchestrator_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES public.orchestrator_deployments(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed, partial
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  agent_results JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of {role_id, status, result, started_at, completed_at}
  summary TEXT, -- CEO consolidated summary
  delivery_status JSONB NOT NULL DEFAULT '{}'::jsonb, -- {email: "sent", whatsapp: "sent", notification: "sent"}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orchestrator_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestrator_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for deployments
CREATE POLICY "Users can view own deployments" ON public.orchestrator_deployments
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create own deployments" ON public.orchestrator_deployments
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own deployments" ON public.orchestrator_deployments
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own deployments" ON public.orchestrator_deployments
  FOR DELETE USING (owner_id = auth.uid());

-- RLS policies for runs
CREATE POLICY "Users can view own runs" ON public.orchestrator_runs
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create own runs" ON public.orchestrator_runs
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own runs" ON public.orchestrator_runs
  FOR UPDATE USING (owner_id = auth.uid());

-- Triggers
CREATE TRIGGER update_orchestrator_deployments_updated_at
  BEFORE UPDATE ON public.orchestrator_deployments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for runs (live status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orchestrator_runs;
