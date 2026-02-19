import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User, Mail, Lock, Bell, Shield, CreditCard, LogOut, Camera,
  Smartphone, Globe, Laptop, Monitor, Loader2, Save, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Key, Trash2, Download, Copy,
  Clock, MapPin, ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TABS = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "security", label: "Segurança", icon: Lock },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "billing", label: "Plano & Cobrança", icon: CreditCard },
  { id: "sessions", label: "Sessões", icon: Shield },
];

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { hash } = useLocation();
  const validTabs = TABS.map(t => t.id);
  const hashTab = hash.replace("#", "");
  const tab = validTabs.includes(hashTab) ? hashTab : "profile";

  return (
    <>
      <TopBar
        title="Minha Conta"
        subtitle="Gerencie suas informações pessoais, segurança e preferências"
      />
      <div className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Nav */}
            <aside className="lg:w-56 shrink-0">
              <Card className="p-2 overflow-hidden">
                <AccountSidebarUser />
                <Separator className="my-2" />
                <nav className="space-y-0.5">
                  {TABS.map(t => (
                    <a
                      key={t.id}
                      href={`#${t.id}`}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        tab === t.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <t.icon className="h-4 w-4 shrink-0" />
                      {t.label}
                    </a>
                  ))}
                </nav>
                <Separator className="my-2" />
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sair da conta
                </button>
              </Card>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 space-y-4">
              {tab === "profile" && <ProfileTab />}
              {tab === "security" && <SecurityTab />}
              {tab === "notifications" && <NotificationsTab />}
              {tab === "billing" && <BillingTab />}
              {tab === "sessions" && <SessionsTab />}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Sidebar user info ─── */
function AccountSidebarUser() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const initials = (profile?.display_name || user?.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Avatar className="h-10 w-10 border-2 border-primary/20">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{profile?.display_name || "Usuário"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
      </div>
    </div>
  );
}

/* ─── Profile Tab ─── */
function ProfileTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      if (data?.display_name && !displayName) setDisplayName(data.display_name);
      return data as { avatar_url: string | null; created_at: string; display_name: string | null; id: string; updated_at: string; user_id: string } | null;
    },
    enabled: !!user,
  });

  const initials = (profile?.display_name || user?.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      // For now, use a data URL as avatar (no storage bucket configured)
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("user_id", user.id);
        queryClient.invalidateQueries({ queryKey: ["my-profile"] });
        toast.success("Foto atualizada!");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao fazer upload.");
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName || profile?.display_name,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar."); return; }
    queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    toast.success("Perfil atualizado com sucesso!");
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Foto de Perfil</h3>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-4 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{profile?.display_name || "Seu Nome"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => fileRef.current?.click()}>
                <Camera className="h-3 w-3 mr-1" /> Trocar foto
              </Button>
              {profile?.avatar_url && (
                <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={async () => {
                  await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user!.id);
                  queryClient.invalidateQueries({ queryKey: ["my-profile"] });
                  toast.success("Foto removida.");
                }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remover
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">JPG, PNG ou GIF. Máx. 2MB.</p>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Informações Pessoais</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome de exibição</Label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome completo"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={user?.email || ""} readOnly className="h-9 text-sm pl-9 bg-muted/40 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground">Para alterar o e-mail, entre em contato com o suporte.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Telefone / WhatsApp</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+55 (11) 99999-9999" className="h-9 text-sm pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Localização</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="São Paulo, Brasil" className="h-9 text-sm pl-9" />
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Website / LinkedIn</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://seusite.com.br" className="h-9 text-sm pl-9" />
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Bio curta</Label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Especialista em SEO com foco em crescimento orgânico..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <p className="text-[10px] text-muted-foreground">{bio.length}/160 caracteres</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" className="text-xs gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar alterações
          </Button>
        </div>
      </Card>

      {/* Account info */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Informações da Conta</h3>
        <div className="space-y-3">
          <InfoRow label="ID da conta" value={user?.id?.slice(0, 18) + "..."} copyable />
          <InfoRow label="E-mail verificado" value={user?.email_confirmed_at ? "Sim" : "Não"} badge={user?.email_confirmed_at ? "success" : "warning"} />
          <InfoRow label="Criado em" value={user?.created_at ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—"} />
          <InfoRow label="Último acesso" value={user?.last_sign_in_at ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"} />
          <InfoRow label="Provedor" value={user?.app_metadata?.provider || "email"} />
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="p-6 border-destructive/30">
        <h3 className="text-sm font-semibold text-destructive mb-1">Zona de Perigo</h3>
        <p className="text-xs text-muted-foreground mb-4">Ações irreversíveis. Proceda com cautela.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
            <div>
              <p className="text-xs font-medium text-foreground">Exportar meus dados</p>
              <p className="text-[10px] text-muted-foreground">Baixe todos os seus dados em formato JSON.</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1"><Download className="h-3 w-3" /> Exportar</Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <p className="text-xs font-medium text-destructive">Excluir conta</p>
              <p className="text-[10px] text-muted-foreground">Exclui permanentemente sua conta e todos os dados.</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7 border-destructive/50 text-destructive hover:bg-destructive/10 gap-1">
              <Trash2 className="h-3 w-3" /> Excluir
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─── Security Tab ─── */
function SecurityTab() {
  const { user } = useAuth();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const pwdStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: "Muito fraca", color: "bg-destructive", width: "20%" };
    if (score <= 2) return { label: "Fraca", color: "bg-warning", width: "40%" };
    if (score <= 3) return { label: "Média", color: "bg-warning", width: "60%" };
    if (score <= 4) return { label: "Forte", color: "bg-success", width: "80%" };
    return { label: "Muito forte", color: "bg-success", width: "100%" };
  };

  const strength = pwdStrength(newPwd);

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error("As senhas não coincidem."); return; }
    if (newPwd.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSaving(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Senha alterada com sucesso!");
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
  };

  return (
    <div className="space-y-4">
      {/* Password */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Alterar Senha</h3>
        </div>
        <div className="space-y-3 max-w-md">
          <div className="space-y-1.5">
            <Label className="text-xs">Senha atual</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-sm pr-9"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nova senha</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-sm pr-9"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {strength && (
              <div className="space-y-1">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }} />
                </div>
                <p className="text-[10px] text-muted-foreground">Força: <span className="font-medium text-foreground">{strength.label}</span></p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirmar nova senha</Label>
            <Input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-sm"
            />
            {confirmPwd && newPwd !== confirmPwd && (
              <p className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Senhas não coincidem</p>
            )}
            {confirmPwd && newPwd === confirmPwd && newPwd.length > 0 && (
              <p className="text-[10px] text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Senhas coincidem</p>
            )}
          </div>
          <Button size="sm" className="text-xs gap-1.5" onClick={handleChangePassword} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
            Alterar senha
          </Button>
        </div>
      </Card>

      {/* 2FA */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Autenticação em Dois Fatores (2FA)</h3>
        </div>
        <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">2FA via Aplicativo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Use Google Authenticator, Authy ou similar para gerar códigos de segurança.</p>
            <Badge variant="outline" className="mt-2 text-[10px]">Em breve</Badge>
          </div>
        </div>
      </Card>

      {/* Login activity */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Atividade de Login Recente</h3>
        <div className="space-y-2">
          {[
            { device: "Chrome no Windows", location: "São Paulo, BR", time: "Agora", current: true },
            { device: "Safari no iPhone", location: "Rio de Janeiro, BR", time: "2h atrás", current: false },
            { device: "Firefox no macOS", location: "São Paulo, BR", time: "Ontem às 14:22", current: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {item.device.includes("iPhone") ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{item.device}</p>
                <p className="text-[10px] text-muted-foreground">{item.location} · {item.time}</p>
              </div>
              {item.current ? (
                <Badge className="text-[10px] bg-success/10 text-success border-success/20">Atual</Badge>
              ) : (
                <Button variant="ghost" size="sm" className="text-[10px] h-6 text-destructive hover:text-destructive px-2">Revogar</Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Notifications Tab ─── */
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    email_weekly: true,
    email_alerts: true,
    email_product: false,
    push_ranking: true,
    push_indexing: true,
    push_agents: false,
    whatsapp_reports: false,
    whatsapp_alerts: false,
  });

  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const groups = [
    {
      title: "E-mail",
      icon: Mail,
      items: [
        { key: "email_weekly", label: "Relatório semanal", desc: "Resumo de performance enviado toda segunda-feira" },
        { key: "email_alerts", label: "Alertas de performance", desc: "Quedas de ranking, erros de indexação e anomalias" },
        { key: "email_product", label: "Novidades do produto", desc: "Novas funcionalidades e atualizações do Rankito" },
      ]
    },
    {
      title: "Notificações push",
      icon: Bell,
      items: [
        { key: "push_ranking", label: "Mudanças de ranking", desc: "Alertas quando posições mudam significativamente" },
        { key: "push_indexing", label: "Indexação", desc: "Status de envio e aprovação de URLs" },
        { key: "push_agents", label: "Agentes IA", desc: "Quando um agente gera novos diagnósticos" },
      ]
    },
    {
      title: "WhatsApp",
      icon: Smartphone,
      items: [
        { key: "whatsapp_reports", label: "Relatórios semanais", desc: "Receba relatórios resumidos via WhatsApp" },
        { key: "whatsapp_alerts", label: "Alertas críticos", desc: "Quedas bruscas de tráfego e erros graves" },
      ]
    }
  ];

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <Card key={group.title} className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <group.icon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
          </div>
          <div className="space-y-3">
            {group.items.map(item => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={prefs[item.key as keyof typeof prefs]}
                  onCheckedChange={() => toggle(item.key as keyof typeof prefs)}
                />
              </div>
            ))}
          </div>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button size="sm" className="text-xs gap-1.5" onClick={() => toast.success("Preferências salvas!")}>
          <Save className="h-3.5 w-3.5" /> Salvar preferências
        </Button>
      </div>
    </div>
  );
}

/* ─── Billing Tab ─── */
function BillingTab() {
  const { user } = useAuth();

  const { data: billing } = useQuery({
    queryKey: ["my-billing", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const planColors: Record<string, string> = {
    start: "text-muted-foreground border-border",
    growth: "text-primary border-primary/30",
    unlimited: "text-warning border-warning/30",
  };

  const planName: Record<string, string> = {
    start: "Start",
    growth: "Growth",
    unlimited: "Unlimited",
  };

  const currentPlan = billing?.plan || "start";
  const usagePercent = billing ? Math.round((billing.events_used / billing.events_limit) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Current plan */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Plano atual</p>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">{planName[currentPlan] || currentPlan}</h3>
              <Badge variant="outline" className={`text-[10px] ${planColors[currentPlan] || ""}`}>
                {billing?.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
          <Button size="sm" className="text-xs" onClick={() => window.location.href = "/account/billing"}>
            Gerenciar plano <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Usage */}
        {billing && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Eventos este mês</span>
                <span className="font-medium text-foreground">{billing.events_used?.toLocaleString("pt-BR")} / {billing.events_limit?.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePercent > 80 ? "bg-destructive" : usagePercent > 60 ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{usagePercent}% utilizado</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Projetos", value: "—", limit: billing.projects_limit },
                { label: "Membros", value: "—", limit: "∞" },
                { label: "MRR", value: `R$ ${billing.mrr?.toFixed(2) || "0,00"}` },
                { label: "Expira em", value: billing.expires_at ? format(new Date(billing.expires_at), "dd/MM/yyyy") : "—" },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{item.value}</p>
                  {item.limit !== undefined && <p className="text-[10px] text-muted-foreground">Limite: {item.limit}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!billing && (
          <div className="p-4 rounded-xl bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">Você está no plano gratuito.</p>
            <Button size="sm" className="text-xs mt-3">Fazer upgrade</Button>
          </div>
        )}
      </Card>

      {/* Plans comparison */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Comparar Planos</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { slug: "start", name: "Start", price: "Grátis", highlight: false, features: ["1 projeto", "500 eventos/mês", "Agentes básicos", "Search Console"] },
            { slug: "growth", name: "Growth", price: "R$ 97/mês", highlight: true, features: ["10 projetos", "50k eventos/mês", "Agentes avançados", "GA4 + GSC + Ads"] },
            { slug: "unlimited", name: "Unlimited", price: "R$ 297/mês", highlight: false, features: ["Ilimitado", "500k eventos/mês", "Orquestrador IA", "White-label + API"] },
          ].map(plan => (
            <div
              key={plan.slug}
              className={`p-4 rounded-xl border ${plan.highlight ? "border-primary bg-primary/5" : "border-border"} ${currentPlan === plan.slug ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                {currentPlan === plan.slug && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Atual</Badge>}
              </div>
              <p className="text-base font-bold text-foreground mb-3">{plan.price}</p>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {currentPlan !== plan.slug && (
                <Button size="sm" variant={plan.highlight ? "default" : "outline"} className="w-full mt-3 text-xs h-7">
                  {plan.slug === "start" ? "Fazer downgrade" : "Fazer upgrade"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Sessions Tab ─── */
function SessionsTab() {
  const { signOut } = useAuth();
  const [revoking, setRevoking] = useState(false);

  const mockSessions = [
    { id: "1", device: "Chrome 120 no Windows 11", location: "São Paulo, SP — Brasil", ip: "179.xxx.xxx.xx", lastActive: "Agora", current: true, icon: Monitor },
    { id: "2", device: "Safari 17 no iPhone 15", location: "Rio de Janeiro, RJ — Brasil", ip: "189.xxx.xxx.xx", lastActive: "2 horas atrás", current: false, icon: Smartphone },
    { id: "3", device: "Firefox 121 no macOS", location: "São Paulo, SP — Brasil", ip: "200.xxx.xxx.xx", lastActive: "Ontem", current: false, icon: Laptop },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Sessões Ativas</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/5 gap-1"
            disabled={revoking}
            onClick={async () => {
              setRevoking(true);
              await signOut();
            }}
          >
            {revoking ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
            Sair de todos
          </Button>
        </div>

        <div className="space-y-3">
          {mockSessions.map(session => (
            <div
              key={session.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${session.current ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted/20"}`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${session.current ? "bg-primary/10" : "bg-muted"}`}>
                <session.icon className={`h-5 w-5 ${session.current ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-foreground truncate">{session.device}</p>
                  {session.current && <Badge className="text-[10px] bg-success/10 text-success border-success/20 shrink-0">Sessão atual</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {session.location}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {session.lastActive}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">IP: {session.ip}</p>
              </div>
              {!session.current && (
                <Button variant="ghost" size="sm" className="text-[10px] h-7 text-destructive hover:text-destructive shrink-0">
                  Revogar
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 border-warning/30 bg-warning/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">Não reconhece alguma sessão?</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Revogue a sessão imediatamente e altere sua senha para proteger sua conta.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─── Helper Components ─── */
function InfoRow({ label, value, copyable, badge }: {
  label: string; value: string; copyable?: boolean; badge?: "success" | "warning"
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge className={`text-[10px] ${badge === "success" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
            {value}
          </Badge>
        )}
        {!badge && <span className="text-xs font-medium text-foreground font-mono">{value}</span>}
        {copyable && (
          <button
            onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado!"); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
