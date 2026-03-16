import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users, UserPlus, Crown, Shield, Eye, Trash2, Loader2, Mail, Clock, Search,
  UserCheck, Pencil, AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  owner: { label: "Proprietário", color: "text-amber-500", icon: <Crown className="h-3.5 w-3.5 text-amber-500" />, desc: "Acesso total ao projeto" },
  admin: { label: "Admin", color: "text-primary", icon: <Shield className="h-3.5 w-3.5 text-primary" />, desc: "Gerencia membros e configurações" },
  analyst: { label: "Analista", color: "text-emerald-500", icon: <UserCheck className="h-3.5 w-3.5 text-emerald-500" />, desc: "Edita conteúdo e analisa dados" },
  readonly: { label: "Visualizador", color: "text-muted-foreground", icon: <Eye className="h-3.5 w-3.5 text-muted-foreground" />, desc: "Apenas leitura" },
};

const MODULE_PERMISSIONS = [
  { key: "overview", label: "Visão Geral", desc: "Dashboard e KPIs" },
  { key: "seo", label: "SEO", desc: "GSC, keywords, posições" },
  { key: "indexing", label: "Indexação", desc: "URLs e sitemaps" },
  { key: "analytics", label: "Analytics (GA4)", desc: "Tráfego e audiência" },
  { key: "tracking", label: "Tracking", desc: "Eventos, metas, heatmaps" },
  { key: "ai_agent", label: "Agente IA", desc: "Chat, workflows, orquestrador" },
  { key: "semantic", label: "Grafo Semântico", desc: "Entidades e schema.org" },
  { key: "reports", label: "Relatórios", desc: "Exportações e PDFs" },
  { key: "settings", label: "Configurações", desc: "Integrações, API, equipe" },
];

const DEFAULT_PERMS_BY_ROLE: Record<string, Record<string, boolean>> = {
  admin: Object.fromEntries(MODULE_PERMISSIONS.map(m => [m.key, true])),
  analyst: Object.fromEntries(MODULE_PERMISSIONS.map(m => [m.key, !["settings"].includes(m.key)])),
  readonly: Object.fromEntries(MODULE_PERMISSIONS.map(m => [m.key, ["overview", "reports"].includes(m.key)])),
};

interface TeamSettingsProps {
  projectId: string;
}

export function TeamSettings({ projectId }: TeamSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("readonly");
  const [invitePerms, setInvitePerms] = useState<Record<string, boolean>>(DEFAULT_PERMS_BY_ROLE["readonly"]);
  const [showInvite, setShowInvite] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});

  // Check plan limit
  const { data: planLimit } = useQuery({
    queryKey: ["plan-limit-members", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("check_plan_limit", {
        _user_id: user!.id,
        _limit_type: "members",
      });
      return data as { allowed: boolean; limit: number; used: number; remaining: number; plan: string } | null;
    },
    enabled: !!user,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["project-members-full", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("id, role, user_id, created_at, permissions, invited_email, status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!projectId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["member-profiles", members.map((m) => m.user_id)],
    queryFn: async () => {
      const userIds = members.map((m) => m.user_id);
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      return data || [];
    },
    enabled: members.length > 0,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role, permissions }: { email: string; role: string; permissions: Record<string, boolean> }) => {
      if (!user) throw new Error("Não autenticado");

      // Check plan limit
      if (planLimit && !planLimit.allowed) {
        throw new Error(`Limite de membros atingido (${planLimit.used}/${planLimit.limit}). Faça upgrade do plano.`);
      }

      // Look up user by email in profiles
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("display_name", email)
        .maybeSingle();

      // For now, we create the member record. In production, this would send an email invitation.
      const { error } = await supabase.from("project_members").insert({
        project_id: projectId,
        user_id: targetProfile?.user_id || user.id, // fallback — in real flow would be pending
        role: role as any,
        permissions,
        invited_email: email,
        status: targetProfile ? "active" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Convite enviado!", description: `${inviteEmail} foi convidado para o projeto.` });
      setInviteEmail("");
      setShowInvite(false);
      qc.invalidateQueries({ queryKey: ["project-members-full", projectId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao convidar", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("project_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Membro removido" });
      qc.invalidateQueries({ queryKey: ["project-members-full", projectId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ memberId, role, permissions }: { memberId: string; role: string; permissions: Record<string, boolean> }) => {
      const { error } = await supabase
        .from("project_members")
        .update({ role: role as any, permissions })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Permissões atualizadas!" });
      setEditingMember(null);
      qc.invalidateQueries({ queryKey: ["project-members-full", projectId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);
  const isOwner = members.find((m) => m.user_id === user?.id)?.role === "owner";

  const filteredMembers = members.filter((m) => {
    if (!searchTerm) return true;
    const profile = getProfile(m.user_id);
    const name = profile?.display_name || (m as any).invited_email || m.user_id;
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || m.role.includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: members.length,
    admins: members.filter((m) => m.role === "admin" || m.role === "owner").length,
    analysts: members.filter((m) => m.role === "analyst").length,
    viewers: members.filter((m) => m.role === "readonly").length,
  };

  const handleRoleChange = (role: string) => {
    setInviteRole(role);
    setInvitePerms(DEFAULT_PERMS_BY_ROLE[role] || {});
  };

  const openEditPerms = (member: any) => {
    setEditingMember(member);
    const perms = (member.permissions && typeof member.permissions === "object") ? member.permissions : DEFAULT_PERMS_BY_ROLE[member.role] || {};
    setEditPerms(perms as Record<string, boolean>);
  };

  const atLimit = planLimit && !planLimit.allowed;

  return (
    <div className="space-y-4">
      {/* Plan limit banner */}
      {planLimit && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${atLimit ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-foreground"}`}>
          <Users className="h-4 w-4 shrink-0" />
          <span>
            <strong>{planLimit.used}</strong> de <strong>{planLimit.limit}</strong> membros utilizados
            {atLimit && " — faça upgrade para convidar mais membros"}
            <span className="text-muted-foreground ml-1">(plano {planLimit.plan})</span>
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: <Users className="h-4 w-4 text-primary" /> },
          { label: "Admins", value: stats.admins, icon: <Shield className="h-4 w-4 text-primary" /> },
          { label: "Analistas", value: stats.analysts, icon: <UserCheck className="h-4 w-4 text-emerald-500" /> },
          { label: "Visualizadores", value: stats.viewers, icon: <Eye className="h-4 w-4 text-muted-foreground" /> },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              {s.icon}
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Members Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membros do Projeto
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Gerencie quem tem acesso e qual nível de permissão
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setShowInvite(!showInvite)}
              disabled={!!atLimit}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Convidar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Invite Section */}
          <AnimatePresence>
            {showInvite && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    Convidar novo membro
                  </p>

                  <div className="flex gap-2 flex-col sm:flex-row">
                    <Input
                      className="h-9 text-sm flex-1"
                      placeholder="email@exemplo.com"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <Select value={inviteRole} onValueChange={handleRoleChange}>
                      <SelectTrigger className="h-9 w-full sm:w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="analyst">Analista</SelectItem>
                        <SelectItem value="readonly">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Granular Permissions */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-foreground">Permissões de acesso aos módulos:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {MODULE_PERMISSIONS.map((mod) => (
                        <div
                          key={mod.key}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${invitePerms[mod.key] ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/20 opacity-60"}`}
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-foreground">{mod.label}</p>
                            <p className="text-[9px] text-muted-foreground">{mod.desc}</p>
                          </div>
                          <Switch
                            checked={!!invitePerms[mod.key]}
                            onCheckedChange={(checked) =>
                              setInvitePerms((prev) => ({ ...prev, [mod.key]: checked }))
                            }
                            className="ml-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Roles explanation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {["admin", "analyst", "readonly"].map((role) => {
                      const cfg = ROLE_CONFIG[role];
                      return (
                        <div key={role} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${inviteRole === role ? "bg-primary/10 border border-primary/30" : "bg-background/50 border border-transparent"}`} onClick={() => handleRoleChange(role)}>
                          {cfg.icon}
                          <div>
                            <p className="text-[11px] font-semibold text-foreground">{cfg.label}</p>
                            <p className="text-[9px] text-muted-foreground">{cfg.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="h-9 text-xs gap-1 whitespace-nowrap"
                      disabled={!inviteEmail || inviteMutation.isPending}
                      onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole, permissions: invitePerms })}
                    >
                      {inviteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                      Enviar convite
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search */}
          {members.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 text-xs pl-9"
                placeholder="Buscar membro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          {/* Members List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">
                {members.length === 0
                  ? "Nenhum membro encontrado. Convide sua equipe!"
                  : "Nenhum resultado para a busca."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredMembers.map((member, idx) => {
                const profile = getProfile(member.user_id);
                const displayName = profile?.display_name || (member as any).invited_email || `Usuário ${member.user_id.slice(0, 8)}`;
                const roleCfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.readonly;
                const isSelf = member.user_id === user?.id;
                const initials = displayName.slice(0, 2).toUpperCase();
                const isPending = (member as any).status === "pending";
                const memberPerms = (member as any).permissions || {};
                const enabledModules = MODULE_PERMISSIONS.filter(m => memberPerms[m.key]).length;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center justify-between px-3 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover ring-2 ring-border" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-border">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                          {isSelf && <Badge variant="outline" className="text-[9px] shrink-0">Você</Badge>}
                          {isPending && <Badge variant="secondary" className="text-[9px] shrink-0 gap-1"><Clock className="h-2.5 w-2.5" /> Pendente</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            {roleCfg.icon}
                            <span className={`text-[10px] font-medium ${roleCfg.color}`}>{roleCfg.label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {enabledModules}/{MODULE_PERMISSIONS.length} módulos
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDistanceToNow(new Date(member.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                      {isOwner && !isSelf && member.role !== "owner" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPerms(member)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeMutation.mutate(member.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {member.role === "owner" && (
                        <Badge className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                          <Crown className="h-2.5 w-2.5 mr-1" /> Owner
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Matriz de permissões padrão por função
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Módulo</th>
                  {["owner", "admin", "analyst", "readonly"].map((r) => (
                    <th key={r} className="text-center py-2 px-2 text-muted-foreground font-medium">
                      {ROLE_CONFIG[r].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_PERMISSIONS.map((mod) => (
                  <tr key={mod.key} className="border-b border-border/50">
                    <td className="py-1.5 pr-4 text-foreground">{mod.label}</td>
                    <td className="text-center py-1.5 px-2"><span className="text-emerald-500">✓</span></td>
                    <td className="text-center py-1.5 px-2"><span className="text-emerald-500">✓</span></td>
                    <td className="text-center py-1.5 px-2">
                      {DEFAULT_PERMS_BY_ROLE.analyst[mod.key] ? <span className="text-emerald-500">✓</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="text-center py-1.5 px-2">
                      {DEFAULT_PERMS_BY_ROLE.readonly[mod.key] ? <span className="text-emerald-500">✓</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar permissões
            </DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-border">
                  {(getProfile(editingMember.user_id)?.display_name || (editingMember as any).invited_email || "U").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{getProfile(editingMember.user_id)?.display_name || (editingMember as any).invited_email}</p>
                  <p className="text-[10px] text-muted-foreground">{ROLE_CONFIG[editingMember.role]?.label}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Função</Label>
                <Select value={editingMember.role} onValueChange={(v) => setEditingMember((prev: any) => ({ ...prev, role: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="analyst">Analista</SelectItem>
                    <SelectItem value="readonly">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold">Acesso aos módulos:</p>
                <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                  {MODULE_PERMISSIONS.map((mod) => (
                    <div
                      key={mod.key}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${editPerms[mod.key] ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/20 opacity-60"}`}
                    >
                      <div>
                        <p className="text-[11px] font-medium text-foreground">{mod.label}</p>
                        <p className="text-[9px] text-muted-foreground">{mod.desc}</p>
                      </div>
                      <Switch
                        checked={!!editPerms[mod.key]}
                        onCheckedChange={(checked) => setEditPerms((prev) => ({ ...prev, [mod.key]: checked }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm" className="text-xs">Cancelar</Button></DialogClose>
            <Button
              size="sm"
              className="text-xs gap-1.5"
              disabled={updateMutation.isPending}
              onClick={() => editingMember && updateMutation.mutate({ memberId: editingMember.id, role: editingMember.role, permissions: editPerms })}
            >
              {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
