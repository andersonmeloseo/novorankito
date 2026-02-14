import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Plus, Loader2, Trash2, Settings, MoreVertical, MousePointerClick, Eye, BarChart3, FileText, Link2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getGreeting, getUserDisplayName } from "@/components/layout/TopBar";
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

  // Fetch metrics for all projects
  const projectIds = projects.map(p => p.id);
  const { data: seoMetrics = [] } = useQuery({
    queryKey: ["projects-seo-summary", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("seo_metrics")
        .select("project_id, clicks, impressions, ctr, position")
        .in("project_id", projectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  const { data: siteUrls = [] } = useQuery({
    queryKey: ["projects-urls-summary", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("site_urls")
          .select("project_id, id")
          .in("project_id", projectIds)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    enabled: projectIds.length > 0,
  });

  // Aggregate metrics per project
  const metricsMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>();
  seoMetrics.forEach((m: any) => {
    const existing = metricsMap.get(m.project_id) || { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 };
    existing.clicks += m.clicks || 0;
    existing.impressions += m.impressions || 0;
    existing.ctr += Number(m.ctr || 0);
    existing.position += Number(m.position || 0);
    existing.count++;
    metricsMap.set(m.project_id, existing);
  });

  const urlsMap = new Map<string, number>();
  siteUrls.forEach((u: any) => {
    urlsMap.set(u.project_id, (urlsMap.get(u.project_id) || 0) + 1);
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
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

  const displayName = getUserDisplayName(user);
  const greeting = getGreeting();

  return (
    <>
      <TopBar title="Projetos" subtitle="Gerencie e acompanhe todos os seus sites" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Greeting banner */}
        {displayName && (
          <div className="gradient-primary rounded-xl p-5 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.12),transparent_60%)]" />
            <div className="relative">
              <h2 className="text-lg font-bold font-display">{greeting}, {displayName}! 👋</h2>
              <p className="text-sm opacity-80 mt-0.5">
                {projects.length > 0
                  ? `Você tem ${projects.length} projeto${projects.length > 1 ? "s" : ""} ativo${projects.length > 1 ? "s" : ""}. Continue monitorando!`
                  : "Crie seu primeiro projeto para começar a monitorar seus sites."
                }
              </p>
            </div>
          </div>
        )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {projects.map((project) => {
              const metrics = metricsMap.get(project.id);
              const urlCount = urlsMap.get(project.id) || 0;
              const avgCtr = metrics && metrics.count > 0 ? (metrics.ctr / metrics.count).toFixed(1) : "0";
              const avgPos = metrics && metrics.count > 0 ? (metrics.position / metrics.count).toFixed(1) : "—";

              return (
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

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                        <MousePointerClick className="h-2.5 w-2.5" />
                        <span className="text-[9px] uppercase tracking-wider">Cliques</span>
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums">{metrics?.clicks?.toLocaleString("pt-BR") || "0"}</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                        <Eye className="h-2.5 w-2.5" />
                        <span className="text-[9px] uppercase tracking-wider">Impr.</span>
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums">{metrics?.impressions?.toLocaleString("pt-BR") || "0"}</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                        <BarChart3 className="h-2.5 w-2.5" />
                        <span className="text-[9px] uppercase tracking-wider">CTR</span>
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums">{avgCtr}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                        <BarChart3 className="h-2.5 w-2.5" />
                        <span className="text-[9px] uppercase tracking-wider">Posição</span>
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums">{avgPos}</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                        <Link2 className="h-2.5 w-2.5" />
                        <span className="text-[9px] uppercase tracking-wider">URLs</span>
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums">{urlCount}</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                        <FileText className="h-2.5 w-2.5" />
                        <span className="text-[9px] uppercase tracking-wider">Tipo</span>
                      </div>
                      <span className="text-[10px] font-medium text-foreground truncate">{project.site_type || "—"}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
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
