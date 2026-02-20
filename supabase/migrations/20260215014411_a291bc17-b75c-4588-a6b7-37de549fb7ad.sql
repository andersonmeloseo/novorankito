-- Fix decrypted views to respect RLS by using SECURITY INVOKER

-- Recreate ga4_connections_decrypted with SECURITY INVOKER
DROP VIEW IF EXISTS public.ga4_connections_decrypted;
CREATE VIEW public.ga4_connections_decrypted
WITH (security_invoker = true)
AS
SELECT id, project_id, owner_id, connection_name, property_id, property_name,
       client_email, decrypt_sensitive(private_key) AS private_key,
       last_sync_at, created_at, updated_at
FROM public.ga4_connections;

-- Recreate gsc_connections_decrypted with SECURITY INVOKER
DROP VIEW IF EXISTS public.gsc_connections_decrypted;
CREATE VIEW public.gsc_connections_decrypted
WITH (security_invoker = true)
AS
SELECT id, project_id, owner_id, connection_name, site_url,
       client_email, decrypt_sensitive(private_key) AS private_key,
       last_sync_at, created_at, updated_at
FROM public.gsc_connections;