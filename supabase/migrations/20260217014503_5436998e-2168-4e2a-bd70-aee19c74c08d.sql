
-- Add goal_project_id to semantic_entities for project folder isolation
ALTER TABLE public.semantic_entities ADD COLUMN goal_project_id UUID;

-- Add goal_project_id to semantic_relations for project folder isolation  
ALTER TABLE public.semantic_relations ADD COLUMN goal_project_id UUID;
