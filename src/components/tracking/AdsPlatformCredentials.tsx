import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AnimatedContainer } from "@/components/ui/animated-container";
import {
  Settings, Eye, EyeOff, Save, CheckCircle2, AlertTriangle, KeyRound,
  Plus, Pencil, Trash2, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password";
  hint?: string;
}

const GOOGLE_ADS_FIELDS: CredentialField[] = [
  { key: "account_name", label: "Nome da Conta", placeholder: "Ex: Conta Principal MCC", hint: "Nome para identificar esta conta" },
  { key: "customer_id", label: "Customer ID", placeholder: "123-456-7890", hint: "ID da conta Google Ads (com hífens)" },
  { key: "developer_token", label: "Developer Token", placeholder: "XXXXXXXXXXXXXXXX", type: "password", hint: "Token de desenvolvedor da conta MCC" },
  { key: "client_id", label: "OAuth Client ID", placeholder: "xxxxx.apps.googleusercontent.com", hint: "Client ID do Google Cloud Console" },
  { key: "client_secret", label: "OAuth Client Secret", placeholder: "GOCSPX-xxxxx", type: "password" },
  { key: "refresh_token", label: "Refresh Token", placeholder: "1//0xxxxx", type: "password", hint: "Token de refresh do OAuth2" },
];

const META_ADS_FIELDS: CredentialField[] = [
  { key: "account_name", label: "Nome da Conta", placeholder: "Ex: Pixel Principal", hint: "Nome para identificar esta conta" },
  { key: "pixel_id", label: "Pixel ID", placeholder: "123456789012345", hint: "ID do pixel do Meta/Facebook" },
  { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxx...", type: "password", hint: "Token de acesso da API de Conversões (CAPI)" },
];

function CredentialInput({ field, value, onChange }: { field: CredentialField; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const isPassword = field.type === "password";

  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{field.label}</Label>
      <div className="relative">
        <Input
          type={isPassword && !show ? "password" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="text-xs h-8 pr-8 font-mono"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {field.hint && <p className="text-[9px] text-muted-foreground">{field.hint}</p>}
    </div>
  );
}

interface GoogleAdsAccount {
  id: string;
  account_name: string;
  customer_id: string;
  is_active: boolean;
  auto_connected: boolean;
  created_at: string;
}

interface MetaAdsAccount {
  id: string;
  account_name: string;
  pixel_id: string;
  is_active: boolean;
  auto_connected: boolean;
  created_at: string;
}

function useGoogleAdsAccounts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["google-ads-connections", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("google_ads_connections")
        .select("id, account_name, customer_id, is_active, auto_connected, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as GoogleAdsAccount[];
    },
    enabled: !!projectId,
  });
}

function useMetaAdsAccounts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["meta-ads-connections", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("meta_ads_connections")
        .select("id, account_name, pixel_id, is_active, auto_connected, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as MetaAdsAccount[];
    },
    enabled: !!projectId,
  });
}

function GoogleAdsSection({ projectId }: { projectId: string | undefined }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading } = useGoogleAdsAccounts(projectId);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm({});
    setAdding(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!projectId || !user) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("google_ads_connections")
          .update({
            account_name: form.account_name || "",
            customer_id: form.customer_id || "",
            developer_token: form.developer_token || null,
            client_id: form.client_id || null,
            client_secret: form.client_secret || null,
            refresh_token: form.refresh_token || null,
          })
          .eq("id", editing);
        if (error) throw error;
        toast.success("Conta Google Ads atualizada!");
      } else {
        const { error } = await supabase
          .from("google_ads_connections")
          .insert({
            owner_id: user.id,
            project_id: projectId,
            account_name: form.account_name || "",
            customer_id: form.customer_id || "",
            developer_token: form.developer_token || null,
            client_id: form.client_id || null,
            client_secret: form.client_secret || null,
            refresh_token: form.refresh_token || null,
          });
        if (error) throw error;
        toast.success("Conta Google Ads adicionada!");
      }
      queryClient.invalidateQueries({ queryKey: ["google-ads-connections"] });
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("google_ads_connections").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Conta removida");
    queryClient.invalidateQueries({ queryKey: ["google-ads-connections"] });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("google_ads_connections").update({ is_active: active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["google-ads-connections"] });
  };

  const startEdit = async (account: GoogleAdsAccount) => {
    // Fetch full record for editing
    const { data } = await supabase
      .from("google_ads_connections")
      .select("*")
      .eq("id", account.id)
      .single();
    if (data) {
      setForm({
        account_name: data.account_name || "",
        customer_id: data.customer_id || "",
        developer_token: data.developer_token || "",
        client_id: data.client_id || "",
        client_secret: data.client_secret || "",
        refresh_token: data.refresh_token || "",
      });
      setEditing(account.id);
      setAdding(false);
    }
  };

  const showForm = adding || editing;

  return (
    <Card className="p-4 bg-muted/20 border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold border-chart-3/40 text-chart-3">Google Ads</Badge>
          <span className="text-[9px] text-muted-foreground">{accounts.length} conta(s)</span>
        </div>
        {!showForm && (
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => { resetForm(); setAdding(true); }}>
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        )}
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />}

      {/* Account list */}
      {!showForm && accounts.map((acc) => (
        <div key={acc.id} className="flex items-center justify-between p-2.5 rounded-md bg-background/60 border border-border/40">
          <div className="flex items-center gap-2 min-w-0">
            <Switch checked={acc.is_active} onCheckedChange={(v) => handleToggle(acc.id, v)} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground truncate">
                {acc.account_name || acc.customer_id}
              </div>
              <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                ID: {acc.customer_id}
                {acc.auto_connected && <Badge variant="secondary" className="text-[8px] h-4">Auto</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(acc)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(acc.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {accounts.length === 0 && !showForm && !isLoading && (
        <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma conta conectada</p>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground">{editing ? "Editar Conta" : "Nova Conta"}</span>
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={resetForm}><X className="h-3 w-3" /></Button>
          </div>
          {GOOGLE_ADS_FIELDS.map(field => (
            <CredentialInput
              key={field.key}
              field={field}
              value={form[field.key] || ""}
              onChange={v => setForm(prev => ({ ...prev, [field.key]: v }))}
            />
          ))}
          <Button
            size="sm" className="w-full h-8 text-xs gap-1.5 mt-1"
            disabled={!form.customer_id?.trim() || saving}
            onClick={handleSave}
          >
            {saving ? <><Settings className="h-3 w-3 animate-spin" /> Salvando...</> : <><Save className="h-3 w-3" /> {editing ? "Atualizar" : "Salvar"}</>}
          </Button>
        </div>
      )}
    </Card>
  );
}

function MetaAdsSection({ projectId }: { projectId: string | undefined }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading } = useMetaAdsAccounts(projectId);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({}); setAdding(false); setEditing(null); };

  const handleSave = async () => {
    if (!projectId || !user) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("meta_ads_connections")
          .update({ account_name: form.account_name || "", pixel_id: form.pixel_id || "", access_token: form.access_token || null })
          .eq("id", editing);
        if (error) throw error;
        toast.success("Conta Meta Ads atualizada!");
      } else {
        const { error } = await supabase
          .from("meta_ads_connections")
          .insert({ owner_id: user.id, project_id: projectId, account_name: form.account_name || "", pixel_id: form.pixel_id || "", access_token: form.access_token || null });
        if (error) throw error;
        toast.success("Conta Meta Ads adicionada!");
      }
      queryClient.invalidateQueries({ queryKey: ["meta-ads-connections"] });
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meta_ads_connections").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Conta removida");
    queryClient.invalidateQueries({ queryKey: ["meta-ads-connections"] });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("meta_ads_connections").update({ is_active: active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["meta-ads-connections"] });
  };

  const startEdit = async (account: MetaAdsAccount) => {
    const { data } = await supabase.from("meta_ads_connections").select("*").eq("id", account.id).single();
    if (data) {
      setForm({ account_name: data.account_name || "", pixel_id: data.pixel_id || "", access_token: data.access_token || "" });
      setEditing(account.id);
      setAdding(false);
    }
  };

  const showForm = adding || editing;

  return (
    <Card className="p-4 bg-muted/20 border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold border-chart-4/40 text-chart-4">Meta Ads</Badge>
          <span className="text-[9px] text-muted-foreground">{accounts.length} conta(s)</span>
        </div>
        {!showForm && (
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => { resetForm(); setAdding(true); }}>
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        )}
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />}

      {!showForm && accounts.map((acc) => (
        <div key={acc.id} className="flex items-center justify-between p-2.5 rounded-md bg-background/60 border border-border/40">
          <div className="flex items-center gap-2 min-w-0">
            <Switch checked={acc.is_active} onCheckedChange={(v) => handleToggle(acc.id, v)} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{acc.account_name || acc.pixel_id}</div>
              <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                Pixel: {acc.pixel_id}
                {acc.auto_connected && <Badge variant="secondary" className="text-[8px] h-4">Auto</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(acc)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(acc.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {accounts.length === 0 && !showForm && !isLoading && (
        <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma conta conectada</p>
      )}

      {showForm && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground">{editing ? "Editar Conta" : "Nova Conta"}</span>
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={resetForm}><X className="h-3 w-3" /></Button>
          </div>
          {META_ADS_FIELDS.map(field => (
            <CredentialInput key={field.key} field={field} value={form[field.key] || ""} onChange={v => setForm(prev => ({ ...prev, [field.key]: v }))} />
          ))}
          <Button
            size="sm" className="w-full h-8 text-xs gap-1.5 mt-1"
            disabled={!form.pixel_id?.trim() || saving}
            onClick={handleSave}
          >
            {saving ? <><Settings className="h-3 w-3 animate-spin" /> Salvando...</> : <><Save className="h-3 w-3" /> {editing ? "Atualizar" : "Salvar"}</>}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function AdsPlatformCredentials({ projectId }: { projectId?: string }) {
  return (
    <AnimatedContainer delay={0.06}>
      <Card className="p-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-primary" />
          Contas de Ads Conectadas
        </h3>
        <p className="text-[10px] text-muted-foreground mb-4">
          Gerencie suas contas de plataformas de Ads. Adicione, edite ou remova conexões a qualquer momento.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <GoogleAdsSection projectId={projectId} />
          <MetaAdsSection projectId={projectId} />
        </div>
      </Card>
    </AnimatedContainer>
  );
}
