
CREATE TABLE public.custom_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  metric TEXT NOT NULL DEFAULT 'clicks',
  condition TEXT NOT NULL DEFAULT 'drop',
  threshold NUMERIC NOT NULL DEFAULT 20,
  unit TEXT NOT NULL DEFAULT '%',
  severity TEXT NOT NULL DEFAULT 'warning',
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alerts" ON public.custom_alerts FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own alerts" ON public.custom_alerts FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own alerts" ON public.custom_alerts FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own alerts" ON public.custom_alerts FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TRIGGER update_custom_alerts_updated_at BEFORE UPDATE ON public.custom_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
