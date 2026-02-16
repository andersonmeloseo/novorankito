import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";
import { User, Shield, CreditCard, FolderOpen, Trash2, Key, Mail } from "lucide-react";
import { useAssignRole } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";

interface ClientEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  role: string | null;
  projects: any[];
  billing: any | null;
  onDeleted?: () => void;
}

const PLANS = [
  { id: "free", nome: "Gratuito" },
  { id: "starter", nome: "Starter" },
  { id: "pro", nome: "Pro" },
  { id: "enterprise", nome: "Enterprise" },
];

export function ClientEditDialog({ open, onOpenChange, profile, role, projects, billing, onDeleted }: ClientEditDialogProps) {
  const [tab, setTab] = useState("perfil");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [billingStatus, setBillingStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const assignRole = useAssignRole();

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
      setSelectedRole(role || "");
      setSelectedPlan(billing?.plan || "free");
      setBillingStatus(billing?.status || "active");
    }
  }, [profile, role, billing]);

  if (!profile) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, avatar_url: avatarUrl || null })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      toast({ title: "Perfil salvo", description: `Nome alterado para "${displayName}"` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await assignRole.mutateAsync({ userId: profile.user_id, role: selectedRole as any });
      toast({ title: "Papel atualizado", description: `Papel "${selectedRole}" atribuído` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBilling = async () => {
    setSaving(true);
    try {
      if (billing) {
        const { error } = await supabase
          .from("billing_subscriptions")
          .update({ plan: selectedPlan, status: billingStatus })
          .eq("id", billing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("billing_subscriptions")
          .insert({ user_id: profile.user_id, plan: selectedPlan, status: billingStatus, mrr: 0, events_limit: 1000, projects_limit: 1 });
        if (error) throw error;
      }
      toast({ title: "Plano salvo", description: `Plano "${selectedPlan}" com status "${billingStatus}"` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    setSaving(true);
    try {
      // Delete billing, roles, then profile
      await supabase.from("billing_subscriptions").delete().eq("user_id", profile.user_id);
      await supabase.from("user_roles").delete().eq("user_id", profile.user_id);
      const { error } = await supabase.from("profiles").delete().eq("user_id", profile.user_id);
      if (error) throw error;
      toast({ title: "Cliente removido", description: "Perfil e dados associados foram excluídos" });
      onOpenChange(false);
      onDeleted?.();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {(displayName || "C")[0].toUpperCase()}
            </div>
            <div>
              <div className="text-base font-semibold">{displayName || "Sem nome"}</div>
              <div className="text-xs text-muted-foreground font-mono font-normal">{profile.user_id.slice(0, 24)}...</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="perfil" className="text-xs gap-1"><User className="h-3 w-3" /> Perfil</TabsTrigger>
            <TabsTrigger value="acesso" className="text-xs gap-1"><Shield className="h-3 w-3" /> Acesso</TabsTrigger>
            <TabsTrigger value="plano" className="text-xs gap-1"><CreditCard className="h-3 w-3" /> Plano</TabsTrigger>
            <TabsTrigger value="projetos" className="text-xs gap-1"><FolderOpen className="h-3 w-3" /> Projetos</TabsTrigger>
          </TabsList>

          {/* Perfil */}
          <TabsContent value="perfil" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome de Exibição</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-9 text-sm" placeholder="Nome do cliente" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">URL do Avatar</Label>
                <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="h-9 text-sm" placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ID do Usuário</Label>
                <Input value={profile.user_id} disabled className="h-9 text-sm font-mono bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Criado em</Label>
                <Input value={format(new Date(profile.created_at), "dd/MM/yyyy HH:mm")} disabled className="h-9 text-sm bg-muted/50" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="text-xs">
                {saving ? "Salvando..." : "Salvar Perfil"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="text-xs gap-1">
                    <Trash2 className="h-3 w-3" /> Excluir Cliente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá remover o perfil, papéis e assinatura deste cliente. Esta ação não pode ser desfeita.
                      {projects.length > 0 && (
                        <span className="block mt-2 text-destructive font-medium">
                          ⚠️ Este cliente possui {projects.length} projeto(s) que não serão excluídos.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir Permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          {/* Acesso */}
          <TabsContent value="acesso" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Papel Atual:</Label>
                {role ? (
                  <Badge variant={role === "owner" || role === "admin" ? "default" : "secondary"} className="text-xs">{role}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Nenhum</span>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs">Alterar Papel</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner — Acesso total</SelectItem>
                    <SelectItem value="admin">Admin — Sem billing</SelectItem>
                    <SelectItem value="analyst">Analyst — Dashboards</SelectItem>
                    <SelectItem value="readonly">Read-only — Leitura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={handleSaveRole} disabled={saving || !selectedRole} className="text-xs">
              {saving ? "Salvando..." : "Salvar Papel"}
            </Button>
          </TabsContent>

          {/* Plano */}
          <TabsContent value="plano" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Plano</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLANS.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={billingStatus} onValueChange={setBillingStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="trial">Em Trial</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {billing && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm font-bold">R$ {Number(billing.mrr || 0).toLocaleString("pt-BR")}</div>
                  <div className="text-[10px] text-muted-foreground">MRR</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm font-bold">{(billing.events_used || 0).toLocaleString("pt-BR")}</div>
                  <div className="text-[10px] text-muted-foreground">Eventos Usados</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm font-bold">{projects.length}</div>
                  <div className="text-[10px] text-muted-foreground">Projetos</div>
                </div>
              </div>
            )}
            <Button size="sm" onClick={handleSaveBilling} disabled={saving} className="text-xs">
              {saving ? "Salvando..." : "Salvar Plano"}
            </Button>
          </TabsContent>

          {/* Projetos */}
          <TabsContent value="projetos" className="space-y-4 mt-4">
            <h4 className="text-xs font-semibold">Projetos ({projects.length})</h4>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Nenhum projeto cadastrado</p>
            ) : (
              <div className="space-y-1.5">
                {projects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/50">
                    <div>
                      <div className="text-xs font-medium">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.domain}</div>
                    </div>
                    <Badge variant={getStatusVariant(p.status)} className="text-[9px]">{translateStatus(p.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
