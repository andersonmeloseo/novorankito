import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, Sparkles, User, Trash2, Loader2, Bot, Database, CheckCircle2, XCircle, BarChart3, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiChat } from "@/hooks/use-ai-chat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

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

function useDataSources(projectId?: string) {
  return useQuery({
    queryKey: ["ai-data-sources", projectId],
    queryFn: async () => {
      if (!projectId) return { gsc: null, ga4: null, seoCount: 0, urlsCount: 0, sessionsCount: 0 };

      const [gscRes, ga4Res, seoRes, urlsRes, sessionsRes] = await Promise.all([
        supabase.from("gsc_connections").select("site_url, connection_name, last_sync_at").eq("project_id", projectId).limit(1),
        supabase.from("ga4_connections").select("property_name, property_id, last_sync_at").eq("project_id", projectId).limit(1),
        supabase.from("seo_metrics").select("id", { count: "exact", head: true }).eq("project_id", projectId),
        supabase.from("site_urls").select("id", { count: "exact", head: true }).eq("project_id", projectId),
        supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      ]);

      return {
        gsc: gscRes.data?.[0] || null,
        ga4: ga4Res.data?.[0] || null,
        seoCount: seoRes.count || 0,
        urlsCount: urlsRes.count || 0,
        sessionsCount: sessionsRes.count || 0,
      };
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function AgentChatTab({ agentName, agentInstructions, projectId }: AgentChatTabProps) {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: sources } = useDataSources(projectId);

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
        <div className="flex items-center gap-2">
          {/* Data sources indicators */}
          {projectId && sources && (
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={sources.gsc ? "default" : "outline"}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 gap-1 cursor-default",
                        sources.gsc ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20" : "text-muted-foreground"
                      )}
                    >
                      <Search className="h-2.5 w-2.5" />
                      GSC
                      {sources.gsc ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-xs">
                    {sources.gsc ? (
                      <div>
                        <p className="font-semibold">Google Search Console ✅</p>
                        <p className="text-muted-foreground">{sources.gsc.site_url}</p>
                        <p className="text-muted-foreground">{sources.seoCount.toLocaleString()} métricas SEO • {sources.urlsCount.toLocaleString()} URLs</p>
                      </div>
                    ) : (
                      <p>GSC não conectado. Conecte na página de Configurações.</p>
                    )}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={sources.ga4 ? "default" : "outline"}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 gap-1 cursor-default",
                        sources.ga4 ? "bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/20" : "text-muted-foreground"
                      )}
                    >
                      <BarChart3 className="h-2.5 w-2.5" />
                      GA4
                      {sources.ga4 ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-xs">
                    {sources.ga4 ? (
                      <div>
                        <p className="font-semibold">Google Analytics 4 ✅</p>
                        <p className="text-muted-foreground">{sources.ga4.property_name} (ID: {sources.ga4.property_id})</p>
                        <p className="text-muted-foreground">{sources.sessionsCount.toLocaleString()} sessões registradas</p>
                      </div>
                    ) : (
                      <p>GA4 não conectado. Conecte na página de Configurações.</p>
                    )}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0.5 gap-1 cursor-default text-muted-foreground"
                    >
                      <Database className="h-2.5 w-2.5" />
                      {((sources.seoCount || 0) + (sources.urlsCount || 0) + (sources.sessionsCount || 0)).toLocaleString()}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p>Total de registros disponíveis para a IA</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearMessages} className="text-xs gap-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
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
                {sources?.gsc || sources?.ga4
                  ? "Tenho acesso completo aos dados do seu projeto. Pergunte sobre SEO, analytics, indexação, tráfego ou peça análises detalhadas."
                  : "Conecte o Google Search Console e/ou GA4 nas configurações do projeto para que eu possa analisar seus dados reais."}
              </p>
            </div>

            {/* Data sources summary */}
            {projectId && sources && (
              <div className="flex flex-wrap justify-center gap-2 w-full max-w-md">
                <div className={cn(
                  "flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border",
                  sources.gsc ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-border bg-muted/50 text-muted-foreground"
                )}>
                  <Search className="h-3 w-3" />
                  GSC: {sources.gsc ? `${sources.seoCount.toLocaleString()} métricas` : "Não conectado"}
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border",
                  sources.ga4 ? "border-blue-500/30 bg-blue-500/5 text-blue-600" : "border-border bg-muted/50 text-muted-foreground"
                )}>
                  <BarChart3 className="h-3 w-3" />
                  GA4: {sources.ga4 ? `${sources.sessionsCount.toLocaleString()} sessões` : "Não conectado"}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground">
                  <Database className="h-3 w-3" />
                  {sources.urlsCount.toLocaleString()} URLs mapeadas
                </div>
              </div>
            )}

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
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_table]:text-xs [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1 [&_code]:rounded">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-line">{msg.content}</p>
              )}
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
