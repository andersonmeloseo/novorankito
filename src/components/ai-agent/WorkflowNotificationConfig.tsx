import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageCircle, Clock, Calendar, FileText, Send, Loader2, Trash2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface WorkflowNotificationConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
  projectId: string;
}

const DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: `${String(i).padStart(2, "0")}:00`,
  label: `${String(i).padStart(2, "0")}:00`,
}));

export function WorkflowNotificationConfig({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  projectId,
}: WorkflowNotificationConfigProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [whatsappRecipients, setWhatsappRecipients] = useState("");
  const [sendPdf, setSendPdf] = useState(true);
  const [sendSummary, setSendSummary] = useState(true);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["workflow-schedule", workflowId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_schedules")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!projectId,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["workflow-deliveries", workflowId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_deliveries")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
  });

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      setScheduleDays(schedule.schedule_days || [1, 2, 3, 4, 5]);
      setScheduleTime(schedule.schedule_time?.substring(0, 5) || "09:00");
      setNotifyEmail(schedule.notify_email);
      setNotifyWhatsapp(schedule.notify_whatsapp);
      setEmailRecipients((schedule.email_recipients || []).join(", "));
      setWhatsappRecipients((schedule.whatsapp_recipients || []).join(", "));
      setSendPdf(schedule.send_pdf);
      setSendSummary(schedule.send_summary);
    }
  }, [schedule]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      const payload = {
        workflow_id: workflowId,
        project_id: projectId,
        owner_id: user.id,
        enabled,
        schedule_days: scheduleDays,
        schedule_time: `${scheduleTime}:00`,
        notify_email: notifyEmail,
        notify_whatsapp: notifyWhatsapp,
        email_recipients: emailRecipients.split(",").map((e) => e.trim()).filter(Boolean),
        whatsapp_recipients: whatsappRecipients.split(",").map((w) => w.trim()).filter(Boolean),
        send_pdf: sendPdf,
        send_summary: sendSummary,
      };

      if (schedule?.id) {
        const { error } = await supabase
          .from("workflow_schedules")
          .update(payload)
          .eq("id", schedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workflow_schedules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-schedule"] });
      toast.success("Configuração salva!");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-primary" />
            Notificações — {workflowName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">Agendamento ativo</p>
                <p className="text-[11px] text-muted-foreground">Executa automaticamente nos dias/horários configurados</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Dias da semana
              </Label>
              <div className="flex gap-1.5">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "h-9 w-9 rounded-lg text-[11px] font-medium transition-all border",
                      scheduleDays.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5" /> Horário
                </Label>
                <Select value={scheduleTime} onValueChange={setScheduleTime}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value} className="text-xs">
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">(Brasília)</span>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2 p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Notificar por Email
                </Label>
                <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
              </div>
              {notifyEmail && (
                <div className="space-y-1.5">
                  <Input
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    placeholder="email1@exemplo.com, email2@exemplo.com"
                    className="text-xs h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Separe múltiplos emails por vírgula</p>
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-2 p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> Notificar por WhatsApp
                </Label>
                <Switch checked={notifyWhatsapp} onCheckedChange={setNotifyWhatsapp} />
              </div>
              {notifyWhatsapp && (
                <div className="space-y-1.5">
                  <Input
                    value={whatsappRecipients}
                    onChange={(e) => setWhatsappRecipients(e.target.value)}
                    placeholder="+5511999999999, +5521888888888"
                    className="text-xs h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Números com DDI+DDD, separados por vírgula</p>
                </div>
              )}
            </div>

            {/* Output format */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Formato de envio
              </Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <Checkbox checked={sendPdf} onCheckedChange={(v) => setSendPdf(!!v)} />
                  PDF anexado
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <Checkbox checked={sendSummary} onCheckedChange={(v) => setSendSummary(!!v)} />
                  Resumo no corpo
                </label>
              </div>
            </div>

            {/* Recent deliveries */}
            {deliveries.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Últimos envios
                </Label>
                <div className="space-y-1">
                  {deliveries.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded border border-border bg-muted/20">
                      <div className="flex items-center gap-2">
                        {d.channel === "email" ? <Mail className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                        <span className="text-muted-foreground">{d.recipient}</span>
                      </div>
                      <Badge
                        variant={d.status === "sent" ? "default" : d.status === "failed" ? "destructive" : "secondary"}
                        className="text-[8px]"
                      >
                        {d.status === "sent" ? "Enviado" : d.status === "failed" ? "Falhou" : "Pendente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save */}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full gap-1.5"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Salvar configuração
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
