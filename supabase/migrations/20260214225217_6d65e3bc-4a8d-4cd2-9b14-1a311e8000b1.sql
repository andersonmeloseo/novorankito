
-- Table to track API configurations/keys used by the system
CREATE TABLE public.api_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  secret_key_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'integration',
  status TEXT NOT NULL DEFAULT 'inactive',
  is_configured BOOLEAN NOT NULL DEFAULT false,
  base_url TEXT,
  docs_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  configured_by UUID,
  UNIQUE(secret_key_name)
);

-- Enable RLS
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;

-- Only admins/owners can manage API configurations
CREATE POLICY "Admins can view API configurations"
ON public.api_configurations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can insert API configurations"
ON public.api_configurations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can update API configurations"
ON public.api_configurations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can delete API configurations"
ON public.api_configurations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Auto-update updated_at
CREATE TRIGGER update_api_configurations_updated_at
BEFORE UPDATE ON public.api_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with existing configured APIs
INSERT INTO public.api_configurations (name, service_name, secret_key_name, category, status, is_configured, description) VALUES
  ('WhatsApp API Key', 'WhatsApp Business', 'WHATSAPP_API_KEY', 'messaging', 'active', true, 'Chave de API para envio de mensagens WhatsApp'),
  ('WhatsApp API URL', 'WhatsApp Business', 'WHATSAPP_API_URL', 'messaging', 'active', true, 'URL base da API do WhatsApp'),
  ('Lovable AI Gateway', 'Lovable AI', 'LOVABLE_API_KEY', 'ai', 'active', true, 'Gateway de IA para funcionalidades inteligentes do sistema');
