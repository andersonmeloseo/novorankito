import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Palette, Globe, Type, Image, Loader2, Save, RotateCcw, Mail, Link2, LogIn, Eye, EyeOff, Blend, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface WhiteLabelSettingsProps {
  projectId: string;
}

type FormState = typeof defaultForm;

const defaultForm = {
  brand_name: "Rankito",
  subtitle: "SEO Intelligence",
  logo_url: "",
  favicon_url: "",
  primary_color: "#6366f1",
  accent_color: "#22c55e",
  sidebar_bg_color: "",
  text_color: "",
  custom_domain: "",
  footer_text: "",
  hide_powered_by: false,
  login_title: "",
  login_subtitle: "",
  support_email: "",
  support_url: "",
  gradient_end_color: "",
};

/* ─── Color Presets ─── */
const COLOR_PRESETS = [
  { name: "Indigo", primary: "#6366f1", accent: "#22c55e", gradient: "" },
  { name: "Roxo Neon", primary: "#8b5cf6", accent: "#f59e0b", gradient: "#ec4899" },
  { name: "Azul Ocean", primary: "#0ea5e9", accent: "#14b8a6", gradient: "#6366f1" },
  { name: "Vermelho Fire", primary: "#ef4444", accent: "#f97316", gradient: "#ec4899" },
  { name: "Esmeralda", primary: "#10b981", accent: "#06b6d4", gradient: "#22d3ee" },
  { name: "Sunset", primary: "#f97316", accent: "#eab308", gradient: "#ef4444" },
  { name: "Rose Gold", primary: "#e11d48", accent: "#f43f5e", gradient: "#fb923c" },
  { name: "Midnight", primary: "#3b82f6", accent: "#8b5cf6", gradient: "#06b6d4" },
];

/* ─── Helpers ─── */
function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function setHslVar(varName: string, hex: string | null) {
  const root = document.documentElement;
  if (hex) {
    const hsl = hexToHsl(hex);
    if (hsl) root.style.setProperty(varName, hsl);
  } else {
    root.style.removeProperty(varName);
  }
}

const CSS_VARS = ["--primary", "--sidebar-primary", "--accent", "--sidebar", "--foreground", "--sidebar-foreground", "--gradient-end"];

function applyLivePreview(form: FormState) {
  setHslVar("--primary", form.primary_color || null);
  setHslVar("--sidebar-primary", form.primary_color || null);
  setHslVar("--accent", form.accent_color || null);
  setHslVar("--sidebar", form.sidebar_bg_color || null);
  setHslVar("--foreground", form.text_color || null);
  setHslVar("--sidebar-foreground", form.text_color || null);
  setHslVar("--gradient-end", form.gradient_end_color || null);
}

function clearLivePreview() {
  const root = document.documentElement;
  CSS_VARS.forEach(v => root.style.removeProperty(v));
}

/* ─── Component ─── */
export function WhiteLabelSettings({ projectId }: WhiteLabelSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [livePreview, setLivePreview] = useState(true);
  const [form, setForm] = useState<FormState>(defaultForm);
  const initializedRef = useRef(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["whitelabel", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whitelabel_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!projectId,
  });

  // Sync form from DB — only once when settings first loads
  useEffect(() => {
    if (initializedRef.current) return;
    if (isLoading) return; // wait for query to finish
    initializedRef.current = true;
    if (!settings) return; // no record yet, keep defaults
    const s = settings as any;
    setForm({
      brand_name: s.brand_name || "Rankito",
      subtitle: s.subtitle || "SEO Intelligence",
      logo_url: s.logo_url || "",
      favicon_url: s.favicon_url || "",
      primary_color: s.primary_color || "#6366f1",
      accent_color: s.accent_color || "#22c55e",
      sidebar_bg_color: s.sidebar_bg_color || "",
      text_color: s.text_color || "",
      custom_domain: s.custom_domain || "",
      footer_text: s.footer_text || "",
      hide_powered_by: s.hide_powered_by || false,
      login_title: s.login_title || "",
      login_subtitle: s.login_subtitle || "",
      support_email: s.support_email || "",
      support_url: s.support_url || "",
      gradient_end_color: s.gradient_end_color || "",
    });
  }, [settings, isLoading]);

  // Live preview — apply CSS vars in real time
  useEffect(() => {
    if (!livePreview) return;
    applyLivePreview(form);
  }, [form, livePreview]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => { clearLivePreview(); };
  }, []);

  const updateForm = useCallback((updates: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (settings) {
        const { error } = await supabase
          .from("whitelabel_settings")
          .update(payload)
          .eq("id", (settings as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whitelabel_settings")
          .insert({ ...payload, project_id: projectId, owner_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Salvo!", description: "Configurações white-label atualizadas." });
      qc.invalidateQueries({ queryKey: ["whitelabel", projectId] });
      qc.invalidateQueries({ queryKey: ["whitelabel-runtime", projectId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const colorField = (label: string, field: keyof FormState, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={(form[field] as string) || "#000000"}
          onChange={(e) => updateForm({ [field]: e.target.value })}
          className="h-8 w-10 rounded border cursor-pointer"
        />
        <Input
          className="h-8 text-sm flex-1"
          placeholder={placeholder || "#hex"}
          value={form[field] as string}
          onChange={(e) => updateForm({ [field]: e.target.value })}
        />
      </div>
    </div>
  );

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    updateForm({
      primary_color: preset.primary,
      accent_color: preset.accent,
      gradient_end_color: preset.gradient,
    });
  };

  const isPresetActive = (preset: typeof COLOR_PRESETS[0]) =>
    form.primary_color === preset.primary &&
    form.accent_color === preset.accent &&
    form.gradient_end_color === preset.gradient;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4" />
              White-Label
              <Badge variant="secondary" className="text-[10px]">Enterprise</Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Personalize completamente a marca do seu projeto — alterações visuais aparecem em tempo real
            </CardDescription>
          </div>
          <Button
            variant={livePreview ? "default" : "outline"}
            size="sm"
            className="text-xs gap-1.5 h-7"
            onClick={() => {
              const next = !livePreview;
              setLivePreview(next);
              if (!next) clearLivePreview();
              else applyLivePreview(form);
            }}
          >
            {livePreview ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Preview ao vivo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Brand Identity */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identidade da Marca</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Type className="h-3 w-3" /> Nome da marca</Label>
              <Input className="h-8 text-sm" value={form.brand_name} onChange={(e) => updateForm({ brand_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Type className="h-3 w-3" /> Subtítulo</Label>
              <Input className="h-8 text-sm" placeholder="SEO Intelligence" value={form.subtitle} onChange={(e) => updateForm({ subtitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Image className="h-3 w-3" /> URL do Logo</Label>
              <Input className="h-8 text-sm" placeholder="https://..." value={form.logo_url} onChange={(e) => updateForm({ logo_url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Image className="h-3 w-3" /> URL do Favicon</Label>
              <Input className="h-8 text-sm" placeholder="https://..." value={form.favicon_url} onChange={(e) => updateForm({ favicon_url: e.target.value })} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Color Presets */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🎨 Presets de Cores</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COLOR_PRESETS.map((preset) => {
              const active = isPresetActive(preset);
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all duration-200 hover:scale-[1.03]",
                    active
                      ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {/* Swatch row */}
                  <div className="flex gap-1 w-full">
                    <div
                      className="h-5 flex-1 rounded-l-md"
                      style={{ background: preset.gradient
                        ? `linear-gradient(135deg, ${preset.primary}, ${preset.gradient})`
                        : preset.primary
                      }}
                    />
                    <div className="h-5 w-5 rounded-r-md" style={{ background: preset.accent }} />
                  </div>
                  <span className="text-[10px] font-medium text-foreground">{preset.name}</span>
                  {active && (
                    <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Colors */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cores Manuais</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colorField("Cor primária", "primary_color", "#6366f1")}
            {colorField("Cor de destaque", "accent_color", "#22c55e")}
            {colorField("Fundo da sidebar", "sidebar_bg_color", "Padrão do tema")}
            {colorField("Cor do texto", "text_color", "Padrão do tema")}
          </div>
        </div>

        <Separator />

        {/* Gradient */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Blend className="h-3 w-3" /> Degradê (Gradient)
          </p>
          <p className="text-[11px] text-muted-foreground mb-3">
            Defina uma cor final para criar um degradê a partir da cor primária. Aplicado no logo e destaques.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Cor primária (início)</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.primary_color || "#6366f1"}
                  onChange={(e) => updateForm({ primary_color: e.target.value })}
                  className="h-8 w-10 rounded border cursor-pointer"
                />
                <Input className="h-8 text-sm flex-1" value={form.primary_color} readOnly />
              </div>
            </div>
            {colorField("Cor final (degradê)", "gradient_end_color", "#a855f7")}
          </div>
          {form.primary_color && form.gradient_end_color && (
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs">Preview do degradê</Label>
              <div
                className="h-8 w-full rounded-lg border"
                style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.gradient_end_color})` }}
              />
            </div>
          )}
          {form.gradient_end_color && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs mt-2 h-7 text-muted-foreground"
              onClick={() => updateForm({ gradient_end_color: "" })}
            >
              Remover degradê
            </Button>
          )}
        </div>

        <Separator />

        {/* Login Screen */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <LogIn className="h-3 w-3" /> Tela de Login
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Título do login</Label>
              <Input className="h-8 text-sm" placeholder="Bem-vindo ao Rankito" value={form.login_title} onChange={(e) => updateForm({ login_title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subtítulo do login</Label>
              <Input className="h-8 text-sm" placeholder="Entre na sua conta" value={form.login_subtitle} onChange={(e) => updateForm({ login_subtitle: e.target.value })} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Domain & Support */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Domínio & Suporte</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Globe className="h-3 w-3" /> Domínio customizado</Label>
              <Input className="h-8 text-sm" placeholder="app.suaempresa.com" value={form.custom_domain} onChange={(e) => updateForm({ custom_domain: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> E-mail de suporte</Label>
              <Input className="h-8 text-sm" placeholder="suporte@suaempresa.com" value={form.support_email} onChange={(e) => updateForm({ support_email: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1.5"><Link2 className="h-3 w-3" /> URL de suporte / Central de ajuda</Label>
              <Input className="h-8 text-sm" placeholder="https://ajuda.suaempresa.com" value={form.support_url} onChange={(e) => updateForm({ support_url: e.target.value })} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Footer & Misc */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Texto do rodapé</Label>
            <Input className="h-8 text-sm" placeholder="© 2026 Sua Empresa" value={form.footer_text} onChange={(e) => updateForm({ footer_text: e.target.value })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Ocultar "Powered by Rankito"</Label>
            <Switch checked={form.hide_powered_by} onCheckedChange={(v) => updateForm({ hide_powered_by: v })} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-8 text-sm gap-1.5" onClick={() => { setForm(defaultForm); toast({ title: "Restaurado", description: "Valores padrão aplicados. Clique em Salvar para confirmar." }); }}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>
          <Button className="flex-1 h-8 text-sm gap-1.5" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
