import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  MapPin,
  Clock,
  FileText,
  Search,
  Link2,
  Zap,
  BarChart3,
  Bot,
  MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Project", icon: Globe },
  { label: "Sitemap", icon: FileText },
  { label: "GSC", icon: Search },
  { label: "GA4", icon: BarChart3 },
  { label: "Tracking", icon: MonitorSmartphone },
  { label: "Ads", icon: Zap },
  { label: "AI Agent", icon: Bot },
];

const SITE_TYPES = [
  { value: "ecommerce", label: "E-commerce", icon: "🛒" },
  { value: "blog", label: "Blog / Content", icon: "📝" },
  { value: "services", label: "Services", icon: "🏢" },
  { value: "marketplace", label: "Marketplace", icon: "🏪" },
  { value: "saas", label: "SaaS", icon: "💻" },
  { value: "local", label: "Local Business", icon: "📍" },
  { value: "news", label: "News / Media", icon: "📰" },
  { value: "portfolio", label: "Portfolio", icon: "🎨" },
];

const COUNTRIES = [
  { value: "BR", label: "Brazil" },
  { value: "US", label: "United States" },
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Spain" },
  { value: "UK", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "MX", label: "Mexico" },
];

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "Europe/Lisbon", label: "Lisbon (GMT+0)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "Europe/London", label: "London (GMT+0)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)" },
  { value: "America/Mexico_City", label: "Mexico City (GMT-6)" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [project, setProject] = useState({
    name: "",
    domain: "",
    type: "",
    country: "",
    timezone: "",
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
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-foreground tracking-tight">Rankito</span>
          <span className="text-muted-foreground text-sm">/ New Project</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
          Cancel
        </Button>
      </header>

      {/* Progress */}
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

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-lg">
          {step === 0 && (
            <StepCreateProject project={project} setProject={setProject} />
          )}
          {step === 1 && <StepPlaceholder title="Connect Sitemap" description="Enter your sitemap URL to import all pages automatically." icon={Link2} />}
          {step === 2 && <StepPlaceholder title="Connect Google Search Console" description="Link your GSC property to import SEO performance data." icon={Search} />}
          {step === 3 && <StepPlaceholder title="Connect GA4" description="Link your Google Analytics 4 property to import traffic data." icon={BarChart3} />}
          {step === 4 && <StepPlaceholder title="Install Tracking" description="Add the Rankito tracking script to capture behavioral events." icon={MonitorSmartphone} />}
          {step === 5 && <StepPlaceholder title="Connect Ads" description="Link your Google Ads and Meta Ads accounts." icon={Zap} />}
          {step === 6 && <StepPlaceholder title="Configure AI Agent" description="Set your goals and preferences for the Rankito AI analyst." icon={Bot} />}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step > 0 ? setStep(step - 1) : navigate("/projects"))}
            className="gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <div className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </div>
          <Button
            size="sm"
            onClick={handleNext}
            disabled={!canAdvance}
            className="gap-1.5"
          >
            {step === STEPS.length - 1 ? "Finish" : "Continue"} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

function StepCreateProject({
  project,
  setProject,
}: {
  project: { name: string; domain: string; type: string; country: string; timezone: string };
  setProject: React.Dispatch<React.SetStateAction<typeof project>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Create your project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about the site you want to track and optimize.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium">Project name</Label>
          <Input
            id="name"
            placeholder="My Website"
            value={project.name}
            onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="domain" className="text-xs font-medium">Domain</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              id="domain"
              placeholder="example.com"
              className="pl-9"
              value={project.domain}
              onChange={(e) => setProject((p) => ({ ...p, domain: e.target.value }))}
            />
          </div>
        </div>

        {/* Site type grid */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Site type</Label>
          <div className="grid grid-cols-4 gap-2">
            {SITE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setProject((p) => ({ ...p, type: t.value }))}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-all",
                  project.type === t.value
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                )}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Country
            </Label>
            <Select value={project.country} onValueChange={(v) => setProject((p) => ({ ...p, country: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" /> Timezone
            </Label>
            <Select value={project.timezone} onValueChange={(v) => setProject((p) => ({ ...p, timezone: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          This integration step will be available when APIs are connected.
        </p>
        <p className="text-xs text-muted-foreground mt-1">You can skip this for now.</p>
      </Card>
    </div>
  );
}
