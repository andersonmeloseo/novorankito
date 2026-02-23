import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Mail, MessageSquare, Send, Loader2, CheckCircle2, XCircle, Clock, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const NOTIFICATION_TYPES = [
  { value: "welcome", label: "🎉 Boas-vindas", color: "bg-emerald-500/10 text-emerald-600" },
  { value: "expiring_7d", label: "⏰ Vence em 7 dias", color: "bg-yellow-500/10 text-yellow-600" },
  { value: "expiring_3d", label: "⚠️ Vence em 3 dias", color: "bg-orange-500/10 text-orange-600" },
  { value: "expiring_1d", label: "🚨 Vence amanhã", color: "bg-red-500/10 text-red-600" },
  { value: "expired", label: "🚫 Expirado", color: "bg-destructive/10 text-destructive" },
  { value: "payment_reminder", label: "💰 Lembrete cobrança", color: "bg-blue-500/10 text-blue-600" },
];

export default function AdminNotificationsPage() {
  const qc = useQueryClient();
  const [manualType, setManualType] = useState<string>("");
  const [manualUserId, setManualUserId] = useState<string>("");

  // Fetch billing notifications log
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-billing-notifications"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("billing_notifications" as any).select("*").order("created_at", { ascending: false }).limit(200)) as any;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch workflow deliveries for legacy stats
  const { data: deliveries = [] } = useQuery({
    queryKey: ["admin-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflow_deliveries").select("id, channel, status, created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users with WhatsApp for manual send
  const { data: usersWithWa = [] } = useQuery({
    queryKey: ["admin-users-whatsapp"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, display_name, whatsapp_phone").not("whatsapp_phone", "is", null).neq("whatsapp_phone", "");
      if (error) throw error;
      return data || [];
    },
  });

  // Run cron (scan all subscriptions)
  const runCron = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("billing-lifecycle-notifications", {
        body: { mode: "cron" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Scan concluído", description: `${data.sent} enviados, ${data.failed} falhas` });
      qc.invalidateQueries({ queryKey: ["admin-billing-notifications"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Manual send
  const manualSend = useMutation({
    mutationFn: async () => {
      if (!manualUserId || !manualType) throw new Error("Selecione usuário e tipo");
      const { data, error } = await supabase.functions.invoke("billing-lifecycle-notifications", {
        body: { mode: "manual", user_id: manualUserId, notification_type: manualType },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Enviado!", description: `${data.sent} mensagem(ns) enviada(s)` });
      qc.invalidateQueries({ queryKey: ["admin-billing-notifications"] });
      setManualUserId("");
      setManualType("");
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Stats
  const sentCount = notifications.filter((n: any) => n.status === "sent").length;
  const failedCount = notifications.filter((n: any) => n.status === "failed").length;
  const waDeliveries = deliveries.filter((d: any) => d.channel === "whatsapp").length;
  const emailDeliveries = deliveries.filter((d: any) => d.channel === "email").length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Central de Notificações" description="Mensagens automáticas de ciclo de vida via WhatsApp e in-app" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> WhatsApp Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{sentCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Falhas
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{failedCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Usuários c/ WA
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{usersWithWa.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Workflow (legado)
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{waDeliveries + emailDeliveries}</div></CardContent>
        </Card>
      </div>

      {/* Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cron Scan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Scan Automático
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Verifica todos os planos e envia notificações para quem está vencendo (7d, 3d, 1d), venceu ou é novo.
            </p>
            <Button size="sm" onClick={() => runCron.mutate()} disabled={runCron.isPending} className="gap-1.5">
              {runCron.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Executar Scan Agora
            </Button>
          </CardContent>
        </Card>

        {/* Manual Send */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4" /> Envio Manual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={manualUserId} onValueChange={setManualUserId}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Selecionar usuário..." />
              </SelectTrigger>
              <SelectContent>
                {usersWithWa.map((u: any) => (
                  <SelectItem key={u.user_id} value={u.user_id} className="text-xs">
                    {u.display_name} — {u.whatsapp_phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={manualType} onValueChange={setManualType}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Tipo de notificação..." />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => manualSend.mutate()} disabled={manualSend.isPending || !manualUserId || !manualType} className="gap-1.5">
              {manualSend.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notification Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" /> Histórico de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma notificação enviada ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Tipo", "Canal", "Status", "Plano", "Telefone", "Quando"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n: any) => {
                    const typeInfo = NOTIFICATION_TYPES.find(t => t.value === n.notification_type);
                    return (
                      <tr key={n.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className={`text-[10px] ${typeInfo?.color || ""}`}>
                            {typeInfo?.label || n.notification_type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-[10px]">{n.channel}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          {n.status === "sent" ? (
                            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Enviado</span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> Falha</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{n.metadata?.plan || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground font-mono text-[10px]">{n.metadata?.phone || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
