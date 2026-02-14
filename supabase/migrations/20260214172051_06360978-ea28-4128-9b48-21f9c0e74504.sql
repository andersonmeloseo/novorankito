
-- AI Agents table (system + custom agents)
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  instructions TEXT,
  speciality TEXT NOT NULL DEFAULT 'custom',
  is_system BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_number TEXT,
  notification_triggers TEXT[] DEFAULT '{}',
  notification_destination TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agents in their projects"
ON public.ai_agents FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can create agents in their projects"
ON public.ai_agents FOR INSERT
WITH CHECK (auth.uid() = owner_id AND public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can update their agents"
ON public.ai_agents FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their agents"
ON public.ai_agents FOR DELETE
USING (auth.uid() = owner_id);

CREATE TRIGGER update_ai_agents_updated_at
BEFORE UPDATE ON public.ai_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages table
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their chat messages"
ON public.ai_chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
ON public.ai_chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their chat messages"
ON public.ai_chat_messages FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_ai_chat_messages_project ON public.ai_chat_messages(project_id, created_at);
CREATE INDEX idx_ai_agents_project ON public.ai_agents(project_id);
