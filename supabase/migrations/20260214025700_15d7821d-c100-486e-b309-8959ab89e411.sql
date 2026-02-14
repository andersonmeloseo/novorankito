-- Add meta_title and meta_description columns to site_urls
ALTER TABLE public.site_urls
ADD COLUMN meta_title text,
ADD COLUMN meta_description text;
