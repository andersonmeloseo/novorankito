import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  StickyNote, Plus, Trash2, Pencil, Tag, Calendar, MessageSquare, Loader2,
} from "lucide-react";

export interface Annotation {
  id: string;
  project_id: string;
  owner_id: string;
  annotation_date: string;
  title: string;
  description: string | null;
  category: string;
  color: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "indexing", label: "Indexação", color: "hsl(var(--chart-1))" },
  { value: "content", label: "Conteúdo", color: "hsl(var(--chart-2))" },
  { value: "technical", label: "Técnico", color: "hsl(var(--chart-3))" },
  { value: "link_building", label: "Link Building", color: "hsl(var(--chart-4))" },
  { value: "algorithm", label: "Algoritmo", color: "hsl(var(--chart-5))" },
  { value: "general", label: "Geral", color: "hsl(var(--primary))" },
];

interface Props {
  projectId: string | undefined;
}

export function useAnnotations(projectId: string | undefined) {
  return useQuery({
    queryKey: ["seo-annotations", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_annotations")
        .select("*")
        .eq("project_id", projectId!)
        .order("annotation_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Annotation[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function AnnotationDialog({
  open,
  onOpenChange,
  projectId,
  date,
  editAnnotation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | undefined;
  date: string;
  editAnnotation?: Annotation | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(editAnnotation?.title || "");
  const [description, setDescription] = useState(editAnnotation?.description || "");
  const [category, setCategory] = useState(editAnnotation?.category || "general");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!projectId || !user || !title.trim()) return;
    setSaving(true);
    try {
      if (editAnnotation) {
        const { error } = await supabase
          .from("seo_annotations")
          .update({ title: title.trim(), description: description.trim() || null, category })
          .eq("id", editAnnotation.id);
        if (error) throw error;
        toast.success("Nota atualizada");
      } else {
        const { error } = await supabase
          .from("seo_annotations")
          .insert({
            project_id: projectId,
            owner_id: user.id,
            annotation_date: date,
            title: title.trim(),
            description: description.trim() || null,
            category,
          });
        if (error) throw error;
        toast.success("Nota adicionada ao gráfico");
      }
      qc.invalidateQueries({ queryKey: ["seo-annotations", projectId] });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCategory("general");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <StickyNote className="h-4 w-4 text-primary" />
            {editAnnotation ? "Editar nota" : "Adicionar nota"} — {date ? format(parseISO(date), "dd/MM/yyyy") : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Título *</label>
            <Input
              placeholder="Ex: Indexei 50 páginas de produto"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Descrição</label>
            <Textarea
              placeholder="Detalhes da ação realizada..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Categoria</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" className="text-xs gap-1.5" onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {editAnnotation ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnnotationsHistory({ projectId }: Props) {
  const { data: annotations = [], isLoading } = useAnnotations(projectId);
  const qc = useQueryClient();
  const [editAnnotation, setEditAnnotation] = useState<Annotation | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seo_annotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-annotations", projectId] });
      toast.success("Nota removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return null;
  if (annotations.length === 0) return null;

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[5];

  return (
    <>
      <AnimatedContainer delay={0.15}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Histórico de Notas ({annotations.length})
            </h3>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {annotations.map(a => {
              const catInfo = getCategoryInfo(a.category);
              return (
                <div key={a.id} className="px-4 py-3 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {format(parseISO(a.annotation_date), "dd/MM/yyyy")}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4" style={{ borderColor: catInfo.color, color: catInfo.color }}>
                          {catInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                      {a.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditAnnotation(a)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </AnimatedContainer>

      {editAnnotation && (
        <AnnotationDialog
          open={!!editAnnotation}
          onOpenChange={open => { if (!open) setEditAnnotation(null); }}
          projectId={projectId}
          date={editAnnotation.annotation_date}
          editAnnotation={editAnnotation}
        />
      )}
    </>
  );
}

// Custom dot component for Recharts that shows annotation markers
export function AnnotationDot(props: any & { annotations: Annotation[] }) {
  const { cx, cy, payload, annotations } = props;
  if (!payload?.rawDate || !annotations) return null;
  
  const dayAnnotations = annotations.filter(
    (a: Annotation) => a.annotation_date === payload.rawDate
  );
  
  if (dayAnnotations.length === 0) return null;
  
  const catInfo = CATEGORIES.find(c => c.value === dayAnnotations[0].category) || CATEGORIES[5];
  
  return (
    <g>
      <circle cx={cx} cy={8} r={6} fill={catInfo.color} opacity={0.9} />
      <text x={cx} y={12} textAnchor="middle" fontSize={8} fill="white" fontWeight="bold">
        {dayAnnotations.length > 1 ? dayAnnotations.length : "✎"}
      </text>
    </g>
  );
}
