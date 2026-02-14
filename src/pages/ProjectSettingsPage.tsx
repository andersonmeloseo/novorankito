import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Link2, Tag, Wifi, WifiOff, Bell, Users, Bot, Settings2, Copy, Loader2,
  RefreshCw, Trash2, Pencil, CheckCircle2, AlertCircle, Upload, Search, BookOpen,
  ExternalLink, TestTube,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { toast as shadToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

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
            <GscIntegrationCard projectId={project.id} />
            <Ga4IntegrationCard />
            <AdsIntegrationCard name="Google Ads" />
            <AdsIntegrationCard name="Meta Ads" />
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

/* ─── GSC Integration Card ─── */
function GscIntegrationCard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [sites, setSites] = useState<{ siteUrl: string; permissionLevel: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [step, setStep] = useState<"form" | "validating" | "select">("form");

  const { data: conn, isLoading } = useQuery({
    queryKey: ["gsc-connection", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("gsc_connections").select("*").eq("project_id", projectId).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const isConnected = !!conn;

  const handleTest = async () => {
    if (!conn) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-gsc", {
        body: { credentials: { client_email: conn.client_email, private_key: conn.private_key } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      shadToast({ title: "Conexão OK!", description: `${data.sites?.length || 0} propriedade(s) encontrada(s).` });
    } catch (e: any) {
      shadToast({ title: "Falha na conexão", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-gsc-data", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["seo-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["gsc-connection"] });
      shadToast({ title: "Sincronização concluída!", description: `${data?.inserted?.toLocaleString() || 0} métricas importadas.` });
    } catch (e: any) {
      shadToast({ title: "Erro ao sincronizar", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!conn) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("gsc_connections").delete().eq("id", conn.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["gsc-connection"] });
      shadToast({ title: "GSC desconectado." });
    } catch (e: any) {
      shadToast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleConnect = async () => {
    if (!connectionName.trim()) { setJsonError("Informe um nome."); return; }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput.trim());
      if (!parsed.client_email || !parsed.private_key) {
        setJsonError("JSON inválido: client_email e private_key são obrigatórios.");
        return;
      }
    } catch { setJsonError("JSON inválido."); return; }

    setStep("validating");
    setJsonError("");

    try {
      const { data, error } = await supabase.functions.invoke("verify-gsc", {
        body: { credentials: { client_email: parsed.client_email, private_key: parsed.private_key } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      const fetchedSites = data.sites || [];
      if (fetchedSites.length === 0) {
        setJsonError("Nenhuma propriedade encontrada. Verifique se a Service Account tem acesso.");
        setStep("form");
        return;
      }
      setSites(fetchedSites);
      setSelectedSite(fetchedSites[0]?.siteUrl || "");
      setStep("select");
    } catch (e: any) {
      setJsonError(e.message);
      setStep("form");
    }
  };

  const handleSaveConnection = async () => {
    if (!user || !selectedSite) return;
    let parsed: any;
    try { parsed = JSON.parse(jsonInput.trim()); } catch { return; }
    try {
      const { error } = await supabase.from("gsc_connections").upsert({
        project_id: projectId,
        owner_id: user.id,
        connection_name: connectionName,
        client_email: parsed.client_email,
        private_key: parsed.private_key,
        site_url: selectedSite,
      }, { onConflict: "project_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["gsc-connection"] });
      setEditing(false);
      setStep("form");
      setJsonInput("");
      shadToast({ title: "Conexão GSC salva!" });
    } catch (e: any) {
      shadToast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Card className="p-4"><Loader2 className="h-4 w-4 animate-spin" /></Card>;

  // Show connected state
  if (isConnected && !editing) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-success" />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">Google Search Console</span>
              <p className="text-[10px] text-muted-foreground">{conn.connection_name} · {conn.site_url}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-success/20">Conectado</Badge>
        </div>
        {conn.last_sync_at && (
          <p className="text-[10px] text-muted-foreground">
            Último sync: {format(parseISO(conn.last_sync_at), "dd/MM/yyyy HH:mm")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
            Testar
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Sincronizar
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => { setEditing(true); setConnectionName(conn.connection_name); }}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1 text-destructive hover:text-destructive" onClick={handleDisconnect} disabled={deleting}>
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Desconectar
          </Button>
        </div>
      </Card>
    );
  }

  // Show connect/edit form
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            {editing ? <Pencil className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Google Search Console</span>
            <p className="text-[10px] text-muted-foreground">{editing ? "Editar conexão" : "Não conectado"}</p>
          </div>
        </div>
        {editing && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setEditing(false); setStep("form"); setJsonError(""); }}>
            Cancelar
          </Button>
        )}
      </div>

      {step === "form" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome da conexão</Label>
            <Input placeholder="Ex: GSC Principal" value={connectionName} onChange={e => { setConnectionName(e.target.value); setJsonError(""); }} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Credenciais JSON (Service Account)</Label>
            <label className="cursor-pointer">
              <input type="file" accept=".json" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => { setJsonInput(evt.target?.result as string); setJsonError(""); };
                reader.readAsText(file);
                e.target.value = "";
              }} />
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors px-3 py-2 text-xs text-muted-foreground">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload arquivo .json</span>
              </div>
            </label>
            <textarea
              className="w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              placeholder='{"type": "service_account", ...}'
              value={jsonInput}
              onChange={e => { setJsonInput(e.target.value); setJsonError(""); }}
            />
          </div>
          {jsonError && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {jsonError}
            </div>
          )}
          <Button size="sm" className="w-full text-xs h-8 gap-1" onClick={handleConnect} disabled={!jsonInput.trim() || !connectionName.trim()}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Validar e conectar
          </Button>
        </div>
      )}

      {step === "validating" && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Verificando credenciais...</span>
        </div>
      )}

      {step === "select" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 text-success text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Conexão verificada! Selecione a propriedade.
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Propriedade</Label>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sites.map(s => <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="w-full text-xs h-8 gap-1" onClick={handleSaveConnection} disabled={!selectedSite}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Salvar conexão
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ─── GA4 Integration Card (placeholder) ─── */
function Ga4IntegrationCard() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Google Analytics 4</span>
            <p className="text-[10px] text-muted-foreground">Não conectado</p>
          </div>
        </div>
        <Button size="sm" className="text-xs h-7">Conectar</Button>
      </div>
    </Card>
  );
}

/* ─── Ads Integration Card (placeholder) ─── */
function AdsIntegrationCard({ name }: { name: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">{name}</span>
            <p className="text-[10px] text-muted-foreground">Não conectado</p>
          </div>
        </div>
        <Button size="sm" className="text-xs h-7">Conectar</Button>
      </div>
    </Card>
  );
}
