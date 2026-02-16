
-- Semantic entities (nodes in the graph)
CREATE TABLE public.semantic_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'Organization',
  name TEXT NOT NULL,
  description TEXT,
  schema_type TEXT,
  schema_properties JSONB DEFAULT '{}'::jsonb,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.semantic_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entities" ON public.semantic_entities FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create own entities" ON public.semantic_entities FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own entities" ON public.semantic_entities FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own entities" ON public.semantic_entities FOR DELETE USING (owner_id = auth.uid());

CREATE TRIGGER update_semantic_entities_updated_at
BEFORE UPDATE ON public.semantic_entities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Semantic relations (edges / triples: subject -> predicate -> object)
CREATE TABLE public.semantic_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.semantic_entities(id) ON DELETE CASCADE,
  object_id UUID NOT NULL REFERENCES public.semantic_entities(id) ON DELETE CASCADE,
  predicate TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.semantic_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relations" ON public.semantic_relations FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create own relations" ON public.semantic_relations FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own relations" ON public.semantic_relations FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own relations" ON public.semantic_relations FOR DELETE USING (owner_id = auth.uid());

CREATE TRIGGER update_semantic_relations_updated_at
BEFORE UPDATE ON public.semantic_relations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_semantic_entities_project ON public.semantic_entities(project_id);
CREATE INDEX idx_semantic_relations_project ON public.semantic_relations(project_id);
CREATE INDEX idx_semantic_relations_subject ON public.semantic_relations(subject_id);
CREATE INDEX idx_semantic_relations_object ON public.semantic_relations(object_id);
