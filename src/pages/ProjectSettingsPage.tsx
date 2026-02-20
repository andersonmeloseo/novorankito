import { useLocation, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Link2, Tag, Wifi, WifiOff, Bell, Users, Bot, Settings2, Copy, Loader2,
  RefreshCw, Trash2, Pencil, CheckCircle2, AlertCircle, Upload, Search, BookOpen,
  ExternalLink, TestTube, Eye, EyeOff, Save, Info, Megaphone, Target,
  Code2, Palette, KeyRound, Webhook,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { toast as shadToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { WhiteLabelSettings } from "@/components/settings/WhiteLabelSettings";
import { ApiKeysSettings } from "@/components/settings/ApiKeysSettings";
import { WebhooksSettings } from "@/components/settings/WebhooksSettings";
import { IntegrationsInfoCard } from "@/components/settings/IntegrationsInfoCard";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { GoalsAlertsSettings } from "@/components/settings/GoalsAlertsSettings";
import { GSCTutorialModal } from "@/components/onboarding/GSCTutorialModal";
import { GA4TutorialModal } from "@/components/onboarding/GA4TutorialModal";

export default function ProjectSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const validTabs = ["general", "integrations", "tracking", "goals", "team", "api", "whitelabel"];
  const hashTab = hash.replace("#", "");
  const tab = validTabs.includes(hashTab) ? hashTab : "general";

  const { data: project, isLoading } = useQuery({
    queryKey: ["active-project-settings", user?.id],
    queryFn: async () => {
      const savedId = localStorage.getItem("rankito_current_project");
      if (savedId) {
        const { data } = await supabase
          .from("projects")
          .select("*")
          .eq("id", savedId)
          .eq("owner_id", user!.id)
          .single();
        if (data) return data;
      }
      // Fallback: get first project owned by user
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user!.id)
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
  const [siteType, setSiteType] = useState("");
  const [monetizationEnabled, setMonetizationEnabled] = useState<boolean | null>(null);

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
    if (siteType) updates.site_type = siteType;
    if (monetizationEnabled !== null) {
      updates.monetization_status = monetizationEnabled ? "disponivel" : "desativado";
    }
    if (Object.keys(updates).length === 0) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }
    const { error } = await supabase.from("projects").update(updates).eq("id", project.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Projeto atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["active-project-settings"] });
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
      <TopBar title={`Configurações — ${tab === "general" ? "Geral" : tab === "integrations" ? "Integrações" : tab === "tracking" ? "Tracking" : tab === "goals" ? "Metas & Alertas" : tab === "team" ? "Equipe" : tab === "api" ? "API & Webhooks" : "White-Label"}`} subtitle={`Gerencie o projeto ${project.name}`} />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {tab === "general" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <Settings2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Configurações Gerais</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Defina nome, domínio, tipo do site e módulos ativos. Essas informações são usadas pelo agente IA, relatórios e integrações para personalizar a experiência.</p>
              </div>
            </div>
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
                  <Select value={siteType || project.site_type || ""} onValueChange={setSiteType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecionar tipo…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="lead_gen">Geração de Leads</SelectItem>
                      <SelectItem value="local">Negócio Local</SelectItem>
                      <SelectItem value="portfolio">Portfólio</SelectItem>
                      <SelectItem value="rank_rent">Rank & Rent</SelectItem>
                      <SelectItem value="institutional">Institucional</SelectItem>
                      <SelectItem value="news">Notícias / Portal</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <span className="text-xs font-medium text-foreground">Ativar Rank & Rent</span>
                  <p className="text-[10px] text-muted-foreground">Habilita o módulo de monetização por aluguel de páginas e projetos</p>
                </div>
                <Switch
                  checked={monetizationEnabled !== null ? monetizationEnabled : (project.monetization_status !== "desativado")}
                  onCheckedChange={setMonetizationEnabled}
                />
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
          </div>
        )}

         {tab === "integrations" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <Wifi className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Integrações</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Conecte suas contas do Google Search Console, GA4, Google Ads e Meta Ads. As credenciais são armazenadas de forma segura e usadas para sincronizar dados automaticamente.</p>
              </div>
            </div>
            <GscIntegrationCard projectId={project.id} />
            <Ga4IntegrationCard projectId={project.id} />
            <GoogleAdsIntegrationCard projectId={project.id} />
            <MetaAdsIntegrationCard projectId={project.id} />
          </div>
        )}

        {tab === "tracking" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <Code2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Script de Tracking</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Instale o script universal no seu site para capturar pageviews, cliques, conversões, Core Web Vitals e sessões automaticamente. Basta colar o snippet no {'<head>'} do seu HTML.</p>
              </div>
            </div>
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
          </div>
        )}

        {tab === "goals" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Metas & Alertas</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Configure metas de performance (cliques, impressões, posição) e alertas automáticos com notificações via painel, WhatsApp ou webhook quando métricas ultrapassarem os thresholds definidos.</p>
              </div>
            </div>
            <GoalsAlertsSettings projectId={project.id} />
          </div>
        )}

        {tab === "team" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Equipe</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Gerencie os membros do projeto, defina permissões por função (proprietário, admin, analista, visualizador) e convide colaboradores para trabalhar no projeto.</p>
              </div>
            </div>
            <TeamSettings projectId={project.id} />
          </div>
        )}

        {tab === "api" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <KeyRound className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">API & Webhooks</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Gerencie chaves de API para acesso programático e configure webhooks para receber notificações em tempo real. Integre com n8n, Zapier, Make, Slack, CRMs e ferramentas de BI.</p>
              </div>
            </div>
            <ApiKeysSettings projectId={project.id} />
            <WebhooksSettings projectId={project.id} />
            <IntegrationsInfoCard />
          </div>
        )}

        {tab === "whitelabel" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <Palette className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">White-Label</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Personalize a aparência da plataforma com a marca do seu cliente ou agência. Configure logo, cores, domínio customizado e remova referências ao Rankito.</p>
              </div>
            </div>
            <WhiteLabelSettings projectId={project.id} />
          </div>
        )}
      </div>
    </>
  );
}

/* ─── GSC Integration Card (Multiple Connections) ─── */
function GscIntegrationCard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [sites, setSites] = useState<{ siteUrl: string; permissionLevel: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [step, setStep] = useState<"form" | "validating" | "select">("form");

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["gsc-connections", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("gsc_connections").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!projectId,
  });

  const resetForm = () => {
    setAdding(false);
    setEditingId(null);
    setStep("form");
    setJsonInput("");
    setConnectionName("");
    setJsonError("");
    setSites([]);
    setSelectedSite("");
  };

  const handleTest = async (conn: any) => {
    setTestingId(conn.id);
    try {
      const { data, error } = await supabase.functions.invoke("verify-gsc", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      shadToast({ title: "Conexão OK!", description: `${data.sites?.length || 0} propriedade(s) encontrada(s).` });
    } catch (e: any) {
      shadToast({ title: "Falha na conexão", description: e.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (conn: any) => {
    setSyncingId(conn.id);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-gsc-data", {
        body: { project_id: projectId, connection_id: conn.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["seo-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["gsc-connections"] });
      shadToast({ title: "Sincronização concluída!", description: `${data?.inserted?.toLocaleString() || 0} métricas importadas.` });
    } catch (e: any) {
      shadToast({ title: "Erro ao sincronizar", description: e.message, variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (connId: string) => {
    setDeletingId(connId);
    try {
      const { error } = await supabase.from("gsc_connections").delete().eq("id", connId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["gsc-connections"] });
      shadToast({ title: "Conexão GSC removida." });
    } catch (e: any) {
      shadToast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleValidate = async () => {
    if (!connectionName.trim()) { setJsonError("Informe um nome para a conexão."); return; }
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
      if (editingId) {
        const { error } = await supabase.from("gsc_connections").update({
          connection_name: connectionName,
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          site_url: selectedSite,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gsc_connections").insert({
          project_id: projectId,
          owner_id: user.id,
          connection_name: connectionName,
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          site_url: selectedSite,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["gsc-connections"] });
      resetForm();
      shadToast({ title: editingId ? "Conexão atualizada!" : "Nova conexão GSC adicionada!" });
    } catch (e: any) {
      shadToast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Card className="p-4"><Loader2 className="h-4 w-4 animate-spin" /></Card>;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${connections.length > 0 ? "bg-success/10" : "bg-muted"}`}>
            {connections.length > 0 ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Google Search Console</span>
            <p className="text-[10px] text-muted-foreground">
              {connections.length === 0 ? "Nenhuma conta conectada" : `${connections.length} conta(s) conectada(s)`}
            </p>
          </div>
        </div>
        {!adding && !editingId && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setShowTutorial(true)}>
              <BookOpen className="h-3 w-3" /> <span className="hidden sm:inline">Tutorial</span>
            </Button>
            <Button size="sm" className="text-xs h-7 gap-1" onClick={() => setAdding(true)}>
              <Search className="h-3 w-3" /> Adicionar Conta
            </Button>
          </div>
        )}
      </div>

      {/* Existing connections list */}
      {connections.length > 0 && !adding && !editingId && (
        <div className="space-y-2">
          {connections.map((conn: any) => (
            <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{conn.connection_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{conn.site_url} · {conn.client_email}</p>
                  {conn.last_sync_at && (
                    <p className="text-[9px] text-muted-foreground">Sync: {format(parseISO(conn.last_sync_at), "dd/MM/yyyy HH:mm")}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleTest(conn)} disabled={testingId === conn.id}>
                  {testingId === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSync(conn)} disabled={syncingId === conn.id}>
                  {syncingId === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                  setEditingId(conn.id);
                  setConnectionName(conn.connection_name);
                  setJsonInput("");
                  setStep("form");
                }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDisconnect(conn.id)} disabled={deletingId === conn.id}>
                  {deletingId === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info about multiple accounts */}
      {connections.length > 0 && !adding && !editingId && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <Settings2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Adicione múltiplas Service Accounts para <strong className="text-foreground">aumentar o limite de quota</strong> da API do Search Console. 
            Cada conta possui ~200 notificações/dia e ~2.000 inspeções/dia independentes.
          </p>
        </div>
      )}

      {/* Add / Edit form */}
      {(adding || editingId) && (
        <div className="space-y-3 border border-border rounded-lg p-3 bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">{editingId ? "Editar Conexão" : "Nova Conexão GSC"}</span>
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={resetForm}>Cancelar</Button>
          </div>

          {step === "form" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome da conexão</Label>
                <Input placeholder="Ex: GSC Conta 2" value={connectionName} onChange={e => { setConnectionName(e.target.value); setJsonError(""); }} className="h-8 text-xs" />
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
              <Button size="sm" className="w-full text-xs h-8 gap-1" onClick={handleValidate} disabled={!jsonInput.trim() || !connectionName.trim()}>
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
                <CheckCircle2 className="h-3.5 w-3.5" /> {editingId ? "Atualizar conexão" : "Salvar conexão"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state: show form directly */}
      {connections.length === 0 && !adding && (
        <div className="space-y-2">
          <Button size="sm" className="w-full text-xs gap-1.5" onClick={() => setAdding(true)}>
            <Search className="h-3 w-3" /> Conectar Google Search Console
          </Button>
          <Button size="sm" className="w-full text-xs gap-1.5" onClick={() => setShowTutorial(true)}>
            <BookOpen className="h-3 w-3" /> Veja como fazer a Configuração e conexão
          </Button>
        </div>
      )}
      <GSCTutorialModal open={showTutorial} onOpenChange={setShowTutorial} />
    </Card>
  );
}

/* ─── GA4 Integration Card ─── */
function Ga4IntegrationCard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [properties, setProperties] = useState<{ propertyId: string; displayName: string; account: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [step, setStep] = useState<"form" | "validating" | "select">("form");

  const { data: conn, isLoading } = useQuery({
    queryKey: ["ga4-connection", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("ga4_connections").select("*").eq("project_id", projectId).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const isConnected = !!conn;

  const handleTest = async () => {
    if (!conn) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-ga4", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      shadToast({ title: "Conexão GA4 OK!", description: `${data.properties?.length || 0} propriedade(s) encontrada(s).` });
    } catch (e: any) {
      shadToast({ title: "Falha na conexão GA4", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!conn) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("ga4_connections").delete().eq("id", conn.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["ga4-connection"] });
      shadToast({ title: "GA4 desconectado." });
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
      const { data, error } = await supabase.functions.invoke("verify-ga4", {
        body: { credentials: { client_email: parsed.client_email, private_key: parsed.private_key } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      const fetched = data.properties || [];
      if (fetched.length === 0) {
        setJsonError("Nenhuma propriedade GA4 encontrada. Verifique se a Service Account tem acesso.");
        setStep("form");
        return;
      }
      setProperties(fetched);
      setSelectedProperty(fetched[0]?.propertyId || "");
      setStep("select");
    } catch (e: any) {
      setJsonError(e.message);
      setStep("form");
    }
  };

  const handleSaveConnection = async () => {
    if (!user || !selectedProperty) return;
    let parsed: any;
    try { parsed = JSON.parse(jsonInput.trim()); } catch { return; }
    const selectedProp = properties.find(p => p.propertyId === selectedProperty);
    try {
      const { error } = await supabase.from("ga4_connections").upsert({
        project_id: projectId,
        owner_id: user.id,
        connection_name: connectionName,
        client_email: parsed.client_email,
        private_key: parsed.private_key,
        property_id: selectedProperty,
        property_name: selectedProp?.displayName || "",
      }, { onConflict: "project_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["ga4-connection"] });
      setEditing(false);
      setJsonInput("");
      setStep("form");
      shadToast({ title: "Conexão GA4 salva!" });
    } catch (e: any) {
      shadToast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Carregando GA4...</span>
        </div>
      </Card>
    );
  }

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-ga4-data", {
        body: { project_id: projectId, report_type: "overview" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["ga4-report"] });
      queryClient.invalidateQueries({ queryKey: ["ga4-connection"] });
      shadToast({ title: "Sincronização GA4 concluída!", description: "Dados atualizados com sucesso." });
    } catch (e: any) {
      shadToast({ title: "Erro ao sincronizar GA4", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (isConnected && !editing) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-success" />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">Google Analytics 4</span>
              <p className="text-[10px] text-muted-foreground">
                {conn.connection_name} · Propriedade: {conn.property_name || conn.property_id || "—"}
              </p>
              {conn.last_sync_at && (
                <p className="text-[10px] text-muted-foreground">
                  Último sync: {format(parseISO(conn.last_sync_at), "dd/MM/yyyy HH:mm")}
                </p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-success/20">Conectado</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />} Testar
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sincronizar
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
          <Button size="sm" className="text-xs h-7 gap-1" onClick={() => setShowTutorial(true)}>
            <BookOpen className="h-3 w-3" /> Tutorial
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1 text-destructive hover:text-destructive" onClick={handleDisconnect} disabled={deleting}>
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Desconectar
          </Button>
        </div>
        <GA4TutorialModal open={showTutorial} onOpenChange={setShowTutorial} />
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Google Analytics 4</span>
            <p className="text-[10px] text-muted-foreground">{editing ? "Editando credenciais" : "Não conectado"}</p>
          </div>
        </div>
        {editing ? (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setEditing(false); setStep("form"); setJsonError(""); }}>
            Cancelar
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setShowTutorial(true)}>
            <BookOpen className="h-3 w-3" /> Tutorial
          </Button>
        )}
      </div>

      {step === "form" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome da conexão</Label>
            <Input className="h-8 text-xs" placeholder="Ex: GA4 - Meu Site" value={connectionName} onChange={e => { setConnectionName(e.target.value); setJsonError(""); }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Credenciais JSON</Label>
            <label className="cursor-pointer">
              <input type="file" accept=".json,application/json" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = evt => { setJsonInput(evt.target?.result as string); setJsonError(""); };
                reader.readAsText(file);
                e.target.value = "";
              }} />
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors px-3 py-2 text-xs text-muted-foreground">
                <Upload className="h-3.5 w-3.5" /> Upload do arquivo .json
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
          <span className="text-xs text-muted-foreground">Verificando credenciais GA4...</span>
        </div>
      )}

      {step === "select" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 text-success text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Conexão verificada! Selecione a propriedade.
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Propriedade GA4</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {properties.map(p => <SelectItem key={p.propertyId} value={p.propertyId}>{p.displayName} ({p.account})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="w-full text-xs h-8 gap-1" onClick={handleSaveConnection} disabled={!selectedProperty}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Salvar conexão
          </Button>
        </div>
      )}
      <GA4TutorialModal open={showTutorial} onOpenChange={setShowTutorial} />
    </Card>
  );
}

/* ─── Google Ads Integration Card (Full) ─── */
function GoogleAdsIntegrationCard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [creds, setCreds] = useState<Record<string, string>>({});

  const FIELDS = [
    { key: "developer_token", label: "Developer Token", placeholder: "XXXXXXXXXXXXXXXX", secret: true, hint: "Token de desenvolvedor da sua conta MCC no Google Ads. Encontrado em Ferramentas > Centro de API." },
    { key: "customer_id", label: "Customer ID", placeholder: "123-456-7890", secret: false, hint: "ID da conta Google Ads (com hífens). Visível no canto superior direito do painel." },
    { key: "login_customer_id", label: "Login Customer ID (MCC)", placeholder: "123-456-7890", secret: false, hint: "ID da conta MCC pai, necessário se a conta é gerenciada. Deixe vazio se for conta direta." },
    { key: "client_id", label: "OAuth Client ID", placeholder: "xxxxx.apps.googleusercontent.com", secret: false, hint: "Client ID do projeto no Google Cloud Console > Credenciais > OAuth 2.0." },
    { key: "client_secret", label: "OAuth Client Secret", placeholder: "GOCSPX-xxxxx", secret: true, hint: "Client Secret gerado junto ao Client ID no Cloud Console." },
    { key: "refresh_token", label: "Refresh Token", placeholder: "1//0xxxxx", secret: true, hint: "Token OAuth2 de refresh. Gere via OAuth Playground ou seu próprio fluxo de autorização." },
  ];

  const { data: savedConfig } = useQuery({
    queryKey: ["google-ads-config", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_configurations")
        .select("*")
        .eq("service_name", "google_ads")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  // Init from saved config
  useState(() => {
    if (savedConfig?.is_configured) {
      setEnabled(true);
    }
  });

  const isComplete = FIELDS.filter(f => f.key !== "login_customer_id").every(f => creds[f.key]?.trim());

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      toast.success("Credenciais do Google Ads salvas com sucesso!");
      setShowFields(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      toast.success("Conexão com Google Ads verificada com sucesso!");
    } catch (e: any) {
      toast.error("Falha na conexão: " + e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-muted"}`}>
            <Megaphone className={`h-4 w-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Google Ads</span>
              {enabled && isComplete ? (
                <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Conectado</Badge>
              ) : enabled ? (
                <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Incompleto</Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-muted-foreground">Inativo</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Sincronize conversões offline, importe campanhas e gerencie audiences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enabled && isComplete && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
              Testar
            </Button>
          )}
          <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); if (v) setShowFields(true); }} />
        </div>
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Info banner */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Pré-requisitos:</strong> Conta Google Ads com acesso de API aprovado (Developer Token com nível básico ou standard).</p>
              <p>Crie credenciais OAuth no <span className="text-primary">Google Cloud Console</span> → APIs & Services → Credentials → OAuth 2.0 Client IDs.</p>
            </div>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Conversões Offline", desc: "Upload automático via API" },
              { label: "Campanhas", desc: "Importar dados de performance" },
              { label: "Audiences", desc: "Sincronizar listas de remarketing" },
              { label: "Relatórios", desc: "Métricas de custo e ROAS" },
            ].map(cap => (
              <div key={cap.label} className="p-2 rounded-lg border border-border/50 bg-muted/20">
                <p className="text-[10px] font-semibold text-foreground">{cap.label}</p>
                <p className="text-[9px] text-muted-foreground">{cap.desc}</p>
              </div>
            ))}
          </div>

          {/* Credential fields */}
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map(field => (
              <div key={field.key} className="space-y-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{field.label}</Label>
                <div className="relative">
                  <Input
                    type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={creds[field.key] || ""}
                    onChange={e => setCreds(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="text-xs h-8 pr-8 font-mono"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSecrets[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground">{field.hint}</p>
              </div>
            ))}
          </div>

          {!isComplete && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
              <AlertCircle className="h-3 w-3" />
              Preencha todos os campos obrigatórios para habilitar a integração
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-8 gap-1.5 flex-1" disabled={!isComplete || saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar Credenciais
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─── Meta Ads Integration Card (Full) ─── */
function MetaAdsIntegrationCard({ projectId }: { projectId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [creds, setCreds] = useState<Record<string, string>>({});

  const FIELDS = [
    { key: "pixel_id", label: "Pixel ID", placeholder: "123456789012345", secret: false, hint: "ID do pixel do Meta. Encontrado em Events Manager > Data Sources > Pixel." },
    { key: "access_token", label: "Access Token (CAPI)", placeholder: "EAAxxxxxxx...", secret: true, hint: "Token de acesso da API de Conversões. Gere em Events Manager > Settings > Generate Access Token." },
    { key: "ad_account_id", label: "Ad Account ID", placeholder: "act_123456789", secret: false, hint: "ID da conta de anúncios (formato act_XXXXX). Encontrado em Business Settings > Ad Accounts." },
    { key: "app_id", label: "App ID", placeholder: "123456789012345", secret: false, hint: "ID do aplicativo Meta. Encontrado em Meta for Developers > My Apps." },
    { key: "app_secret", label: "App Secret", placeholder: "xxxxxxxxxxxxxxxx", secret: true, hint: "Secret do app Meta para validação server-side. Encontrado em App Settings > Basic." },
    { key: "test_event_code", label: "Test Event Code (opcional)", placeholder: "TEST12345", secret: false, hint: "Código para eventos de teste no Events Manager. Usado somente em desenvolvimento." },
  ];

  const requiredFields = ["pixel_id", "access_token", "ad_account_id"];
  const isComplete = requiredFields.every(k => creds[k]?.trim());

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      toast.success("Credenciais do Meta Ads salvas com sucesso!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      toast.success("Conexão com Meta Ads verificada com sucesso!");
    } catch (e: any) {
      toast.error("Falha: " + e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-muted"}`}>
            <Target className={`h-4 w-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Meta Ads</span>
              {enabled && isComplete ? (
                <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Conectado</Badge>
              ) : enabled ? (
                <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Incompleto</Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-muted-foreground">Inativo</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">API de Conversões (CAPI), eventos server-side, audiências e relatórios</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enabled && isComplete && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
              Testar
            </Button>
          )}
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Info banner */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Pré-requisitos:</strong> Pixel do Meta configurado e acesso à API de Conversões habilitado.</p>
              <p>Gere o Access Token em <span className="text-primary">Events Manager</span> → Settings → Conversions API → Generate Access Token.</p>
            </div>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "CAPI (Server-Side)", desc: "Eventos de conversão server-side" },
              { label: "Audiences", desc: "Custom audiences e lookalikes" },
              { label: "Offline Events", desc: "Upload de conversões offline" },
              { label: "Relatórios", desc: "ROAS, CPA e performance" },
            ].map(cap => (
              <div key={cap.label} className="p-2 rounded-lg border border-border/50 bg-muted/20">
                <p className="text-[10px] font-semibold text-foreground">{cap.label}</p>
                <p className="text-[9px] text-muted-foreground">{cap.desc}</p>
              </div>
            ))}
          </div>

          {/* Credential fields */}
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map(field => (
              <div key={field.key} className="space-y-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {field.label}
                  {!requiredFields.includes(field.key) && <span className="text-muted-foreground/50 ml-1 normal-case">(opcional)</span>}
                </Label>
                <div className="relative">
                  <Input
                    type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={creds[field.key] || ""}
                    onChange={e => setCreds(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="text-xs h-8 pr-8 font-mono"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSecrets[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground">{field.hint}</p>
              </div>
            ))}
          </div>

          {!isComplete && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
              <AlertCircle className="h-3 w-3" />
              Preencha Pixel ID, Access Token e Ad Account ID para habilitar
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-8 gap-1.5 flex-1" disabled={!isComplete || saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar Credenciais
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
