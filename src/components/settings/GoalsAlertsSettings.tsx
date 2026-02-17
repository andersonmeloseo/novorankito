import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Bell, TrendingDown, TrendingUp, AlertTriangle, Search,
  BarChart3, MousePointerClick, Eye, FileWarning, Zap, Bot,
  Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GoalsAlertsSettingsProps {
  projectId: string;
}

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
  },
];

const SEVERITY_CONFIG = {
  critical: { label: "Crítico", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  warning: { label: "Aviso", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  info: { label: "Info", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
};

export function GoalsAlertsSettings({ projectId }: GoalsAlertsSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [focus, setFocus] = useState("seo_growth");
  const [clicksGoal, setClicksGoal] = useState("30000");
  const [impressionsGoal, setImpressionsGoal] = useState("500000");
  const [positionGoal, setPositionGoal] = useState("8");
  const [alerts, setAlerts] = useState<AlertRule[]>(DEFAULT_ALERTS);
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    // Simulate save - in production this would persist to DB
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast({ title: "Configurações salvas!", description: "Metas e alertas atualizados com sucesso." });
  };

  const enabledCount = alerts.filter((a) => a.enabled).length;
  const criticalCount = alerts.filter((a) => a.enabled && a.severity === "critical").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Alertas ativos", value: enabledCount, total: alerts.length, icon: <Bell className="h-4 w-4 text-primary" /> },
          { label: "Críticos", value: criticalCount, icon: <AlertTriangle className="h-4 w-4 text-destructive" /> },
          { label: "Meta cliques/mês", value: Number(clicksGoal).toLocaleString("pt-BR"), icon: <MousePointerClick className="h-4 w-4 text-primary" /> },
          { label: "Meta posição", value: `Top ${positionGoal}`, icon: <Target className="h-4 w-4 text-primary" /> },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              {s.icon}
              <div>
                <p className="text-lg font-bold text-foreground leading-none">
                  {s.value}
                  {"total" in s && <span className="text-xs font-normal text-muted-foreground">/{s.total}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

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
              <Input
                type="number"
                className="h-9 text-sm"
                value={clicksGoal}
                onChange={(e) => setClicksGoal(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-primary" />
                Meta de impressões / mês
              </Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={impressionsGoal}
                onChange={(e) => setImpressionsGoal(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-primary" />
                Meta de posição média
              </Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={positionGoal}
                onChange={(e) => setPositionGoal(e.target.value)}
                min={1}
                max={100}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alertas automáticos
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Configure notificações para variações importantes nas métricas
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
                  alert.enabled
                    ? sev.bg
                    : "bg-muted/20 border-border/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`mt-0.5 ${alert.enabled ? sev.color : "text-muted-foreground"}`}>
                      {alert.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">{alert.label}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${alert.enabled ? sev.color : ""}`}
                        >
                          {sev.label}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>

                      {alert.enabled && (
                        <div className="flex items-center gap-2 mt-2">
                          <Label className="text-[10px] text-muted-foreground shrink-0">Threshold:</Label>
                          <Input
                            type="number"
                            className="h-6 w-16 text-[11px] px-2"
                            value={alert.threshold}
                            onChange={(e) => updateThreshold(alert.id, Number(e.target.value))}
                          />
                          <span className="text-[10px] text-muted-foreground">{alert.unit}</span>
                        </div>
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

      {/* Notification channels info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Canais de notificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { name: "In-app", desc: "Notificações dentro do painel", status: "ativo", icon: "🔔" },
              { name: "Webhook", desc: "Configure na aba API & Webhooks", status: "configurável", icon: "🔗" },
              { name: "Agente IA", desc: "Insights proativos baseados nos alertas", status: "ativo", icon: "🤖" },
            ].map((ch) => (
              <div key={ch.name} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/20">
                <span className="text-sm">{ch.icon}</span>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">{ch.name}</p>
                  <p className="text-[9px] text-muted-foreground">{ch.desc}</p>
                  <Badge variant="outline" className="text-[8px] mt-1">{ch.status}</Badge>
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
