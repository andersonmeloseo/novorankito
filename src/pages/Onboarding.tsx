import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Globe, MapPin, Clock, FileText, Search,
  Link2, Zap, BarChart3, Bot, MonitorSmartphone, Loader2, CheckCircle2,
  AlertCircle, ExternalLink, Copy, Wifi, Target, TrendingUp, DollarSign,
  Bell, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Projeto", icon: Globe },
  { label: "Sitemap", icon: FileText },
  { label: "GSC", icon: Search },
  { label: "GA4", icon: BarChart3 },
  { label: "Tracking", icon: MonitorSmartphone },
  { label: "Ads", icon: Megaphone },
  { label: "Agente IA", icon: Bot },
];

const SITE_TYPES = [
  { value: "ecommerce", label: "E-commerce", icon: "🛒" },
  { value: "blog", label: "Blog / Conteúdo", icon: "📝" },
  { value: "services", label: "Serviços", icon: "🏢" },
  { value: "marketplace", label: "Marketplace", icon: "🏪" },
  { value: "saas", label: "SaaS", icon: "💻" },
  { value: "local", label: "Negócio Local", icon: "📍" },
  { value: "news", label: "Notícias / Mídia", icon: "📰" },
  { value: "portfolio", label: "Portfólio", icon: "🎨" },
];

const COUNTRIES = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "Estados Unidos" },
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Espanha" },
  { value: "UK", label: "Reino Unido" },
  { value: "DE", label: "Alemanha" },
  { value: "FR", label: "França" },
  { value: "MX", label: "México" },
];

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "Europe/London", label: "Londres (GMT+0)" },
  { value: "Europe/Berlin", label: "Berlim (GMT+1)" },
  { value: "America/Mexico_City", label: "Cidade do México (GMT-6)" },
];

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [project, setProject] = useState({
    name: "", domain: "", type: "", country: "", timezone: "",
  });

  const canAdvance =
    step === 0
      ? project.name.trim() && project.domain.trim() && project.type && project.country
      : true;

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else navigate("/overview");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-foreground tracking-tight">Rankito</span>
          <span className="text-muted-foreground text-sm">/ Novo Projeto</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>Cancelar</Button>
      </header>

      <div className="border-b border-border px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-initial">
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    active && "bg-primary/10 text-primary",
                    done && "text-primary cursor-pointer",
                    !active && !done && "text-muted-foreground"
                  )}
                >
                  {done ? (
                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-px mx-1", done ? "bg-primary" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {step === 0 && <StepCreateProject project={project} setProject={setProject} />}
              {step === 1 && <StepSitemap />}
              {step === 2 && <StepGSC />}
              {step === 3 && <StepGA4 />}
              {step === 4 && <StepTracking />}
              {step === 5 && <StepAds />}
              {step === 6 && <StepAIAgent />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => (step > 0 ? setStep(step - 1) : navigate("/projects"))} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <div className="text-xs text-muted-foreground">Etapa {step + 1} de {STEPS.length}</div>
          <Button size="sm" onClick={handleNext} disabled={!canAdvance} className="gap-1.5">
            {step === STEPS.length - 1 ? "Concluir" : "Continuar"} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

/* Step 1: Create Project */
function StepCreateProject({ project, setProject }: {
  project: { name: string; domain: string; type: string; country: string; timezone: string };
  setProject: React.Dispatch<React.SetStateAction<typeof project>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Crie seu projeto</h2>
        <p className="text-sm text-muted-foreground mt-1">Informe os dados do site que deseja monitorar e otimizar.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium">Nome do projeto</Label>
          <Input id="name" placeholder="Meu Site" value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="domain" className="text-xs font-medium">Domínio</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="domain" placeholder="exemplo.com.br" className="pl-9" value={project.domain} onChange={(e) => setProject((p) => ({ ...p, domain: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Tipo de site</Label>
          <div className="grid grid-cols-4 gap-2">
            {SITE_TYPES.map((t) => (
              <button key={t.value} onClick={() => setProject((p) => ({ ...p, type: t.value }))}
                className={cn("flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-all",
                  project.type === t.value ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                )}>
                <span className="text-base">{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> País</Label>
            <Select value={project.country} onValueChange={(v) => setProject((p) => ({ ...p, country: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Fuso horário</Label>
            <Select value={project.timezone} onValueChange={(v) => setProject((p) => ({ ...p, timezone: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Step 2: Sitemap */
function StepSitemap() {
  const [url, setUrl] = useState("https://acme.com/sitemap.xml");
  const [fetched, setFetched] = useState(false);
  const mockUrls = [
    { url: "/", status: "ok", type: "page" },
    { url: "/products", status: "ok", type: "category" },
    { url: "/products/wireless-headphones", status: "ok", type: "product" },
    { url: "/blog/best-noise-cancelling-2026", status: "ok", type: "post" },
    { url: "/old-promo", status: "redirect", type: "page" },
    { url: "/products/discontinued", status: "noindex", type: "product" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Conectar Sitemap</h2>
        <p className="text-sm text-muted-foreground mt-1">Importe as URLs do seu site automaticamente via sitemap.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">URL do Sitemap</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-9 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seusite.com/sitemap.xml" />
            </div>
            <Button size="sm" onClick={() => setFetched(true)} className="gap-1.5 text-xs">
              {fetched ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
              {fetched ? "Importado" : "Buscar URLs"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Suportamos sitemap.xml, sitemap index e múltiplos sitemaps.</p>
        </div>

        {fetched && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{mockUrls.length} URLs encontradas</span>
              <Badge variant="secondary" className="text-[10px]">sitemap.xml</Badge>
            </div>
            <Card className="overflow-hidden">
              <div className="divide-y divide-border max-h-48 overflow-y-auto scrollbar-thin">
                {mockUrls.map((u) => (
                  <div key={u.url} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Checkbox defaultChecked={u.status === "ok"} />
                      <span className="font-mono text-foreground">{u.url}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px]">{u.type}</Badge>
                      <span className={cn("text-[9px] font-medium", u.status === "ok" ? "text-success" : u.status === "redirect" ? "text-warning" : "text-muted-foreground")}>
                        {u.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <p className="text-[10px] text-muted-foreground">As URLs importadas serão adicionadas ao Inventário de URLs com tags e grupos editáveis.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* Step 3: GSC */
function StepGSC() {
  const [connected, setConnected] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Conectar Google Search Console</h2>
        <p className="text-sm text-muted-foreground mt-1">Vincule sua propriedade do GSC para importar dados de performance SEO.</p>
      </div>
      <Card className="p-5 space-y-4">
        {!connected ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Search className="h-5 w-5 text-primary" />
              <div>
                <span className="text-sm font-medium text-foreground">Google Search Console</span>
                <p className="text-[10px] text-muted-foreground">Autorize o acesso via OAuth para importar dados</p>
              </div>
            </div>
            <Button onClick={() => setConnected(true)} className="w-full gap-2 text-sm">
              <ExternalLink className="h-3.5 w-3.5" /> Conectar com Google
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">Precisamos de permissão de leitura para acessar métricas do Search Console.</p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Conectado com sucesso!</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Propriedade selecionada</Label>
              <Select defaultValue="sc-domain:acme.com">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sc-domain:acme.com">sc-domain:acme.com</SelectItem>
                  <SelectItem value="https://acme.com">https://acme.com/</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Status", value: "Verificado", ok: true },
                { label: "Dados disponíveis", value: "16 meses", ok: true },
                { label: "Permissão", value: "Leitura", ok: true },
                { label: "Última sincronização", value: "Agora", ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
                  <div><span className="text-muted-foreground">{item.label}:</span> <span className="font-medium text-foreground">{item.value}</span></div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
}

/* Step 4: GA4 */
function StepGA4() {
  const [connected, setConnected] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Conectar Google Analytics 4</h2>
        <p className="text-sm text-muted-foreground mt-1">Vincule sua propriedade GA4 para importar dados de tráfego e conversões.</p>
      </div>
      <Card className="p-5 space-y-4">
        {!connected ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <span className="text-sm font-medium text-foreground">Google Analytics 4</span>
                <p className="text-[10px] text-muted-foreground">Autorize o acesso para importar métricas e dimensões</p>
              </div>
            </div>
            <Button onClick={() => setConnected(true)} className="w-full gap-2 text-sm">
              <ExternalLink className="h-3.5 w-3.5" /> Conectar com Google
            </Button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">GA4 conectado!</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Propriedade / Stream</Label>
              <Select defaultValue="properties/123456789">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="properties/123456789">acme.com — Web Stream</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-2 block">Eventos principais detectados</Label>
              <div className="flex flex-wrap gap-1.5">
                {["page_view", "session_start", "first_visit", "scroll", "click", "purchase", "add_to_cart"].map((ev) => (
                  <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
}

/* Step 5: Tracking */
function StepTracking() {
  const [method, setMethod] = useState<"script" | "plugin">("script");
  const [liveReceived, setLiveReceived] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Instalar Tracking</h2>
        <p className="text-sm text-muted-foreground mt-1">Adicione o script Rankito para capturar eventos comportamentais do seu site.</p>
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setMethod("script")}
            className={cn("flex-1 p-3 rounded-lg border text-xs font-medium text-center transition-all",
              method === "script" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20"
            )}>
            📋 Script / Tag
          </button>
          <button onClick={() => setMethod("plugin")}
            className={cn("flex-1 p-3 rounded-lg border text-xs font-medium text-center transition-all",
              method === "plugin" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20"
            )}>
            🔌 Plugin WordPress
          </button>
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Chave do Projeto</Label>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"><Copy className="h-3 w-3" /> Copiar</Button>
          </div>
          <div className="bg-muted rounded-md p-2 font-mono text-xs text-foreground">rk_live_a1b2c3d4e5f6</div>
        </Card>

        {method === "script" ? (
          <Card className="p-4 space-y-3">
            <Label className="text-xs font-medium">Adicione antes do {"</body>"}</Label>
            <div className="bg-muted rounded-md p-3 font-mono text-[11px] text-foreground leading-relaxed overflow-x-auto">
              {`<script src="https://cdn.rankito.io/track.js"\n  data-key="rk_live_a1b2c3d4e5f6"\n  async></script>`}
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full"><Copy className="h-3 w-3" /> Copiar Snippet</Button>
          </Card>
        ) : (
          <Card className="p-4 space-y-3">
            <Label className="text-xs font-medium">Plugin WordPress</Label>
            <p className="text-xs text-muted-foreground">Baixe o plugin e ative no painel do WordPress. Cole a chave do projeto nas configurações.</p>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full">Baixar Plugin (.zip)</Button>
          </Card>
        )}

        <Card className={cn("p-4 flex items-center gap-3 transition-colors", liveReceived ? "border-success/30 bg-success/5" : "")}>
          {liveReceived ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <span className="text-sm font-medium text-success">Eventos recebidos!</span>
                <p className="text-[10px] text-muted-foreground">3 page_views e 1 click detectados em tempo real.</p>
              </div>
            </>
          ) : (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-warning" />
              </span>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Aguardando eventos...</span>
                <p className="text-[10px] text-muted-foreground">Instale o script e acesse seu site para testar.</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setLiveReceived(true)}>Simular</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* Step 6: Ads */
function StepAds() {
  const [gadsConnected, setGadsConnected] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Conectar Ads</h2>
        <p className="text-sm text-muted-foreground mt-1">Vincule suas contas de anúncios para unificar dados de performance.</p>
      </div>
      <div className="space-y-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Google Ads</span>
                <p className="text-[10px] text-muted-foreground">Campanhas, custos, conversões e ROAS</p>
              </div>
            </div>
            {gadsConnected ? (
              <Badge className="text-[10px] bg-success/10 text-success border-0">Conectado</Badge>
            ) : (
              <Button size="sm" className="text-xs gap-1.5" onClick={() => setGadsConnected(true)}>
                <ExternalLink className="h-3 w-3" /> Conectar
              </Button>
            )}
          </div>
          {gadsConnected && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border">
              <Select defaultValue="123-456-7890">
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="123-456-7890">Conta: 123-456-7890 (acme.com)</SelectItem></SelectContent>
              </Select>
            </motion.div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Meta Ads</span>
                <p className="text-[10px] text-muted-foreground">Facebook & Instagram Ads, pixel e eventos</p>
              </div>
            </div>
            {metaConnected ? (
              <Badge className="text-[10px] bg-success/10 text-success border-0">Conectado</Badge>
            ) : (
              <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setMetaConnected(true)}>
                <ExternalLink className="h-3 w-3" /> Conectar
              </Button>
            )}
          </div>
          {metaConnected && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-1.5">
                {["Pixel detectado", "Eventos de conversão mapeados"].map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 text-[10px] text-success"><CheckCircle2 className="h-2.5 w-2.5" />{s}</span>
                ))}
              </div>
            </motion.div>
          )}
        </Card>

        <p className="text-[10px] text-muted-foreground text-center">Você pode pular esta etapa e conectar depois em Configurações.</p>
      </div>
    </div>
  );
}

/* Step 7: AI Agent */
function StepAIAgent() {
  const [objective, setObjective] = useState("");
  const [frequency, setFrequency] = useState("weekly");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Configurar Agente IA</h2>
        <p className="text-sm text-muted-foreground mt-1">Defina seus objetivos e o Rankito AI vai gerar insights personalizados.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Qual seu objetivo principal?</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "seo_growth", label: "Crescimento SEO", icon: TrendingUp },
              { value: "leads", label: "Geração de Leads", icon: Target },
              { value: "ecommerce", label: "Receita E-commerce", icon: DollarSign },
              { value: "content", label: "Performance de Conteúdo", icon: FileText },
            ].map((obj) => (
              <button key={obj.value} onClick={() => setObjective(obj.value)}
                className={cn("flex items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-all",
                  objective === obj.value ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" : "border-border text-muted-foreground hover:border-foreground/20"
                )}>
                <obj.icon className="h-4 w-4" />{obj.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Frequência de análises</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Metas (opcional)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Cliques/mês</Label>
              <Input placeholder="30000" type="number" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Conversões/mês</Label>
              <Input placeholder="500" type="number" className="h-8 text-xs" />
            </div>
          </div>
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-warning" />
            <Label className="text-xs font-medium">Alertas Automáticos</Label>
          </div>
          {[
            { label: "Queda significativa de cliques (>20%)", default: true },
            { label: "Perda de posição em keywords prioritárias", default: true },
            { label: "Oportunidades de quick-win detectadas", default: true },
            { label: "Anomalias em tráfego ou conversões", default: false },
          ].map((alert) => (
            <div key={alert.label} className="flex items-center justify-between">
              <span className="text-xs text-foreground">{alert.label}</span>
              <Switch defaultChecked={alert.default} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
