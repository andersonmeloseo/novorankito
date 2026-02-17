import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Bot } from "lucide-react";
import type { CanvasNodeData, CanvasNodeType } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface NodeConfigPanelProps {
  nodeId: string;
  data: CanvasNodeData;
  onUpdate: (nodeId: string, data: Partial<CanvasNodeData>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  projectId?: string;
}

export function NodeConfigPanel({ nodeId, data, onUpdate, onClose, onDelete, projectId }: NodeConfigPanelProps) {
  const [label, setLabel] = useState(data.label);
  const cfg = data.config as any;

  useEffect(() => { setLabel(data.label); }, [data.label]);

  const { data: existingAgents = [] } = useQuery({
    queryKey: ["ai-agents-for-canvas", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from("ai_agents")
        .select("id, name, speciality, instructions, description")
        .eq("project_id", projectId)
        .eq("enabled", true)
        .order("name");
      return data || [];
    },
    enabled: !!projectId,
  });

  const updateConfig = (partial: Record<string, any>) => {
    onUpdate(nodeId, { config: { ...data.config, ...partial } as any });
  };

  const selectExistingAgent = (agentId: string) => {
    const agent = existingAgents.find((a: any) => a.id === agentId);
    if (!agent) return;
    onUpdate(nodeId, {
      label: agent.name,
      config: {
        ...data.config,
        agentName: agent.name,
        agentInstructions: agent.instructions || "",
        prompt: cfg.prompt || "",
        emoji: "🤖",
      } as any,
    });
    setLabel(agent.name);
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border z-50 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Configurar Nó</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Nome</Label>
          <Input
            value={label}
            onChange={(e) => { setLabel(e.target.value); onUpdate(nodeId, { label: e.target.value }); }}
            className="text-xs h-8"
          />
        </div>

        {data.nodeType === "trigger" && (
          <div className="space-y-2">
            <Label className="text-xs">Tipo de Trigger</Label>
            <Select value={cfg.triggerType || "manual"} onValueChange={(v) => updateConfig({ triggerType: v })}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="schedule">Agendado</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
              </SelectContent>
            </Select>
            {cfg.triggerType === "schedule" && (
              <div className="space-y-1">
                <Label className="text-xs">Expressão Cron</Label>
                <Input value={cfg.cronExpression || ""} onChange={(e) => updateConfig({ cronExpression: e.target.value })} placeholder="0 9 * * 1" className="text-xs h-8" />
              </div>
            )}
          </div>
        )}

        {data.nodeType === "agent" && (
          <div className="space-y-3">
            {existingAgents.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Usar agente existente</Label>
                <Select onValueChange={selectExistingAgent}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Selecionar agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingAgents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <span className="flex items-center gap-2">
                          <Bot className="h-3 w-3 text-blue-400" />
                          <span>{agent.name}</span>
                          <span className="text-muted-foreground text-[10px]">· {agent.speciality}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Ou configure manualmente abaixo</p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Nome do Agente</Label>
              <Input value={cfg.agentName || ""} onChange={(e) => updateConfig({ agentName: e.target.value })} placeholder="Rankito SEO" className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prompt / Instrução</Label>
              <Textarea value={cfg.prompt || ""} onChange={(e) => updateConfig({ prompt: e.target.value })} placeholder="O que este agente deve fazer..." className="text-xs min-h-[120px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instruções do Sistema (opcional)</Label>
              <Textarea value={cfg.agentInstructions || ""} onChange={(e) => updateConfig({ agentInstructions: e.target.value })} placeholder="Personalidade e expertise..." className="text-xs min-h-[80px]" />
            </div>
          </div>
        )}

        {data.nodeType === "action" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Ação</Label>
              <Select value={cfg.actionType || "email"} onValueChange={(v) => updateConfig({ actionType: v })}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Enviar Email</SelectItem>
                  <SelectItem value="whatsapp">Enviar WhatsApp</SelectItem>
                  <SelectItem value="webhook">Disparar Webhook</SelectItem>
                  <SelectItem value="notification">Notificação Interna</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Destino</Label>
              <Input value={cfg.destination || ""} onChange={(e) => updateConfig({ destination: e.target.value })} placeholder={cfg.actionType === "email" ? "email@exemplo.com" : cfg.actionType === "whatsapp" ? "+5511999999999" : "https://..."} className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Template da Mensagem</Label>
              <Textarea value={cfg.template || ""} onChange={(e) => updateConfig({ template: e.target.value })} placeholder="Use {{resultado}} para inserir dados do passo anterior" className="text-xs min-h-[80px]" />
            </div>
          </div>
        )}

        {data.nodeType === "condition" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Campo</Label>
              <Input value={cfg.field || ""} onChange={(e) => updateConfig({ field: e.target.value })} placeholder="resultado, status, etc." className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Operador</Label>
              <Select value={cfg.operator || "contains"} onValueChange={(v) => updateConfig({ operator: v })}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contém</SelectItem>
                  <SelectItem value="not_contains">Não contém</SelectItem>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="gt">Maior que</SelectItem>
                  <SelectItem value="lt">Menor que</SelectItem>
                  <SelectItem value="exists">Existe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor</Label>
              <Input value={cfg.value || ""} onChange={(e) => updateConfig({ value: e.target.value })} className="text-xs h-8" />
            </div>
          </div>
        )}

        {data.nodeType === "delay" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tempo de espera</Label>
              <div className="flex gap-2">
                <Input type="number" value={cfg.delaySeconds || 0} onChange={(e) => updateConfig({ delaySeconds: parseInt(e.target.value) || 0 })} className="text-xs h-8 flex-1" />
                <Select value={cfg.delayUnit || "seconds"} onValueChange={(v) => updateConfig({ delayUnit: v })}>
                  <SelectTrigger className="text-xs h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Segundos</SelectItem>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {data.nodeType === "split" && (
          <div className="space-y-2">
            <Label className="text-xs">Tipo de Split</Label>
            <Select value={cfg.splitType || "parallel"} onValueChange={(v) => updateConfig({ splitType: v })}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="parallel">Paralelo</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {data.nodeType === "merge" && (
          <div className="space-y-2">
            <Label className="text-xs">Tipo de Merge</Label>
            <Select value={cfg.mergeType || "wait_all"} onValueChange={(v) => updateConfig({ mergeType: v })}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wait_all">Esperar Todos</SelectItem>
                <SelectItem value="wait_any">Esperar Qualquer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button variant="destructive" size="sm" className="w-full text-xs mt-4" onClick={() => { onDelete(nodeId); onClose(); }}>
          Excluir Nó
        </Button>
      </div>
    </div>
  );
}
