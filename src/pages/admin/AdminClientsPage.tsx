import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CreditCard, Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminClientsPage() {
  // Placeholder — will be connected to real multi-tenant data
  const mockClients = [
    { id: 1, name: "Agência Digital Pro", users: 12, projects: 8, plan: "Enterprise", status: "active", mrr: 497 },
    { id: 2, name: "SEO Masters", users: 5, projects: 3, plan: "Pro", status: "active", mrr: 197 },
    { id: 3, name: "Growth Labs", users: 3, projects: 2, plan: "Starter", status: "trial", mrr: 0 },
    { id: 4, name: "WebFlow Agency", users: 8, projects: 5, plan: "Pro", status: "active", mrr: 197 },
    { id: 5, name: "Digital First", users: 1, projects: 1, plan: "Starter", status: "suspended", mrr: 0 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Clientes / Tenants" description="Gestão multi-tenant — status, planos, impersonação e histórico" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Clientes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{mockClients.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Ativos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-success">{mockClients.filter(c => c.status === "active").length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Em Trial</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-warning">{mockClients.filter(c => c.status === "trial").length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">MRR Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {mockClients.reduce((s, c) => s + c.mrr, 0).toLocaleString("pt-BR")}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium">Usuários</th>
                <th className="p-3 font-medium">Projetos</th>
                <th className="p-3 font-medium">MRR</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mockClients.map((client) => (
                <tr key={client.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-3 font-medium">{client.name}</td>
                  <td className="p-3"><Badge variant="outline">{client.plan}</Badge></td>
                  <td className="p-3">{client.users}</td>
                  <td className="p-3">{client.projects}</td>
                  <td className="p-3">R$ {client.mrr}</td>
                  <td className="p-3">
                    <Badge variant={client.status === "active" ? "default" : client.status === "trial" ? "secondary" : "destructive"}>
                      {client.status}
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
    </div>
  );
}
