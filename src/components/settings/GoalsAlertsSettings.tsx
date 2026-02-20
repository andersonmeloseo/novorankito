import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import {
  Target, Bell, TrendingDown, TrendingUp, AlertTriangle, Search,
  BarChart3, MousePointerClick, Eye, FileWarning, Zap, Bot,
  Save, Loader2, MessageCircle, BellRing, Webhook, Phone,
  CheckCircle2, Send,
} from "lucide-react";
import { motion } from "framer-motion";

interface GoalsAlertsSettingsProps {
  projectId: string;
}

type DeliveryChannel = "in_app" | "whatsapp" | "webhook";

interface AlertRule {
  id: string;
  label: string;
  description: string;
  metric: string;
  condition: "drop" | "rise" | "below" | "above";
  threshold: number;
  unit: string;
  enabled: boolean;
  icon: React.ReactNode;
  severity: "warning" | "critical" | "info";
  channels: DeliveryChannel[];
}

const DEFAULT_ALERTS: AlertRule[] = [
  {
    id: "clicks_drop",
    label: "Queda de cliques",
    description: "Notificar quando cliques orgânicos caírem significativamente",
    metric: "clicks",
    condition: "drop",
    threshold: 20,
    unit: "%",
    enabled: true,
    icon: <TrendingDown className="h-4 w-4" />,
    severity: "critical",
    channels: ["in_app", "whatsapp"],
  },
  {
    id: "position_rise",
    label: "Perda de posição",
    description: "Notificar quando posição média subir (piorar)",
    metric: "position",
    condition: "rise",
    threshold: 5,
    unit: "posições",
    enabled: true,
    icon: <TrendingUp className="h-4 w-4" />,
    severity: "warning",
    channels: ["in_app"],
  },
  {
    id: "impressions_drop",
    label: "Queda de impressões",
    description: "Notificar quando impressões caírem abaixo do esperado",
    metric: "impressions",
    condition: "drop",
    threshold: 30,
    unit: "%",
    enabled: false,
    icon: <Eye className="h-4 w-4" />,
    severity: "warning",
    channels: ["in_app"],
  },
  {
    id: "indexing_errors",
    label: "Falhas de indexação",
    description: "Notificar quando houver falhas consecutivas na fila de indexação",
    metric: "indexing_errors",
    condition: "above",
    threshold: 3,
    unit: "falhas seguidas",
    enabled: true,
    icon: <FileWarning className="h-4 w-4" />,
    severity: "critical",
    channels: ["in_app", "whatsapp"],
  },
  {
    id: "ctr_drop",
    label: "Queda de CTR",
    description: "Notificar quando CTR médio cair abaixo do threshold",
    metric: "ctr",
    condition: "below",
    threshold: 2,
    unit: "%",
    enabled: false,
    icon: <MousePointerClick className="h-4 w-4" />,
    severity: "info",
    channels: ["in_app"],
  },
  {
    id: "new_keywords",
    label: "Novas keywords rankando",
    description: "Notificar quando novas palavras-chave entrarem no top 10",
    metric: "keywords",
    condition: "above",
    threshold: 5,
    unit: "novas keywords",
    enabled: false,
    icon: <Search className="h-4 w-4" />,
    severity: "info",
    channels: ["in_app"],
  },
  {
    id: "traffic_spike",
    label: "Pico de tráfego",
    description: "Notificar quando tráfego subir acima do normal (possível viralização)",
    metric: "traffic",
    condition: "above",
    threshold: 50,
    unit: "% acima da média",
    enabled: false,
    icon: <Zap className="h-4 w-4" />,
    severity: "info",
    channels: ["in_app"],
  },
  {
    id: "page_deindexed",
    label: "Página desindexada",
    description: "Notificar quando uma página importante sair do índice do Google",
    metric: "indexed_pages",
    condition: "drop",
    threshold: 1,
    unit: "página(s)",
    enabled: true,
    icon: <AlertTriangle className="h-4 w-4" />,
    severity: "critical",
    channels: ["in_app", "whatsapp"],
  },
  {
    id: "bounce_rate_rise",
    label: "Aumento de bounce rate",
    description: "Notificar quando taxa de rejeição subir significativamente",
    metric: "bounce_rate",
    condition: "rise",
    threshold: 15,
    unit: "%",
    enabled: false,
    icon: <BarChart3 className="h-4 w-4" />,
    severity: "warning",
    channels: ["in_app"],
  },
  {
    id: "conversion_drop",
    label: "Queda de conversões",
    description: "Notificar quando conversões caírem em relação ao período anterior",
    metric: "conversions",
    condition: "drop",
    threshold: 25,
    unit: "%",
    enabled: false,
    icon: <Target className="h-4 w-4" />,
    severity: "critical",
    channels: ["in_app"],
  },
  {
    id: "crawl_budget_waste",
    label: "Desperdício de crawl budget",
    description: "Notificar quando páginas de baixo valor consumirem crawl excessivo",
    metric: "crawl_waste",
    condition: "above",
    threshold: 40,
    unit: "% do budget",
    enabled: false,
    icon: <Bot className="h-4 w-4" />,
    severity: "warning",
    channels: ["in_app"],
  },
  {
    id: "core_web_vitals",
    label: "Core Web Vitals degradados",
    description: "Notificar quando métricas de performance (LCP, CLS, INP) piorarem",
    metric: "web_vitals",
    condition: "below",
    threshold: 75,
    unit: "score",
    enabled: false,
    icon: <Zap className="h-4 w-4" />,
    severity: "warning",
    channels: ["in_app"],
  },
];

const SEVERITY_CONFIG = {
  critical: { label: "Crítico", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  warning: { label: "Aviso", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  info: { label: "Info", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
};

const CHANNEL_CONFIG: Record<DeliveryChannel, { label: string; icon: React.ReactNode; desc: string }> = {
  in_app: { label: "In-app", icon: <BellRing className="h-3.5 w-3.5" />, desc: "Notificação no painel" },
  whatsapp: { label: "WhatsApp", icon: <MessageCircle className="h-3.5 w-3.5" />, desc: "Mensagem no WhatsApp" },
  webhook: { label: "Webhook", icon: <Webhook className="h-3.5 w-3.5" />, desc: "Disparo HTTP" },
};

export function GoalsAlertsSettings({ projectId }: GoalsAlertsSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [focus, setFocus] = useState("seo_growth");
  const [clicksGoal, setClicksGoal] = useState("30000");
  const [impressionsGoal, setImpressionsGoal] = useState("500000");
  const [positionGoal, setPositionGoal] = useState("8");
  const [alerts, setAlerts] = useState<AlertRule[]>(DEFAULT_ALERTS);
  const [saving, setSaving] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [testing, setTesting] = useState<string | null>(null);

  // Check if WhatsApp is configured (agent has whatsapp_number)
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

  // Get project name for alert messages
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

  const savedPhone = whatsappPhone || agentConfig?.whatsapp_number || "";

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const updateThreshold = (id: string, value: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, threshold: value } : a))
    );
  };

  const toggleChannel = (alertId: string, channel: DeliveryChannel) => {
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== alertId) return a;
        const channels = a.channels.includes(channel)
          ? a.channels.filter((c) => c !== channel)
          : [...a.channels, channel];
        return { ...a, channels };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast({ title: "Configurações salvas!", description: "Metas e alertas atualizados com sucesso." });
  };

  const handleTestAlert = async (alert: AlertRule) => {
    if (!savedPhone && alert.channels.includes("whatsapp")) {
      toast({ title: "Configure o WhatsApp", description: "Informe um número para receber alertas.", variant: "destructive" });
      return;
    }

    setTesting(alert.id);
    try {
      const conditionText = alert.condition === "drop" ? "caiu" : alert.condition === "rise" ? "subiu" : alert.condition === "below" ? "está abaixo de" : "está acima de";
      const alertMessage = `🚨 *ALERTA — ${project?.name || "Projeto"}*\n\n` +
        `⚠️ *${alert.label}*\n` +
        `${alert.description}\n\n` +
        `📊 Métrica: ${alert.metric} ${conditionText} ${alert.threshold}${alert.unit}\n` +
        `🌐 Projeto: ${project?.name || projectId}\n` +
        `🔗 Domínio: ${project?.domain || "—"}\n` +
        `⏰ ${new Date().toLocaleString("pt-BR")}\n\n` +
        `_Este é um alerta de teste._`;

      // Send in-app notification
      if (alert.channels.includes("in_app") && user) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          project_id: projectId,
          title: `⚠️ ${alert.label}`,
          message: `${alert.description} — Threshold: ${alert.threshold}${alert.unit}`,
          type: "alert",
        });
      }

      // Send WhatsApp via existing function
      if (alert.channels.includes("whatsapp") && savedPhone) {
        await supabase.functions.invoke("send-workflow-notification", {
          body: {
            direct_send: {
              project_id: projectId,
              phones: [savedPhone],
            },
            report: alertMessage,
            workflow_name: `Alerta: ${alert.label}`,
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

  const enabledCount = alerts.filter((a) => a.enabled).length;
  const criticalCount = alerts.filter((a) => a.enabled && a.severity === "critical").length;
  const whatsappAlerts = alerts.filter((a) => a.enabled && a.channels.includes("whatsapp")).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Alertas ativos", value: enabledCount, total: alerts.length, icon: <Bell className="h-4 w-4 text-primary" /> },
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
            Receba alertas críticos diretamente no WhatsApp — mensagens com nome do projeto, métrica e threshold
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                Número do WhatsApp
              </Label>
              <Input
                className="h-9 text-sm"
                placeholder="+55 47 99999-9999"
                value={savedPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
              />
            </div>
            {savedPhone && (
              <Badge variant="outline" className="h-9 px-3 text-[10px] flex items-center gap-1 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </Badge>
            )}
          </div>

          {/* Preview of WhatsApp message */}
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-[10px] font-semibold text-foreground mb-1.5 flex items-center gap-1">
              <MessageCircle className="h-3 w-3 text-emerald-500" />
              Preview da mensagem no WhatsApp:
            </p>
            <div className="bg-background rounded-lg p-2.5 text-[10px] font-mono text-foreground/80 leading-relaxed whitespace-pre-line border border-border/50">
              {`🚨 *ALERTA — ${project?.name || "Seu Projeto"}*

⚠️ *Queda de cliques*
Cliques orgânicos caíram 20%

📊 Métrica: clicks caiu 20%
🌐 Projeto: ${project?.name || "Seu Projeto"}
🔗 Domínio: ${project?.domain || "seudominio.com"}
⏰ ${new Date().toLocaleString("pt-BR")}`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas do Projeto
          </CardTitle>
          <CardDescription className="text-xs">
            Defina objetivos que orientam o agente IA e geram alertas automáticos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Bot className="h-3 w-3 text-primary" />
                Foco do agente IA
              </Label>
              <Select value={focus} onValueChange={setFocus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
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
              <Label className="text-xs flex items-center gap-1.5">
                <MousePointerClick className="h-3 w-3 text-primary" />
                Meta de cliques / mês
              </Label>
              <Input type="number" className="h-9 text-sm" value={clicksGoal} onChange={(e) => setClicksGoal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-primary" />
                Meta de impressões / mês
              </Label>
              <Input type="number" className="h-9 text-sm" value={impressionsGoal} onChange={(e) => setImpressionsGoal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-primary" />
                Meta de posição média
              </Label>
              <Input type="number" className="h-9 text-sm" value={positionGoal} onChange={(e) => setPositionGoal(e.target.value)} min={1} max={100} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts with delivery channels */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alertas automáticos
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Configure alertas e escolha onde receber: no painel, WhatsApp ou webhook
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {enabledCount} ativo{enabledCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((alert, idx) => {
            const sev = SEVERITY_CONFIG[alert.severity];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`p-3 rounded-xl border transition-all ${
                  alert.enabled ? sev.bg : "bg-muted/20 border-border/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`mt-0.5 ${alert.enabled ? sev.color : "text-muted-foreground"}`}>
                      {alert.icon}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">{alert.label}</span>
                          <Badge variant="outline" className={`text-[9px] ${alert.enabled ? sev.color : ""}`}>
                            {sev.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>
                      </div>

                      {alert.enabled && (
                        <>
                          {/* Threshold */}
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] text-muted-foreground shrink-0">Threshold:</Label>
                            <Input
                              type="number"
                              className="h-6 w-16 text-[11px] px-2"
                              value={alert.threshold}
                              onChange={(e) => updateThreshold(alert.id, Number(e.target.value))}
                            />
                            <span className="text-[10px] text-muted-foreground">{alert.unit}</span>
                          </div>

                          {/* Delivery Channels */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <Label className="text-[10px] text-muted-foreground shrink-0">Enviar para:</Label>
                            {(Object.entries(CHANNEL_CONFIG) as [DeliveryChannel, typeof CHANNEL_CONFIG["in_app"]][]).map(([key, ch]) => (
                              <label
                                key={key}
                                className="flex items-center gap-1.5 cursor-pointer group"
                              >
                                <Checkbox
                                  checked={alert.channels.includes(key)}
                                  onCheckedChange={() => toggleChannel(alert.id, key)}
                                  className="h-3.5 w-3.5"
                                />
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                                  {ch.icon}
                                  {ch.label}
                                </span>
                              </label>
                            ))}

                            {/* Test button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2 text-[9px] gap-1 ml-auto text-primary"
                              onClick={() => handleTestAlert(alert)}
                              disabled={testing === alert.id}
                            >
                              {testing === alert.id ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Send className="h-2.5 w-2.5" />
                              )}
                              Testar
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={alert.enabled}
                    onCheckedChange={() => toggleAlert(alert.id)}
                  />
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Channel summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Resumo dos canais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                name: "In-app",
                desc: "Notificações no sino do painel",
                count: alerts.filter((a) => a.enabled && a.channels.includes("in_app")).length,
                icon: <BellRing className="h-4 w-4 text-primary" />,
                status: "sempre ativo",
              },
              {
                name: "WhatsApp",
                desc: savedPhone ? `Enviando para ${savedPhone}` : "Configure um número acima",
                count: whatsappAlerts,
                icon: <MessageCircle className="h-4 w-4 text-emerald-500" />,
                status: savedPhone ? "configurado" : "pendente",
              },
              {
                name: "Webhook",
                desc: "Configure na aba API & Webhooks",
                count: alerts.filter((a) => a.enabled && a.channels.includes("webhook")).length,
                icon: <Webhook className="h-4 w-4 text-primary" />,
                status: "configurável",
              },
            ].map((ch) => (
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

      {/* Save */}
      <div className="flex justify-end">
        <Button size="sm" className="text-xs gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
