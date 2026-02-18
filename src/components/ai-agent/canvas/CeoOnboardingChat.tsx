import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Building2, Users, CheckCircle2, X } from "lucide-react";
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
  options?: { label: string; value: string }[];
  type?: "text" | "options" | "team-preview";
  teamPreview?: ProfessionalRole[];
}

type OnboardingStep = "welcome" | "mission" | "goals" | "niche" | "hours" | "team-size" | "suggest" | "confirm" | "deploying" | "done";

const CEO_AVATAR = "👔";

const NICHE_OPTIONS = [
  { label: "E-commerce", value: "ecommerce" },
  { label: "SaaS / Tecnologia", value: "saas" },
  { label: "Serviços Locais", value: "local" },
  { label: "Blog / Mídia", value: "media" },
  { label: "Agência / Freelancer", value: "agency" },
  { label: "Outro", value: "other" },
];

const TEAM_SIZE_OPTIONS = [
  { label: "⚡ Enxuto (3-4 profissionais)", value: "minimal" },
  { label: "🎯 Focado (5-7 profissionais)", value: "focused" },
  { label: "🏢 Completo (8-12 profissionais)", value: "full" },
];

function suggestTeam(answers: Record<string, string>): ProfessionalRole[] {
  const size = answers.teamSize || "focused";
  const niche = answers.niche || "other";

  // Always include CEO and PM
  const core = ["ceo", "project_manager"];
  
  if (size === "minimal") {
    // CEO, PM, SEO Manager, Analytics
    return PROFESSIONAL_ROLES.filter(r => [...core, "seo_manager", "analytics_manager"].includes(r.id));
  }

  if (size === "focused") {
    const ids = [...core, "seo_manager", "seo_analyst", "analytics_manager", "content_strategist"];
    if (niche === "ecommerce") ids.push("ads_manager");
    if (niche === "agency") ids.push("cs_analyst");
    if (niche === "local") ids.push("dev_tech");
    if (niche === "media") ids.push("social_media");
    if (niche === "saas") ids.push("ads_manager");
    return PROFESSIONAL_ROLES.filter(r => ids.includes(r.id));
  }

  // Full team
  return PROFESSIONAL_ROLES;
}

export function CeoOnboardingChat({ open, onOpenChange, projectId, onDeployed }: CeoOnboardingChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);
  const [suggestedTeam, setSuggestedTeam] = useState<ProfessionalRole[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const suggestedTeamRef = useRef<ProfessionalRole[]>([]);

  // Keep ref in sync for use inside closures
  useEffect(() => { suggestedTeamRef.current = suggestedTeam; }, [suggestedTeam]);

  const handleRemoveMember = useCallback((roleId: string) => {
    if (roleId === "ceo") {
      toast.error("O CEO não pode ser removido da equipe.");
      return;
    }
    setSuggestedTeam(prev => {
      const updated = prev.filter(r => r.id !== roleId);
      // Also update the last team-preview message
      setMessages(msgs => msgs.map(m => 
        m.teamPreview ? { ...m, teamPreview: updated } : m
      ));
      return updated;
    });
    toast.success("Membro removido da equipe.");
  }, []);

  const addCeoMessage = useCallback((content: string, options?: ChatMessage["options"], teamPreview?: ProfessionalRole[]) => {
    const msg: ChatMessage = {
      id: `ceo-${Date.now()}-${Math.random()}`,
      role: "ceo",
      content,
      options,
      type: options ? "options" : teamPreview ? "team-preview" : "text",
      teamPreview,
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const addUserMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    }]);
  }, []);

  // Initialize conversation
  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;
    
    setTimeout(() => {
      addCeoMessage("Olá! 👋 Sou o CEO da sua equipe de IA. Vou te ajudar a montar a equipe perfeita para o seu projeto.");
      setTimeout(() => {
        addCeoMessage("Para começar, me conte: **qual é a missão principal do seu projeto?** O que você quer alcançar com SEO e marketing digital?");
        setStep("mission");
      }, 800);
    }, 400);
  }, [open, addCeoMessage]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setStep("welcome");
      setAnswers({});
      setSuggestedTeam([]);
      setDeploying(false);
      initialized.current = false;
    }
  }, [open]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const processAnswer = useCallback((answer: string, currentStep: OnboardingStep) => {
    addUserMessage(answer);

    switch (currentStep) {
      case "mission":
        setAnswers(prev => ({ ...prev, mission: answer }));
        setTimeout(() => {
          addCeoMessage("Excelente missão! 🎯 Agora me diga: **quais são suas 2-3 metas principais?** (ex: aumentar tráfego orgânico, melhorar conversões, ranking top 3)");
          setStep("goals");
        }, 600);
        break;

      case "goals":
        setAnswers(prev => ({ ...prev, goals: answer }));
        setTimeout(() => {
          addCeoMessage("Entendi suas metas. Em que **nicho/segmento** seu projeto atua?", NICHE_OPTIONS);
          setStep("niche");
        }, 600);
        break;

      case "niche":
        setAnswers(prev => ({ ...prev, niche: answer }));
        setTimeout(() => {
          addCeoMessage("Quantas **horas semanais** você pretende dedicar ao projeto? Isso me ajuda a calibrar a frequência das rotinas da equipe.");
          setStep("hours");
        }, 600);
        break;

      case "hours":
        setAnswers(prev => ({ ...prev, hours: answer }));
        setTimeout(() => {
          addCeoMessage("Qual o **tamanho da equipe** que você prefere?", TEAM_SIZE_OPTIONS);
          setStep("team-size");
        }, 600);
        break;

      case "team-size": {
        const newAnswers = { ...answers, teamSize: answer, hours: answers.hours || "10" };
        setAnswers(newAnswers);
        setTimeout(() => {
          const team = suggestTeam(newAnswers);
          setSuggestedTeam(team);
          addCeoMessage(
            `Perfeito! Com base no seu perfil, montei a equipe ideal com **${team.length} profissionais**. Cada um tem sua rotina definida e vai trabalhar autonomamente:`,
            undefined,
            team
          );
          setTimeout(() => {
            addCeoMessage("Essa equipe está boa? Posso **implantar agora** ou quer ajustar algo?", [
              { label: "✅ Implantar agora!", value: "deploy" },
              { label: "🔄 Quero mais profissionais", value: "more" },
              { label: "➖ Quero menos profissionais", value: "less" },
            ]);
            setStep("confirm");
          }, 1000);
        }, 800);
        break;
      }

      case "confirm":
        if (answer === "deploy") {
          handleDeployRef.current();
        } else if (answer === "more") {
          const biggerTeam = suggestTeam({ ...answers, teamSize: "full" });
          setSuggestedTeam(biggerTeam);
          addCeoMessage(`Ampliei para a equipe completa com **${biggerTeam.length} profissionais**:`, undefined, biggerTeam);
          setTimeout(() => {
            addCeoMessage("Agora sim? Posso implantar?", [
              { label: "✅ Implantar agora!", value: "deploy" },
              { label: "➖ É demais, reduza", value: "less" },
            ]);
          }, 800);
        } else if (answer === "less") {
          const smallerTeam = suggestTeam({ ...answers, teamSize: "minimal" });
          setSuggestedTeam(smallerTeam);
          addCeoMessage(`Reduzi para uma equipe enxuta com **${smallerTeam.length} profissionais**:`, undefined, smallerTeam);
          setTimeout(() => {
            addCeoMessage("Essa equipe funciona?", [
              { label: "✅ Implantar agora!", value: "deploy" },
              { label: "🔄 Quero mais", value: "more" },
            ]);
          }, 800);
        }
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, addCeoMessage, addUserMessage, projectId, user]);

  const handleDeployRef = useRef<() => void>(() => {});
  
  handleDeployRef.current = async () => {
    if (!projectId || !user || suggestedTeamRef.current.length === 0) {
      toast.error("Nenhuma equipe para implantar. Tente novamente.");
      return;
    }
    const currentTeam = suggestedTeamRef.current;
    setStep("deploying");
    setDeploying(true);

    addCeoMessage("🚀 Implantando a equipe... Cada profissional está recebendo suas instruções e se preparando para a primeira rotina.");

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

      const teamName = answers.mission
        ? `Equipe: ${answers.mission.slice(0, 40)}`
        : "Minha Equipe de IA";

      const { data: deployment, error } = await supabase
        .from("orchestrator_deployments")
        .insert({
          project_id: projectId,
          owner_id: user.id,
          name: teamName,
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

      setStep("done");
      addCeoMessage(`✅ Equipe **"${teamName}"** implantada com sucesso! A primeira execução já está em andamento. Você pode acompanhar os resultados no painel do orquestrador.`);
      
      setTimeout(() => {
        toast.success("🏢 Equipe implantada! Primeira execução iniciada.");
        onDeployed?.();
        onOpenChange(false);
      }, 2000);

    } catch (err: any) {
      setDeploying(false);
      setStep("confirm");
      addCeoMessage(`❌ Erro ao implantar: ${err.message}. Tente novamente.`, [
        { label: "🔄 Tentar novamente", value: "deploy" },
      ]);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || deploying) return;
    processAnswer(inputValue.trim(), step);
    setInputValue("");
  };

  const handleOptionClick = (value: string) => {
    if (deploying) return;
    const option = messages
      .flatMap(m => m.options || [])
      .find(o => o.value === value);
    processAnswer(value, step);
  };

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
              <Badge variant="secondary" className="text-[9px]">Chat Guiado</Badge>
            </h3>
            <p className="text-[10px] text-muted-foreground">Responda as perguntas para montar a equipe ideal</p>
          </div>
          {step === "deploying" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {step === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
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
                    <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>

                  {/* Team preview */}
                  {msg.teamPreview && msg.teamPreview.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {msg.teamPreview.map(role => (
                        <div key={role.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card/50 text-xs group relative">
                          <span className="text-base">{role.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{role.title}</p>
                            <p className="text-[10px] text-muted-foreground">{role.department}</p>
                          </div>
                          {role.id !== "ceo" && step !== "deploying" && step !== "done" && (
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
                  )}

                  {/* Option buttons */}
                  {msg.options && msg.options.length > 0 && step !== "deploying" && step !== "done" && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.options.map(opt => (
                        <Button
                          key={opt.value}
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleOptionClick(opt.value)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="px-4 py-3 border-t border-border bg-card">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder={
                step === "deploying" || step === "done"
                  ? "Aguarde..."
                  : step === "mission" ? "Descreva a missão do seu projeto..."
                  : step === "goals" ? "Liste suas metas principais..."
                  : step === "hours" ? "Ex: 10 horas por semana"
                  : "Digite sua resposta..."
              }
              disabled={deploying || step === "done"}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!inputValue.trim() || deploying || step === "done"}
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
