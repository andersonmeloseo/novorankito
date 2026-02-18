
-- Create orchestrator_tasks table for AI-generated tasks
CREATE TABLE public.orchestrator_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deployment_id UUID REFERENCES public.orchestrator_deployments(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.orchestrator_runs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  
  -- Task content
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral', -- seo, conteudo, links, ads, tecnico, estrategia, analytics
  priority TEXT NOT NULL DEFAULT 'normal', -- urgente, alta, normal, baixa
  
  -- Assignment
  assigned_role TEXT, -- which AI agent role created/assigned it
  assigned_role_emoji TEXT,
  assigned_to_human TEXT, -- human team member name
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, done, cancelled
  
  -- Timing
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Context
  context_url TEXT,
  success_metric TEXT, -- how to measure if this task succeeded
  estimated_impact TEXT, -- e.g. "+15% CTR", "Resolve 23 erros de indexação"
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orchestrator_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tasks"
  ON public.orchestrator_tasks FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.orchestrator_tasks FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own tasks"
  ON public.orchestrator_tasks FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.orchestrator_tasks FOR DELETE
  USING (auth.uid() = owner_id);

-- Service role can insert tasks (for edge functions)
CREATE POLICY "Service role full access"
  ON public.orchestrator_tasks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_orchestrator_tasks_updated_at
  BEFORE UPDATE ON public.orchestrator_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_orchestrator_tasks_project_id ON public.orchestrator_tasks(project_id);
CREATE INDEX idx_orchestrator_tasks_deployment_id ON public.orchestrator_tasks(deployment_id);
CREATE INDEX idx_orchestrator_tasks_owner_status ON public.orchestrator_tasks(owner_id, status);
CREATE INDEX idx_orchestrator_tasks_run_id ON public.orchestrator_tasks(run_id);
