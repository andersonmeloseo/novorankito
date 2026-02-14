import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";
import { useAdminProfiles, useAdminProjects, useAdminBilling } from "@/hooks/use-admin";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";

export default function AdminClientsPage() {
  const { data: profiles = [], isLoading: pLoading } = useAdminProfiles();
  const { data: projects = [] } = useAdminProjects();
  const { data: billing = [] } = useAdminBilling();

  const isLoading = pLoading;

  // Build client list from profiles + their projects and billing
  const clients = profiles.map((profile: any) => {
    const userProjects = projects.filter((p: any) => p.owner_id === profile.user_id);
    const userBilling = billing.find((b: any) => b.user_id === profile.user_id);
    return {
      id: profile.id,
      name: profile.display_name || profile.user_id.slice(0, 8),
      projects: userProjects.length,
      plan: userBilling?.plan || "free",
      status: userBilling?.status || "active",
      mrr: Number(userBilling?.mrr || 0),
    };
  });

  const activeClients = clients.filter(c => c.status === "active").length;
  const trialClients = clients.filter(c => c.status === "trial").length;
  const totalMrr = clients.reduce((s, c) => s + c.mrr, 0);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Clientes / Tenants" description="Gestão multi-tenant — status, planos e histórico" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Clientes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{clients.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Ativos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-success">{activeClients}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Em Trial</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-warning">{trialClients}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">MRR Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalMrr.toLocaleString("pt-BR")}</div></CardContent></Card>
      </div>

      {clients.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhum cliente" description="Os clientes aparecerão aqui conforme novos usuários se registrarem." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Plano</th>
                  <th className="p-3 font-medium">Projetos</th>
                  <th className="p-3 font-medium">MRR</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3 font-medium">{client.name}</td>
                    <td className="p-3"><Badge variant="outline">{client.plan}</Badge></td>
                    <td className="p-3">{client.projects}</td>
                    <td className="p-3">R$ {client.mrr}</td>
                    <td className="p-3">
                      <Badge variant={getStatusVariant(client.status)}>
                        {translateStatus(client.status)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
