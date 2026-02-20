import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Webhook, Plus, Trash2, Loader2, BookOpen, Code2, ChevronDown, ChevronUp, Zap, Bell, BarChart3, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENT_OPTIONS = ["*", "metrics.updated", "indexing.completed", "url.discovered", "job.completed", "job.failed"];

const EVENT_DOCS: Record<string, { desc: string; example: string }> = {
  "*": { desc: "Recebe todos os eventos do projeto", example: "Qualquer evento abaixo" },
  "metrics.updated": { desc: "Disparado quando métricas de SEO/GA4 são atualizadas", example: "Atualizar dashboard externo em tempo real" },
  "indexing.completed": { desc: "Disparado quando URLs são indexadas com sucesso", example: "Notificar equipe no Slack que URLs foram indexadas" },
  "url.discovered": { desc: "Disparado quando novas URLs são descobertas", example: "Alimentar pipeline de análise de conteúdo" },
  "job.completed": { desc: "Disparado quando um job de sync (GSC/GA4) finaliza", example: "Trigger automação no n8n após sync" },
  "job.failed": { desc: "Disparado quando um job falha", example: "Alerta no Discord/WhatsApp sobre falha" },
};

const USE_CASES = [
  { title: "Slack / Discord / WhatsApp", desc: "Receba alertas automáticos quando jobs terminam ou falham.", icon: <Bell className="h-3.5 w-3.5 text-primary" /> },
  { title: "Dashboard em tempo real", desc: "Atualize painéis externos automaticamente quando métricas mudam.", icon: <BarChart3 className="h-3.5 w-3.5 text-primary" /> },
  { title: "Automação (n8n / Zapier)", desc: "Acione workflows automaticamente com base em eventos do projeto.", icon: <Zap className="h-3.5 w-3.5 text-primary" /> },
  { title: "Pipeline de conteúdo", desc: "Inicie análises quando novas URLs são descobertas.", icon: <Search className="h-3.5 w-3.5 text-primary" /> },
];

interface WebhooksSettingsProps {
  projectId: string;
}

export function WebhooksSettings({ projectId }: WebhooksSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>(["*"]);
  const [showDocs, setShowDocs] = useState(false);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
      const { error } = await supabase.from("webhooks").insert({
        owner_id: user!.id,
        project_id: projectId,
        url: newUrl,
        secret,
        events: newEvents,
      });
      if (error) throw error;
      return secret;
    },
    onSuccess: (secret) => {
      toast({ title: "Webhook criado!", description: `Secret: ${secret.substring(0, 12)}... (salve agora!)` });
      setNewUrl("");
      qc.invalidateQueries({ queryKey: ["webhooks", projectId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Webhook removido" });
      qc.invalidateQueries({ queryKey: ["webhooks", projectId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("webhooks").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks", projectId] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Webhook className="h-4 w-4" />
          Webhooks
        </CardTitle>
        <CardDescription className="text-xs">
          Receba notificações HTTP automáticas quando eventos acontecerem no seu projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Use Cases */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/50 bg-muted/20">
              <span className="mt-0.5">{uc.icon}</span>
              <div>
                <p className="text-[11px] font-semibold text-foreground">{uc.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{uc.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Create new webhook */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input className="h-8 text-sm flex-1" placeholder="https://seu-servidor.com/webhook" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newUrl}>
              {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Criar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_OPTIONS.map((evt) => (
              <Badge
                key={evt}
                variant={newEvents.includes(evt) ? "default" : "outline"}
                className="text-[10px] cursor-pointer"
                onClick={() =>
                  setNewEvents(
                    newEvents.includes(evt)
                      ? newEvents.filter((e) => e !== evt)
                      : [...newEvents, evt]
                  )
                }
              >
                {evt === "*" ? "Todos" : evt}
              </Badge>
            ))}
          </div>
        </div>

        {/* List webhooks */}
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : webhooks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum webhook configurado.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((w) => (
              <div key={w.id} className="px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Webhook className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <code className="text-[11px] font-mono truncate">{w.url}</code>
                    {w.failure_count > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {w.failure_count} falha{w.failure_count > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={w.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: w.id, active: v })}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(w.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap">
                    {(w.events || []).map((evt: string) => (
                      <Badge key={evt} variant="outline" className="text-[9px]">
                        {evt === "*" ? "Todos" : evt}
                      </Badge>
                    ))}
                  </div>
                  {w.last_triggered_at && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Último: {formatDistanceToNow(new Date(w.last_triggered_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Docs toggle */}
        <button
          onClick={() => setShowDocs(!showDocs)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
        >
          <Code2 className="h-3.5 w-3.5" />
          {showDocs ? "Ocultar" : "Ver"} eventos e documentação
          {showDocs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showDocs && (
          <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
            <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Eventos disponíveis
            </p>

            <div className="space-y-2">
              {Object.entries(EVENT_DOCS).map(([event, doc]) => (
                <div key={event} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <code className="text-[10px] font-mono font-semibold text-foreground bg-background px-1.5 py-0.5 rounded">{event}</code>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-1">{doc.desc}</p>
                  <p className="text-[10px] text-muted-foreground/70 pl-1 italic">Ex: {doc.example}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-foreground">Payload recebido:</p>
              <div className="bg-background rounded p-2 font-mono text-[10px] text-foreground overflow-x-auto">
                {`{
  "event": "job.completed",
  "project_id": "uuid",
  "timestamp": "2026-02-17T...",
  "data": { ... }
}`}
              </div>
            </div>

            <div className="border-t border-border pt-2 space-y-1">
              <p className="text-[10px] font-semibold text-foreground">Validação de assinatura:</p>
              <p className="text-[10px] text-muted-foreground">Cada entrega inclui o header <code className="bg-background px-1 rounded">X-Webhook-Signature</code> com HMAC-SHA256.</p>
              <div className="bg-background rounded p-2 font-mono text-[10px] text-foreground overflow-x-auto">
                {`// Verificar no seu servidor:
const signature = req.headers["x-webhook-signature"];
const expected = "sha256=" + hmacSHA256(body, secret);
if (signature !== expected) return 401;`}
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
              <p>⏱️ Timeout: 10 segundos por entrega</p>
              <p>🔄 Auto-desativação: após 10 falhas consecutivas</p>
              <p>📋 Histórico: todas as entregas são registradas em <code className="bg-background px-1 rounded">webhook_deliveries</code></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
