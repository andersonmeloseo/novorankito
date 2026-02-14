import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Plus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ProjectsList() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/overview")}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{project.name}</h3>
                      <p className="text-xs text-muted-foreground">{project.domain}</p>
                    </div>
                  </div>
                  <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {project.status === "active" ? "Ativo" : project.status}
                  </Badge>
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
    </>
  );
}
