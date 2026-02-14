import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  Users, FolderOpen, CreditCard, Activity, Globe, TrendingUp,
  TrendingDown, Database, Shield, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, LineGlowGradient,
} from "@/components/analytics/ChartPrimitives";
import { useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";

interface AdminDashboardTabProps {
  stats: any;
  profiles: any[];
  projects: any[];
  billing: any[];
  logs: any[];
}

export function AdminDashboardTab({ stats, profiles, projects, billing, logs }: AdminDashboardTabProps) {
  // Growth data: users by day (last 30 days)
  const userGrowth = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MM/dd");
      days[d] = 0;
    }
    profiles.forEach(p => {
      try {
        const d = format(parseISO(p.created_at), "MM/dd");
        if (days[d] !== undefined) days[d]++;
      } catch {}
    });
    return Object.entries(days).map(([date, count]) => ({ date, users: count }));
  }, [profiles]);

  // MRR by plan
  const mrrByPlan = useMemo(() => {
    const map: Record<string, number> = {};
    billing.forEach(b => {
      map[b.plan] = (map[b.plan] || 0) + Number(b.mrr);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [billing]);

  // Projects by status
  const projectsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(p => {
      map[p.status] = (map[p.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [projects]);

  // Recent activity
  const recentLogs = logs.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Usuários" value={stats?.totalUsers || 0} change={0} sparklineColor="hsl(var(--chart-1))" />
        <KpiCard label="Projetos" value={stats?.totalProjects || 0} change={0} sparklineColor="hsl(var(--chart-2))" />
        <KpiCard label="MRR" value={stats?.totalMrr || 0} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
        <KpiCard label="ARPU" value={stats?.arpu || 0} change={0} prefix="R$" sparklineColor="hsl(var(--chart-7))" />
        <KpiCard label="Churn" value={Number(stats?.churnRate) || 0} change={0} suffix="%" sparklineColor="hsl(var(--warning))" />
        <KpiCard label="URLs Monitoradas" value={stats?.totalUrls || 0} change={0} sparklineColor="hsl(var(--chart-5))" />
      </StaggeredGrid>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer>
          <Card className="p-5">
            <ChartHeader title="Crescimento de Usuários" subtitle="Novos cadastros por dia (últimos 30 dias)" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <defs>
                    <LineGlowGradient id="userGrowthGlow" color="hsl(var(--chart-1))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="date" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="users" name="Novos Usuários" stroke="hsl(var(--chart-1))" fill="url(#userGrowthGlow)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.05}>
          <Card className="p-5">
            <ChartHeader title="MRR por Plano" subtitle="Distribuição de receita recorrente" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mrrByPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {mrrByPlan.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Status overview + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="Projetos por Status" subtitle="Distribuição do estado dos projetos" />
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByStatus}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Projetos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <ChartHeader title="Atividade Recente" subtitle="Últimas ações no sistema" />
            <div className="space-y-2">
              {recentLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade registrada</p>
              ) : recentLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground truncate">{log.action}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={getStatusVariant(log.status)} className="text-[9px]">
                      {translateStatus(log.status)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Quick stats cards */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{stats?.totalRoles || 0}</div>
            <div className="text-xs text-muted-foreground">Papéis Atribuídos</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-success" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{stats?.activeSubs || 0}</div>
            <div className="text-xs text-muted-foreground">Assinaturas Ativas</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{stats?.cancelledSubs || 0}</div>
            <div className="text-xs text-muted-foreground">Cancelamentos</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-warning" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{(stats?.totalMetrics || 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Métricas SEO</div>
          </div>
        </Card>
      </StaggeredGrid>
    </div>
  );
}
