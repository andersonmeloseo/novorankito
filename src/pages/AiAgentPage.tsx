import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { mockInsights } from "@/lib/mock-data";
import {
  Bot, Send, Lightbulb, ListChecks, Settings2, Sparkles,
  CheckCircle2, Clock, AlertCircle, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_MESSAGES = [
  { role: "assistant" as const, content: "Olá! Sou o Agente Rankito. Analisei os dados do seu projeto e encontrei 3 insights prioritários. O mais crítico é a queda de 34% em cliques na /products/smart-speaker. Quer que eu detalhe as possíveis causas?" },
  { role: "user" as const, content: "Sim, detalhe as causas e sugira ações." },
  { role: "assistant" as const, content: "A queda na /products/smart-speaker está associada a:\n\n1. **Perda de posição** — posição média caiu de 5.8 → 9.2 nas últimas 2 semanas\n2. **Novo concorrente** — um resultado do TechRadar entrou no top 3 para 'smart speaker comparison'\n3. **CTR reduzido** — o snippet atual tem CTR 1.2%, abaixo da média do segmento (2.8%)\n\n**Ações recomendadas:**\n- Reescrever title tag com benefício claro (estimativa: +40% CTR)\n- Adicionar FAQ schema markup\n- Criar 2 internal links de páginas com autoridade\n\nQuer que eu crie tarefas para essas ações?" },
];

const MOCK_TASKS = [
  { id: "1", title: "Reescrever title tag da /products/smart-speaker", status: "a_fazer" as const, priority: "alta", assignee: "João", due: "2026-02-15" },
  { id: "2", title: "Adicionar FAQ schema na página de smart speaker", status: "em_progresso" as const, priority: "alta", assignee: "Maria", due: "2026-02-16" },
  { id: "3", title: "Otimizar meta descriptions do grupo 'Blog'", status: "concluido" as const, priority: "média", assignee: "João", due: "2026-02-12" },
  { id: "4", title: "Criar internal links para /products/smart-speaker", status: "a_fazer" as const, priority: "alta", assignee: "—", due: "2026-02-17" },
  { id: "5", title: "Revisar canibalizacão em 'headphones' queries", status: "a_fazer" as const, priority: "média", assignee: "—", due: "2026-02-18" },
];

const TASK_STATUS_STYLE: Record<string, { bg: string; icon: React.ElementType; label: string }> = {
  a_fazer: { bg: "bg-muted text-muted-foreground", icon: Clock, label: "A fazer" },
  em_progresso: { bg: "bg-primary/10 text-primary", icon: AlertCircle, label: "Em progresso" },
  concluido: { bg: "bg-success/10 text-success", icon: CheckCircle2, label: "Concluído" },
};

export default function AiAgentPage() {
  const [mode, setMode] = useState<"executive" | "technical">("executive");
  const [tab, setTab] = useState("chat");

  return (
    <>
      <TopBar title="Agente IA" subtitle="Insights & Ações" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Mode Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setMode("executive")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", mode === "executive" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
            >
              Executivo
            </button>
            <button
              onClick={() => setMode("technical")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", mode === "technical" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
            >
              Técnico
            </button>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 ml-auto">
            <Settings2 className="h-3 w-3" /> Configurar
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="chat" className="text-xs gap-1.5"><Bot className="h-3 w-3" /> Chat</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs gap-1.5"><Lightbulb className="h-3 w-3" /> Insights</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1.5"><ListChecks className="h-3 w-3" /> Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <Card className="flex flex-col h-[520px]">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {MOCK_MESSAGES.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "assistant" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                    )}>
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Input placeholder="Pergunte ao Agente Rankito..." className="flex-1 text-sm" />
                <Button size="sm" className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="mt-4 space-y-3">
            {mockInsights.map((insight) => (
              <InsightCard key={insight.id} {...insight} />
            ))}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Central de Tarefas</h3>
                <Badge variant="secondary" className="text-[10px]">{MOCK_TASKS.length} tarefas</Badge>
              </div>
              <div className="divide-y divide-border">
                {MOCK_TASKS.map((task) => {
                  const statusStyle = TASK_STATUS_STYLE[task.status];
                  const StatusIcon = statusStyle.icon;
                  return (
                    <div key={task.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors flex-wrap sm:flex-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${statusStyle.bg}`}>
                        <StatusIcon className="h-2.5 w-2.5" /> {statusStyle.label}
                      </span>
                      <span className="text-sm text-foreground flex-1">{task.title}</span>
                      <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                      <span className="text-[10px] text-muted-foreground">{task.due}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
