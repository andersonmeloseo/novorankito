import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderKanban, Plus, Trash2, Loader2, Network, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useGoalProjects } from "@/hooks/use-goal-projects";
import { cn } from "@/lib/utils";

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

interface SemanticProjectSelectorProps {
  projectId: string | null;
  selected: string | null;
  onSelect: (id: string) => void;
}

export function SemanticProjectSelector({ projectId, selected, onSelect }: SemanticProjectSelectorProps) {
  const { data: projects = [], isLoading, createProject, deleteProject } = useGoalProjects(projectId, "semantic");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Informe o nome do projeto."); return; }
    try {
      const created = await createProject.mutateAsync({ name: name.trim(), description: desc.trim() || undefined, color });
      toast.success("Projeto semântico criado!");
      onSelect(created.id);
      setShowCreate(false);
      setName(""); setDesc(""); setColor(PROJECT_COLORS[0]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar projeto.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este projeto semântico? As entidades vinculadas não serão removidas.")) return;
    try {
      await deleteProject.mutateAsync(id);
      toast.success("Projeto excluído!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Create new project card */}
        <button
          onClick={() => setShowCreate(true)}
          className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-8 transition-all hover:border-primary/40 hover:bg-primary/5 min-h-[180px]"
        >
          <div className="rounded-full bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Novo Projeto Semântico</p>
            <p className="text-[11px] text-muted-foreground mt-1">Crie uma pasta para organizar suas entidades</p>
          </div>
        </button>

        {/* Existing projects */}
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "group relative flex flex-col items-start gap-3 rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 min-h-[180px] text-left",
              selected === p.id && "ring-2 ring-primary border-primary"
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <div className="rounded-lg p-2" style={{ backgroundColor: `${p.color}20` }}>
                <FolderKanban className="h-5 w-5" style={{ color: p.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <span
                onClick={(e) => handleDelete(p.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </div>

            {p.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
            )}

            <div className="mt-auto flex items-center gap-1 text-[11px] text-primary font-medium">
              <Network className="h-3 w-3" />
              Abrir grafo
              <ChevronRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-sm">Novo Projeto Semântico</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Site Principal" className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Objetivo do projeto semântico..." className="h-9 text-xs" />
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
