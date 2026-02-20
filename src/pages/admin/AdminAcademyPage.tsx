import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, GraduationCap, PlayCircle, ChevronDown,
  ChevronUp, Eye, EyeOff, Clock, Youtube, Video,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  is_published: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  thumbnail_url: string | null;
  academy_lessons: Lesson[];
}

// ─── video preview util ──────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractWistiaId(url: string): string | null {
  const m = url.match(/wistia\.(?:com|net)\/(?:medias|embed\/iframe)\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

// ─── Module Form Dialog ─────────────────────────────────────

function ModuleDialog({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Module>;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Título obrigatório");
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      sort_order: parseInt(sortOrder) || 0,
      is_published: isPublished,
    };
    const { error } = initial?.id
      ? await supabase.from("academy_modules").update(payload).eq("id", initial.id)
      : await supabase.from("academy_modules").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial?.id ? "Módulo atualizado!" : "Módulo criado!");
    qc.invalidateQueries({ queryKey: ["academy-modules-admin"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Módulo 1 — Introdução" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o módulo…" rows={3} className="text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Publicado</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                <span className="text-xs text-muted-foreground">{isPublished ? "Visível" : "Rascunho"}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lesson Form Dialog ─────────────────────────────────────

function LessonDialog({
  open, onOpenChange, moduleId, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  moduleId: string;
  initial?: Partial<Lesson>;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url || "");
  const [videoType, setVideoType] = useState(initial?.video_type || "youtube");
  const [duration, setDuration] = useState(String(initial?.duration_minutes || ""));
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [saving, setSaving] = useState(false);

  const ytId = videoType === "youtube" ? extractYouTubeId(videoUrl) : null;
  const wistiaId = videoType === "wistia" ? extractWistiaId(videoUrl) : null;
  const previewSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
    : wistiaId
    ? `https://fast.wistia.net/embed/iframe/${wistiaId}`
    : null;

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Título obrigatório");
    if (!videoUrl.trim()) return toast.error("URL do vídeo obrigatória");
    setSaving(true);
    const payload = {
      module_id: moduleId,
      title: title.trim(),
      description: description.trim() || null,
      video_url: videoUrl.trim(),
      video_type: videoType,
      duration_minutes: duration ? parseInt(duration) : null,
      sort_order: parseInt(sortOrder) || 0,
      is_published: isPublished,
    };
    const { error } = initial?.id
      ? await supabase.from("academy_lessons").update(payload).eq("id", initial.id)
      : await supabase.from("academy_lessons").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial?.id ? "Aula atualizada!" : "Aula criada!");
    qc.invalidateQueries({ queryKey: ["academy-modules-admin"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar Aula" : "Nova Aula"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O que é SEO?" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva a aula…" rows={2} className="text-sm resize-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-xs">Plataforma *</Label>
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">
                    <span className="flex items-center gap-2"><Youtube className="h-3.5 w-3.5 text-destructive" /> YouTube</span>
                  </SelectItem>
                  <SelectItem value="wistia">
                    <span className="flex items-center gap-2"><Video className="h-3.5 w-3.5 text-primary" /> Wistia</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">URL do Vídeo *</Label>
              <Input
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder={videoType === "youtube" ? "https://youtube.com/watch?v=..." : "https://xxx.wistia.com/medias/..."}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Preview */}
          {previewSrc && (
            <div className="rounded-xl overflow-hidden border border-border">
              <div className="relative w-full bg-black" style={{ paddingTop: "56.25%" }}>
                <iframe
                  src={previewSrc}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="preview"
                />
              </div>
            </div>
          )}
          {videoUrl && !previewSrc && (
            <p className="text-xs text-destructive">URL inválida para a plataforma selecionada.</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Duração (min)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="h-9 text-sm" placeholder="15" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Publicado</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                <span className="text-xs text-muted-foreground">{isPublished ? "Visível" : "Rascunho"}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ───────────────────────────────────────────────────

export default function AdminAcademyPage() {
  const qc = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; data?: Partial<Module> }>({ open: false });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; moduleId: string; data?: Partial<Lesson> }>({ open: false, moduleId: "" });

  const { data: modules = [], isLoading } = useQuery<Module[]>({
    queryKey: ["academy-modules-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select(`
          id, title, description, sort_order, is_published, thumbnail_url,
          academy_lessons (
            id, module_id, title, description, video_url, video_type,
            duration_minutes, sort_order, is_published
          )
        `)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        academy_lessons: (m.academy_lessons || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
    },
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("academy_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-modules-admin"] });
      toast.success("Módulo excluído");
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("academy_lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-modules-admin"] });
      toast.success("Aula excluída");
    },
  });

  const toggleModuleExpand = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalLessons = modules.reduce((s, m) => s + m.academy_lessons.length, 0);
  const publishedLessons = modules.reduce(
    (s, m) => s + m.academy_lessons.filter(l => l.is_published).length, 0
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground font-display">Academy</h1>
            <p className="text-xs text-muted-foreground">
              {modules.length} módulos · {publishedLessons}/{totalLessons} aulas publicadas
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setModuleDialog({ open: true, data: {} })}
        >
          <Plus className="h-4 w-4" /> Novo Módulo
        </Button>
      </div>

      <Separator />

      {/* Modules list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
          <GraduationCap className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhum módulo criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, mi) => {
            const isExpanded = expandedModules.has(mod.id);
            return (
              <div key={mod.id} className="border border-border rounded-xl overflow-hidden">
                {/* Module header row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
                  <button onClick={() => toggleModuleExpand(mod.id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {mi + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{mod.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {mod.academy_lessons.length} aulas
                        {mod.description && ` · ${mod.description.slice(0, 50)}…`}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-5",
                        mod.is_published
                          ? "bg-success/5 border-success/20 text-success"
                          : "bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {mod.is_published ? "Publicado" : "Rascunho"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setModuleDialog({ open: true, data: mod })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Excluir módulo e todas as aulas?")) deleteModule.mutate(mod.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => toggleModuleExpand(mod.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Lessons list */}
                {isExpanded && (
                  <div className="divide-y divide-border/50">
                    {mod.academy_lessons.map((lesson, li) => (
                      <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {lesson.video_type === "youtube" ? (
                            <Youtube className="h-4 w-4 text-destructive shrink-0" />
                          ) : (
                            <Video className="h-4 w-4 text-primary shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {li + 1}. {lesson.title}
                            </p>
                            {lesson.duration_minutes && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> {lesson.duration_minutes} min
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-5",
                              lesson.is_published
                                ? "bg-success/5 border-success/20 text-success"
                                : "bg-muted/40 text-muted-foreground"
                            )}
                          >
                            {lesson.is_published ? "Publicada" : "Rascunho"}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setLessonDialog({ open: true, moduleId: mod.id, data: lesson })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm("Excluir esta aula?")) deleteLesson.mutate(lesson.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add lesson button */}
                    <div className="px-4 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs h-8 text-primary"
                        onClick={() => setLessonDialog({ open: true, moduleId: mod.id, data: {} })}
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar Aula
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ModuleDialog
        open={moduleDialog.open}
        onOpenChange={v => setModuleDialog(prev => ({ ...prev, open: v }))}
        initial={moduleDialog.data}
      />
      {lessonDialog.open && (
        <LessonDialog
          open={lessonDialog.open}
          onOpenChange={v => setLessonDialog(prev => ({ ...prev, open: v }))}
          moduleId={lessonDialog.moduleId}
          initial={lessonDialog.data}
        />
      )}
    </div>
  );
}
