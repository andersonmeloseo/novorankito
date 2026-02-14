import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Link2, Tag, Wifi, WifiOff, Bell, Users, Bot, Settings2, Copy, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";

export default function ProjectSettingsPage() {
  const { user } = useAuth();

  const { data: project, isLoading } = useQuery({
    queryKey: ["active-project-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: siteUrls = [] } = useQuery({
    queryKey: ["project-urls", project?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_urls")
        .select("url, url_group, tags, status")
        .eq("project_id", project!.id)
        .limit(50);
      return data || [];
    },
    enabled: !!project?.id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project-members", project?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_members")
        .select("id, role, user_id, created_at")
        .eq("project_id", project!.id);
      return data || [];
    },
    enabled: !!project?.id,
  });

  const [projectName, setProjectName] = useState("");
  const [domain, setDomain] = useState("");

  // Sync state when project loads
  const displayName = projectName || project?.name || "";
  const displayDomain = domain || project?.domain || "";

  // Extract unique tags from site_urls
  const allTags = Array.from(new Set(siteUrls.flatMap((u: any) => u.tags || [])));
  const urlGroups = Array.from(new Set(siteUrls.map((u: any) => u.url_group).filter(Boolean)));

  const handleSave = async () => {
    if (!project?.id) return;
    const updates: any = {};
    if (projectName) updates.name = projectName;
    if (domain) updates.domain = domain;
    if (Object.keys(updates).length === 0) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }
    const { error } = await supabase.from("projects").update(updates).eq("id", project.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Projeto atualizado com sucesso!");
    }
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Configurações" subtitle="Carregando..." />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <TopBar title="Configurações" subtitle="Nenhum projeto encontrado" />
        <div className="p-6 text-center text-muted-foreground text-sm">
          Crie um projeto primeiro para acessar as configurações.
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Configurações" subtitle={`Gerencie o projeto ${project.name}`} />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Tabs defaultValue="general">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="general" className="text-xs">Geral</TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs">Integrações</TabsTrigger>
            <TabsTrigger value="tracking" className="text-xs">Tracking</TabsTrigger>
            <TabsTrigger value="goals" className="text-xs">Metas & Alertas</TabsTrigger>
            <TabsTrigger value="team" className="text-xs">Equipe</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Informações do Projeto</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do projeto</Label>
                  <Input
                    value={projectName || project.name}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Domínio principal</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={domain || project.domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="h-9 text-sm pl-9"
                    />
                  </div>
                </div>
              </div>
              {project.country && (
                <div className="grid sm:grid-cols-3 gap-4">
                  {project.country && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">País</Label>
                      <Input value={project.country} className="h-9 text-sm" readOnly />
                    </div>
                  )}
                  {project.city && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cidade</Label>
                      <Input value={project.city} className="h-9 text-sm" readOnly />
                    </div>
                  )}
                  {project.timezone && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fuso horário</Label>
                      <Input value={project.timezone} className="h-9 text-sm" readOnly />
                    </div>
                  )}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Badge variant="secondary" className="text-[10px]">{project.status}</Badge>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo do site</Label>
                  <Badge variant="secondary" className="text-[10px]">{project.site_type || "Não definido"}</Badge>
                </div>
              </div>
              {urlGroups.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Grupos de URL / Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {urlGroups.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]"><Tag className="h-2.5 w-2.5 mr-1" />{tag}</Badge>
                    ))}
                    {allTags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button size="sm" className="text-xs" onClick={handleSave}>Salvar Alterações</Button>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4 space-y-4">
            {[
              { name: "Google Search Console", status: "connected", icon: Wifi, color: "text-success" },
              { name: "Google Analytics 4", status: "connected", icon: Wifi, color: "text-success" },
              { name: "Google Ads", status: "disconnected", icon: WifiOff, color: "text-muted-foreground" },
              { name: "Meta Ads", status: "disconnected", icon: WifiOff, color: "text-muted-foreground" },
            ].map((integration) => (
              <Card key={integration.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <integration.icon className={`h-4 w-4 ${integration.color}`} />
                  <div>
                    <span className="text-sm font-medium text-foreground">{integration.name}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {integration.status === "connected" ? "Conectado e sincronizando" : "Não conectado"}
                    </p>
                  </div>
                </div>
                <Button variant={integration.status === "connected" ? "outline" : "default"} size="sm" className="text-xs">
                  {integration.status === "connected" ? "Desconectar" : "Conectar"}
                </Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tracking" className="mt-4 space-y-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Script de Tracking</h3>
              <div className="space-y-1.5">
                <Label className="text-xs">ID do Projeto</Label>
                <div className="flex items-center gap-2">
                  <Input value={project.id} className="h-9 text-sm font-mono" readOnly />
                  <Button variant="outline" size="sm" className="h-9" onClick={() => { navigator.clipboard.writeText(project.id); toast.success("Copiado!"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Snippet para instalação</Label>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs text-foreground">
                  {`<script src="https://cdn.rankito.io/track.js" data-key="${project.id}"></script>`}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="mt-4 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Objetivos do Agente IA</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Foco principal</Label>
                  <Input defaultValue="SEO Growth + Leads" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Meta de cliques/mês</Label>
                  <Input defaultValue="30000" type="number" className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-medium text-foreground">Alertas & Thresholds</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Alerta de queda de cliques", desc: "Notificar quando cliques caírem > 20%", enabled: true },
                  { label: "Alerta de posição", desc: "Notificar quando posição média subir > 5 posições", enabled: true },
                  { label: "Alerta de erro de indexação", desc: "Notificar falhas consecutivas na fila", enabled: false },
                ].map((alert) => (
                  <div key={alert.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <span className="text-xs font-medium text-foreground">{alert.label}</span>
                      <p className="text-[10px] text-muted-foreground">{alert.desc}</p>
                    </div>
                    <Switch defaultChecked={alert.enabled} />
                  </div>
                ))}
              </div>
              <Button size="sm" className="text-xs">Salvar Configurações</Button>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-4 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Membros do Projeto</h3>
                <Button size="sm" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Convidar</Button>
              </div>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum membro adicional encontrado.</p>
              ) : (
                members.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {member.role[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{member.user_id.slice(0, 8)}...</span>
                        <p className="text-[10px] text-muted-foreground">Role: {member.role}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{member.role}</Badge>
                  </div>
                ))
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
