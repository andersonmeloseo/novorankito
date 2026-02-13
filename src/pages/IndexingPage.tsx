import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { mockIndexingQueue } from "@/lib/mock-data";
import { Send, CheckCircle2, Clock, AlertTriangle, RotateCcw, Zap, Settings2 } from "lucide-react";

const STATUS_MAP: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  success: { color: "bg-success/10 text-success border-success/20", icon: CheckCircle2, label: "Sucesso" },
  pending: { color: "bg-warning/10 text-warning border-warning/20", icon: Clock, label: "Pendente" },
  failed: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle, label: "Falha" },
};

export default function IndexingPage() {
  const successCount = mockIndexingQueue.filter((q) => q.status === "success").length;
  const pendingCount = mockIndexingQueue.filter((q) => q.status === "pending").length;
  const failedCount = mockIndexingQueue.filter((q) => q.status === "failed").length;

  return (
    <>
      <TopBar title="Indexação" subtitle="Gerencie a fila de indexação e acompanhe o status das suas URLs" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total de Requisições" value={mockIndexingQueue.length} change={0} />
          <KpiCard label="Sucesso" value={successCount} change={0} />
          <KpiCard label="Pendentes" value={pendingCount} change={0} />
          <KpiCard label="Falhas" value={failedCount} change={0} />
        </div>

        {/* Automation Rules */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Regras de Automação</h3>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Settings2 className="h-3 w-3" /> Configurar
            </Button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "Nova URL importada", desc: "Enviar automaticamente para indexação", active: true },
              { label: "Queda crítica detectada", desc: "Reenviar após atualização de conteúdo", active: true },
              { label: "URLs prioritárias", desc: "Ciclo semanal de reenvio", active: false },
            ].map((rule) => (
              <Card key={rule.label} className={`p-3 border ${rule.active ? "border-primary/30 bg-primary/5" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{rule.label}</span>
                  <Badge variant={rule.active ? "default" : "secondary"} className="text-[9px]">
                    {rule.active ? "Ativo" : "Desativado"}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{rule.desc}</p>
              </Card>
            ))}
          </div>
        </Card>

        {/* Queue Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Fila de Indexação</h3>
            <Button size="sm" className="text-xs gap-1.5 h-8">
              <Send className="h-3 w-3" /> Enviar URL
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Enviado em</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tentativas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Motivo</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {mockIndexingQueue.map((item) => {
                  const statusInfo = STATUS_MAP[item.status];
                  const Icon = statusInfo.icon;
                  return (
                    <tr key={item.url + item.sentAt} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{item.url}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px] font-normal">{item.type === "index" ? "indexar" : "atualizar"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusInfo.color}`}>
                          <Icon className="h-2.5 w-2.5" /> {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.sentAt}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.retries}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.failReason ? "Quota excedida" : "—"}</td>
                      <td className="px-4 py-3">
                        {item.status === "failed" && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Success Rate */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{Math.round((successCount / mockIndexingQueue.length) * 100)}%</div>
            <div className="text-xs text-muted-foreground mt-1">Taxa de Sucesso</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">~2,4h</div>
            <div className="text-xs text-muted-foreground mt-1">Tempo Médio de Processamento</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">47</div>
            <div className="text-xs text-muted-foreground mt-1">Total Este Mês</div>
          </Card>
        </div>
      </div>
    </>
  );
}
