import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Mail, Shield, Eye, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/empty-state";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-primary/10 text-primary",
  admin: "bg-warning/10 text-warning",
  analyst: "bg-info/10 text-info",
  readonly: "bg-muted text-muted-foreground",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  analyst: "Analyst",
  readonly: "Read-only",
};

export default function UsersPage() {
  const { user } = useAuth();

  // Get current project
  const projectId = typeof window !== "undefined" ? localStorage.getItem("rankito_current_project") : null;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_members")
        .select("id, user_id, role, created_at")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!projectId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["member-profiles", members.map(m => m.user_id)],
    queryFn: async () => {
      const userIds = members.map((m: any) => m.user_id);
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      if (error) throw error;
      return data || [];
    },
    enabled: members.length > 0,
  });

  const getProfile = (userId: string) => profiles.find((p: any) => p.user_id === userId);

  return (
    <>
      <TopBar title="Usuários & Permissões" subtitle="Gerencie membros da equipe e controle de acessos" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">{members.length} membros</h2>
          <Button size="sm" className="text-xs gap-1.5"><Mail className="h-3 w-3" /> Convidar Membro</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum membro" description="Membros aparecerão aqui quando forem adicionados ao projeto." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Usuário", "Função", "Ações"].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: any) => {
                    const profile = getProfile(member.user_id);
                    const displayName = profile?.display_name || member.user_id.slice(0, 8);
                    const role = member.role as string;
                    return (
                      <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {displayName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{displayName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[role] || ""}`}>
                            {role === "owner" && <Shield className="h-2.5 w-2.5" />}
                            {role === "readonly" && <Eye className="h-2.5 w-2.5" />}
                            {ROLE_LABELS[role] || role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" className="text-xs h-7">Editar</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Roles explanation */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-3">Níveis de Acesso</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { role: "owner", desc: "Acesso total: billing, usuários, projetos, integrações" },
              { role: "admin", desc: "Acesso total ao projeto, sem gestão de billing" },
              { role: "analyst", desc: "Dashboards, relatórios e insights. Sem billing ou usuários" },
              { role: "readonly", desc: "Apenas visualização de dados e relatórios" },
            ].map((r) => (
              <div key={r.role} className="p-3 rounded-lg border border-border">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mb-2 ${ROLE_COLORS[r.role]}`}>{ROLE_LABELS[r.role]}</span>
                <p className="text-[10px] text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
