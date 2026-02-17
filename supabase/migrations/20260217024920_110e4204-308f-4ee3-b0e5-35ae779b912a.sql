
-- Add encrypted secret_value column to api_configurations
ALTER TABLE public.api_configurations ADD COLUMN IF NOT EXISTS secret_value text;

-- Create trigger to auto-encrypt secret_value on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_api_secret_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Only encrypt if the value changed and looks like it's not already encrypted (base64 encrypted values are long)
  IF NEW.secret_value IS NOT NULL AND NEW.secret_value != '' AND 
     (OLD IS NULL OR OLD.secret_value IS DISTINCT FROM NEW.secret_value) THEN
    -- If it doesn't look like base64 encoded encrypted data, encrypt it
    IF length(NEW.secret_value) < 200 OR NEW.secret_value LIKE 'sk-%' OR NEW.secret_value LIKE 'pk-%' THEN
      NEW.secret_value := encrypt_sensitive(NEW.secret_value);
    END IF;
    NEW.is_configured := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_api_secret ON public.api_configurations;
CREATE TRIGGER encrypt_api_secret
  BEFORE INSERT OR UPDATE ON public.api_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_api_secret_trigger();

-- Create a decrypted view for edge functions (service role only)
CREATE OR REPLACE VIEW public.api_configurations_decrypted AS
SELECT 
  id, name, service_name, description, secret_key_name, category,
  status, is_configured, base_url, docs_url, created_at, updated_at, configured_by,
  CASE 
    WHEN secret_value IS NOT NULL THEN decrypt_sensitive(secret_value)
    ELSE NULL
  END AS secret_value
FROM public.api_configurations;

-- Only service role can access decrypted view
REVOKE ALL ON public.api_configurations_decrypted FROM anon, authenticated;
GRANT SELECT ON public.api_configurations_decrypted TO service_role;

-- Seed OpenAI config if not exists
INSERT INTO public.api_configurations (name, service_name, secret_key_name, category, status, description, base_url, docs_url)
VALUES ('OpenAI API', 'OpenAI', 'OPENAI_API_KEY', 'ai', 'inactive', 'API da OpenAI para modelos GPT', 'https://api.openai.com', 'https://platform.openai.com/docs')
ON CONFLICT DO NOTHING;
