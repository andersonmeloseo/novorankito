
-- Table for individual lead tracking in Rank & Rent
CREATE TABLE public.rr_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page_url TEXT,
  client_id UUID REFERENCES public.rr_clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'organic',
  status TEXT NOT NULL DEFAULT 'novo',
  value NUMERIC DEFAULT 0,
  notes TEXT,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rr_leads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own leads" ON public.rr_leads FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own leads" ON public.rr_leads FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own leads" ON public.rr_leads FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own leads" ON public.rr_leads FOR DELETE USING (auth.uid() = owner_id);

-- Trigger for updated_at
CREATE TRIGGER update_rr_leads_updated_at
  BEFORE UPDATE ON public.rr_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_rr_leads_owner_project ON public.rr_leads(owner_id, project_id);
CREATE INDEX idx_rr_leads_status ON public.rr_leads(status);
