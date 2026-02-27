import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, CheckCircle2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROFESSIONAL_ROLES, DEFAULT_HIERARCHY, type ProfessionalRole } from "./OrchestratorTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CeoOnboardingChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onDeployed?: () => void;
}

interface ChatMessage {
  id: string;
  role: "ceo" | "user";
  content: string;
  teamPreview?: ProfessionalRole[];
  teamName?: string;
  isStreaming?: boolean;
}

const CEO_AVATAR = "👔";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ceo-onboarding-chat`;

type AiMsg = { role: "user" | "assistant"; content: string };

export function CeoOnboardingChat({ open, onOpenChange, projectId, onDeployed }: CeoOnboardingChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [done, setDone] = useState(false);
  const [suggestedTeam, setSuggestedTeam] = useState<ProfessionalRole[]>([]);
  const [teamName, setTeamName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const suggestedTeamRef = useRef<ProfessionalRole[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { suggestedTeamRef.current = suggestedTeam; }, [suggestedTeam]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setMessages([]);
      setAiMessages([]);
      setInputValue("");
      setStreaming(false);
      setDeploying(false);
      setDone(false);
      setSuggestedTeam([]);
      setTeamName("");
      initialized.current = false;
    }
  }, [open]);

  // Initialize with AI greeting
  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;
    streamAiResponse([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRemoveMember = useCallback((roleId: string) => {
    if (roleId === "ceo") {
      toast.error("O CEO não pode ser removido da equipe.");
      return;
    }
    setSuggestedTeam(prev => {
      const updated = prev.filter(r => r.id !== roleId);
      setMessages(msgs => msgs.map(m =>
        m.teamPreview ? { ...m, teamPreview: updated } : m
      ));
      return updated;
    });
    toast.success("Membro removido da equipe.");
  }, []);

  const streamAiResponse = async (conversationHistory: AiMsg[]) => {
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    // Add placeholder streaming message
    const streamMsgId = `ceo-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: streamMsgId,
      role: "ceo",
      content: "",
      isStreaming: true,
    }]);

    let fullContent = "";
    let toolCallJson = "";
    let isToolCall = false;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: conversationHistory }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            // Handle tool calls
            if (delta?.tool_calls) {
              isToolCall = true;
              for (const tc of delta.tool_calls) {
                if (tc.function?.arguments) {
                  toolCallJson += tc.function.arguments;
                }
              }
              continue;
            }

            // Handle text content
            const content = delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              setMessages(prev => prev.map(m =>
                m.id === streamMsgId ? { ...m, content: fullContent } : m
              ));
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.tool_calls) {
              isToolCall = true;
              for (const tc of delta.tool_calls) {
                if (tc.function?.arguments) toolCallJson += tc.function.arguments;
              }
            }
            const content = delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              setMessages(prev => prev.map(m =>
                m.id === streamMsgId ? { ...m, content: fullContent } : m
              ));
            }
          } catch { /* ignore */ }
        }
      }

      // Process tool call (team suggestion)
      if (isToolCall && toolCallJson) {
        try {
          const toolData = JSON.parse(toolCallJson);
          const teamIds: string[] = toolData.team_ids || [];
          const explanation: string = toolData.explanation || "";
          const suggestedName: string = toolData.team_name || "Minha Equipe de IA";

          const team = PROFESSIONAL_ROLES.filter(r => teamIds.includes(r.id));
          // Always ensure CEO is included
          if (!team.find(r => r.id === "ceo")) {
            team.unshift(PROFESSIONAL_ROLES.find(r => r.id === "ceo")!);
          }

          setSuggestedTeam(team);
          setTeamName(suggestedName);

          // Update the streaming message with explanation + team preview
          setMessages(prev => prev.map(m =>
            m.id === streamMsgId
              ? { ...m, content: explanation, isStreaming: false, teamPreview: team, teamName: suggestedName }
              : m
          ));

          // Update AI conversation with tool result
          const newAiMsgs: AiMsg[] = [
            ...conversationHistory,
            { role: "assistant", content: explanation },
          ];
          setAiMessages(newAiMsgs);

        } catch (parseErr) {
          console.error("Error parsing tool call:", parseErr);
          // Fallback: show whatever text we got
          setMessages(prev => prev.map(m =>
            m.id === streamMsgId ? { ...m, content: fullContent || "Vou montar sua equipe...", isStreaming: false } : m
          ));
        }
      } else {
        // Regular text response - finalize
        setMessages(prev => prev.map(m =>
          m.id === streamMsgId ? { ...m, isStreaming: false } : m
        ));

        const newAiMsgs: AiMsg[] = [
          ...conversationHistory,
          { role: "assistant", content: fullContent },
        ];
        setAiMessages(newAiMsgs);
      }

    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Stream error:", err);
      setMessages(prev => prev.map(m =>
        m.id === streamMsgId
          ? { ...m, content: `❌ ${err.message || "Erro ao conectar com IA. Tente novamente."}`, isStreaming: false }
          : m
      ));
    } finally {
      setStreaming(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || streaming || deploying || done) return;
    const text = inputValue.trim();
    setInputValue("");

    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    }]);

    const newHistory: AiMsg[] = [...aiMessages, { role: "user", content: text }];
    setAiMessages(newHistory);

    await streamAiResponse(newHistory);
  };

  const handleDeploy = async () => {
    const currentTeam = suggestedTeamRef.current;
    if (!projectId || !user || currentTeam.length === 0) {
      toast.error("Nenhuma equipe para implantar.");
      return;
    }
    setDeploying(true);

    setMessages(prev => [...prev, {
      id: `ceo-deploy-${Date.now()}`,
      role: "ceo",
      content: "🚀 Implantando a equipe... Cada profissional está recebendo suas instruções e se preparando para a primeira rotina.",
    }]);

    try {
      const activeHierarchy: Record<string, string> = {};
      const selectedIds = new Set(currentTeam.map(r => r.id));
      currentTeam.forEach(r => {
        if (r.id === "ceo") return;
        const parentId = DEFAULT_HIERARCHY[r.id];
        activeHierarchy[r.id] = parentId && selectedIds.has(parentId) ? parentId : "ceo";
      });

      const rolesPayload = currentTeam.map(r => ({
        id: r.id,
        title: r.title,
        emoji: r.emoji,
        instructions: r.instructions,
        routine: r.routine,
      }));

      const finalName = teamName || "Minha Equipe de IA";

      const { data: deployment, error } = await supabase
        .from("orchestrator_deployments")
        .insert({
          project_id: projectId,
          owner_id: user.id,
          name: finalName,
          roles: rolesPayload as any,
          hierarchy: activeHierarchy as any,
          delivery_channels: ["notification"] as any,
          status: "active",
        })
        .select("id")
        .single();

      if (error) throw error;

      supabase.functions.invoke("run-orchestrator", {
        body: {
          deployment_id: deployment.id,
          project_id: projectId,
          owner_id: user.id,
          roles: rolesPayload,
          hierarchy: activeHierarchy,
          trigger_type: "manual",
        },
      }).catch(console.error);

      setDone(true);
      setMessages(prev => [...prev, {
        id: `ceo-done-${Date.now()}`,
        role: "ceo",
        content: `✅ Equipe **"${finalName}"** implantada com sucesso! A primeira execução já está em andamento. Você pode acompanhar os resultados no painel do orquestrador.`,
      }]);

      setTimeout(() => {
        toast.success("🏢 Equipe implantada! Primeira execução iniciada.");
        onDeployed?.();
        onOpenChange(false);
      }, 2000);

    } catch (err: any) {
      setDeploying(false);
      toast.error(`Erro ao implantar: ${err.message}`);
    }
  };

  const hasTeamSuggestion = suggestedTeam.length > 0 && !done && !deploying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-card">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
            {CEO_AVATAR}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              CEO — Montando sua Equipe
              <Badge variant="secondary" className="text-[9px] gap-1">
                <Sparkles className="h-2.5 w-2.5" /> IA
              </Badge>
            </h3>
            <p className="text-[10px] text-muted-foreground">Converse naturalmente — a IA vai guiar você</p>
          </div>
          {streaming && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {deploying && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {done && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        </div>

        {/* Chat area */}
        <ScrollArea className="flex-1 h-[55vh]" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                {msg.role === "ceo" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-base shrink-0 mt-0.5">
                    {CEO_AVATAR}
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] space-y-2",
                  msg.role === "user" && "items-end"
                )}>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === "ceo"
                      ? "bg-card border border-border rounded-tl-md"
                      : "bg-primary text-primary-foreground rounded-tr-md"
                  )}>
                    {msg.content ? (
                      <span>{msg.content.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}</span>
                    ) : msg.isStreaming ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Pensando...
                      </span>
                    ) : null}
                  </div>

                  {/* Team preview */}
                  {msg.teamPreview && msg.teamPreview.length > 0 && (
                    <div className="space-y-2">
                      {msg.teamName && (
                        <p className="text-xs font-semibold text-primary px-1">🏢 {msg.teamName}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {msg.teamPreview.map(role => (
                          <div key={role.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card/50 text-xs group relative">
                            <span className="text-base">{role.emoji}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">{role.title}</p>
                              <p className="text-[10px] text-muted-foreground">{role.department}</p>
                            </div>
                            {role.id !== "ceo" && !deploying && !done && (
                              <button
                                onClick={() => handleRemoveMember(role.id)}
                                className="h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 text-destructive shrink-0"
                                title="Remover membro"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Deploy bar */}
        {hasTeamSuggestion && (
          <div className="px-4 py-3 border-t border-border bg-primary/5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              <strong>{suggestedTeam.length}</strong> profissionais selecionados. Pronto para implantar?
            </p>
            <Button
              size="sm"
              onClick={handleDeploy}
              disabled={deploying}
              className="gap-1.5 text-xs shrink-0"
            >
              {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Implantar Equipe
            </Button>
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 border-t border-border bg-card">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={
                done ? "Equipe implantada! ✅"
                  : streaming ? "A IA está respondendo..."
                  : "Converse com o CEO sobre seu projeto..."
              }
              disabled={streaming || deploying || done}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!inputValue.trim() || streaming || deploying || done}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
