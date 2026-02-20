import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, AlertTriangle, Shield, Zap, Activity, RefreshCw,
  Loader2, Globe, Clock, Wifi, WifiOff, FileCode, Tag, ShoppingCart,
  MonitorSmartphone, Cpu, BarChart3
} from "lucide-react";

type CheckStatus = "pass" | "warn" | "fail" | "checking";

interface HealthCheck {
  id: string;
  name: string;
  description: string;
  status: CheckStatus;
  detail?: string;
  icon: React.ReactNode;
  category: "installation" | "performance" | "conflicts" | "compatibility";
}

const MOCK_CHECKS: HealthCheck[] = [
  { id: "script-loaded", name: "Script Carregado", description: "Verifica se o Pixel Rankito está presente na página", status: "pass", detail: "Detectado v3.2.0", icon: <FileCode className="h-4 w-4" />, category: "installation" },
  { id: "endpoint-reachable", name: "Endpoint Acessível", description: "Testa a conexão com o servidor de coleta", status: "pass", detail: "Latência: 45ms", icon: <Wifi className="h-4 w-4" />, category: "installation" },
  { id: "project-id", name: "Project ID Válido", description: "Verifica se o Project ID configurado é válido", status: "pass", detail: "UUID válido", icon: <Shield className="h-4 w-4" />, category: "installation" },
  { id: "geo-api", name: "API de Geolocalização", description: "Valida o serviço de geolocalização do visitante", status: "pass", detail: "ipapi.co respondendo (230ms)", icon: <Globe className="h-4 w-4" />, category: "installation" },
  { id: "gtm-conflict", name: "Conflito GTM", description: "Detecta se o Google Tag Manager pode duplicar eventos", status: "warn", detail: "GTM detectado — verifique se não há script duplicado no contêiner", icon: <Tag className="h-4 w-4" />, category: "conflicts" },
  { id: "ga4-coexist", name: "Coexistência GA4", description: "Verifica se o GA4 está presente sem conflitos", status: "pass", detail: "GA4 detectado — sem conflitos", icon: <BarChart3 className="h-4 w-4" />, category: "conflicts" },
  { id: "meta-pixel", name: "Meta Pixel", description: "Verifica coexistência com Facebook/Meta Pixel", status: "pass", detail: "Meta Pixel não detectado", icon: <MonitorSmartphone className="h-4 w-4" />, category: "conflicts" },
  { id: "hotjar-clarity", name: "Hotjar / Clarity", description: "Verifica se ferramentas de heatmap podem interferir", status: "pass", detail: "Nenhum conflito detectado", icon: <Activity className="h-4 w-4" />, category: "conflicts" },
  { id: "load-time", name: "Tempo de Carregamento", description: "Impacto do script no tempo de carregamento", status: "pass", detail: "+12ms (excelente)", icon: <Zap className="h-4 w-4" />, category: "performance" },
  { id: "bundle-size", name: "Tamanho do Script", description: "Peso do script injetado na página", status: "pass", detail: "3.2KB gzipped", icon: <Cpu className="h-4 w-4" />, category: "performance" },
  { id: "flush-rate", name: "Taxa de Envio", description: "Frequência e eficiência do envio de eventos", status: "pass", detail: "Batching ativo (max 50 eventos/flush)", icon: <Activity className="h-4 w-4" />, category: "performance" },
  { id: "keepalive", name: "Keepalive Ativo", description: "Verifica se fetch usa keepalive para page_exit", status: "pass", detail: "keepalive: true confirmado", icon: <Clock className="h-4 w-4" />, category: "performance" },
  { id: "https", name: "HTTPS Ativo", description: "Verifica se o site usa HTTPS (obrigatório)", status: "pass", detail: "Conexão segura", icon: <Shield className="h-4 w-4" />, category: "compatibility" },
  { id: "csp-headers", name: "Content Security Policy", description: "Verifica se CSP pode bloquear o script", status: "warn", detail: "CSP detectada — verifique se o domínio do endpoint está na whitelist", icon: <Shield className="h-4 w-4" />, category: "compatibility" },
  { id: "cookie-consent", name: "Consent Banner", description: "Detecta se há banner de consentimento bloqueando", status: "warn", detail: "Cookie banner detectado — configure Consent Mode", icon: <Shield className="h-4 w-4" />, category: "compatibility" },
  { id: "mobile-compat", name: "Mobile Compatibility", description: "Verifica compatibilidade com navegadores mobile", status: "pass", detail: "Compatível com Chrome, Safari, Firefox Mobile", icon: <MonitorSmartphone className="h-4 w-4" />, category: "compatibility" },
];

const STATUS_ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-success" />,
  warn: <AlertTriangle className="h-4 w-4 text-warning" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
  checking: <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />,
};

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  installation: { label: "Instalação", icon: <FileCode className="h-4 w-4 text-primary" /> },
  conflicts: { label: "Conflitos de Scripts", icon: <AlertTriangle className="h-4 w-4 text-warning" /> },
  performance: { label: "Performance", icon: <Zap className="h-4 w-4 text-success" /> },
  compatibility: { label: "Compatibilidade", icon: <Shield className="h-4 w-4 text-info" /> },
};

export function TagHealthMonitor() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    setChecks(MOCK_CHECKS.map(c => ({ ...c, status: "checking" as CheckStatus })));

    // Simulate progressive checks
    for (let i = 0; i < MOCK_CHECKS.length; i++) {
      await new Promise(r => setTimeout(r, 120 + Math.random() * 180));
      setChecks(prev => prev.map((c, idx) => idx === i ? { ...c, status: MOCK_CHECKS[i].status, detail: MOCK_CHECKS[i].detail } : c));
    }

    setScanning(false);
    setLastScan(new Date().toLocaleTimeString("pt-BR"));
  }, []);

  useEffect(() => { runScan(); }, []);

  const score = useMemo(() => {
    if (checks.length === 0) return 0;
    const done = checks.filter(c => c.status !== "checking");
    if (done.length === 0) return 0;
    const points = done.reduce((s, c) => s + (c.status === "pass" ? 10 : c.status === "warn" ? 6 : 0), 0);
    return Math.round((points / (done.length * 10)) * 100);
  }, [checks]);

  const grouped = useMemo(() => {
    const map: Record<string, HealthCheck[]> = {};
    checks.forEach(c => {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    });
    return map;
  }, [checks]);

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <AnimatedContainer>
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-display text-2xl font-black ${
                  score >= 80 ? "bg-success/10 text-success" : score >= 50 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                }`}>
                  {scanning ? <Loader2 className="h-8 w-8 animate-spin" /> : `${score}%`}
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold font-display">Tag Health Score</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Diagnóstico completo do Pixel Rankito — detecta conflitos, mede performance e valida compatibilidade.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="h-3 w-3" /> {passCount} OK
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-warning/10 text-warning border-warning/20">
                    <AlertTriangle className="h-3 w-3" /> {warnCount} Alertas
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-destructive/10 text-destructive border-destructive/20">
                    <XCircle className="h-3 w-3" /> {failCount} Erros
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button size="sm" onClick={runScan} disabled={scanning} className="gap-1.5 text-xs">
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {scanning ? "Escaneando..." : "Re-escanear"}
              </Button>
              {lastScan && (
                <span className="text-[10px] text-muted-foreground">Último: {lastScan}</span>
              )}
            </div>
          </div>
          <Progress value={score} className="mt-4 h-2" />
        </Card>
      </AnimatedContainer>

      {/* Checks by category */}
      {Object.entries(grouped).map(([category, items], catIdx) => (
        <AnimatedContainer key={category} delay={0.04 * (catIdx + 1)}>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              {CATEGORY_LABELS[category]?.icon}
              <h4 className="text-sm font-bold font-display">{CATEGORY_LABELS[category]?.label || category}</h4>
              <Badge variant="secondary" className="text-[9px] ml-auto">
                {items.filter(c => c.status === "pass").length}/{items.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {items.map(check => (
                <div key={check.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  check.status === "pass" ? "bg-success/5 border-success/15" :
                  check.status === "warn" ? "bg-warning/5 border-warning/15" :
                  check.status === "fail" ? "bg-destructive/5 border-destructive/15" :
                  "bg-muted/20 border-border/50"
                }`}>
                  <div className="shrink-0 mt-0.5">{STATUS_ICON[check.status]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{check.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{check.description}</p>
                    {check.detail && check.status !== "checking" && (
                      <p className={`text-[10px] mt-1 font-medium ${
                        check.status === "pass" ? "text-success" : check.status === "warn" ? "text-warning" : "text-destructive"
                      }`}>{check.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      ))}
    </div>
  );
}
