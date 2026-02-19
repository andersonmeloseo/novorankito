import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  PlayCircle, CheckCircle2, Clock, BookOpen, ChevronRight,
  GraduationCap, Lock, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── helpers ────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function extractWistiaId(url: string): string | null {
  const m = url.match(/wistia\.(?:com|net)\/(?:medias|embed\/iframe)\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

function buildEmbedUrl(videoUrl: string, videoType: string): string | null {
  if (videoType === "youtube") {
    const id = extractYouTubeId(videoUrl);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1` : null;
  }
  if (videoType === "wistia") {
    const id = extractWistiaId(videoUrl);
    return id ? `https://fast.wistia.net/embed/iframe/${id}?autoPlay=true` : null;
  }
  return null;
}

// ─── types ──────────────────────────────────────────────────

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: string;
  duration_minutes: number | null;
  sort_order: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  thumbnail_url: string | null;
  academy_lessons: Lesson[];
}

interface Progress {
  lesson_id: string;
  completed: boolean;
}

// ─── VideoPlayer ────────────────────────────────────────────

function VideoPlayer({ lesson }: { lesson: Lesson | null }) {
  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <GraduationCap className="h-16 w-16 opacity-20" />
        <p className="text-sm">Selecione uma aula para começar</p>
      </div>
    );
  }

  const embedUrl = buildEmbedUrl(lesson.video_url, lesson.video_type);

  if (!embedUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <p className="text-sm">URL de vídeo inválida.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative w-full bg-black" style={{ paddingTop: "56.25%" }}>
        <iframe
          key={lesson.id}
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={lesson.title}
        />
      </div>
      <div className="p-4 bg-card border-t border-border">
        <h2 className="text-base font-semibold text-foreground">{lesson.title}</h2>
        {lesson.description && (
          <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
        )}
        {lesson.duration_minutes && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lesson.duration_minutes} min
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────

export default function AcademyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  // Fetch modules with lessons
  const { data: modules = [], isLoading } = useQuery<Module[]>({
    queryKey: ["academy-modules-user"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select(`
          id, title, description, sort_order, thumbnail_url,
          academy_lessons (
            id, module_id, title, description, video_url,
            video_type, duration_minutes, sort_order
          )
        `)
        .eq("is_published", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        academy_lessons: (m.academy_lessons || [])
          .filter((l: any) => l !== null)
          .sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
    },
  });

  // Fetch user progress
  const { data: progress = [] } = useQuery<Progress[]>({
    queryKey: ["academy-progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Mark lesson complete
  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from("academy_progress")
        .upsert(
          { user_id: user!.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-progress", user?.id] });
      toast.success("Aula marcada como concluída!");
    },
  });

  const progressMap = new Map(progress.map(p => [p.lesson_id, p.completed]));

  // Stats
  const totalLessons = modules.reduce((s, m) => s + m.academy_lessons.length, 0);
  const completedCount = progress.filter(p => p.completed).length;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const toggleModule = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectLesson = (lesson: Lesson, moduleId: string) => {
    setSelectedLesson(lesson);
    // Auto-open the module
    setOpenModules(prev => new Set(prev).add(moduleId));
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Academy" subtitle="Centro de aprendizado do Rankito" />
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (modules.length === 0) {
    return (
      <>
        <TopBar title="Academy" subtitle="Centro de aprendizado do Rankito" />
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <GraduationCap className="h-12 w-12 opacity-30" />
          <p className="text-sm">Nenhum conteúdo disponível ainda. Volte em breve!</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Academy" subtitle="Centro de aprendizado do Rankito" />

      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Progress bar header */}
        <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/20 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Seu progresso</span>
          </div>
          <div className="flex-1 min-w-[120px] max-w-xs">
            <Progress value={pct} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalLessons} aulas ({pct}%)
          </span>
        </div>

        {/* Main layout */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — module/lesson list */}
          <aside className="w-72 shrink-0 border-r border-border flex flex-col min-h-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {modules.map((mod, mi) => {
                  const modLessons = mod.academy_lessons;
                  const modCompleted = modLessons.filter(l => progressMap.get(l.id)).length;
                  const isOpen = openModules.has(mod.id);

                  return (
                    <div key={mod.id} className="rounded-xl border border-border overflow-hidden">
                      {/* Module header */}
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                            {mi + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{mod.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {modCompleted}/{modLessons.length} aulas
                            </p>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* Lessons */}
                      {isOpen && (
                        <div className="divide-y divide-border/50">
                          {modLessons.map((lesson, li) => {
                            const done = !!progressMap.get(lesson.id);
                            const isActive = selectedLesson?.id === lesson.id;
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => handleSelectLesson(lesson, mod.id)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all",
                                  isActive
                                    ? "bg-primary/10 border-l-2 border-l-primary"
                                    : "hover:bg-muted/30"
                                )}
                              >
                                <div className="shrink-0">
                                  {done ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  ) : (
                                    <PlayCircle className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    "text-[12px] truncate",
                                    isActive ? "font-semibold text-foreground" : "text-foreground/80"
                                  )}>
                                    {li + 1}. {lesson.title}
                                  </p>
                                  {lesson.duration_minutes && (
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-2.5 w-2.5" />{lesson.duration_minutes} min
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>

          {/* Video area */}
          <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-background">
            {selectedLesson ? (
              <>
                <div className="flex-1 overflow-auto">
                  <VideoPlayer lesson={selectedLesson} />
                </div>
                <div className="p-4 border-t border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {progressMap.get(selectedLesson.id) ? (
                      <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Concluída
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => markComplete.mutate(selectedLesson.id)}
                        disabled={markComplete.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Marcar como concluída
                      </Button>
                    )}
                  </div>

                  {/* Next lesson */}
                  {(() => {
                    const allLessons = modules.flatMap(m => m.academy_lessons);
                    const idx = allLessons.findIndex(l => l.id === selectedLesson.id);
                    const next = allLessons[idx + 1];
                    if (!next) return null;
                    const nextMod = modules.find(m => m.id === next.module_id);
                    return (
                      <Button
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => handleSelectLesson(next, next.module_id)}
                      >
                        Próxima aula <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-6">
                <GraduationCap className="h-20 w-20 text-primary/20" />
                <div>
                  <h2 className="text-xl font-bold text-foreground font-display">Bem-vindo ao Academy</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    Aprenda a usar o Rankito com os nossos tutoriais em vídeo. Selecione uma aula no menu ao lado para começar.
                  </p>
                </div>
                {modules[0]?.academy_lessons?.[0] && (
                  <Button
                    onClick={() => handleSelectLesson(modules[0].academy_lessons[0], modules[0].id)}
                    className="gap-2"
                  >
                    <PlayCircle className="h-4 w-4" /> Começar agora
                  </Button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
