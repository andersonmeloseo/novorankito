import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, FolderOpen, Activity, CreditCard, Shield,
  Search, CheckCircle2, XCircle, Trash2, UserPlus,
} from "lucide-react";
import {
  useAdminProfiles, useAdminProjects, useAdminRoles,
  useAdminBilling, useAdminAuditLogs, useAssignRole, useRemoveRole,
} from "@/hooks/use-admin";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminPage() {
  const { data: profiles = [], isLoading: loadingProfiles } = useAdminProfiles();
  const { data: projects = [], isLoading: loadingProjects } = useAdminProjects();
  const { data: roles = [] } = useAdminRoles();
  const { data: billing = [] } = useAdminBilling();
  const { data: logs = [] } = useAdminAuditLogs();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const [searchUsers, setSearchUsers] = useState("");
  const [searchProjects, setSearchProjects] = useState("");
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: "", name: "" });
  const [selectedRole, setSelectedRole] = useState<string>("analyst");

  const filteredProfiles = profiles.filter(
    (p) =>
      (p.display_name || "").toLowerCase().includes(searchUsers.toLowerCase()) ||
      p.user_id.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProjects.toLowerCase()) ||
      p.domain.toLowerCase().includes(searchProjects.toLowerCase())
  );

  const getUserRole = (userId: string) => {
    const r = roles.find((r) => r.user_id === userId);
    return r?.role || null;
  };

  const totalMrr = billing.reduce((sum, b) => sum + Number(b.mrr), 0);
  const activeSubs = billing.filter((b) => b.status === "active").length;

  const handleAssignRole = async () => {
    try {
      await assignRole.mutateAsync({
        userId: roleDialog.userId,
        role: selectedRole as any,
      });
      toast({ title: "Papel atribuído", description: `${selectedRole} atribuído a ${roleDialog.name}` });
      setRoleDialog({ open: false, userId: "", name: "" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <TopBar title="Admin Backoffice" subtitle="Gestão global de usuários, projetos, billing e auditoria" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total Usuários" value={profiles.length} change={0} />
          <KpiCard label="Total Projetos" value={projects.length} change={0} />
          <KpiCard label="Assinaturas Ativas" value={activeSubs} change={0} />
          <KpiCard label="MRR" value={totalMrr} change={0} prefix="R$" />
        </div>

        <Tabs defaultValue="users">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs gap-1.5"><FolderOpen className="h-3 w-3" /> Projetos</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs gap-1.5"><CreditCard className="h-3 w-3" /> Billing</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Logs</TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1.5"><Shield className="h-3 w-3" /> Segurança</TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="mt-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Usuários do Sistema ({profiles.length})</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs w-48"
                    placeholder="Buscar usuário..."
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Usuário", "Papel", "Criado em", ""].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProfiles ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Carregando...</td></tr>
                    ) : filteredProfiles.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum usuário encontrado</td></tr>
                    ) : (
                      filteredProfiles.map((p) => {
                        const role = getUserRole(p.user_id);
                        return (
                          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-xs font-medium text-foreground">{p.display_name || "Sem nome"}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{p.user_id.slice(0, 8)}...</div>
                            </td>
                            <td className="px-4 py-3">
                              {role ? (
                                <Badge variant={role === "owner" || role === "admin" ? "default" : "secondary"} className="text-[10px]">
                                  {role}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {format(new Date(p.created_at), "dd/MM/yyyy")}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 gap-1"
                                onClick={() => setRoleDialog({ open: true, userId: p.user_id, name: p.display_name || "Usuário" })}
                              >
                                <UserPlus className="h-3 w-3" /> Papel
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="mt-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Todos os Projetos ({projects.length})</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs w-48"
                    placeholder="Buscar projeto..."
                    value={searchProjects}
                    onChange={(e) => setSearchProjects(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Projeto", "Domínio", "Status", "Monetização", "Criado em"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProjects ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Carregando...</td></tr>
                    ) : filteredProjects.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum projeto encontrado</td></tr>
                    ) : (
                      filteredProjects.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium text-foreground">{p.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{p.domain}</td>
                          <td className="px-4 py-3">
                            <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px]">{p.monetization_status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "dd/MM/yyyy")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* BILLING TAB */}
          <TabsContent value="billing" className="mt-4">
            <div className="grid sm:grid-cols-4 gap-4 mb-4">
              <Card className="p-4 text-center">
                <div className="text-xl font-bold text-foreground">{activeSubs}</div>
                <div className="text-xs text-muted-foreground mt-1">Assinaturas Ativas</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xl font-bold text-foreground">R$ {totalMrr.toLocaleString("pt-BR")}</div>
                <div className="text-xs text-muted-foreground mt-1">MRR</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xl font-bold text-foreground">{billing.filter(b => b.status === "cancelled").length}</div>
                <div className="text-xs text-muted-foreground mt-1">Cancelados</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xl font-bold text-foreground">
                  R$ {activeSubs > 0 ? Math.round(totalMrr / activeSubs).toLocaleString("pt-BR") : 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">ARPU</div>
              </Card>
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Usuário", "Plano", "MRR", "Eventos", "Status"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {billing.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma assinatura registrada</td></tr>
                    ) : (
                      billing.map((b) => (
                        <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.user_id.slice(0, 8)}...</td>
                          <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{b.plan}</Badge></td>
                          <td className="px-4 py-3 text-xs text-foreground">R$ {Number(b.mrr).toLocaleString("pt-BR")}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{b.events_used}/{b.events_limit}</td>
                          <td className="px-4 py-3">
                            <Badge variant={b.status === "active" ? "default" : "destructive"} className="text-[10px]">{b.status}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* LOGS TAB */}
          <TabsContent value="logs" className="mt-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Logs de Auditoria ({logs.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Data/Hora", "Usuário", "Ação", "Detalhe", "Status"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum log registrado</td></tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM HH:mm:ss")}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground font-mono">
                            {log.user_id ? log.user_id.slice(0, 8) + "..." : "system"}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">{log.action}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{log.detail || "—"}</td>
                          <td className="px-4 py-3">
                            {log.status === "success" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security" className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{roles.length}</div>
                  <div className="text-xs text-muted-foreground">Papéis Atribuídos</div>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{profiles.length}</div>
                  <div className="text-xs text-muted-foreground">Usuários Registrados</div>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">
                    {logs.filter((l) => l.status === "failed").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Falhas de Auth</div>
                </div>
              </Card>
            </div>

            {/* Roles list */}
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Papéis Atribuídos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Usuário", "Papel", ""].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum papel atribuído</td></tr>
                    ) : (
                      roles.map((r) => {
                        const profile = profiles.find((p) => p.user_id === r.user_id);
                        return (
                          <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-xs text-foreground">
                              {profile?.display_name || r.user_id.slice(0, 8) + "..."}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="default" className="text-[10px]">{r.role}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-destructive hover:text-destructive"
                                onClick={() => removeRole.mutate({ roleId: r.id })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Políticas de Retenção</h3>
              <div className="space-y-2">
                {[
                  { policy: "Eventos de tracking", retention: "90 dias" },
                  { policy: "Dados GSC/GA4", retention: "16 meses" },
                  { policy: "Logs de auditoria", retention: "12 meses" },
                  { policy: "Sessões de replay", retention: "30 dias" },
                ].map((p) => (
                  <div key={p.policy} className="flex justify-between p-2 rounded-md bg-muted/30 text-xs">
                    <span className="text-foreground">{p.policy}</span>
                    <span className="text-muted-foreground">{p.retention}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Papel — {roleDialog.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
    </>
  );
}
