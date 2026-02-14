import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Plus, Loader2, Trash2, Settings, MoreVertical } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function ProjectsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, domain, status, site_type, country, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      // Delete related data first
      await supabase.from("site_urls").delete().eq("project_id", deleteId);
      await supabase.from("seo_metrics").delete().eq("project_id", deleteId);
      await supabase.from("analytics_sessions").delete().eq("project_id", deleteId);
      await supabase.from("conversions").delete().eq("project_id", deleteId);
      await supabase.from("project_members").delete().eq("project_id", deleteId);
      const { error } = await supabase.from("projects").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Projeto removido com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["projects-list"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-projects"] });
    } catch (e: any) {
      toast({ title: "Erro ao remover projeto", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      <TopBar title="Projetos" subtitle="Gerencie e acompanhe todos os seus sites" />
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">Todos os Projetos</h2>
            <p className="text-sm text-muted-foreground mt-1">Selecione um projeto para visualizar métricas detalhadas.</p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={() => navigate("/onboarding")}>
            <Plus className="h-3.5 w-3.5" /> Novo Projeto
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-8 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">Nenhum projeto encontrado</h3>
            <p className="text-xs text-muted-foreground mb-4">Crie seu primeiro projeto para começar.</p>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => navigate("/onboarding")}>
              <Plus className="h-3.5 w-3.5" /> Criar Projeto
            </Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                    onClick={() => {
                      localStorage.setItem("rankito_current_project", project.id);
                      navigate("/overview");
                    }}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{project.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {project.status === "active" ? "Ativo" : project.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => navigate(`/project-settings?id=${project.id}`)} className="gap-2 text-xs">
                          <Settings className="h-3.5 w-3.5" /> Configurações
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(project.id)}
                          className="gap-2 text-xs text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remover projeto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {(project.site_type || project.country) && (
                  <p className="text-[10px] text-muted-foreground">
                    {[project.site_type, project.country].filter(Boolean).join(" · ")}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os dados associados (URLs, métricas, sessões) serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
