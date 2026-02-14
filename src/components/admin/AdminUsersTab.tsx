import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Filter, UserPlus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { exportCSV } from "@/lib/export-utils";
import { format } from "date-fns";
import { UserStatsCards } from "./users/UserStatsCards";
import { UserTableRow } from "./users/UserTableRow";
import { UserEditDialog } from "./users/UserEditDialog";

interface AdminUsersTabProps {
  profiles: any[];
  roles: any[];
  projects: any[];
  billing: any[];
  isLoading: boolean;
  featureFlags?: any[];
}

export function AdminUsersTab({ profiles, roles, projects, billing, isLoading, featureFlags = [] }: AdminUsersTabProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editUser, setEditUser] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<string | null>(null);

  const getUserRole = (userId: string) => roles.find(r => r.user_id === userId)?.role || null;
  const getUserProjects = (userId: string) => projects.filter(p => p.owner_id === userId);
  const getUserBilling = (userId: string) => billing.find(b => b.user_id === userId);

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      const matchSearch = (p.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
        p.user_id.toLowerCase().includes(search.toLowerCase());
      const userRole = getUserRole(p.user_id);
      const matchRole = roleFilter === "all" || userRole === roleFilter;
      const userPlan = getUserBilling(p.user_id)?.plan || "free";
      const matchPlan = planFilter === "all" || userPlan === planFilter;
      return matchSearch && matchRole && matchPlan;
    });
  }, [profiles, search, roleFilter, planFilter, roles, billing]);

  // Stats
  const stats = useMemo(() => {
    const activeUsers = billing.filter(b => b.status === "active").length;
    const suspendedUsers = billing.filter(b => b.status === "suspended" || b.status === "cancelled").length;
    const adminCount = roles.filter(r => r.role === "admin" || r.role === "owner").length;
    return { total: profiles.length, active: activeUsers || profiles.length, suspended: suspendedUsers, admins: adminCount };
  }, [profiles, billing, roles]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(p => p.user_id)));
  };

  const handleExport = () => {
    const rows = filtered.map(p => ({
      Nome: p.display_name || "Sem nome",
      "User ID": p.user_id,
      Papel: getUserRole(p.user_id) || "—",
      Plano: getUserBilling(p.user_id)?.plan || "free",
      Projetos: getUserProjects(p.user_id).length,
      "Criado em": format(new Date(p.created_at), "dd/MM/yyyy"),
    }));
    exportCSV(rows, "usuarios-admin");
    toast({ title: "Exportado", description: "CSV gerado com sucesso" });
  };

  const editProfile = editUser ? profiles.find(p => p.user_id === editUser) : null;

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <UserStatsCards
        totalUsers={stats.total}
        activeUsers={stats.active}
        suspendedUsers={stats.suspended}
        adminCount={stats.admins}
      />

      {/* Table */}
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Usuários ({filtered.length})</h3>
            {selected.size > 0 && (
              <Badge variant="secondary" className="text-[10px]">{selected.size} selecionados</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs w-48 focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Buscar usuário..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Papéis</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="readonly">Read-only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Planos</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={handleExport}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-8">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={selectAll} />
                </th>
                {["Usuário", "Papel", "Plano", "Status", "Projetos", "Criado em", ""].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Nenhum usuário encontrado</td></tr>
              ) : filtered.map(p => (
                <UserTableRow
                  key={p.id}
                  profile={p}
                  role={getUserRole(p.user_id)}
                  projectsCount={getUserProjects(p.user_id).length}
                  billing={getUserBilling(p.user_id)}
                  selected={selected.has(p.user_id)}
                  onSelect={() => toggleSelect(p.user_id)}
                  onEdit={() => setEditUser(p.user_id)}
                  onView={() => setEditUser(p.user_id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size} selecionados:</span>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
              <UserPlus className="h-3 w-3" /> Atribuir Papel
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5">
              <Trash2 className="h-3 w-3" /> Suspender
            </Button>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      {editProfile && (
        <UserEditDialog
          open={!!editUser}
          onOpenChange={open => !open && setEditUser(null)}
          profile={editProfile}
          role={getUserRole(editUser!)}
          projects={getUserProjects(editUser!)}
          billing={getUserBilling(editUser!)}
          featureFlags={featureFlags}
        />
      )}
    </div>
  );
}
