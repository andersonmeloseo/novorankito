import { useState, useMemo, useEffect } from "react";
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
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  ArrowLeft, ArrowRight, Check, Globe, MapPin, Clock, FileText, Search,
  Link2, Zap, BarChart3, Bot, MonitorSmartphone, Loader2, CheckCircle2,
  AlertCircle, ExternalLink, Copy, Wifi, Target, TrendingUp, DollarSign, Upload,
  Bell, Megaphone, BookOpen, ChevronsUpDown, Building2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { COUNTRIES_DATA, getTimezoneLabel } from "@/lib/geo-data";
import { GSCTutorialModal } from "@/components/onboarding/GSCTutorialModal";
import { GA4TutorialModal } from "@/components/onboarding/GA4TutorialModal";

const STEPS = [
  { label: "Projeto", icon: Globe, required: true },
  { label: "Sitemap", icon: FileText, required: false },
  { label: "GSC", icon: Search, required: false },
  { label: "GA4", icon: BarChart3, required: false },
  { label: "Tracking", icon: MonitorSmartphone, required: false },
  { label: "Ads", icon: Megaphone, required: false },
  { label: "Agente IA", icon: Bot, required: false },
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

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

interface CreatedProject {
  id: string;
  name: string;
  domain: string;
  sitemapImported: boolean;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [createdProjects, setCreatedProjects] = useState<CreatedProject[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [project, setProject] = useState({
    name: "", domain: "", type: "", country: "", city: "", timezone: "",
    isRankRent: false, rrPrice: "", rrDeadline: "", rrClient: "",
  });

  const canAdvance =
    step === 0
      ? project.name.trim() && project.domain.trim() && project.type && project.country && !saving
      : true;

  const saveProject = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("projects").insert({
        name: project.name.trim(),
        domain: project.domain.trim(),
        site_type: project.type,
        country: project.country,
        city: project.city || null,
        timezone: project.timezone || null,
        owner_id: user.id,
        monetization_status: project.isRankRent ? "rank_rent" : "disponivel",
      }).select("id").single();
      if (error) throw error;
      setProjectId(data.id);
      setCreatedProjects(prev => [...prev, { id: data.id, name: project.name.trim(), domain: project.domain.trim(), sitemapImported: false }]);
      await supabase.from("project_members").insert({
        project_id: data.id, user_id: user.id, role: "owner",
      });
      setStep(1);
    } catch (err: any) {
      toast({ title: "Erro ao criar projeto", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Persist onboarding step to database
  const persistStep = async (nextStep: number) => {
    if (projectId) {
      await supabase.from("projects").update({ onboarding_step: nextStep }).eq("id", projectId);
    }
  };

  // Restore progress on mount — find last project with incomplete onboarding
  useEffect(() => {
    if (!user) return;
    const restore = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, domain, site_type, country, city, timezone, monetization_status, onboarding_step, onboarding_completed")
        .eq("owner_id", user.id)
        .eq("onboarding_completed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && !data.onboarding_completed) {
        setProjectId(data.id);
        setProject({
          name: data.name, domain: data.domain, type: data.site_type || "",
          country: data.country || "", city: data.city || "", timezone: data.timezone || "",
          isRankRent: data.monetization_status === "rank_rent", rrPrice: "", rrDeadline: "", rrClient: "",
        });
        setStep(data.onboarding_step || 1); // at least skip step 0 since project exists
      }
    };
    restore();
  }, [user]);

  const handleNext = () => {
    if (step === 0) { saveProject(); return; }
    const nextStep = step + 1;
    if (nextStep < STEPS.length) {
      setStep(nextStep);
      persistStep(nextStep);
    } else {
      // Mark onboarding as complete
      if (projectId) {
        supabase.from("projects").update({ onboarding_completed: true, onboarding_step: STEPS.length }).eq("id", projectId);
        // Update created projects list
        setCreatedProjects(prev => {
          const existing = prev.find(p => p.id === projectId);
          if (existing) return prev;
          return [...prev, { id: projectId, name: project.name, domain: project.domain, sitemapImported: false }];
        });
      }
      setShowSummary(true);
    }
  };

  const handleAddAnotherProject = () => {
    setShowSummary(false);
    setProjectId(null);
    setProject({ name: "", domain: "", type: "", country: "", city: "", timezone: "", isRankRent: false, rrPrice: "", rrDeadline: "", rrClient: "" });
    setStep(0);
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem("rankito_show_tour", "true");
    navigate("/projects");
  };

  if (showSummary) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-foreground tracking-tight">Rankito</span>
            <span className="text-muted-foreground text-sm">/ Onboarding Concluído</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg space-y-6">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {createdProjects.length === 1 ? "Projeto criado!" : `${createdProjects.length} projetos criados!`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Seu onboarding está completo. Você pode adicionar mais projetos ou ir para o dashboard.
              </p>
            </div>

            {/* Created projects list */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <span className="text-xs font-medium text-foreground">Projetos configurados</span>
              </div>
              <div className="divide-y divide-border">
                {createdProjects.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">{p.name}</span>
                      <span className="text-xs text-muted-foreground truncate block">{p.domain}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  </motion.div>
                ))}
              </div>
            </Card>

            <div className="flex flex-col gap-2">
              <Button onClick={handleAddAnotherProject} variant="outline" className="w-full gap-2 text-sm">
                <Plus className="h-4 w-4" /> Adicionar outro projeto
              </Button>
              <Button onClick={handleFinishOnboarding} className="w-full gap-2 text-sm">
                Ir para o Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-foreground tracking-tight">Rankito</span>
          <span className="text-muted-foreground text-sm">/ Novo Projeto {createdProjects.length > 0 ? `(#${createdProjects.length + 1})` : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          {createdProjects.length > 0 && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> {createdProjects.length} projeto{createdProjects.length > 1 ? "s" : ""} criado{createdProjects.length > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => createdProjects.length > 0 ? handleFinishOnboarding() : navigate("/projects")}>
            {createdProjects.length > 0 ? "Concluir" : "Cancelar"}
          </Button>
        </div>
      </header>

      <div className="border-b border-border px-4 sm:px-6 py-3 overflow-x-auto">
        <div className="max-w-3xl mx-auto">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">Progresso do Onboarding</span>
              <span className="text-[10px] font-medium text-primary">{Math.round((step / (STEPS.length - 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <div key={s.label} className="flex items-center flex-1 last:flex-initial">
                  <button onClick={() => i <= step && setStep(i)}
                    className={cn("relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      active && "bg-primary/10 text-primary", done && "text-primary cursor-pointer",
                      !active && !done && "text-muted-foreground")}>
                    {done ? (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    ) : active ? (
                      <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center">
                        <Icon className="h-2.5 w-2.5" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center">
                        <Icon className="h-2.5 w-2.5" />
                      </div>
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                    {/* Validation badge */}
                    <span className={cn(
                      "hidden sm:inline-flex ml-0.5 text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                      s.required
                        ? done
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                        : done
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {done ? "✓" : s.required ? "obrig." : "opcional"}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn("flex-1 h-px mx-1", done ? "bg-primary" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-6 sm:py-10 overflow-y-auto">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              {step === 0 && <StepCreateProject project={project} setProject={setProject} />}
              {step === 1 && <StepSitemap projectId={projectId} />}
              {step === 2 && <StepGSC projectId={projectId} />}
              {step === 3 && <StepGA4 projectId={projectId} />}
              {step === 4 && <StepTracking />}
              {step === 5 && <StepAds />}
              {step === 6 && <StepAIAgent />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="border-t border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => (step > 0 ? setStep(step - 1) : navigate("/projects"))} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <div className="text-xs text-muted-foreground">Etapa {step + 1} de {STEPS.length}</div>
          <Button size="sm" onClick={handleNext} disabled={!canAdvance} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {step === STEPS.length - 1 ? "Concluir" : "Continuar"} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

/* ─── Step 1: Create Project ─── */
function StepCreateProject({ project, setProject }: {
  project: { name: string; domain: string; type: string; country: string; city: string; timezone: string; isRankRent: boolean; rrPrice: string; rrDeadline: string; rrClient: string };
  setProject: React.Dispatch<React.SetStateAction<typeof project>>;
}) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const selectedCountry = COUNTRIES_DATA.find((c) => c.code === project.country);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES_DATA;
    const q = countrySearch.toLowerCase();
    return COUNTRIES_DATA.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countrySearch]);

  const filteredCities = useMemo(() => {
    if (!selectedCountry) return [];
    if (!citySearch) return selectedCountry.timezones;
    const q = citySearch.toLowerCase();
    return selectedCountry.timezones.filter((t) => t.city.toLowerCase().includes(q));
  }, [selectedCountry, citySearch]);

  const handleCountrySelect = (code: string) => {
    setProject((p) => ({ ...p, country: code, city: "", timezone: "" }));
    setCountryOpen(false);
    setCountrySearch("");
  };

  const handleCitySelect = (city: string, tz: string) => {
    setProject((p) => ({ ...p, city, timezone: tz }));
    setCityOpen(false);
    setCitySearch("");
  };

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

        {/* Country autocomplete */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> País</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={countryOpen} className="w-full justify-between text-xs font-normal h-10">
                  {selectedCountry ? selectedCountry.name : "Digite o país..."}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar país..." value={countrySearch} onValueChange={setCountrySearch} className="text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-xs p-2">Nenhum país encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredCountries.map((c) => (
                        <CommandItem key={c.code} value={c.name} onSelect={() => handleCountrySelect(c.code)} className="text-xs">
                          <Check className={cn("mr-2 h-3 w-3", project.country === c.code ? "opacity-100" : "opacity-0")} />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* City autocomplete */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1"><Building2 className="h-3 w-3" /> Cidade</Label>
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={cityOpen} disabled={!selectedCountry} className="w-full justify-between text-xs font-normal h-10">
                  {project.city || "Digite a cidade..."}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cidade..." value={citySearch} onValueChange={setCitySearch} className="text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-xs p-2">Nenhuma cidade encontrada.</CommandEmpty>
                    <CommandGroup>
                      {filteredCities.map((t) => (
                        <CommandItem key={t.city} value={t.city} onSelect={() => handleCitySelect(t.city, t.tz)} className="text-xs">
                          <Check className={cn("mr-2 h-3 w-3", project.city === t.city ? "opacity-100" : "opacity-0")} />
                          {t.city}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Auto timezone */}
        {project.timezone && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex items-center gap-2 p-2.5 rounded-lg bg-success/10 border border-success/20">
            <Clock className="h-3.5 w-3.5 text-success" />
            <span className="text-xs text-success font-medium">
              Fuso horário detectado: {project.timezone} ({getTimezoneLabel(project.timezone)})
            </span>
          </motion.div>
        )}

        {/* Rank & Rent toggle */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs font-medium text-foreground">Este projeto é Rank & Rent?</span>
                <p className="text-[10px] text-muted-foreground">Ative para configurar monetização por locação</p>
              </div>
            </div>
            <Switch checked={project.isRankRent} onCheckedChange={(v) => setProject((p) => ({ ...p, isRankRent: v }))} />
          </div>

          {project.isRankRent && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Preço mensal (R$)</Label>
                  <Input placeholder="2.500" type="number" className="h-8 text-xs" value={project.rrPrice} onChange={(e) => setProject((p) => ({ ...p, rrPrice: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Prazo do contrato</Label>
                  <Select value={project.rrDeadline} onValueChange={(v) => setProject((p) => ({ ...p, rrDeadline: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses</SelectItem>
                      <SelectItem value="24">24 meses</SelectItem>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Nome do cliente (opcional)</Label>
                <Input placeholder="Nome da empresa cliente" className="h-8 text-xs" value={project.rrClient} onChange={(e) => setProject((p) => ({ ...p, rrClient: e.target.value }))} />
              </div>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Step 2: Sitemap ─── */
function StepSitemap({ projectId }: { projectId: string | null }) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ urls: { loc: string; lastmod?: string }[]; total: number; sitemaps_processed: string[] } | null>(null);
  const [error, setError] = useState("");
  const [savingUrls, setSavingUrls] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingCount, setExistingCount] = useState<number | null>(null);

  // Check if URLs were already imported for this project
  useEffect(() => {
    if (!projectId) return;
    const checkExisting = async () => {
      const { count, error } = await supabase
        .from("site_urls")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);
      if (!error && count && count > 0) {
        setExistingCount(count);
        setSaved(true);
      }
    };
    checkExisting();
  }, [projectId]);

  const fetchSitemap = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-sitemap", {
        body: { url: url.trim() },
      });
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar sitemap");
    } finally {
      setLoading(false);
    }
  };

  const saveUrlsToDb = async () => {
    if (!result || !projectId || !user) return;
    setSavingUrls(true);
    try {
      const batch = result.urls.map((u) => ({
        project_id: projectId,
        owner_id: user.id,
        url: u.loc,
        url_type: "page",
        status: "active",
      }));
      // Insert in batches of 100
      for (let i = 0; i < batch.length; i += 100) {
        const chunk = batch.slice(i, i + 100);
        const { error } = await supabase.from("site_urls").upsert(chunk, { onConflict: "project_id,url", ignoreDuplicates: true });
        if (error) throw error;
      }
      setSaved(true);
      toast({ title: "URLs importadas!", description: `${batch.length.toLocaleString("pt-BR")} URLs salvas no inventário.` });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingUrls(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Conectar Sitemap</h2>
        <p className="text-sm text-muted-foreground mt-1">Importe as URLs do seu site automaticamente via sitemap. Suportamos sitemap index com múltiplos sitemaps aninhados.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">URL do Sitemap</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-9 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seusite.com/sitemap.xml" />
            </div>
            <Button size="sm" onClick={fetchSitemap} disabled={loading || !url.trim()} className="gap-1.5 text-xs">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {loading ? "Buscando..." : "Buscar URLs"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Cole a URL do sitemap.xml ou sitemap index. Todos os sitemaps aninhados serão processados recursivamente.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">{error}</span>
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{result.total.toLocaleString("pt-BR")} URLs encontradas</span>
              <Badge variant="secondary" className="text-[9px]">{result.sitemaps_processed.length} sitemaps</Badge>
            </div>

            {/* Sitemaps grid - 4 columns */}
            {result.sitemaps_processed.length > 1 && (
              <Card className="p-3">
                <p className="text-[10px] text-muted-foreground mb-2">{result.sitemaps_processed.length} sitemaps processados recursivamente:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                  {result.sitemaps_processed.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] truncate justify-start font-mono">
                      {s.split("/").pop()}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="divide-y divide-border max-h-48 overflow-y-auto scrollbar-thin">
                {result.urls.slice(0, 50).map((u, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox defaultChecked />
                      <span className="font-mono text-foreground truncate">{u.loc}</span>
                    </div>
                    {u.lastmod && <span className="text-[9px] text-muted-foreground flex-shrink-0">{u.lastmod.slice(0, 10)}</span>}
                  </div>
                ))}
                {result.urls.length > 50 && (
                  <div className="px-3 py-2 text-[10px] text-muted-foreground text-center">
                    ... e mais {(result.urls.length - 50).toLocaleString("pt-BR")} URLs
                  </div>
                )}
              </div>
            </Card>

            {!saved ? (
              <Button onClick={saveUrlsToDb} disabled={savingUrls} className="w-full gap-1.5 text-xs" size="sm">
                {savingUrls ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {savingUrls ? "Salvando..." : `Importar todas as ${result.urls.length.toLocaleString("pt-BR")} URLs`}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs font-medium text-success">URLs importadas com sucesso!</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Show existing import status when returning to this step */}
        {saved && !result && existingCount !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-success">
                {existingCount.toLocaleString("pt-BR")} URLs já importadas neste projeto.
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Você pode buscar o sitemap novamente para adicionar novas URLs. URLs duplicadas serão ignoradas.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ─── Step 3: GSC ─── */
function StepGSC({ projectId }: { projectId: string | null }) {
  const { user } = useAuth();
  const [gscStep, setGscStep] = useState<"credentials" | "validating" | "connected" | "saved" | "error">("credentials");
  const [connectionName, setConnectionName] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [sites, setSites] = useState<{ siteUrl: string; permissionLevel: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [validationError, setValidationError] = useState("");
  const [parsedCreds, setParsedCreds] = useState<{ client_email: string; private_key: string } | null>(null);
  const [savingConnection, setSavingConnection] = useState(false);

  // Check for existing connection
  useEffect(() => {
    if (!projectId) return;
    const check = async () => {
      const { data } = await supabase
        .from("gsc_connections")
        .select("connection_name, site_url, last_sync_at")
        .eq("project_id", projectId)
        .maybeSingle();
      if (data) {
        setConnectionName(data.connection_name);
        setSelectedSite(data.site_url || "");
        setGscStep("saved");
      }
    };
    check();
  }, [projectId]);

  const saveConnection = async () => {
    if (!projectId || !user || !parsedCreds || !selectedSite) {
      console.error("saveConnection: missing required data", { projectId, user: !!user, parsedCreds: !!parsedCreds, selectedSite });
      return;
    }
    setSavingConnection(true);
    try {
      // Check if a connection already exists for this project
      const { data: existing } = await supabase
        .from("gsc_connections")
        .select("id")
        .eq("project_id", projectId)
        .maybeSingle();

      if (existing) {
        // Update existing connection
        const { error } = await supabase.from("gsc_connections").update({
          connection_name: connectionName,
          client_email: parsedCreds.client_email,
          private_key: parsedCreds.private_key,
          site_url: selectedSite,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new connection
        const { error } = await supabase.from("gsc_connections").insert({
          project_id: projectId,
          owner_id: user.id,
          connection_name: connectionName,
          client_email: parsedCreds.client_email,
          private_key: parsedCreds.private_key,
          site_url: selectedSite,
        });
        if (error) throw error;
      }
      setGscStep("saved");
      toast({ title: "Conexão GSC salva!", description: "Os dados serão sincronizados na página SEO." });
    } catch (err: any) {
      console.error("GSC save error:", err);
      toast({ title: "Erro ao salvar conexão", description: err.message, variant: "destructive" });
    } finally {
      setSavingConnection(false);
    }
  };

  const validateAndConnect = async () => {
    if (!connectionName.trim()) {
      setJsonError("Informe um nome para a conexão.");
      return;
    }
    setJsonError("");
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput.trim());
      if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
        setJsonError("JSON inválido: campos obrigatórios não encontrados (client_email, private_key, project_id).");
        return;
      }
    } catch {
      setJsonError("JSON inválido. Verifique se copiou o conteúdo correto do arquivo de credenciais.");
      return;
    }

    setGscStep("validating");
    setValidationError("");

    try {
      const { data, error } = await supabase.functions.invoke("verify-gsc", {
        body: { credentials: { client_email: parsed.client_email, private_key: parsed.private_key } },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Falha na verificação");

      const fetchedSites = data.sites || [];
      if (fetchedSites.length === 0) {
        setValidationError("Nenhuma propriedade encontrada. Verifique se a Service Account foi adicionada como usuária no Search Console.");
        setGscStep("error");
        return;
      }

      setSites(fetchedSites);
      setSelectedSite(fetchedSites[0]?.siteUrl || "");
      setParsedCreds({ client_email: parsed.client_email, private_key: parsed.private_key });
      setGscStep("connected");
    } catch (err: any) {
      console.error("GSC verification failed:", err);
      setValidationError(err.message || "Erro ao verificar credenciais. Tente novamente.");
      setGscStep("error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Conectar Google Search Console</h2>
        <p className="text-sm text-muted-foreground mt-1">Vincule sua propriedade do GSC para importar dados de performance SEO.</p>
      </div>

      {gscStep === "credentials" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Search className="h-5 w-5 text-primary" />
            <div>
              <span className="text-sm font-medium text-foreground">Service Account JSON</span>
              <p className="text-[10px] text-muted-foreground">Cole o conteúdo do arquivo JSON da Service Account do Google</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nome da conexão</Label>
            <Input
              placeholder="Ex: GSC - Meu Site Principal"
              value={connectionName}
              onChange={(e) => { setConnectionName(e.target.value); setJsonError(""); }}
            />
            <p className="text-[10px] text-muted-foreground">Um nome para identificar essa conexão no painel.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Credenciais JSON</Label>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const text = evt.target?.result as string;
                      setJsonInput(text);
                      setJsonError("");
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors px-3 py-2.5 text-xs text-muted-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Fazer upload do arquivo .json</span>
                </div>
              </label>
            </div>
            <textarea
              className="w-full min-h-[140px] rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
              value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setJsonError(""); }}
            />
            <p className="text-[10px] text-muted-foreground">
              Faça upload do arquivo .json ou cole o conteúdo manualmente.
            </p>
          </div>

          {jsonError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive">{jsonError}</span>
            </div>
          )}

          <Button onClick={validateAndConnect} disabled={!jsonInput.trim() || !connectionName.trim()} className="w-full gap-2 text-sm">
            <CheckCircle2 className="h-3.5 w-3.5" /> Validar e conectar
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-2 text-[10px] text-muted-foreground">precisa de ajuda?</span></div>
          </div>
          <Button variant="outline" onClick={() => setTutorialOpen(true)} className="w-full gap-2 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Ver tutorial passo-a-passo
          </Button>
        </Card>
      )}

      {gscStep === "validating" && (
        <Card className="p-5">
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-sm font-medium text-foreground">Verificando conexão com o Search Console...</span>
            <p className="text-xs text-muted-foreground">Autenticando e buscando propriedades disponíveis</p>
          </div>
        </Card>
      )}

      {gscStep === "error" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-xs text-destructive">{validationError}</span>
          </div>
          <Button variant="outline" onClick={() => setGscStep("credentials")} className="w-full gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar e tentar novamente
          </Button>
        </Card>
      )}

      {gscStep === "connected" && (
        <Card className="p-5 space-y-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Conexão verificada com sucesso!</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Propriedade ({sites.length} encontrada{sites.length !== 1 ? "s" : ""})</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.siteUrl} value={s.siteUrl}>
                      {s.siteUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Conexão", value: connectionName },
                { label: "Permissão", value: sites.find(s => s.siteUrl === selectedSite)?.permissionLevel || "—" },
                { label: "Propriedades", value: `${sites.length}` },
                { label: "Status", value: "Conectado" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
                  <div><span className="text-muted-foreground">{item.label}:</span> <span className="font-medium text-foreground">{item.value}</span></div>
                </div>
              ))}
            </div>
            <Button onClick={saveConnection} disabled={savingConnection || !selectedSite} className="w-full gap-2 text-sm">
              {savingConnection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {savingConnection ? "Salvando..." : "Salvar conexão e sincronizar dados"}
            </Button>
          </motion.div>
        </Card>
      )}

      {gscStep === "saved" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">Conexão GSC salva! Os dados serão sincronizados na página SEO.</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
              <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
              <div><span className="text-muted-foreground">Conexão:</span> <span className="font-medium text-foreground">{connectionName}</span></div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
              <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
              <div><span className="text-muted-foreground">Propriedade:</span> <span className="font-medium text-foreground">{selectedSite}</span></div>
            </div>
          </div>
        </Card>
      )}

      <GSCTutorialModal open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </div>
  );
}

/* ─── Step 4: GA4 ─── */
function StepGA4({ projectId }: { projectId: string | null }) {
  const { user } = useAuth();
  const [ga4Step, setGa4Step] = useState<"credentials" | "validating" | "connected" | "error" | "saved">("credentials");
  const [connectionName, setConnectionName] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [properties, setProperties] = useState<{ propertyId: string; displayName: string; account: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [validationError, setValidationError] = useState("");
  const [parsedCreds, setParsedCreds] = useState<{ client_email: string; private_key: string } | null>(null);
  const [savingConnection, setSavingConnection] = useState(false);

  // Restore saved connection
  useEffect(() => {
    if (!projectId || !user) return;
    const check = async () => {
      const { data } = await supabase
        .from("ga4_connections")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (data) {
        setConnectionName(data.connection_name);
        setSelectedProperty(data.property_id || "");
        setGa4Step("saved");
      }
    };
    check();
  }, [projectId, user]);

  const saveConnection = async () => {
    if (!projectId || !user || !parsedCreds || !selectedProperty) return;
    setSavingConnection(true);
    try {
      const selectedProp = properties.find(p => p.propertyId === selectedProperty);
      const { error } = await supabase.from("ga4_connections").upsert({
        project_id: projectId,
        owner_id: user.id,
        connection_name: connectionName,
        client_email: parsedCreds.client_email,
        private_key: parsedCreds.private_key,
        property_id: selectedProperty,
        property_name: selectedProp?.displayName || "",
      }, { onConflict: "project_id" });
      if (error) throw error;
      setGa4Step("saved");
      toast({ title: "Conexão GA4 salva!", description: "Propriedade vinculada com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar conexão", description: err.message, variant: "destructive" });
    } finally {
      setSavingConnection(false);
    }
  };

  const validateAndConnect = async () => {
    if (!connectionName.trim()) { setJsonError("Informe um nome para a conexão."); return; }
    setJsonError("");
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput.trim());
      if (!parsed.client_email || !parsed.private_key) {
        setJsonError("JSON inválido: campos obrigatórios não encontrados (client_email, private_key).");
        return;
      }
    } catch {
      setJsonError("JSON inválido. Verifique se copiou o conteúdo correto do arquivo de credenciais.");
      return;
    }

    setGa4Step("validating");
    setValidationError("");

    try {
      const { data, error } = await supabase.functions.invoke("verify-ga4", {
        body: { credentials: { client_email: parsed.client_email, private_key: parsed.private_key } },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Falha na verificação");

      const fetched = data.properties || [];
      if (fetched.length === 0) {
        setValidationError("Nenhuma propriedade GA4 encontrada. Verifique se a Service Account foi adicionada como Leitor na propriedade GA4.");
        setGa4Step("error");
        return;
      }
      setProperties(fetched);
      setSelectedProperty(fetched[0]?.propertyId || "");
      setParsedCreds({ client_email: parsed.client_email, private_key: parsed.private_key });
      setGa4Step("connected");
    } catch (err: any) {
      console.error("GA4 verification failed:", err);
      setValidationError(err.message || "Erro ao verificar credenciais.");
      setGa4Step("error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Conectar Google Analytics 4</h2>
        <p className="text-sm text-muted-foreground mt-1">Vincule sua propriedade GA4 para importar dados de tráfego e conversões.</p>
      </div>

      {ga4Step === "credentials" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <span className="text-sm font-medium text-foreground">Service Account JSON</span>
              <p className="text-[10px] text-muted-foreground">Mesma Service Account do GSC ou uma nova com acesso ao GA4</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nome da conexão</Label>
            <Input placeholder="Ex: GA4 - Meu Site" value={connectionName} onChange={(e) => { setConnectionName(e.target.value); setJsonError(""); }} />
            <p className="text-[10px] text-muted-foreground">Um nome para identificar essa conexão no painel.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Credenciais JSON</Label>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="flex-1 cursor-pointer">
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => { setJsonInput(evt.target?.result as string); setJsonError(""); };
                  reader.readAsText(file);
                  e.target.value = "";
                }} />
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors px-3 py-2.5 text-xs text-muted-foreground">
                  <Upload className="h-3.5 w-3.5" /><span>Fazer upload do arquivo .json</span>
                </div>
              </label>
            </div>
            <textarea
              className="w-full min-h-[140px] rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
              value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); setJsonError(""); }}
            />
            <p className="text-[10px] text-muted-foreground">Faça upload do arquivo .json ou cole o conteúdo manualmente.</p>
          </div>

          {jsonError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive">{jsonError}</span>
            </div>
          )}

          <Button onClick={validateAndConnect} disabled={!jsonInput.trim() || !connectionName.trim()} className="w-full gap-2 text-sm">
            <CheckCircle2 className="h-3.5 w-3.5" /> Validar e conectar
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-2 text-[10px] text-muted-foreground">precisa de ajuda?</span></div>
          </div>
          <Button variant="outline" onClick={() => setTutorialOpen(true)} className="w-full gap-2 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Ver tutorial passo-a-passo
          </Button>
        </Card>
      )}

      {ga4Step === "validating" && (
        <Card className="p-5">
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-sm font-medium text-foreground">Verificando conexão com o GA4...</span>
            <p className="text-xs text-muted-foreground">Autenticando e buscando propriedades disponíveis</p>
          </div>
        </Card>
      )}

      {ga4Step === "error" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-xs text-destructive">{validationError}</span>
          </div>
          <Button variant="outline" onClick={() => setGa4Step("credentials")} className="w-full gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar e tentar novamente
          </Button>
        </Card>
      )}

      {ga4Step === "connected" && (
        <Card className="p-5 space-y-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Conexão GA4 verificada com sucesso!</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Propriedade ({properties.length} encontrada{properties.length !== 1 ? "s" : ""})</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.propertyId} value={p.propertyId}>
                      {p.displayName} ({p.account})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Conexão", value: connectionName },
                { label: "Propriedade ID", value: selectedProperty },
                { label: "Total", value: `${properties.length} propriedade${properties.length !== 1 ? "s" : ""}` },
                { label: "Status", value: "Conectado" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
                  <div><span className="text-muted-foreground">{item.label}:</span> <span className="font-medium text-foreground">{item.value}</span></div>
                </div>
              ))}
            </div>
            <Button onClick={saveConnection} disabled={savingConnection || !selectedProperty} className="w-full gap-2 text-sm">
              {savingConnection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {savingConnection ? "Salvando..." : "Salvar conexão GA4"}
            </Button>
          </motion.div>
        </Card>
      )}

      {ga4Step === "saved" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">Conexão GA4 salva com sucesso!</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
              <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
              <div><span className="text-muted-foreground">Conexão:</span> <span className="font-medium text-foreground">{connectionName}</span></div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
              <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
              <div><span className="text-muted-foreground">Propriedade:</span> <span className="font-medium text-foreground">{selectedProperty}</span></div>
            </div>
          </div>
          <Button variant="outline" onClick={() => { setGa4Step("credentials"); setJsonInput(""); setParsedCreds(null); }} className="w-full gap-2 text-xs">
            Reconectar com novas credenciais
          </Button>
        </Card>
      )}

      <GA4TutorialModal open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </div>
  );
}

/* ─── Step 5: Tracking ─── */
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
          <button onClick={() => setMethod("script")} className={cn("flex-1 p-3 rounded-lg border text-xs font-medium text-center transition-all", method === "script" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20")}>📋 Script / Tag</button>
          <button onClick={() => setMethod("plugin")} className={cn("flex-1 p-3 rounded-lg border text-xs font-medium text-center transition-all", method === "plugin" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20")}>🔌 Plugin WordPress</button>
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

/* ─── Step 6: Ads ─── */
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
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Megaphone className="h-4 w-4 text-primary" /></div>
              <div>
                <span className="text-sm font-medium text-foreground">Google Ads</span>
                <p className="text-[10px] text-muted-foreground">Campanhas, custos, conversões e ROAS</p>
              </div>
            </div>
            {gadsConnected ? <Badge className="text-[10px] bg-success/10 text-success border-0">Conectado</Badge> : <Button size="sm" className="text-xs gap-1.5" onClick={() => setGadsConnected(true)}><ExternalLink className="h-3 w-3" /> Conectar</Button>}
          </div>
          {gadsConnected && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border">
              <Select defaultValue="123-456-7890"><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="123-456-7890">Conta: 123-456-7890</SelectItem></SelectContent></Select>
            </motion.div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="h-4 w-4 text-primary" /></div>
              <div>
                <span className="text-sm font-medium text-foreground">Meta Ads</span>
                <p className="text-[10px] text-muted-foreground">Facebook & Instagram Ads, pixel e eventos</p>
              </div>
            </div>
            {metaConnected ? <Badge className="text-[10px] bg-success/10 text-success border-0">Conectado</Badge> : <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setMetaConnected(true)}><ExternalLink className="h-3 w-3" /> Conectar</Button>}
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

/* ─── Step 7: AI Agent ─── */
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
                  objective === obj.value ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" : "border-border text-muted-foreground hover:border-foreground/20")}>
                <obj.icon className="h-4 w-4" />{obj.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Frequência de análises</Label>
          <Select value={frequency} onValueChange={setFrequency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Diário</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent></Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Metas (opcional)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Cliques/mês</Label><Input placeholder="30000" type="number" className="h-8 text-xs" /></div>
            <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Conversões/mês</Label><Input placeholder="500" type="number" className="h-8 text-xs" /></div>
          </div>
        </div>
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-warning" /><Label className="text-xs font-medium">Alertas Automáticos</Label></div>
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
