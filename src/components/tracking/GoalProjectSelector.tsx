import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderKanban, Plus, Trash2, Loader2, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { GoalProject, useGoalProjects } from "@/hooks/use-goal-projects";
import { cn } from "@/lib/utils";

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

interface GoalProjectSelectorProps {
  projectId: string | null;
  module: "goals" | "conversions";
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function GoalProjectSelector({ projectId, module, selected, onSelect }: GoalProjectSelectorProps) {
  const { data: projects = [], isLoading, createProject, deleteProject } = useGoalProjects(projectId, module);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Informe o nome do projeto."); return; }
    try {
      const created = await createProject.mutateAsync({ name: name.trim(), description: desc.trim() || undefined, color });
      toast.success("Projeto criado!");
      onSelect(created.id);
      setShowCreate(false);
      setName(""); setDesc(""); setColor(PROJECT_COLORS[0]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar projeto.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este projeto? As metas/conversões vinculadas ficarão sem projeto.")) return;
    try {
      await deleteProject.mutateAsync(id);
      if (selected === id) onSelect(null);
      toast.success("Projeto excluído!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    }
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold font-display uppercase tracking-wider">
              Projetos de {module === "goals" ? "Metas" : "Conversões"}
            </h3>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3" /> Novo Projeto
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <FolderKanban className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
            Nenhum projeto criado. Crie um para organizar suas {module === "goals" ? "metas" : "conversões"}.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelect(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                !selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/40"
              )}
            >
              Todas
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id === selected ? null : p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 group",
                  p.id === selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40"
                )}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                {p.name}
                <span
                  onClick={(e) => handleDelete(p.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-destructive"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-sm">Novo Projeto de {module === "goals" ? "Metas" : "Conversões"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Campanha Black Friday" className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Objetivo do projeto..." className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cor</label>
              <div className="flex gap-1.5">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-full transition-all",
                      color === c ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button size="sm" className="text-xs gap-1" onClick={handleCreate} disabled={createProject.isPending}>
              {createProject.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
