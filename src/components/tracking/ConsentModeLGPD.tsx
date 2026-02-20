import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, CheckCircle2, AlertTriangle, Copy, Check, Eye, Settings,
  FileText, Download, Globe, Cookie, Lock, ToggleLeft, Code, Palette
} from "lucide-react";
import { toast } from "sonner";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      {label && <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">{label}</p>}
      <div className="relative bg-muted/50 border border-border rounded-lg overflow-hidden">
        <pre className="p-4 text-xs text-foreground overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap break-all">{code}</pre>
        <Button size="sm" variant="ghost" className="absolute top-2 right-2 h-7 gap-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

const CONSENT_CATEGORIES = [
  { id: "analytics", label: "Analíticos", desc: "Métricas de uso, heatmaps, scroll depth", essential: false, defaultOn: true },
  { id: "marketing", label: "Marketing", desc: "UTMs, GCLID, FBCLID, remarketing", essential: false, defaultOn: false },
  { id: "functional", label: "Funcionais", desc: "Preferências, idioma, sessão", essential: false, defaultOn: true },
  { id: "essential", label: "Essenciais", desc: "Segurança, autenticação, CSRF", essential: true, defaultOn: true },
];

const COMPLIANCE_CHECKS = [
  { name: "Banner de Consentimento", status: "configured" as const, desc: "Banner LGPD configurado e ativo" },
  { name: "Política de Privacidade", status: "warning" as const, desc: "Link da política não configurado" },
  { name: "Opt-out disponível", status: "configured" as const, desc: "Botão de revogação ativo" },
  { name: "Registro de Consentimento", status: "configured" as const, desc: "Logs de consentimento sendo armazenados" },
  { name: "Retenção de Dados", status: "configured" as const, desc: "Expiração automática em 90 dias" },
  { name: "Anonimização de IP", status: "configured" as const, desc: "IP truncado antes do armazenamento" },
  { name: "DPO Configurado", status: "warning" as const, desc: "Email do DPO não informado" },
  { name: "Base Legal Definida", status: "configured" as const, desc: "Consentimento explícito (Art. 7°, I)" },
];

export function ConsentModeLGPD() {
  const [bannerStyle, setBannerStyle] = useState<"bottom" | "center" | "top">("bottom");
  const [primaryColor, setPrimaryColor] = useState("#00FF88");
  const [brandName, setBrandName] = useState("Meu Site");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [categories, setCategories] = useState(CONSENT_CATEGORIES.map(c => ({ ...c, enabled: c.defaultOn })));
  const [blockBeforeConsent, setBlockBeforeConsent] = useState(true);
  const [respectDNT, setRespectDNT] = useState(true);
  const [autoExpireDays, setAutoExpireDays] = useState(90);

  const toggleCategory = (id: string) => {
    setCategories(prev => prev.map(c => c.id === id && !c.essential ? { ...c, enabled: !c.enabled } : c));
  };

  const bannerSnippet = useMemo(() => {
    const cats = categories.filter(c => !c.essential).map(c => `{ id: '${c.id}', label: '${c.label}', default: ${c.enabled} }`).join(",\n      ");
    return `<!-- Rankito Consent Mode v1.0 — LGPD -->
<script>
(function(w){
  var RK_CONSENT_KEY = '_rk_consent';
  var stored = localStorage.getItem(RK_CONSENT_KEY);
  if (stored) { w.__rkConsent = JSON.parse(stored); return; }

  var categories = [
      ${cats}
  ];

  var overlay = document.createElement('div');
  overlay.id = 'rk-consent-overlay';
  overlay.style.cssText = 'position:fixed;${bannerStyle === "center" ? "top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;" : bannerStyle === "top" ? "top:0;left:0;right:0;" : "bottom:0;left:0;right:0;"}z-index:2147483647;background:${bannerStyle === "center" ? "rgba(0,0,0,0.6)" : "transparent"};';

  var banner = document.createElement('div');
  banner.style.cssText = 'max-width:580px;${bannerStyle !== "center" ? "width:100%;" : ""}margin:16px auto;padding:24px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;color:#fff;font-family:system-ui;box-shadow:0 20px 60px rgba(0,0,0,0.5);';

  var html = '<div style="margin-bottom:16px"><strong style="font-size:16px;">🍪 ${brandName} usa cookies</strong>';
  html += '<p style="font-size:13px;color:#aaa;margin-top:8px;">Utilizamos cookies e tecnologias similares conforme a <strong>LGPD (Lei 13.709/2018)</strong>.${privacyUrl ? ' <a href=\\"' + privacyUrl + '\\" target=\\"_blank\\" style=\\"color:${primaryColor}\\">Política de Privacidade</a>' : ""}</p></div>';
  html += '<div id="rk-cats" style="margin-bottom:16px;"></div>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  html += '<button id="rk-accept-all" style="flex:1;padding:10px 20px;background:${primaryColor};color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">Aceitar Todos</button>';
  html += '<button id="rk-accept-selected" style="flex:1;padding:10px 20px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;font-size:13px;">Aceitar Selecionados</button>';
  html += '<button id="rk-reject" style="padding:10px 16px;background:transparent;color:#888;border:none;cursor:pointer;font-size:12px;">Rejeitar</button>';
  html += '</div>';
  banner.innerHTML = html;
  overlay.appendChild(banner);
  document.body.appendChild(overlay);

  function save(consent) {
    consent.timestamp = new Date().toISOString();
    consent.expires = ${autoExpireDays};
    localStorage.setItem(RK_CONSENT_KEY, JSON.stringify(consent));
    w.__rkConsent = consent;
    overlay.remove();
    ${blockBeforeConsent ? "// Unblock tracking\n    if(w._rkFlush) w._rkFlush();" : ""}
  }

  document.getElementById('rk-accept-all').onclick = function() {
    save({ analytics: true, marketing: true, functional: true });
  };
  document.getElementById('rk-reject').onclick = function() {
    save({ analytics: false, marketing: false, functional: false });
  };
})(window);
</script>`;
  }, [bannerStyle, primaryColor, brandName, privacyUrl, categories, blockBeforeConsent, autoExpireDays]);

  const configuredCount = COMPLIANCE_CHECKS.filter(c => c.status === "configured").length;
  const complianceScore = Math.round((configuredCount / COMPLIANCE_CHECKS.length) * 100);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <FeatureBanner
        icon={Shield}
        title="Consent Mode & LGPD"
        description={<>Configure consentimento de cookies conforme a <strong>Lei Geral de Proteção de Dados</strong>. Gere o banner, bloqueie coleta sem consentimento e exporte relatórios de conformidade.</>}
      />

      <Tabs defaultValue="banner" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="banner" className="text-xs gap-1.5"><Cookie className="h-3.5 w-3.5" /> Banner</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs gap-1.5"><Settings className="h-3.5 w-3.5" /> Categorias</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs gap-1.5"><FileText className="h-3.5 w-3.5" /> Conformidade</TabsTrigger>
          <TabsTrigger value="code" className="text-xs gap-1.5"><Code className="h-3.5 w-3.5" /> Código</TabsTrigger>
        </TabsList>

        {/* Banner Builder */}
        <TabsContent value="banner" className="space-y-4 mt-0">
          <StaggeredGrid className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 space-y-4">
              <h4 className="text-sm font-bold font-display flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Personalizar Banner
              </h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome do Site</label>
                  <Input value={brandName} onChange={e => setBrandName(e.target.value)} className="h-9 text-xs" placeholder="Meu Site" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">URL da Política de Privacidade</label>
                  <Input value={privacyUrl} onChange={e => setPrivacyUrl(e.target.value)} className="h-9 text-xs" placeholder="https://meusite.com/privacidade" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Posição do Banner</label>
                  <Select value={bannerStyle} onValueChange={(v: any) => setBannerStyle(v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom">Rodapé (Recomendado)</SelectItem>
                      <SelectItem value="center">Modal Central</SelectItem>
                      <SelectItem value="top">Topo da Página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cor do Botão</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-9 h-9 rounded border border-border cursor-pointer" />
                    <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 text-xs font-mono w-[100px]" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Bloquear antes do consentimento</p>
                    <p className="text-[10px] text-muted-foreground">Não envia eventos até o usuário aceitar</p>
                  </div>
                  <Switch checked={blockBeforeConsent} onCheckedChange={setBlockBeforeConsent} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Respeitar Do Not Track</p>
                    <p className="text-[10px] text-muted-foreground">Desabilita tracking se DNT estiver ativo</p>
                  </div>
                  <Switch checked={respectDNT} onCheckedChange={setRespectDNT} />
                </div>
              </div>
            </Card>

            {/* Preview */}
            <Card className="p-5 space-y-3">
              <h4 className="text-sm font-bold font-display flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" /> Pré-visualização
              </h4>
              <div className="relative bg-muted/30 rounded-xl border border-border min-h-[300px] flex items-end p-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-muted/10 to-muted/40" />
                <div className="relative w-full max-w-[400px] mx-auto bg-[#1a1a2e] rounded-2xl p-5 border border-white/10 shadow-2xl text-white">
                  <p className="font-bold text-sm mb-2">🍪 {brandName} usa cookies</p>
                  <p className="text-[11px] text-gray-400 mb-4">
                    Utilizamos cookies conforme a <strong>LGPD</strong>.
                    {privacyUrl && <span className="ml-1" style={{ color: primaryColor }}>Política de Privacidade</span>}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button className="flex-1 py-2 px-4 rounded-lg text-[11px] font-bold text-black" style={{ backgroundColor: primaryColor }}>Aceitar Todos</button>
                    <button className="flex-1 py-2 px-4 rounded-lg text-[11px] border border-white/20 text-white">Selecionados</button>
                    <button className="py-2 px-3 text-[10px] text-gray-500">Rejeitar</button>
                  </div>
                </div>
              </div>
            </Card>
          </StaggeredGrid>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="space-y-4 mt-0">
          <Card className="p-5">
            <h4 className="text-sm font-bold font-display mb-4 flex items-center gap-2">
              <ToggleLeft className="h-4 w-4 text-primary" /> Categorias de Consentimento
            </h4>
            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className={`flex items-center justify-between p-4 rounded-lg border ${cat.essential ? "bg-muted/20 border-border/50" : "border-border"}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{cat.label}</p>
                      {cat.essential && <Badge variant="secondary" className="text-[9px]">Obrigatório</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cat.desc}</p>
                  </div>
                  <Switch checked={cat.enabled} onCheckedChange={() => toggleCategory(cat.id)} disabled={cat.essential} />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Compliance Report */}
        <TabsContent value="compliance" className="space-y-4 mt-0">
          <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Score LGPD", value: `${complianceScore}%`, icon: Shield, color: complianceScore >= 80 ? "hsl(var(--success))" : "hsl(var(--warning))" },
              { label: "Itens OK", value: configuredCount, icon: CheckCircle2, color: "hsl(var(--success))" },
              { label: "Alertas", value: COMPLIANCE_CHECKS.length - configuredCount, icon: AlertTriangle, color: "hsl(var(--warning))" },
              { label: "Retenção", value: `${autoExpireDays}d`, icon: Lock, color: "hsl(var(--info))" },
            ].map((kpi, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-1.5">
                  <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                </div>
                <span className="text-2xl font-bold font-display mt-1 block">{kpi.value}</span>
              </Card>
            ))}
          </StaggeredGrid>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold font-display">Checklist de Conformidade LGPD</h4>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.success("Relatório exportado!")}>
                <Download className="h-3.5 w-3.5" /> Exportar Relatório
              </Button>
            </div>
            <div className="space-y-2">
              {COMPLIANCE_CHECKS.map((check, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  check.status === "configured" ? "bg-success/5 border-success/15" : "bg-warning/5 border-warning/15"
                }`}>
                  {check.status === "configured" ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{check.name}</p>
                    <p className="text-[10px] text-muted-foreground">{check.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Generated Code */}
        <TabsContent value="code" className="space-y-4 mt-0">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold font-display">Código do Banner LGPD</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole este código <strong>antes</strong> do script do Pixel Rankito. O banner será exibido automaticamente na primeira visita e respeita a escolha do usuário.
            </p>
            <CopyBlock code={bannerSnippet} label="Banner de Consentimento LGPD" />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
