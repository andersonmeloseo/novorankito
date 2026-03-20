import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User, Trash2, Loader2, Bot, Database, BarChart3, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiChat } from "@/hooks/use-ai-chat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn(
      "prose prose-sm dark:prose-invert max-w-none",
      "[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1",
      "[&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2",
      "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2",
      "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1.5",
      "[&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono",
      "[&_pre]:bg-background/80 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-3 [&_pre]:overflow-x-auto",
      "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
      "[&_table]:w-full [&_table]:my-3 [&_table]:text-xs [&_table]:border-collapse",
      "[&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:border [&_table]:border-border",
      "[&_thead]:bg-muted/60",
      "[&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_th]:border-b [&_th]:border-border",
      "[&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border/50 [&_td]:text-muted-foreground",
      "[&_tr:last-child_td]:border-b-0",
      "[&_tr:hover_td]:bg-muted/30",
      "[&_strong]:text-foreground [&_strong]:font-semibold",
      "[&_hr]:border-border/50 [&_hr]:my-4",
      className
    )}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

interface AgentChatTabProps {
  agentName?: string;
  agentInstructions?: string;
  agentSpeciality?: string;
  projectId?: string;
}

const PROMPTS_BY_SPECIALITY: Record<string, string[]> = {
  growth: [
    "🚀 Analise as oportunidades de crescimento",
    "📈 Canais de aquisição com mais potencial",
    "🎯 5 quick wins para aumentar o tráfego",
    "💰 Como aumentar a taxa de conversão?",
    "🧪 Sugira testes A/B prioritários",
    "🔄 Analise o funil AARRR",
    "📊 North Star Metric ideal",
    "🔥 Plano de growth para 30 dias",
  ],
  seo: [
    "🔍 Keywords com mais potencial de crescimento",
    "🥇 Keywords quase no Top 3",
    "📝 Melhorias de title e meta description",
    "🔄 Canibalização de keywords",
    "⚡ Páginas para otimização urgente",
    "🔗 Cobertura de indexação",
    "🗺️ Sitemap e robots.txt",
    "🔎 Queries com CTR abaixo do esperado",
  ],
  analytics: [
    "📊 Performance geral do projeto",
    "📈 Tráfego orgânico atual",
    "📉 Diagnosticar queda de tráfego",
    "👥 Perfil dos visitantes",
    "📱 Mobile vs Desktop",
    "🌍 Países de origem dos visitantes",
    "🚪 Páginas com maior bounce rate",
    "📅 Tráfego: esta semana vs anterior",
  ],
};

const GENERIC_PROMPTS = [
  "📊 Performance geral do projeto",
  "📈 Como está meu tráfego orgânico?",
  "🔍 Keywords com mais potencial",
  "🏆 Páginas com melhor performance",
  "🎯 5 ações para melhorar meu SEO",
  "💰 Quais páginas convertem mais?",
  "🚀 Estratégias de growth hacking",
  "📅 Comparar tráfego semanal",
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

/* ─── Data Sources Row (compact) ─── */
function DataSourcesBadges({ sources }: { sources: NonNullable<ReturnType<typeof useDataSources>["data"]> }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={sources.gsc ? "default" : "outline"}
              className={cn(
                "text-[10px] px-2 py-1 gap-1.5 cursor-default font-medium",
                sources.gsc ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20" : "text-muted-foreground"
              )}
            >
              <Search className="h-3 w-3" />
              GSC
              {sources.gsc ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            {sources.gsc ? (
              <div className="space-y-1">
                <p className="font-semibold">Google Search Console ✅</p>
                <p className="text-muted-foreground">{sources.gsc.site_url}</p>
                <p className="text-muted-foreground">{sources.seoCount.toLocaleString()} métricas SEO • {sources.urlsCount.toLocaleString()} URLs</p>
              </div>
            ) : <p>GSC não conectado</p>}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={sources.ga4 ? "default" : "outline"}
              className={cn(
                "text-[10px] px-2 py-1 gap-1.5 cursor-default font-medium",
                sources.ga4 ? "bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/20" : "text-muted-foreground"
              )}
            >
              <BarChart3 className="h-3 w-3" />
              GA4
              {sources.ga4 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            {sources.ga4 ? (
              <div className="space-y-1">
                <p className="font-semibold">Google Analytics 4 ✅</p>
                <p className="text-muted-foreground">{sources.ga4.property_name}</p>
                <p className="text-muted-foreground">{sources.sessionsCount.toLocaleString()} sessões</p>
              </div>
            ) : <p>GA4 não conectado</p>}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] px-2 py-1 gap-1.5 cursor-default text-muted-foreground font-medium">
              <Database className="h-3 w-3" />
              {((sources.seoCount || 0) + (sources.urlsCount || 0) + (sources.sessionsCount || 0)).toLocaleString()} registros
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Total de registros disponíveis para a IA
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/* ─── Empty State ─── */
function EmptyState({
  displayName,
  sources,
  projectId,
  activePrompts,
  showAllPrompts,
  setShowAllPrompts,
  onSend,
}: {
  displayName: string;
  sources: ReturnType<typeof useDataSources>["data"];
  projectId?: string;
  activePrompts: string[];
  showAllPrompts: boolean;
  setShowAllPrompts: (v: boolean) => void;
  onSend: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      {/* Avatar */}
      <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/40 flex items-center justify-center mb-6 shadow-lg">
        <Bot className="h-10 w-10 text-primary" />
      </div>

      {/* Greeting */}
      <h3 className="text-lg font-bold text-foreground mb-2">
        Olá! Eu sou o {displayName} 👋
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6 leading-relaxed">
        {sources?.gsc || sources?.ga4
          ? "Tenho acesso aos dados do seu projeto. Pergunte sobre SEO, analytics, tráfego ou peça análises detalhadas."
          : "Conecte o Google Search Console e/ou GA4 para que eu possa analisar seus dados reais."}
      </p>

      {/* Data sources cards */}
      {projectId && sources && (
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className={cn(
            "flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border",
            sources.gsc ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-border bg-muted/50 text-muted-foreground"
          )}>
            <Search className="h-3.5 w-3.5" />
            GSC: {sources.gsc ? `${sources.seoCount.toLocaleString()} métricas` : "Não conectado"}
          </div>
          <div className={cn(
            "flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border",
            sources.ga4 ? "border-blue-500/30 bg-blue-500/5 text-blue-600" : "border-border bg-muted/50 text-muted-foreground"
          )}>
            <BarChart3 className="h-3.5 w-3.5" />
            GA4: {sources.ga4 ? `${sources.sessionsCount.toLocaleString()} sessões` : "Não conectado"}
          </div>
          <div className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            {sources.urlsCount.toLocaleString()} URLs
          </div>
        </div>
      )}

      {/* Suggestion prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {(showAllPrompts ? activePrompts : activePrompts.slice(0, 6)).map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSend(prompt)}
            className="text-left text-xs px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-accent/60 hover:border-primary/30 transition-all duration-200 text-muted-foreground hover:text-foreground leading-relaxed"
          >
            {prompt}
          </button>
        ))}
      </div>
      {activePrompts.length > 6 && (
        <button
          onClick={() => setShowAllPrompts(!showAllPrompts)}
          className="text-xs text-primary hover:underline mt-4 font-medium"
        >
          {showAllPrompts ? "Mostrar menos ▲" : `Ver mais ${activePrompts.length - 6} sugestões ▼`}
        </button>
      )}
    </div>
  );
}

/* ─── Chat Bubble ─── */
function ChatBubble({ msg }: { msg: { role: "user" | "assistant"; content: string } }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-4 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "")}>
      {/* Avatar */}
      <div className={cn(
        "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1",
        isUser ? "bg-muted" : "bg-gradient-to-br from-primary/20 to-accent/40"
      )}>
        {isUser
          ? <User className="h-4 w-4 text-muted-foreground" />
          : <Sparkles className="h-4 w-4 text-primary" />
        }
      </div>

      {/* Content */}
      <div className={cn(
        "rounded-2xl px-5 py-4 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground max-w-[75%]"
          : "bg-muted/60 text-foreground max-w-[85%]"
      )}>
        {isUser ? (
          <p className="whitespace-pre-line">{msg.content}</p>
        ) : (
          <MarkdownContent content={msg.content} />
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function AgentChatTab({ agentName, agentInstructions, agentSpeciality, projectId }: AgentChatTabProps) {
  const [input, setInput] = useState("");
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const { messages, isLoading, sendMessage, clearMessages } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: sources } = useDataSources(projectId);

  const activePrompts = agentSpeciality && PROMPTS_BY_SPECIALITY[agentSpeciality]
    ? PROMPTS_BY_SPECIALITY[agentSpeciality]
    : GENERIC_PROMPTS;

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[680px] overflow-hidden border-border/60">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground">{displayName}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {projectId ? "Conectado ao projeto • Dados em tempo real" : "Sem projeto selecionado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {projectId && sources && <DataSourcesBadges sources={sources} />}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearMessages} className="text-xs gap-1.5 text-muted-foreground hover:text-destructive h-9">
              <Trash2 className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ── Messages area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin">
        {messages.length === 0 ? (
          <EmptyState
            displayName={displayName}
            sources={sources}
            projectId={projectId}
            activePrompts={activePrompts}
            showAllPrompts={showAllPrompts}
            setShowAllPrompts={setShowAllPrompts}
            onSend={handleSend}
          />
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-4 max-w-3xl">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/40 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
                <div className="bg-muted/60 rounded-2xl px-5 py-4 text-sm text-muted-foreground flex items-center gap-3">
                  <span className="inline-flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  Analisando dados do projeto...
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-border/60 px-5 py-4 bg-muted/10">
        <div className="flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Pergunte ao ${displayName}...`}
            className="flex-1 text-sm rounded-xl resize-none min-h-[44px] max-h-[120px] py-3 px-4"
            rows={1}
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="rounded-xl h-11 w-11 shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
