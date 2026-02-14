import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, User, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiChat } from "@/hooks/use-ai-chat";

interface AgentChatTabProps {
  agentName?: string;
  agentInstructions?: string;
  projectContext?: string;
}

export function AgentChatTab({ agentName, agentInstructions, projectContext }: AgentChatTabProps) {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim(), { agentName, agentInstructions, projectContext });
    setInput("");
  };

  return (
    <Card className="flex flex-col h-[560px]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">
          Conversando com <strong>{agentName || "Agente Rankito"}</strong>
        </span>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearMessages} className="text-xs gap-1">
            <Trash2 className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
            <Sparkles className="h-10 w-10 text-primary/30" />
            <p className="text-sm">Pergunte qualquer coisa sobre seu projeto, SEO, analytics ou peça sugestões de melhoria.</p>
          </div>
        )}
        {messages.map((msg, i) => (
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
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            </div>
            <div className="bg-muted rounded-xl px-4 py-3 text-sm text-muted-foreground">
              Pensando...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Pergunte ao agente..."
          className="flex-1 text-sm"
          disabled={isLoading}
        />
        <Button size="sm" onClick={handleSend} disabled={isLoading || !input.trim()} className="gap-1.5">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </Card>
  );
}
