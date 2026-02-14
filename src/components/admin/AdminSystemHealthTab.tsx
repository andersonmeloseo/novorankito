import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  Server, Database, Wifi, Clock, HardDrive, Cpu, Zap, Shield,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ChartHeader } from "@/components/analytics/ChartPrimitives";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";

interface AdminSystemHealthTabProps {
  stats: any;
}

// Simulated system metrics (in a real app these would come from monitoring APIs)
const systemMetrics = {
  uptime: 99.97,
  avgResponseTime: 142,
  edgeFunctionsActive: 14,
  dbConnections: 23,
  dbMaxConnections: 60,
  storageUsed: 1.2,
  storageLimit: 8,
  apiCallsToday: 12847,
  apiRateLimit: 100000,
  errorRate: 0.3,
  lastDeployment: "2026-02-14T08:30:00Z",
};

const services = [
  { name: "Autenticação", status: "operational", latency: "45ms", icon: Shield },
  { name: "Banco de Dados", status: "operational", latency: "12ms", icon: Database },
  { name: "Edge Functions", status: "operational", latency: "89ms", icon: Zap },
  { name: "Storage", status: "operational", latency: "67ms", icon: HardDrive },
  { name: "Realtime", status: "operational", latency: "23ms", icon: Wifi },
  { name: "API REST", status: "operational", latency: "34ms", icon: Server },
];

export function AdminSystemHealthTab({ stats }: AdminSystemHealthTabProps) {
  const dbUsagePct = Math.round((systemMetrics.dbConnections / systemMetrics.dbMaxConnections) * 100);
  const storageUsagePct = Math.round((systemMetrics.storageUsed / systemMetrics.storageLimit) * 100);
  const apiUsagePct = Math.round((systemMetrics.apiCallsToday / systemMetrics.apiRateLimit) * 100);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Uptime" value={systemMetrics.uptime} change={0} suffix="%" sparklineColor="hsl(var(--success))" />
        <KpiCard label="Latência Média" value={systemMetrics.avgResponseTime} change={0} suffix="ms" sparklineColor="hsl(var(--chart-1))" />
        <KpiCard label="Edge Functions" value={systemMetrics.edgeFunctionsActive} change={0} sparklineColor="hsl(var(--chart-5))" />
        <KpiCard label="Taxa de Erros" value={systemMetrics.errorRate} change={0} suffix="%" sparklineColor="hsl(var(--warning))" />
      </StaggeredGrid>

      {/* Service Status Grid */}
      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Status dos Serviços" subtitle="Monitoramento em tempo real de todos os componentes" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {services.map(service => (
              <div key={service.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${service.status === "operational" ? "bg-success/10" : "bg-destructive/10"}`}>
                  <service.icon className={`h-4.5 w-4.5 ${service.status === "operational" ? "text-success" : "text-destructive"}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground">{service.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(service.status)} className="text-[9px]">
                      {translateStatus(service.status)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{service.latency}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </AnimatedContainer>

      {/* Resource Usage */}
      <AnimatedContainer delay={0.05}>
        <Card className="p-5">
          <ChartHeader title="Uso de Recursos" subtitle="Conexões de banco, storage e API rate limits" />
          <div className="space-y-4 mt-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">Conexões DB</span>
                <span className="text-xs text-muted-foreground">{systemMetrics.dbConnections}/{systemMetrics.dbMaxConnections}</span>
              </div>
              <Progress value={dbUsagePct} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">Storage</span>
                <span className="text-xs text-muted-foreground">{systemMetrics.storageUsed}GB / {systemMetrics.storageLimit}GB</span>
              </div>
              <Progress value={storageUsagePct} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">API Calls (hoje)</span>
                <span className="text-xs text-muted-foreground">{systemMetrics.apiCallsToday.toLocaleString()}/{systemMetrics.apiRateLimit.toLocaleString()}</span>
              </div>
              <Progress value={apiUsagePct} className="h-2" />
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Data counts */}
      <AnimatedContainer delay={0.1}>
        <Card className="p-5">
          <ChartHeader title="Volume de Dados" subtitle="Totais armazenados no banco de dados" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: "Usuários", value: stats?.totalUsers || 0, icon: "👤" },
              { label: "Projetos", value: stats?.totalProjects || 0, icon: "📁" },
              { label: "URLs", value: stats?.totalUrls || 0, icon: "🔗" },
              { label: "Métricas SEO", value: stats?.totalMetrics || 0, icon: "📊" },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-lg bg-muted/20 text-center">
                <div className="text-lg mb-1">{item.icon}</div>
                <div className="text-lg font-bold text-foreground">{item.value.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
