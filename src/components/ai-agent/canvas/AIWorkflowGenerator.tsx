import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { CanvasNodeData, CanvasNodeType } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface AIWorkflowGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (nodes: Node[], edges: Edge[], name: string) => void;
  projectId?: string;
}

const SUGGESTIONS = [
  "Análise SEO completa com relatório por email",
  "Monitorar quedas de tráfego e notificar por WhatsApp",
  "Relatório semanal de performance com envio automático",
  "Auditar problemas técnicos e enviar plano de ação",
  "Análise de concorrentes com oportunidades de keywords",
];

export function AIWorkflowGenerator({ open, onOpenChange, onGenerated, projectId }: AIWorkflowGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          agent_name: "Workflow Generator",
          agent_instructions: `Você é um gerador de workflows de automação. O usuário vai descrever o que quer automatizar e você deve retornar UM JSON PURO (sem markdown, sem \`\`\`, apenas o JSON) com a estrutura do workflow.

O JSON deve ter exatamente este formato:
{
  "name": "Nome do Workflow",
  "nodes": [
    { "type": "trigger", "label": "Trigger", "config": { "triggerType": "manual" } },
    { "type": "agent", "label": "Nome do Agente", "config": { "agentName": "Rankito SEO", "prompt": "Instrução detalhada do que o agente deve fazer...", "agentInstructions": "", "emoji": "🔍" } },
    { "type": "report", "label": "Enviar Relatório", "config": { "reportName": "Relatório", "channels": ["email"], "recipients": [{ "name": "Destinatário", "email": "email@exemplo.com" }], "template": "{{resultado}}" } }
  ]
}

REGRAS:
- O primeiro nó SEMPRE deve ser "trigger"
- Use agentes com nomes reais: "Rankito SEO", "Rankito Analytics", "Rankito Growth", "Rankito Content", "Rankito Técnico"
- Os prompts dos agentes devem ser detalhados e usar dados reais do projeto
- Se o usuário mencionar envio de relatório, use o tipo "report" como último nó com channels e recipients
- Se mencionar email, inclua "email" nos channels
- Se mencionar WhatsApp, inclua "whatsapp" nos channels
- Tipos disponíveis: trigger, agent, condition, delay, split, merge, report
- Para condition: config deve ter { "field": "resultado", "operator": "contains", "value": "..." }
- Para delay: config deve ter { "delaySeconds": 5, "delayUnit": "seconds" }
- Gere entre 3 e 6 nós por workflow
- RETORNE APENAS O JSON, nada mais`,
          project_id: projectId,
        },
      });

      if (error) throw new Error(error.message);

      // Read streaming response to get full text
      let fullText = "";
      if (data instanceof ReadableStream) {
        const reader = data.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch { /* partial */ }
          }
        }
      } else if (typeof data === "string") {
        fullText = data;
      }

      // Extract JSON from response
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("IA não retornou JSON válido");

      const workflow = JSON.parse(jsonMatch[0]);
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) throw new Error("Formato inválido");

      // Convert to ReactFlow nodes & edges
      const rfNodes: Node[] = workflow.nodes.map((n: any, i: number) => ({
        id: `ai-${Date.now()}-${i}`,
        type: "canvasNode",
        position: { x: 300, y: 50 + i * 140 },
        data: {
          label: n.label || n.type,
          nodeType: n.type as CanvasNodeType,
          config: n.config || {},
        } as CanvasNodeData,
      }));

      const rfEdges: Edge[] = rfNodes.slice(0, -1).map((n, i) => ({
        id: `ai-edge-${Date.now()}-${i}`,
        source: n.id,
        target: rfNodes[i + 1].id,
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
      }));

      onGenerated(rfNodes, rfEdges, workflow.name || "Workflow IA");
      onOpenChange(false);
      setPrompt("");
      toast.success(`Workflow "${workflow.name}" gerado com sucesso!`);
    } catch (err: any) {
      console.error("AI generation error:", err);
      toast.error(`Erro ao gerar workflow: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Workflow com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Descreva o workflow que deseja criar</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Quero um workflow que analise o SEO do meu site, identifique oportunidades e me envie um relatório por email toda semana..."
              className="min-h-[120px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Sugestões:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={isGenerating || !prompt.trim()} className="w-full gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando workflow...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Gerar Workflow
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
