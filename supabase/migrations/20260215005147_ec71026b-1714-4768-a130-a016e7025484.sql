
-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption/decryption functions using a server-side key
-- The encryption key is stored as a database secret (not accessible to client)

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Use the service role key hash as encryption key (available server-side only)
  encryption_key := encode(digest(current_setting('app.settings.service_role_key', true), 'sha256'), 'hex');
  
  -- If no key available, return plain text (backward compatibility)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN plain_text;
  END IF;
  
  RETURN encode(pgp_sym_encrypt(plain_text, encryption_key), 'base64');
END;
$$;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_sensitive(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Use the service role key hash as encryption key
  encryption_key := encode(digest(current_setting('app.settings.service_role_key', true), 'sha256'), 'hex');
  
  -- If no key or text doesn't look encrypted, return as-is
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN encrypted_text;
  END IF;
  
  -- Try to decrypt; if it fails (not encrypted), return original
  BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_text, 'base64'), encryption_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN encrypted_text;
  END;
END;
$$;

-- Revoke direct access to these functions from anon/authenticated
-- They should only be called by SECURITY DEFINER functions or service role
REVOKE EXECUTE ON FUNCTION public.encrypt_sensitive(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_sensitive(text) FROM anon, authenticated;

-- Create a view that automatically decrypts private_key for edge functions (service role only)
-- This keeps backward compatibility while data gets encrypted over time
CREATE OR REPLACE VIEW public.gsc_connections_decrypted AS
SELECT 
  id, project_id, owner_id, connection_name, site_url, client_email,
  decrypt_sensitive(private_key) as private_key,
  last_sync_at, created_at, updated_at
FROM public.gsc_connections;

CREATE OR REPLACE VIEW public.ga4_connections_decrypted AS
SELECT 
  id, project_id, owner_id, connection_name, property_id, property_name, client_email,
  decrypt_sensitive(private_key) as private_key,
  last_sync_at, created_at, updated_at
FROM public.ga4_connections;

-- Only service role should access decrypted views
REVOKE ALL ON public.gsc_connections_decrypted FROM anon, authenticated;
REVOKE ALL ON public.ga4_connections_decrypted FROM anon, authenticated;

-- Create trigger to auto-encrypt private_key on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_private_key_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only encrypt if the value looks like a PEM key (not already encrypted)
  IF NEW.private_key IS NOT NULL AND NEW.private_key LIKE '-----BEGIN%' THEN
    NEW.private_key := encrypt_sensitive(NEW.private_key);
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to both tables
DROP TRIGGER IF EXISTS encrypt_gsc_private_key ON public.gsc_connections;
CREATE TRIGGER encrypt_gsc_private_key
  BEFORE INSERT OR UPDATE OF private_key ON public.gsc_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_private_key_trigger();

DROP TRIGGER IF EXISTS encrypt_ga4_private_key ON public.ga4_connections;
CREATE TRIGGER encrypt_ga4_private_key
  BEFORE INSERT OR UPDATE OF private_key ON public.ga4_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_private_key_trigger();
