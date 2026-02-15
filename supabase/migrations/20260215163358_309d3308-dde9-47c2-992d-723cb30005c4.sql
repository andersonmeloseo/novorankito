-- Fix encrypt_sensitive function to include extensions schema in search_path
-- The digest() function from pgcrypto lives in the extensions schema
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(plain_text text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  encryption_key text;
BEGIN
  encryption_key := encode(digest(current_setting('app.settings.service_role_key', true), 'sha256'), 'hex');
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN plain_text;
  END IF;
  
  RETURN encode(pgp_sym_encrypt(plain_text, encryption_key), 'base64');
END;
$function$;

-- Also fix decrypt_sensitive
CREATE OR REPLACE FUNCTION public.decrypt_sensitive(encrypted_text text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  encryption_key text;
BEGIN
  encryption_key := encode(digest(current_setting('app.settings.service_role_key', true), 'sha256'), 'hex');
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN encrypted_text;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_text, 'base64'), encryption_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN encrypted_text;
  END;
END;
$function$;

-- Also fix the trigger function
CREATE OR REPLACE FUNCTION public.encrypt_private_key_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.private_key IS NOT NULL AND NEW.private_key LIKE '-----BEGIN%' THEN
    NEW.private_key := encrypt_sensitive(NEW.private_key);
  END IF;
  RETURN NEW;
END;
$function$;