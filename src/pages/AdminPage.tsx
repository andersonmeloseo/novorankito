import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, FolderOpen, Activity, CreditCard, AlertTriangle, Shield,
  Search, Clock, CheckCircle2, XCircle,
} from "lucide-react";

const ADMIN_USERS = [
  { name: "Rafael", email: "rafael@acme.com", plan: "Pro", projects: 3, events: "18.4K", status: "ativo", lastLogin: "2026-02-13 10:32" },
  { name: "Carlos Mendes", email: "carlos@startup.io", plan: "Business", projects: 8, events: "142K", status: "ativo", lastLogin: "2026-02-13 09:15" },
  { name: "Juliana Rocha", email: "juliana@agency.co", plan: "Starter", projects: 1, events: "3.2K", status: "ativo", lastLogin: "2026-02-12 18:40" },
  { name: "Pedro Lima", email: "pedro@shop.com.br", plan: "Pro", projects: 2, events: "28K", status: "suspenso", lastLogin: "2026-02-01 14:20" },
];

const ADMIN_LOGS = [
  { time: "10:32:14", user: "rafael@acme.com", action: "Login", detail: "IP 189.40.x.x", status: "success" },
  { time: "10:30:42", user: "system", action: "Indexing batch", detail: "12 URLs processadas", status: "success" },
  { time: "10:29:10", user: "carlos@startup.io", action: "OAuth refresh", detail: "GSC token renovado", status: "success" },
  { time: "10:15:00", user: "system", action: "Evento ingestão", detail: "4.280 eventos/min", status: "success" },
  { time: "09:58:33", user: "pedro@shop.com.br", action: "OAuth GSC", detail: "Token expirado", status: "failed" },
  { time: "09:45:00", user: "system", action: "Indexing batch", detail: "Quota exceeded - backoff 30min", status: "failed" },
];

export default function AdminPage() {
  return (
    <>
      <TopBar title="Admin" subtitle="Visão completa de usuários, projetos e logs do sistema" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total Usuários" value={847} change={12.4} />
          <KpiCard label="Total Projetos" value={1284} change={8.6} />
          <KpiCard label="Eventos/dia" value={2840000} change={15.2} />
          <KpiCard label="MRR" value={124800} change={22.1} prefix="R$" />
        </div>

        <Tabs defaultValue="users">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs gap-1.5"><FolderOpen className="h-3 w-3" /> Projetos</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs gap-1.5"><CreditCard className="h-3 w-3" /> Billing</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Logs</TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1.5"><Shield className="h-3 w-3" /> Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Usuários do Sistema</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs w-48" placeholder="Buscar usuário..." />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Usuário", "Plano", "Projetos", "Eventos", "Status", "Último Login", ""].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ADMIN_USERS.map((u) => (
                      <tr key={u.email} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-xs font-medium text-foreground">{u.name}</div>
                            <div className="text-[10px] text-muted-foreground">{u.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{u.plan}</Badge></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.projects}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.events}</td>
                        <td className="px-4 py-3">
                          <Badge variant={u.status === "ativo" ? "default" : "destructive"} className="text-[10px]">{u.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.lastLogin}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" className="text-xs h-7">Gerenciar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <Card className="p-5">
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Projetos Ativos", value: "1.142" },
                  { label: "Em Setup", value: "98" },
                  { label: "Pausados", value: "44" },
                ].map((s) => (
                  <Card key={s.label} className="p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">Tabela detalhada de projetos por usuário disponível na versão com backend.</p>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            <Card className="p-5">
              <div className="grid sm:grid-cols-4 gap-4">
                {[
                  { label: "Assinaturas Ativas", value: "784" },
                  { label: "MRR", value: "R$ 124.800" },
                  { label: "Churn Mensal", value: "2.1%" },
                  { label: "ARPU", value: "R$ 159" },
                ].map((s) => (
                  <Card key={s.label} className="p-4 text-center">
                    <div className="text-xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Logs do Sistema</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Hora", "Usuário", "Ação", "Detalhe", "Status"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ADMIN_LOGS.map((log, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.time}</td>
                        <td className="px-4 py-3 text-xs text-foreground">{log.user}</td>
                        <td className="px-4 py-3 text-xs text-foreground">{log.action}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{log.detail}</td>
                        <td className="px-4 py-3">
                          {log.status === "success" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "RBAC Ativo", value: "4 funções", icon: Shield },
                { label: "Logins Hoje", value: "142", icon: Users },
                { label: "Falhas de Auth", value: "3", icon: AlertTriangle },
              ].map((s) => (
                <Card key={s.label} className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </Card>
              ))}
            </div>
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
    </>
  );
}
