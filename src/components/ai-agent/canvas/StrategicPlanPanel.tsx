import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, AlertTriangle, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategicPlanPanelProps {
  deploymentId: string;
  projectId?: string;
}

const DAY_LABELS: Record<string, string> = {
  segunda: "Seg",
  terca: "Ter",
  quarta: "Qua",
  quinta: "Qui",
  sexta: "Sex",
};

const DAY_COLORS = ["bg-violet-500/10 border-violet-500/20", "bg-blue-500/10 border-blue-500/20", "bg-cyan-500/10 border-cyan-500/20", "bg-emerald-500/10 border-emerald-500/20", "bg-amber-500/10 border-amber-500/20"];

export function StrategicPlanPanel({ deploymentId, projectId }: StrategicPlanPanelProps) {
  const { data: lastRun, isLoading } = useQuery({
    queryKey: ["orchestrator-last-run-plan", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orchestrator_runs")
        .select("delivery_status, created_at, status, summary")
        .eq("deployment_id", deploymentId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!deploymentId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const plan = (lastRun?.delivery_status as any)?.strategic_plan;

  if (!plan) {
    return (
      <div className="text-center py-10 space-y-2">
        <Calendar className="h-10 w-10 mx-auto text-muted-foreground/20" />
        <p className="text-sm font-medium text-muted-foreground">Nenhum planejamento estratégico ainda</p>
        <p className="text-xs text-muted-foreground/60">Execute o orquestrador para gerar o plano estratégico da semana.</p>
      </div>
    );
  }

  const days = Object.entries(plan.daily_focus || {}) as [string, string][];

  return (
    <ScrollArea className="max-h-[600px] pr-2">
      <div className="space-y-4 pb-2">
        {/* Week theme */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">🎯 Tema da Semana</p>
          <p className="text-sm font-bold">{plan.week_theme}</p>
          {lastRun?.created_at && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Gerado em {new Date(lastRun.created_at).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {/* Top goals */}
        {plan.top_goals?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="h-3 w-3" /> Metas Prioritárias
            </p>
            <div className="space-y-1.5">
              {(plan.top_goals as string[]).map((goal, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                  <span className="text-xs font-bold text-primary shrink-0">{i + 1}.</span>
                  <p className="text-xs">{goal}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily focus */}
        {days.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> Foco Diário
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {days.map(([day, focus], i) => (
                <div key={day} className={cn("p-2 rounded-lg border text-center", DAY_COLORS[i % DAY_COLORS.length])}>
                  <p className="text-[9px] font-bold uppercase mb-1">{DAY_LABELS[day] || day}</p>
                  <p className="text-[10px] leading-tight">{focus}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs to watch */}
        {plan.kpis_to_watch?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> KPIs para Monitorar
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {(plan.kpis_to_watch as any[]).map((kpi, i) => (
                <div key={i} className="p-2.5 rounded-lg border border-border bg-card/50">
                  <p className="text-[9px] text-muted-foreground">{kpi.metric}</p>
                  <p className="text-xs font-bold text-primary mt-0.5">{kpi.target}</p>
                  {kpi.current && <p className="text-[9px] text-muted-foreground">Atual: {kpi.current}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk alert */}
        {plan.risk_alert && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-0.5">Alerta de Risco</p>
              <p className="text-xs">{plan.risk_alert}</p>
            </div>
          </div>
        )}

        {/* CEO summary */}
        {lastRun?.summary && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">📋 Relatório Executivo CEO</p>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <ScrollArea className="max-h-48">
                <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{lastRun.summary}</p>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
