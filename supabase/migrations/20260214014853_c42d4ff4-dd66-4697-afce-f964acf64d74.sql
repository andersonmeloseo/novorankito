-- Add city column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS city text;