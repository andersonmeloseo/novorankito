
-- Add workflow presets table for agent chaining
CREATE TABLE public.agent_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflows" ON public.agent_workflows FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create own workflows" ON public.agent_workflows FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own workflows" ON public.agent_workflows FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own workflows" ON public.agent_workflows FOR DELETE USING (owner_id = auth.uid());

-- Add action history table for agents
CREATE TABLE public.agent_action_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_detail TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_action_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent history" ON public.agent_action_history FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE ai_agents.id = agent_action_history.agent_id AND ai_agents.owner_id = auth.uid()));

CREATE POLICY "Users can insert agent history" ON public.agent_action_history FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_agents WHERE ai_agents.id = agent_action_history.agent_id AND ai_agents.owner_id = auth.uid()));
