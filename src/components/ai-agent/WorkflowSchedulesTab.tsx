import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Bell, Calendar, Clock, Mail, MessageCircle, Trash2, Edit2,
  Loader2, Play, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WorkflowNotificationConfig } from "./WorkflowNotificationConfig";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const WORKFLOW_NAMES: Record<string, string> = {
  "seo-full-analysis": "Análise SEO Completa",
  "content-decay-alert": "Alerta de Decay de Conteúdo",
  "weekly-report": "Relatório Semanal Automático",
  "indexing-pipeline": "Pipeline de Indexação",
  "competitor-spy": "Espionagem de Concorrentes",
  "ctr-optimization": "Otimização de CTR",
  "traffic-drop-diagnostic": "Diagnóstico de Queda de Tráfego",
  "conversion-funnel": "Análise de Funil de Conversão",
  "monthly-executive": "Relatório Mensal Executivo",
  "technical-seo-audit": "Auditoria Técnica SEO",
  "keyword-cannibalization": "Detecção de Canibalização",
  "local-seo-check": "Checkup SEO Local",
  "link-profile-analysis": "Análise de Perfil de Links",
  "content-gap-finder": "Descoberta de Gaps de Conteúdo",
  "mobile-performance": "Auditoria Mobile",
  "seasonal-planner": "Planejamento Sazonal",
  "roi-calculator": "Calculadora de ROI SEO",
  "quick-wins": "Quick Wins Semanais",
  "brand-monitoring": "Monitoramento de Marca",
  "pagespeed-report": "Relatório de Velocidade",
  "ecommerce-seo": "SEO para E-commerce",
  "featured-snippets": "Conquista de Featured Snippets",
  "site-architecture": "Arquitetura do Site",
  "international-expansion": "Expansão Internacional",
  "ai-seo-readiness": "Prontidão para AI Search",
  "penalty-check": "Verificação de Penalidades",
};

interface WorkflowSchedulesTabProps {
  projectId?: string;
}

export function WorkflowSchedulesTab({ projectId }: WorkflowSchedulesTabProps) {
  const queryClient = useQueryClient();
  const [editingSchedule, setEditingSchedule] = useState<{ workflowId: string; workflowName: string } | null>(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["workflow-schedules-full", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("workflow_schedules")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["workflow-deliveries-all", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("workflow_deliveries")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("workflow_schedules")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-schedules-full"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-schedules-list"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-schedules-full"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-schedules-list"] });
      toast.success("Agendamento excluído");
    },
  });

  const testMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-workflow-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            schedule_id: scheduleId,
            report: "🧪 **Teste de Notificação**\n\nEste é um teste automático do sistema de agendamentos do Rankito.\n\n✅ Se você recebeu esta mensagem, a integração está funcionando corretamente!",
            workflow_name: "Teste de Notificação",
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao enviar");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-deliveries-all"] });
      const sent = data.results?.filter((r: any) => r.status === "sent").length || 0;
      const failed = data.results?.filter((r: any) => r.status === "failed").length || 0;
      if (failed > 0) {
        toast.warning(`${sent} enviado(s), ${failed} falhou(aram)`);
      } else {
        toast.success(`Teste enviado com sucesso! (${sent} destinatário(s))`);
      }
    },
    onError: (err: any) => {
      toast.error(`Erro no teste: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-medium">Nenhum agendamento configurado</p>
        <p className="text-xs mt-1">Vá até a aba Workflows, ative um workflow e clique no ícone 🔔 para configurar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Schedules list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {schedules.map((sched) => {
          const workflowName = WORKFLOW_NAMES[sched.workflow_id] || sched.workflow_id;
          const schedDeliveries = deliveries.filter((d) => d.schedule_id === sched.id);

          return (
            <Card key={sched.id} className={cn(
              "p-4 space-y-3 transition-all",
              sched.enabled ? "ring-1 ring-primary/20" : "opacity-60"
            )}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Bell className={cn("h-4 w-4 flex-shrink-0", sched.enabled ? "text-primary" : "text-muted-foreground")} />
                    <h4 className="text-sm font-semibold text-foreground truncate">{workflowName}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant={sched.enabled ? "default" : "secondary"} className="text-[9px]">
                      {sched.enabled ? "Ativo" : "Pausado"}
                    </Badge>
                    {sched.last_run_status && (
                      <Badge
                        variant={sched.last_run_status === "success" ? "default" : "destructive"}
                        className="text-[9px]"
                      >
                        {sched.last_run_status === "success" ? "✅ Sucesso" : "⚠️ Parcial"}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={sched.enabled}
                  onCheckedChange={(enabled) => toggleMutation.mutate({ id: sched.id, enabled })}
                />
              </div>

              {/* Schedule info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{(sched.schedule_days || []).map((d: number) => DAY_LABELS[d]).join(", ")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{(sched.schedule_time as string)?.substring(0, 5)} ({sched.timezone || "America/Sao_Paulo"})</span>
                </div>
              </div>

              {/* Channels */}
              <div className="flex items-center gap-3 text-xs">
                {sched.notify_email && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{(sched.email_recipients || []).length} email(s)</span>
                  </div>
                )}
                {sched.notify_whatsapp && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    <span>{(sched.whatsapp_recipients || []).length} WhatsApp</span>
                  </div>
                )}
                {sched.send_pdf && <Badge variant="outline" className="text-[8px]">PDF</Badge>}
                {sched.send_summary && <Badge variant="outline" className="text-[8px]">Resumo</Badge>}
              </div>

              {/* Recipients preview */}
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                {(sched.email_recipients || []).map((e: string) => (
                  <div key={e} className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {e}</div>
                ))}
                {(sched.whatsapp_recipients || []).map((w: string) => (
                  <div key={w} className="flex items-center gap-1"><MessageCircle className="h-2.5 w-2.5" /> {w}</div>
                ))}
              </div>

              {/* Last run */}
              {sched.last_run_at && (
                <div className="text-[10px] text-muted-foreground">
                  Último envio: {new Date(sched.last_run_at).toLocaleString("pt-BR")}
                </div>
              )}

              {/* Recent deliveries for this schedule */}
              {schedDeliveries.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">Últimos envios:</p>
                  {schedDeliveries.slice(0, 3).map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-[10px] px-2 py-1 rounded border border-border bg-muted/20">
                      <div className="flex items-center gap-1.5">
                        {d.channel === "email" ? <Mail className="h-2.5 w-2.5" /> : <MessageCircle className="h-2.5 w-2.5" />}
                        <span className="text-muted-foreground truncate max-w-[120px]">{d.recipient}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {d.status === "sent" ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5 text-destructive" />
                        )}
                        <span className={d.status === "sent" ? "text-emerald-500" : "text-destructive"}>
                          {d.status === "sent" ? "Enviado" : "Falhou"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs gap-1"
                  onClick={() => setEditingSchedule({ workflowId: sched.workflow_id, workflowName: workflowName })}
                >
                  <Edit2 className="h-3 w-3" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => testMutation.mutate(sched.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Testar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-destructive hover:text-destructive px-2"
                  onClick={() => {
                    if (confirm("Excluir este agendamento?")) {
                      deleteMutation.mutate(sched.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit dialog */}
      {editingSchedule && projectId && (
        <WorkflowNotificationConfig
          open={!!editingSchedule}
          onOpenChange={(o) => !o && setEditingSchedule(null)}
          workflowId={editingSchedule.workflowId}
          workflowName={editingSchedule.workflowName}
          projectId={projectId}
        />
      )}
    </div>
  );
}
