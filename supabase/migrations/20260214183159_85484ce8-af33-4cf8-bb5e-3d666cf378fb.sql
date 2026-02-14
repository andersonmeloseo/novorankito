
-- Table to store workflow notification & schedule configuration
CREATE TABLE public.workflow_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id TEXT NOT NULL, -- references preset workflow id or agent_workflows.id
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  
  -- Schedule config
  enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Sun, 1=Mon...6=Sat
  schedule_time TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  
  -- Notification config
  notify_email BOOLEAN NOT NULL DEFAULT false,
  notify_whatsapp BOOLEAN NOT NULL DEFAULT false,
  email_recipients TEXT[] NOT NULL DEFAULT '{}',
  whatsapp_recipients TEXT[] NOT NULL DEFAULT '{}',
  
  -- Output format
  send_pdf BOOLEAN NOT NULL DEFAULT true,
  send_summary BOOLEAN NOT NULL DEFAULT true, -- short text summary
  
  -- Tracking
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workflow_id, project_id)
);

-- Delivery history
CREATE TABLE public.workflow_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.workflow_schedules(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  
  -- Delivery details
  channel TEXT NOT NULL, -- 'email' or 'whatsapp'
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  
  -- Content
  report_summary TEXT,
  pdf_url TEXT,
  full_report TEXT,
  
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_schedules
CREATE POLICY "Users can view own workflow schedules"
  ON public.workflow_schedules FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own workflow schedules"
  ON public.workflow_schedules FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own workflow schedules"
  ON public.workflow_schedules FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own workflow schedules"
  ON public.workflow_schedules FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS policies for workflow_deliveries
CREATE POLICY "Users can view own deliveries"
  ON public.workflow_deliveries FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

CREATE POLICY "Service can insert deliveries"
  ON public.workflow_deliveries FOR INSERT
  WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_workflow_schedules_updated_at
  BEFORE UPDATE ON public.workflow_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
