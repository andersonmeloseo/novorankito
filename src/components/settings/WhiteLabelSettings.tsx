import { useState } from "react";
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
import { Palette, Globe, Type, Image, Loader2, Save, RotateCcw, Mail, Link2, LogIn } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface WhiteLabelSettingsProps {
  projectId: string;
}

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
};

export function WhiteLabelSettings({ projectId }: WhiteLabelSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

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

  const [form, setForm] = useState(defaultForm);

  const [synced, setSynced] = useState(false);
  if (settings && !synced) {
    setForm({
      brand_name: settings.brand_name || "Rankito",
      subtitle: (settings as any).subtitle || "SEO Intelligence",
      logo_url: settings.logo_url || "",
      favicon_url: settings.favicon_url || "",
      primary_color: settings.primary_color || "#6366f1",
      accent_color: settings.accent_color || "#22c55e",
      sidebar_bg_color: (settings as any).sidebar_bg_color || "",
      text_color: (settings as any).text_color || "",
      custom_domain: settings.custom_domain || "",
      footer_text: settings.footer_text || "",
      hide_powered_by: settings.hide_powered_by || false,
      login_title: (settings as any).login_title || "",
      login_subtitle: (settings as any).login_subtitle || "",
      support_email: (settings as any).support_email || "",
      support_url: (settings as any).support_url || "",
    });
    setSynced(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (settings) {
        const { error } = await supabase
          .from("whitelabel_settings")
          .update(payload)
          .eq("id", settings.id);
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

  const colorField = (label: string, field: keyof typeof form, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={(form[field] as string) || "#000000"}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          className="h-8 w-10 rounded border cursor-pointer"
        />
        <Input
          className="h-8 text-sm flex-1"
          placeholder={placeholder || "#hex"}
          value={form[field] as string}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4" />
          White-Label
          <Badge variant="secondary" className="text-[10px]">Enterprise</Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Personalize completamente a marca do seu projeto para seus clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Brand Identity */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identidade da Marca</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Type className="h-3 w-3" /> Nome da marca</Label>
              <Input className="h-8 text-sm" value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Type className="h-3 w-3" /> Subtítulo</Label>
              <Input className="h-8 text-sm" placeholder="SEO Intelligence" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Image className="h-3 w-3" /> URL do Logo</Label>
              <Input className="h-8 text-sm" placeholder="https://..." value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Image className="h-3 w-3" /> URL do Favicon</Label>
              <Input className="h-8 text-sm" placeholder="https://..." value={form.favicon_url} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Colors */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cores</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colorField("Cor primária", "primary_color", "#6366f1")}
            {colorField("Cor de destaque", "accent_color", "#22c55e")}
            {colorField("Fundo da sidebar", "sidebar_bg_color", "Padrão do tema")}
            {colorField("Cor do texto", "text_color", "Padrão do tema")}
          </div>
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
              <Input className="h-8 text-sm" placeholder="Bem-vindo ao Rankito" value={form.login_title} onChange={(e) => setForm({ ...form, login_title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subtítulo do login</Label>
              <Input className="h-8 text-sm" placeholder="Entre na sua conta" value={form.login_subtitle} onChange={(e) => setForm({ ...form, login_subtitle: e.target.value })} />
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
              <Input className="h-8 text-sm" placeholder="app.suaempresa.com" value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> E-mail de suporte</Label>
              <Input className="h-8 text-sm" placeholder="suporte@suaempresa.com" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1.5"><Link2 className="h-3 w-3" /> URL de suporte / Central de ajuda</Label>
              <Input className="h-8 text-sm" placeholder="https://ajuda.suaempresa.com" value={form.support_url} onChange={(e) => setForm({ ...form, support_url: e.target.value })} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Footer & Misc */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Texto do rodapé</Label>
            <Input className="h-8 text-sm" placeholder="© 2026 Sua Empresa" value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Ocultar "Powered by Rankito"</Label>
            <Switch checked={form.hide_powered_by} onCheckedChange={(v) => setForm({ ...form, hide_powered_by: v })} />
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
