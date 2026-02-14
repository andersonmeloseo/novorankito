import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, XCircle, Trash2 } from "lucide-react";
import { useRemoveRole } from "@/hooks/use-admin";

interface AdminSecurityTabProps {
  profiles: any[];
  roles: any[];
  logs: any[];
}

export function AdminSecurityTab({ profiles, roles, logs }: AdminSecurityTabProps) {
  const removeRole = useRemoveRole();
  const failedLogs = logs.filter(l => l.status === "failed");

  return (
    <div className="space-y-4">
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
            <div className="text-lg font-bold text-foreground">{failedLogs.length}</div>
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
                {["Usuário", "Papel", ""].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum papel atribuído</td></tr>
              ) : roles.map(r => {
                const profile = profiles.find(p => p.user_id === r.user_id);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-foreground">{profile?.display_name || r.user_id.slice(0, 8) + "..."}</td>
                    <td className="px-4 py-3"><Badge variant="default" className="text-[10px]">{r.role}</Badge></td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => removeRole.mutate({ roleId: r.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Retention policies */}
      <Card className="p-5">
        <h3 className="text-sm font-medium text-foreground mb-3">Políticas de Retenção</h3>
        <div className="space-y-2">
          {[
            { policy: "Eventos de tracking", retention: "90 dias" },
            { policy: "Dados GSC/GA4", retention: "16 meses" },
            { policy: "Logs de auditoria", retention: "12 meses" },
            { policy: "Sessões de replay", retention: "30 dias" },
          ].map(p => (
            <div key={p.policy} className="flex justify-between p-2 rounded-md bg-muted/30 text-xs">
              <span className="text-foreground">{p.policy}</span>
              <span className="text-muted-foreground">{p.retention}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
