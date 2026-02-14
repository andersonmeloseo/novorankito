import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { Download, CreditCard, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader,
} from "@/components/analytics/ChartPrimitives";
import { useMemo } from "react";
import { exportCSV } from "@/lib/export-utils";
import { toast } from "@/hooks/use-toast";

interface AdminBillingTabProps {
  billing: any[];
  profiles: any[];
}

export function AdminBillingTab({ billing, profiles }: AdminBillingTabProps) {
  const totalMrr = billing.reduce((s, b) => s + Number(b.mrr), 0);
  const activeSubs = billing.filter(b => b.status === "active").length;
  const cancelledSubs = billing.filter(b => b.status === "cancelled").length;
  const arpu = activeSubs > 0 ? Math.round(totalMrr / activeSubs) : 0;
  const totalEvents = billing.reduce((s, b) => s + b.events_used, 0);
  const totalEventsLimit = billing.reduce((s, b) => s + b.events_limit, 0);

  const byPlan = useMemo(() => {
    const map: Record<string, { count: number; mrr: number }> = {};
    billing.forEach(b => {
      if (!map[b.plan]) map[b.plan] = { count: 0, mrr: 0 };
      map[b.plan].count++;
      map[b.plan].mrr += Number(b.mrr);
    });
    return Object.entries(map).map(([plan, data]) => ({ plan, ...data }));
  }, [billing]);

  const getProfileName = (userId: string) => profiles.find(p => p.user_id === userId)?.display_name || userId.slice(0, 8) + "...";

  const handleExport = () => {
    exportCSV(billing.map(b => ({
      Usuário: getProfileName(b.user_id), Plano: b.plan, MRR: b.mrr,
      "Eventos Usados": b.events_used, "Limite Eventos": b.events_limit, Status: b.status,
    })), "billing-admin");
    toast({ title: "Exportado" });
  };

  return (
    <div className="space-y-4">
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="MRR Total" value={totalMrr} change={0} prefix="R$" sparklineColor="hsl(var(--chart-9))" />
        <KpiCard label="Assinaturas Ativas" value={activeSubs} change={0} sparklineColor="hsl(var(--success))" />
        <KpiCard label="Canceladas" value={cancelledSubs} change={0} sparklineColor="hsl(var(--destructive))" />
        <KpiCard label="ARPU" value={arpu} change={0} prefix="R$" sparklineColor="hsl(var(--chart-7))" />
        <KpiCard label="Eventos Usados" value={totalEvents} change={0} sparklineColor="hsl(var(--chart-5))" />
        <KpiCard label="Capacidade Eventos" value={totalEventsLimit > 0 ? Math.round((totalEvents / totalEventsLimit) * 100) : 0} change={0} suffix="%" sparklineColor="hsl(var(--warning))" />
      </StaggeredGrid>

      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Assinantes por Plano" subtitle="Quantidade e MRR por tier" />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPlan}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="plan" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Bar dataKey="count" name="Assinantes" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="mrr" name="MRR (R$)" fill="hsl(var(--chart-9))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Todas as Assinaturas</h3>
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={handleExport}>
            <Download className="h-3 w-3" /> CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Usuário", "Plano", "MRR", "Eventos", "Projetos", "Status"].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {billing.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma assinatura</td></tr>
              ) : billing.map(b => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-foreground">{getProfileName(b.user_id)}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{b.plan}</Badge></td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground">R$ {Number(b.mrr).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.events_used.toLocaleString()}/{b.events_limit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.projects_limit}</td>
                  <td className="px-4 py-3"><Badge variant={b.status === "active" ? "default" : "destructive"} className="text-[10px]">{b.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
