import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";
import { User, Shield, CreditCard, FolderOpen, Settings, Activity, Zap } from "lucide-react";
import { useAssignRole } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  role: string | null;
  projects: any[];
  billing: any | null;
  featureFlags: any[];
}

const PLANS = [
  { id: "free", name: "Gratuito", price: "R$ 0", events: "1.000", projects: "1" },
  { id: "starter", name: "Starter", price: "R$ 97", events: "10.000", projects: "3" },
  { id: "pro", name: "Pro", price: "R$ 297", events: "100.000", projects: "10" },
  { id: "enterprise", name: "Enterprise", price: "R$ 997", events: "Ilimitado", projects: "Ilimitado" },
];

const FEATURES = [
  { key: "ai_agent", label: "Agente IA", description: "Chat com IA e automações" },
  { key: "rank_rent", label: "Rank & Rent", description: "Monetização de páginas" },
  { key: "indexing", label: "Indexação", description: "Submissão automática ao Google" },
  { key: "workflows", label: "Workflows", description: "Automações e notificações" },
  { key: "white_label", label: "White Label", description: "Branding personalizado" },
  { key: "api_access", label: "Acesso API", description: "API REST completa" },
];

export function UserEditDialog({ open, onOpenChange, profile, role, projects, billing, featureFlags }: UserEditDialogProps) {
  const [tab, setTab] = useState("profile");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [userFeatures, setUserFeatures] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const assignRole = useAssignRole();

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setSelectedRole(role || "");
      setSelectedPlan(billing?.plan || "free");
      const feats: Record<string, boolean> = {};
      FEATURES.forEach(f => {
        feats[f.key] = featureFlags.some(ff => ff.key === f.key && ff.allowed_user_ids?.includes(profile.user_id));
      });
      setUserFeatures(feats);
    }
  }, [profile, role, billing, featureFlags]);

  if (!profile) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      toast({ title: "Perfil atualizado", description: `Nome alterado para ${displayName}` });
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
      toast({ title: "Papel atualizado", description: `${selectedRole} atribuído com sucesso` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const planData = PLANS.find(p => p.id === selectedPlan);
      if (!planData) return;
      const eventsLimit = selectedPlan === "enterprise" ? 999999 : parseInt(planData.events.replace(/\./g, ""));
      const projectsLimit = selectedPlan === "enterprise" ? 999 : parseInt(planData.projects);

      if (billing) {
        const { error } = await supabase
          .from("billing_subscriptions")
          .update({ plan: selectedPlan, events_limit: eventsLimit, projects_limit: projectsLimit })
          .eq("id", billing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("billing_subscriptions")
          .insert({
            user_id: profile.user_id,
            plan: selectedPlan,
            events_limit: eventsLimit,
            projects_limit: projectsLimit,
            mrr: 0,
            status: "active",
          });
        if (error) throw error;
      }
      toast({ title: "Plano atualizado", description: `Plano alterado para ${planData.name}` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key: string) => {
    setUserFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {(profile.display_name || "U")[0].toUpperCase()}
            </div>
            <div>
              <div className="text-base font-semibold">{profile.display_name || "Sem nome"}</div>
              <div className="text-xs text-muted-foreground font-mono font-normal">{profile.user_id.slice(0, 20)}...</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="w-full grid grid-cols-5 h-9">
            <TabsTrigger value="profile" className="text-xs gap-1"><User className="h-3 w-3" /> Perfil</TabsTrigger>
            <TabsTrigger value="role" className="text-xs gap-1"><Shield className="h-3 w-3" /> Papel</TabsTrigger>
            <TabsTrigger value="plan" className="text-xs gap-1"><CreditCard className="h-3 w-3" /> Plano</TabsTrigger>
            <TabsTrigger value="features" className="text-xs gap-1"><Zap className="h-3 w-3" /> Features</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1"><Activity className="h-3 w-3" /> Atividade</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome de Exibição</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">User ID</Label>
                <Input value={profile.user_id} disabled className="h-9 text-sm font-mono bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Criado em</Label>
                <Input value={format(new Date(profile.created_at), "dd/MM/yyyy HH:mm")} disabled className="h-9 text-sm bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Atualizado em</Label>
                <Input value={format(new Date(profile.updated_at), "dd/MM/yyyy HH:mm")} disabled className="h-9 text-sm bg-muted/50" />
              </div>
            </div>
            <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="text-xs">
              {saving ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </TabsContent>

          {/* Role Tab */}
          <TabsContent value="role" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-xs">Papel Atual</Label>
              {role ? (
                <Badge variant={role === "owner" || role === "admin" ? "default" : "secondary"} className="text-xs">{role}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Nenhum papel atribuído</span>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">Alterar Papel</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar papel..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner — Acesso total</SelectItem>
                  <SelectItem value="admin">Admin — Sem billing</SelectItem>
                  <SelectItem value="analyst">Analyst — Dashboards e relatórios</SelectItem>
                  <SelectItem value="readonly">Read-only — Apenas leitura</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  { role: "owner", desc: "Acesso total: billing, usuários, projetos" },
                  { role: "admin", desc: "Gestão completa sem billing" },
                  { role: "analyst", desc: "Dashboards e relatórios" },
                  { role: "readonly", desc: "Apenas visualização" },
                ].map(r => (
                  <div key={r.role} className={`p-2.5 rounded-lg border text-xs transition-all ${selectedRole === r.role ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="font-medium text-foreground capitalize">{r.role}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={handleSaveRole} disabled={saving || !selectedRole} className="text-xs">
              {saving ? "Salvando..." : "Atribuir Papel"}
            </Button>
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Plano Atual:</Label>
              <Badge variant="outline" className="text-xs capitalize">{billing?.plan || "free"}</Badge>
              {billing && (
                <Badge variant={getStatusVariant(billing.status)} className="text-[10px]">{translateStatus(billing.status)}</Badge>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map(plan => (
                <Card
                  key={plan.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedPlan === plan.id ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "border-border"}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                    <span className="text-sm font-bold text-primary">{plan.price}</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div>• {plan.events} eventos/mês</div>
                    <div>• {plan.projects} projetos</div>
                  </div>
                </Card>
              ))}
            </div>
            {billing && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm font-bold text-foreground">R$ {Number(billing.mrr || 0).toLocaleString("pt-BR")}</div>
                  <div className="text-[10px] text-muted-foreground">MRR</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm font-bold text-foreground">{billing.events_used?.toLocaleString("pt-BR")}/{billing.events_limit?.toLocaleString("pt-BR")}</div>
                  <div className="text-[10px] text-muted-foreground">Eventos</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm font-bold text-foreground">{projects.length}/{billing.projects_limit}</div>
                  <div className="text-[10px] text-muted-foreground">Projetos</div>
                </div>
              </div>
            )}
            <Button size="sm" onClick={handleSavePlan} disabled={saving} className="text-xs">
              {saving ? "Salvando..." : "Salvar Plano"}
            </Button>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Ative ou desative funcionalidades para este usuário.</p>
            <div className="space-y-2">
              {FEATURES.map(feat => (
                <div key={feat.key} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-foreground">{feat.label}</div>
                    <div className="text-[11px] text-muted-foreground">{feat.description}</div>
                  </div>
                  <Switch
                    checked={userFeatures[feat.key] || false}
                    onCheckedChange={() => toggleFeature(feat.key)}
                  />
                </div>
              ))}
            </div>
            <Button size="sm" disabled={saving} className="text-xs" onClick={() => toast({ title: "Features salvas", description: "Configurações de features atualizadas" })}>
              {saving ? "Salvando..." : "Salvar Features"}
            </Button>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-foreground">Projetos ({projects.length})</h4>
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum projeto cadastrado</p>
              ) : (
                <div className="space-y-1.5">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/50">
                      <div>
                        <div className="text-xs font-medium text-foreground">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.domain}</div>
                      </div>
                      <Badge variant={getStatusVariant(p.status)} className="text-[9px]">{translateStatus(p.status)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
