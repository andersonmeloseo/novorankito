import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Loader2, Search, Download, Trash2, Pencil, Filter, Building2 } from "lucide-react";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";
import { useAdminProfiles, useAdminProjects, useAdminBilling, useAdminRoles } from "@/hooks/use-admin";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientEditDialog } from "@/components/admin/clients/ClientEditDialog";
import { exportCSV } from "@/lib/export-utils";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminClientsPage() {
  const { data: profiles = [], isLoading } = useAdminProfiles();
  const { data: projects = [] } = useAdminProjects();
  const { data: billing = [] } = useAdminBilling();
  const { data: roles = [] } = useAdminRoles();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editUserId, setEditUserId] = useState<string | null>(null);

  const getUserProjects = (userId: string) => projects.filter((p: any) => p.owner_id === userId);
  const getUserBilling = (userId: string) => billing.find((b: any) => b.user_id === userId);
  const getUserRole = (userId: string) => roles.find((r: any) => r.user_id === userId)?.role || null;

  const clients = useMemo(() => {
    return profiles.map((profile: any) => {
      const userBilling = getUserBilling(profile.user_id);
      return {
        ...profile,
        projectsCount: getUserProjects(profile.user_id).length,
        plan: userBilling?.plan || "free",
        status: userBilling?.status || "active",
        mrr: Number(userBilling?.mrr || 0),
      };
    });
  }, [profiles, projects, billing]);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = (c.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
        c.user_id.toLowerCase().includes(search.toLowerCase());
      const matchPlan = planFilter === "all" || c.plan === planFilter;
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [clients, search, planFilter, statusFilter]);

  const activeClients = clients.filter(c => c.status === "active").length;
  const trialClients = clients.filter(c => c.status === "trial").length;
  const totalMrr = clients.reduce((s, c) => s + c.mrr, 0);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.user_id)));
  };

  const handleExport = () => {
    const rows = filtered.map(c => ({
      Nome: c.display_name || "Sem nome",
      "ID Usuário": c.user_id,
      Plano: c.plan,
      Status: translateStatus(c.status),
      Projetos: c.projectsCount,
      MRR: c.mrr,
      "Criado em": format(new Date(c.created_at), "dd/MM/yyyy"),
    }));
    exportCSV(rows, "clientes-admin");
    toast({ title: "Exportado", description: "CSV gerado com sucesso" });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-billing"] });
    queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  const editProfile = editUserId ? profiles.find((p: any) => p.user_id === editUserId) : null;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Clientes" description="Gestão completa de clientes — editar, remover e gerenciar acessos" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Clientes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{clients.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Ativos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-success">{activeClients}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Em Trial</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-warning">{trialClients}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">MRR Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalMrr.toLocaleString("pt-BR")}</div></CardContent></Card>
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Clientes ({filtered.length})</h3>
            {selected.size > 0 && (
              <Badge variant="secondary" className="text-[10px]">{selected.size} selecionados</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs w-48 focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Buscar cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
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
                {["Cliente", "Plano", "Projetos", "MRR", "Status", "Criado em", ""].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Nenhum cliente encontrado</td></tr>
              ) : filtered.map(client => (
                <tr key={client.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox checked={selected.has(client.user_id)} onCheckedChange={() => toggleSelect(client.user_id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(client.display_name || "C")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{client.display_name || "Sem nome"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{client.user_id.slice(0, 16)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] capitalize">{client.plan}</Badge></td>
                  <td className="px-4 py-3 text-xs">{client.projectsCount}</td>
                  <td className="px-4 py-3 text-xs">R$ {client.mrr.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusVariant(client.status)} className="text-[10px]">
                      {translateStatus(client.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-muted-foreground">
                    {format(new Date(client.created_at), "dd/MM/yy")}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditUserId(client.user_id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bulk */}
        {selected.size > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size} selecionados:</span>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5">
              <Trash2 className="h-3 w-3" /> Suspender
            </Button>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      {editProfile && (
        <ClientEditDialog
          open={!!editUserId}
          onOpenChange={open => !open && setEditUserId(null)}
          profile={editProfile}
          role={getUserRole(editUserId!)}
          projects={getUserProjects(editUserId!)}
          billing={getUserBilling(editUserId!)}
          onDeleted={handleRefresh}
        />
      )}
    </div>
  );
}
