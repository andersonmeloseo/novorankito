import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Mail, MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminNotificationsPage() {
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["admin-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflow_deliveries").select("id, channel, status, created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const emailCount = deliveries.filter((d: any) => d.channel === "email").length;
  const whatsappCount = deliveries.filter((d: any) => d.channel === "whatsapp").length;
  const totalCount = deliveries.length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Notificações" description="Envio global, broadcast para clientes e alertas internos" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> E-mails Enviados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{emailCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> WhatsApp</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{whatsappCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Bell className="h-3 w-3" /> Total Entregas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" /> Enviar Broadcast</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Assunto" className="text-sm" />
          <Textarea placeholder="Mensagem..." className="text-sm min-h-[120px]" />
          <div className="flex gap-2">
            <Button size="sm">Enviar para Todos</Button>
            <Button size="sm" variant="outline">Enviar para Plano Específico</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
