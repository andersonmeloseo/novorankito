import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users, UserPlus, Crown, Shield, Eye, Trash2, Loader2, Mail, Copy, ChevronDown, ChevronUp,
  UserCheck, Clock, Search,
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

interface TeamSettingsProps {
  projectId: string;
}

export function TeamSettings({ projectId }: TeamSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("readonly");
  const [showInvite, setShowInvite] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["project-members-full", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("id, role, user_id, created_at")
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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from("project_members")
        .update({ role: role as any })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Função atualizada!" });
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
    const name = profile?.display_name || m.user_id;
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || m.role.includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: members.length,
    admins: members.filter((m) => m.role === "admin" || m.role === "owner").length,
    analysts: members.filter((m) => m.role === "analyst").length,
    viewers: members.filter((m) => m.role === "readonly").length,
  };

  return (
    <div className="space-y-4">
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
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
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
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="h-9 w-full sm:w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="analyst">Analista</SelectItem>
                        <SelectItem value="readonly">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-9 text-xs gap-1 whitespace-nowrap"
                      disabled={!inviteEmail}
                      onClick={() => {
                        toast({ title: "Convite enviado!", description: `${inviteEmail} receberá um e-mail com acesso.` });
                        setInviteEmail("");
                        setShowInvite(false);
                      }}
                    >
                      <Mail className="h-3 w-3" />
                      Enviar convite
                    </Button>
                  </div>

                  {/* Roles explanation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {["admin", "analyst", "readonly"].map((role) => {
                      const cfg = ROLE_CONFIG[role];
                      return (
                        <div key={role} className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
                          {cfg.icon}
                          <div>
                            <p className="text-[11px] font-semibold text-foreground">{cfg.label}</p>
                            <p className="text-[9px] text-muted-foreground">{cfg.desc}</p>
                          </div>
                        </div>
                      );
                    })}
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
                const displayName = profile?.display_name || `Usuário ${member.user_id.slice(0, 8)}`;
                const roleCfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
                const isSelf = member.user_id === user?.id;
                const initials = displayName.slice(0, 2).toUpperCase();

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center justify-between px-3 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-border"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-border">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                          {isSelf && (
                            <Badge variant="outline" className="text-[9px] shrink-0">Você</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            {roleCfg.icon}
                            <span className={`text-[10px] font-medium ${roleCfg.color}`}>{roleCfg.label}</span>
                          </div>
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
                          <Select
                            value={member.role}
                            onValueChange={(v) => updateRoleMutation.mutate({ memberId: member.id, role: v })}
                          >
                            <SelectTrigger className="h-7 w-[110px] text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="analyst">Analista</SelectItem>
                              <SelectItem value="readonly">Visualizador</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeMutation.mutate(member.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {member.role === "owner" && (
                        <Badge className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                          <Crown className="h-2.5 w-2.5 mr-1" />
                          Owner
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
            Matriz de permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Ação</th>
                  {["owner", "admin", "analyst", "readonly"].map((r) => (
                    <th key={r} className="text-center py-2 px-2 text-muted-foreground font-medium">
                      {ROLE_CONFIG[r].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { action: "Visualizar dados e relatórios", perms: [true, true, true, true] },
                  { action: "Editar conteúdo e URLs", perms: [true, true, true, false] },
                  { action: "Gerenciar integrações (GSC/GA4)", perms: [true, true, false, false] },
                  { action: "Convidar / remover membros", perms: [true, true, false, false] },
                  { action: "Alterar configurações do projeto", perms: [true, true, false, false] },
                  { action: "Criar API Keys e Webhooks", perms: [true, true, false, false] },
                  { action: "Gerenciar White-Label", perms: [true, false, false, false] },
                  { action: "Excluir projeto", perms: [true, false, false, false] },
                ].map((row) => (
                  <tr key={row.action} className="border-b border-border/50">
                    <td className="py-1.5 pr-4 text-foreground">{row.action}</td>
                    {row.perms.map((p, i) => (
                      <td key={i} className="text-center py-1.5 px-2">
                        {p ? (
                          <span className="text-emerald-500">✓</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
