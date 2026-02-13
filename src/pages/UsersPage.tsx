import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Mail, Shield, Eye } from "lucide-react";

const USERS = [
  { name: "Rafael", email: "rafael@acme.com", role: "Owner", status: "ativo", projects: 3 },
  { name: "Maria Silva", email: "maria@acme.com", role: "Admin", status: "ativo", projects: 2 },
  { name: "João Santos", email: "joao@acme.com", role: "Analyst", status: "ativo", projects: 1 },
  { name: "Ana Costa", email: "ana@acme.com", role: "Read-only", status: "pendente", projects: 1 },
];

const ROLE_COLORS: Record<string, string> = {
  Owner: "bg-primary/10 text-primary",
  Admin: "bg-warning/10 text-warning",
  Analyst: "bg-info/10 text-info",
  "Read-only": "bg-muted text-muted-foreground",
};

export default function UsersPage() {
  return (
    <>
      <TopBar title="Usuários & Permissões" subtitle="Gerencie membros e acessos" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">{USERS.length} membros</h2>
          <Button size="sm" className="text-xs gap-1.5"><Mail className="h-3 w-3" /> Convidar Membro</Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Usuário", "Função", "Status", "Projetos", "Ações"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {USERS.map((user) => (
                  <tr key={user.email} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {user.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{user.name}</div>
                          <div className="text-[10px] text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[user.role] || ""}`}>
                        {user.role === "Owner" && <Shield className="h-2.5 w-2.5" />}
                        {user.role === "Read-only" && <Eye className="h-2.5 w-2.5" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === "ativo" ? "default" : "secondary"} className="text-[10px]">
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.projects}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="text-xs h-7">Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Roles explanation */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-3">Níveis de Acesso</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { role: "Owner", desc: "Acesso total: billing, usuários, projetos, integrações" },
              { role: "Admin", desc: "Acesso total ao projeto, sem gestão de billing" },
              { role: "Analyst", desc: "Dashboards, relatórios e insights. Sem billing ou usuários" },
              { role: "Read-only", desc: "Apenas visualização de dados e relatórios" },
            ].map((r) => (
              <div key={r.role} className="p-3 rounded-lg border border-border">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mb-2 ${ROLE_COLORS[r.role]}`}>{r.role}</span>
                <p className="text-[10px] text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
