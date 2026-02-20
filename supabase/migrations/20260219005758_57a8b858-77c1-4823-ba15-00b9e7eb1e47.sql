
-- ============================================================
-- ACADEMY SYSTEM
-- ============================================================

-- Modules (chapters/sections)
CREATE TABLE public.academy_modules (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read published modules
CREATE POLICY "Users can view published modules"
  ON public.academy_modules FOR SELECT TO authenticated
  USING (is_published = true);

-- Admins/owners can do everything
CREATE POLICY "Admins can manage modules"
  ON public.academy_modules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ----------------------------------------------------------------

-- Lessons (individual videos inside a module)
CREATE TABLE public.academy_lessons (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id        UUID NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  video_url        TEXT NOT NULL,
  video_type       TEXT NOT NULL DEFAULT 'youtube', -- 'youtube' | 'wistia'
  duration_minutes INTEGER,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published lessons"
  ON public.academy_lessons FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "Admins can manage lessons"
  ON public.academy_lessons FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ----------------------------------------------------------------

-- Progress tracking per user per lesson
CREATE TABLE public.academy_progress (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL,
  lesson_id    UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.academy_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.academy_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.academy_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all progress (analytics)
CREATE POLICY "Admins can view all progress"
  ON public.academy_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ----------------------------------------------------------------

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.set_academy_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_academy_modules_updated
  BEFORE UPDATE ON public.academy_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_academy_updated_at();

CREATE TRIGGER trg_academy_lessons_updated
  BEFORE UPDATE ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_academy_updated_at();
