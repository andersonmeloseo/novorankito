import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, UserPlus, Trash2, Ban, Eye, Download,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAssignRole, useRemoveRole } from "@/hooks/use-admin";
import { exportCSV } from "@/lib/export-utils";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";

interface AdminUsersTabProps {
  profiles: any[];
  roles: any[];
  projects: any[];
  billing: any[];
  isLoading: boolean;
}

export function AdminUsersTab({ profiles, roles, projects, billing, isLoading }: AdminUsersTabProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: "", name: "" });
  const [selectedRole, setSelectedRole] = useState("analyst");
  const [detailUser, setDetailUser] = useState<string | null>(null);
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const filtered = profiles.filter(
    p => (p.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
         p.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const getUserRole = (userId: string) => roles.find(r => r.user_id === userId)?.role || null;
  const getUserProjects = (userId: string) => projects.filter(p => p.owner_id === userId);
  const getUserBilling = (userId: string) => billing.find(b => b.user_id === userId);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.user_id)));
    }
  };

  const handleAssignRole = async () => {
    try {
      await assignRole.mutateAsync({ userId: roleDialog.userId, role: selectedRole as any });
      toast({ title: "Papel atribuído", description: `${selectedRole} atribuído a ${roleDialog.name}` });
      setRoleDialog({ open: false, userId: "", name: "" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    const rows = filtered.map(p => ({
      Nome: p.display_name || "Sem nome",
      "User ID": p.user_id,
      Papel: getUserRole(p.user_id) || "—",
      Projetos: getUserProjects(p.user_id).length,
      "Criado em": format(new Date(p.created_at), "dd/MM/yyyy"),
    }));
    exportCSV(rows, "usuarios-admin");
    toast({ title: "Exportado", description: "CSV gerado com sucesso" });
  };

  const detailProfile = detailUser ? profiles.find(p => p.user_id === detailUser) : null;
  const detailProjects = detailUser ? getUserProjects(detailUser) : [];
  const detailBilling = detailUser ? getUserBilling(detailUser) : null;
  const detailRole = detailUser ? getUserRole(detailUser) : null;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Usuários ({profiles.length})</h3>
            {selected.size > 0 && (
              <Badge variant="secondary" className="text-[10px]">{selected.size} selecionados</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs w-48" placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={handleExport}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-8">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={selectAll} />
                </th>
                {["Usuário", "Papel", "Projetos", "Plano", "Criado em", ""].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum usuário encontrado</td></tr>
              ) : filtered.map(p => {
                const role = getUserRole(p.user_id);
                const userProjects = getUserProjects(p.user_id);
                const userBilling = getUserBilling(p.user_id);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox checked={selected.has(p.user_id)} onCheckedChange={() => toggleSelect(p.user_id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-foreground">{p.display_name || "Sem nome"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{p.user_id.slice(0, 12)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      {role ? (
                        <Badge variant={role === "owner" || role === "admin" ? "default" : "secondary"} className="text-[10px]">{role}</Badge>
                      ) : <span className="text-[10px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{userProjects.length}</td>
                    <td className="px-4 py-3">
                    {userBilling ? (
                        <Badge variant="outline" className="text-[10px]">{userBilling.plan}</Badge>
                      ) : <span className="text-[10px] text-muted-foreground">Gratuito</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-xs h-7 w-7 p-0" onClick={() => setDetailUser(p.user_id)} title="Ver detalhes">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => setRoleDialog({ open: true, userId: p.user_id, name: p.display_name || "Usuário" })}>
                          <UserPlus className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={open => setRoleDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Papel — {roleDialog.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="readonly">Read-only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ open: false, userId: "", name: "" })}>Cancelar</Button>
            <Button onClick={handleAssignRole} disabled={assignRole.isPending}>
              {assignRole.isPending ? "Salvando..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!detailUser} onOpenChange={open => !open && setDetailUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {detailProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-[10px] text-muted-foreground uppercase">Nome</div>
                  <div className="text-sm font-medium text-foreground">{detailProfile.display_name || "Sem nome"}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-[10px] text-muted-foreground uppercase">Papel</div>
                  <div className="text-sm font-medium text-foreground">{detailRole || "Nenhum"}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-[10px] text-muted-foreground uppercase">Cadastro</div>
                  <div className="text-sm font-medium text-foreground">{format(new Date(detailProfile.created_at), "dd/MM/yyyy HH:mm")}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-[10px] text-muted-foreground uppercase">Plano</div>
                  <div className="text-sm font-medium text-foreground">{detailBilling?.plan || "Gratuito"}</div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Projetos ({detailProjects.length})</h4>
                {detailProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum projeto</p>
                ) : (
                  <div className="space-y-1">
                    {detailProjects.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/20">
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
              {detailBilling && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Billing</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-md bg-muted/20 text-center">
                      <div className="text-sm font-bold text-foreground">R$ {Number(detailBilling.mrr).toLocaleString("pt-BR")}</div>
                      <div className="text-[10px] text-muted-foreground">MRR</div>
                    </div>
                    <div className="p-2 rounded-md bg-muted/20 text-center">
                      <div className="text-sm font-bold text-foreground">{detailBilling.events_used}/{detailBilling.events_limit}</div>
                      <div className="text-[10px] text-muted-foreground">Eventos</div>
                    </div>
                    <div className="p-2 rounded-md bg-muted/20 text-center">
                      <Badge variant={getStatusVariant(detailBilling.status)} className="text-[10px]">{translateStatus(detailBilling.status)}</Badge>
                      <div className="text-[10px] text-muted-foreground mt-1">Status</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
