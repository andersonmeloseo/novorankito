import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, User, Trash2, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiChat } from "@/hooks/use-ai-chat";

interface AgentChatTabProps {
  agentName?: string;
  agentInstructions?: string;
  projectId?: string;
}

const QUICK_PROMPTS = [
  "📊 Analise a performance geral do meu projeto",
  "🔍 Quais keywords têm mais potencial de crescimento?",
  "📈 Como está meu tráfego orgânico?",
  "⚡ Quais páginas precisam de otimização urgente?",
  "🎯 Sugira 5 ações para melhorar meu SEO",
  "🔗 Analise minha cobertura de indexação",
];

export function AgentChatTab({ agentName, agentInstructions, projectId }: AgentChatTabProps) {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    sendMessage(msg, { agentName, agentInstructions, projectId });
    setInput("");
  };

  const displayName = agentName || "Rankito";

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">{displayName}</span>
            <p className="text-[10px] text-muted-foreground">
              {projectId ? "Conectado ao projeto • Dados em tempo real" : "Sem projeto selecionado"}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearMessages} className="text-xs gap-1 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Olá! Eu sou o {displayName} 👋</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Tenho acesso completo aos dados do seu projeto. Pergunte sobre SEO, analytics, indexação, tráfego ou peça análises detalhadas.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md mt-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="text-left text-[11px] px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200 text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              msg.role === "assistant"
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground"
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
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center flex-shrink-0">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              Analisando dados do projeto...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2 bg-muted/20">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={`Pergunte ao ${displayName}...`}
          className="flex-1 text-sm rounded-xl"
          disabled={isLoading}
        />
        <Button size="sm" onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="gap-1.5 rounded-xl">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </Card>
  );
}
