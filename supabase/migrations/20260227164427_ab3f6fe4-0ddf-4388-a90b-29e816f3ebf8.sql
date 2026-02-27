-- Drop and recreate views with SECURITY INVOKER to respect underlying table RLS

DROP VIEW IF EXISTS public.ga4_connections_decrypted;
CREATE VIEW public.ga4_connections_decrypted
WITH (security_invoker = true) AS
SELECT id, project_id, owner_id, connection_name, property_id, property_name,
  client_email, decrypt_sensitive(private_key) AS private_key,
  last_sync_at, created_at, updated_at
FROM ga4_connections;

DROP VIEW IF EXISTS public.gsc_connections_decrypted;
CREATE VIEW public.gsc_connections_decrypted
WITH (security_invoker = true) AS
SELECT id, project_id, owner_id, connection_name, site_url,
  client_email, decrypt_sensitive(private_key) AS private_key,
  last_sync_at, created_at, updated_at
FROM gsc_connections;

DROP VIEW IF EXISTS public.api_configurations_decrypted;
CREATE VIEW public.api_configurations_decrypted
WITH (security_invoker = true) AS
SELECT id, name, service_name, description, secret_key_name, category,
  status, is_configured, base_url, docs_url, created_at, updated_at, configured_by,
  CASE WHEN secret_value IS NOT NULL THEN decrypt_sensitive(secret_value) ELSE NULL::text END AS secret_value
FROM api_configurations;