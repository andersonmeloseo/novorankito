import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Bell, TrendingDown, TrendingUp, AlertTriangle, Search,
  BarChart3, MousePointerClick, Eye, FileWarning, Zap, Bot,
  Save, Loader2, MessageCircle, BellRing, Webhook, Phone,
  CheckCircle2, Send, Plus, Pencil, Trash2,
} from "lucide-react";
import { motion } from "framer-motion";

interface GoalsAlertsSettingsProps {
  projectId: string;
}

type DeliveryChannel = "in_app" | "whatsapp" | "webhook";

interface CustomAlert {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: string;
  threshold: number;
  unit: string;
  severity: string;
  enabled: boolean;
  channels: DeliveryChannel[];
  project_id: string;
  owner_id: string;
}

const METRIC_OPTIONS = [
  { value: "clicks", label: "Cliques", icon: MousePointerClick },
  { value: "impressions", label: "Impressões", icon: Eye },
  { value: "position", label: "Posição média", icon: TrendingUp },
  { value: "ctr", label: "CTR", icon: BarChart3 },
  { value: "indexing_errors", label: "Falhas de indexação", icon: FileWarning },
  { value: "keywords", label: "Keywords", icon: Search },
  { value: "traffic", label: "Tráfego", icon: Zap },
  { value: "conversions", label: "Conversões", icon: Target },
  { value: "bounce_rate", label: "Bounce rate", icon: BarChart3 },
  { value: "indexed_pages", label: "Páginas indexadas", icon: AlertTriangle },
];

const CONDITION_OPTIONS = [
  { value: "drop", label: "Cair mais que" },
  { value: "rise", label: "Subir mais que" },
  { value: "below", label: "Ficar abaixo de" },
  { value: "above", label: "Ficar acima de" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Crítico", color: "text-destructive" },
  { value: "warning", label: "Aviso", color: "text-amber-500" },
  { value: "info", label: "Info", color: "text-primary" },
];

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Crítico", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  warning: { label: "Aviso", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  info: { label: "Info", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
};

const CHANNEL_CONFIG: Record<DeliveryChannel, { label: string; icon: React.ReactNode; desc: string }> = {
  in_app: { label: "In-app", icon: <BellRing className="h-3.5 w-3.5" />, desc: "Notificação no painel" },
  whatsapp: { label: "WhatsApp", icon: <MessageCircle className="h-3.5 w-3.5" />, desc: "Mensagem no WhatsApp" },
  webhook: { label: "Webhook", icon: <Webhook className="h-3.5 w-3.5" />, desc: "Disparo HTTP" },
};

const EMPTY_ALERT = {
  name: "", description: "", metric: "clicks", condition: "drop",
  threshold: 20, unit: "%", severity: "warning", channels: ["in_app"] as DeliveryChannel[],
};

export function GoalsAlertsSettings({ projectId }: GoalsAlertsSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Goals state
  const [focus, setFocus] = useState("seo_growth");
  const [clicksGoal, setClicksGoal] = useState("30000");
  const [impressionsGoal, setImpressionsGoal] = useState("500000");
  const [positionGoal, setPositionGoal] = useState("8");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);

  // Alert dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<CustomAlert | null>(null);
  const [form, setForm] = useState(EMPTY_ALERT);
  const [testing, setTesting] = useState<string | null>(null);

  // Load goals from DB
  const { data: savedGoals } = useQuery({
    queryKey: ["project-goals-alerts", projectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("project_goals_alerts")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  // Load custom alerts from DB
  const { data: customAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["custom-alerts", projectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("custom_alerts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      return (data || []) as CustomAlert[];
    },
    enabled: !!projectId,
  });

  // Hydrate goals from DB
  useEffect(() => {
    if (!savedGoals) return;
    setFocus(savedGoals.focus || "seo_growth");
    setClicksGoal(String(savedGoals.clicks_goal || 30000));
    setImpressionsGoal(String(savedGoals.impressions_goal || 500000));
    setPositionGoal(String(savedGoals.position_goal || 8));
    setWhatsappPhone(savedGoals.whatsapp_phone || "");
  }, [savedGoals]);

  const { data: agentConfig } = useQuery({
    queryKey: ["agent-whatsapp-config", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_agents")
        .select("whatsapp_number")
        .eq("project_id", projectId)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: ["project-name-alerts", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("name, domain")
        .eq("id", projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  const effectivePhone = whatsappPhone || agentConfig?.whatsapp_number || "";

  // Save goals
  const handleSaveGoals = async () => {
    if (!user || !projectId) return;
    setSavingGoals(true);
    try {
      const { error } = await (supabase as any)
        .from("project_goals_alerts")
        .upsert({
          project_id: projectId, owner_id: user.id, focus,
          clicks_goal: parseInt(clicksGoal) || 30000,
          impressions_goal: parseInt(impressionsGoal) || 500000,
          position_goal: parseInt(positionGoal) || 8,
          whatsapp_phone: effectivePhone,
          alerts: [],
        }, { onConflict: "project_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["project-goals-alerts", projectId] });
      toast({ title: "Metas salvas!", description: "Configurações de metas e WhatsApp atualizadas." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingGoals(false);
    }
  };

  // CRUD mutations for alerts
  const saveMutation = useMutation({
    mutationFn: async (alert: typeof EMPTY_ALERT & { id?: string }) => {
      if (!user) throw new Error("Não autenticado");
      if (!alert.name.trim()) throw new Error("Nome do alerta é obrigatório");
      
      if (alert.id) {
        // Update
        const { error } = await (supabase as any)
          .from("custom_alerts")
          .update({
            name: alert.name, description: alert.description, metric: alert.metric,
            condition: alert.condition, threshold: alert.threshold, unit: alert.unit,
            severity: alert.severity, channels: alert.channels,
          })
          .eq("id", alert.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await (supabase as any)
          .from("custom_alerts")
          .insert({
            project_id: projectId, owner_id: user.id,
            name: alert.name, description: alert.description, metric: alert.metric,
            condition: alert.condition, threshold: alert.threshold, unit: alert.unit,
            severity: alert.severity, channels: alert.channels, enabled: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-alerts", projectId] });
      setDialogOpen(false);
      setEditingAlert(null);
      setForm(EMPTY_ALERT);
      toast({ title: editingAlert ? "Alerta atualizado!" : "Alerta criado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase as any)
        .from("custom_alerts")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-alerts", projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("custom_alerts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-alerts", projectId] });
      toast({ title: "Alerta excluído" });
    },
  });

  const openCreate = () => {
    setEditingAlert(null);
    setForm(EMPTY_ALERT);
    setDialogOpen(true);
  };

  const openEdit = (alert: CustomAlert) => {
    setEditingAlert(alert);
    setForm({
      name: alert.name, description: alert.description || "", metric: alert.metric,
      condition: alert.condition, threshold: alert.threshold, unit: alert.unit,
      severity: alert.severity, channels: (alert.channels || ["in_app"]) as DeliveryChannel[],
    });
    setDialogOpen(true);
  };

  const handleTestAlert = async (alert: CustomAlert) => {
    if (!effectivePhone && alert.channels.includes("whatsapp")) {
      toast({ title: "Configure o WhatsApp", description: "Informe um número para receber alertas.", variant: "destructive" });
      return;
    }
    setTesting(alert.id);
    try {
      const conditionText = alert.condition === "drop" ? "caiu" : alert.condition === "rise" ? "subiu" : alert.condition === "below" ? "está abaixo de" : "está acima de";
      const alertMessage = `🚨 *ALERTA — ${project?.name || "Projeto"}*\n\n⚠️ *${alert.name}*\n${alert.description}\n\n📊 Métrica: ${alert.metric} ${conditionText} ${alert.threshold}${alert.unit}\n🌐 Projeto: ${project?.name || projectId}\n🔗 Domínio: ${project?.domain || "—"}\n⏰ ${new Date().toLocaleString("pt-BR")}\n\n_Este é um alerta de teste._`;

      if (alert.channels.includes("in_app") && user) {
        await supabase.from("notifications").insert({
          user_id: user.id, project_id: projectId,
          title: `⚠️ ${alert.name}`,
          message: `${alert.description} — Threshold: ${alert.threshold}${alert.unit}`,
          type: "alert",
        });
      }
      if (alert.channels.includes("whatsapp") && effectivePhone) {
        await supabase.functions.invoke("send-workflow-notification", {
          body: {
            direct_send: { project_id: projectId, phones: [effectivePhone] },
            report: alertMessage, workflow_name: `Alerta: ${alert.name}`,
          },
        });
      }
      toast({ title: "Alerta de teste enviado!", description: `Enviado para: ${alert.channels.join(", ")}` });
    } catch (err: any) {
      toast({ title: "Erro no teste", description: err.message, variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const toggleFormChannel = (ch: DeliveryChannel) => {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(ch) ? prev.channels.filter(c => c !== ch) : [...prev.channels, ch],
    }));
  };

  const enabledCount = customAlerts.filter(a => a.enabled).length;
  const criticalCount = customAlerts.filter(a => a.enabled && a.severity === "critical").length;
  const whatsappAlerts = customAlerts.filter(a => a.enabled && a.channels?.includes("whatsapp")).length;

  const getMetricIcon = (metric: string) => {
    const m = METRIC_OPTIONS.find(o => o.value === metric);
    if (!m) return <Bell className="h-4 w-4" />;
    const Icon = m.icon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Alertas ativos", value: enabledCount, total: customAlerts.length, icon: <Bell className="h-4 w-4 text-primary" /> },
          { label: "Críticos", value: criticalCount, icon: <AlertTriangle className="h-4 w-4 text-destructive" /> },
          { label: "Via WhatsApp", value: whatsappAlerts, icon: <MessageCircle className="h-4 w-4 text-emerald-500" /> },
          { label: "Meta posição", value: `Top ${positionGoal}`, icon: <Target className="h-4 w-4 text-primary" /> },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              {s.icon}
              <div>
                <p className="text-lg font-bold text-foreground leading-none">
                  {s.value}
                  {"total" in s && s.total !== undefined && <span className="text-xs font-normal text-muted-foreground">/{s.total}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* WhatsApp Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            WhatsApp para Alertas
          </CardTitle>
          <CardDescription className="text-xs">
            Receba alertas críticos diretamente no WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Número do WhatsApp
              </Label>
              <Input className="h-9 text-sm" placeholder="+55 47 99999-9999" value={effectivePhone} onChange={(e) => setWhatsappPhone(e.target.value)} />
            </div>
            {effectivePhone && (
              <Badge variant="outline" className="h-9 px-3 text-[10px] flex items-center gap-1 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" /> Configurado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" /> Metas do Projeto
          </CardTitle>
          <CardDescription className="text-xs">
            Defina objetivos que orientam o agente IA e geram alertas automáticos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Bot className="h-3 w-3 text-primary" /> Foco do agente IA</Label>
              <Select value={focus} onValueChange={setFocus}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seo_growth">SEO Growth</SelectItem>
                  <SelectItem value="lead_gen">Geração de Leads</SelectItem>
                  <SelectItem value="ecommerce">E-commerce / Receita</SelectItem>
                  <SelectItem value="brand">Branding / Awareness</SelectItem>
                  <SelectItem value="local">SEO Local</SelectItem>
                  <SelectItem value="rank_rent">Rank & Rent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><MousePointerClick className="h-3 w-3 text-primary" /> Meta de cliques / mês</Label>
              <Input type="number" className="h-9 text-sm" value={clicksGoal} onChange={(e) => setClicksGoal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Eye className="h-3 w-3 text-primary" /> Meta de impressões / mês</Label>
              <Input type="number" className="h-9 text-sm" value={impressionsGoal} onChange={(e) => setImpressionsGoal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><BarChart3 className="h-3 w-3 text-primary" /> Meta de posição média</Label>
              <Input type="number" className="h-9 text-sm" value={positionGoal} onChange={(e) => setPositionGoal(e.target.value)} min={1} max={100} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="text-xs gap-1.5" onClick={handleSaveGoals} disabled={savingGoals}>
              {savingGoals ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar metas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts CRUD */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" /> Alertas
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Crie, edite e gerencie seus alertas personalizados
              </CardDescription>
            </div>
            <Button size="sm" className="text-xs gap-1.5" onClick={openCreate}>
              <Plus className="h-3 w-3" /> Novo Alerta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {alertsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : customAlerts.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhum alerta criado ainda</p>
              <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={openCreate}>
                <Plus className="h-3 w-3" /> Criar primeiro alerta
              </Button>
            </div>
          ) : (
            customAlerts.map((alert, idx) => {
              const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`p-3 rounded-xl border transition-all ${alert.enabled ? sev.bg : "bg-muted/20 border-border/50 opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={`mt-0.5 ${alert.enabled ? sev.color : "text-muted-foreground"}`}>
                        {getMetricIcon(alert.metric)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">{alert.name}</span>
                            <Badge variant="outline" className={`text-[9px] ${alert.enabled ? sev.color : ""}`}>{sev.label}</Badge>
                            <span className="text-[9px] text-muted-foreground">
                              {CONDITION_OPTIONS.find(c => c.value === alert.condition)?.label} {alert.threshold}{alert.unit}
                            </span>
                          </div>
                          {alert.description && <p className="text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>}
                        </div>

                        {alert.enabled && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {(alert.channels || []).map(ch => {
                              const cfg = CHANNEL_CONFIG[ch as DeliveryChannel];
                              return cfg ? (
                                <Badge key={ch} variant="secondary" className="text-[8px] gap-1 h-5">
                                  {cfg.icon} {cfg.label}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary" onClick={() => handleTestAlert(alert)} disabled={testing === alert.id}>
                        {testing === alert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(alert)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteMutation.mutate(alert.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: alert.id, enabled: checked })}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Channel summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Resumo dos canais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { name: "In-app", desc: "Notificações no sino do painel", count: customAlerts.filter(a => a.enabled && a.channels?.includes("in_app")).length, icon: <BellRing className="h-4 w-4 text-primary" />, status: "sempre ativo" },
              { name: "WhatsApp", desc: effectivePhone ? `Enviando para ${effectivePhone}` : "Configure um número acima", count: whatsappAlerts, icon: <MessageCircle className="h-4 w-4 text-emerald-500" />, status: effectivePhone ? "configurado" : "pendente" },
              { name: "Webhook", desc: "Configure na aba API & Webhooks", count: customAlerts.filter(a => a.enabled && a.channels?.includes("webhook")).length, icon: <Webhook className="h-4 w-4 text-primary" />, status: "configurável" },
            ].map(ch => (
              <div key={ch.name} className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-1.5">
                <div className="flex items-center gap-2">
                  {ch.icon}
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{ch.name}</p>
                    <p className="text-[9px] text-muted-foreground">{ch.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[8px]">{ch.status}</Badge>
                  <span className="text-[10px] text-muted-foreground">{ch.count} alerta{ch.count !== 1 ? "s" : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              {editingAlert ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingAlert ? "Editar Alerta" : "Novo Alerta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do alerta *</Label>
              <Input className="h-9 text-sm" placeholder="Ex: Queda de cliques orgânicos" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input className="h-9 text-sm" placeholder="Descrição opcional" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Métrica</Label>
                <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METRIC_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Condição</Label>
                <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Limite</Label>
                <Input type="number" className="h-9 text-sm" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unidade</Label>
                <Input className="h-9 text-sm" placeholder="%" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Severidade</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Canais de entrega</Label>
              <div className="flex items-center gap-4">
                {(Object.entries(CHANNEL_CONFIG) as [DeliveryChannel, typeof CHANNEL_CONFIG["in_app"]][]).map(([key, ch]) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={form.channels.includes(key)} onCheckedChange={() => toggleFormChannel(key)} className="h-3.5 w-3.5" />
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">{ch.icon} {ch.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {form.channels.includes("whatsapp") && (
              <div className="space-y-1.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-emerald-500" /> Número do WhatsApp para este alerta
                </Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="+55 47 99999-9999"
                  value={effectivePhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                />
                {effectivePhone && (
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Alertas serão enviados para {effectivePhone}
                  </p>
                )}
                {!effectivePhone && (
                  <p className="text-[10px] text-destructive">Informe um número para receber alertas via WhatsApp</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm" className="text-xs">Cancelar</Button></DialogClose>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => saveMutation.mutate({ ...form, id: editingAlert?.id })} disabled={saveMutation.isPending || !form.name.trim()}>
              {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {editingAlert ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
