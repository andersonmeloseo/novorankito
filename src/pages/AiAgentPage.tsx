import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Plus, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AgentChatTab } from "@/components/ai-agent/AgentChatTab";
import { AgentCard } from "@/components/ai-agent/AgentCard";
import { CreateAgentDialog } from "@/components/ai-agent/CreateAgentDialog";

const SYSTEM_AGENTS = [
  {
    speciality: "growth",
    name: "Agente Growth",
    description: "Monitora métricas de crescimento, identifica oportunidades de expansão e sugere estratégias para aumentar tráfego e conversões.",
    instructions: "Você é um especialista em Growth Marketing. Analise dados de tráfego, conversões, fontes de aquisição e sugira estratégias de crescimento. Foque em métricas como taxa de conversão, CAC, LTV e ROI. Identifique quick wins e oportunidades de escala.",
  },
  {
    speciality: "seo",
    name: "Agente SEO",
    description: "Analisa posições, backlinks, oportunidades de keywords e problemas técnicos de SEO para melhorar o ranking orgânico.",
    instructions: "Você é um especialista em SEO técnico e de conteúdo. Analise posições de keywords, CTR, backlinks, cobertura de indexação, canibalizacão e problemas técnicos. Sugira otimizações de title tags, meta descriptions, internal linking e content gaps.",
  },
  {
    speciality: "analytics",
    name: "Agente Analytics",
    description: "Interpreta dados do GA4 e GSC, gera relatórios de performance e identifica anomalias nos dados do projeto.",
    instructions: "Você é um analista de dados especializado em web analytics. Interprete dados do Google Analytics e Search Console, identifique tendências, anomalias e padrões. Gere insights acionáveis sobre comportamento do usuário, jornada de conversão e performance de conteúdo.",
  },
];

export default function AiAgentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("chat");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [chatAgent, setChatAgent] = useState<{ name: string; instructions: string } | null>(null);

  // Get current project from localStorage
  const projectId = typeof window !== "undefined" ? localStorage.getItem("rankito_current_project") : null;

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ["ai-agents", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("project_id", projectId)
        .order("is_system", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Seed system agents if none exist
  useEffect(() => {
    if (!projectId || !user || agents === undefined) return;
    const hasSystem = agents.some((a: any) => a.is_system);
    if (!hasSystem && agents.length === 0) {
      const seedAgents = SYSTEM_AGENTS.map(a => ({
        ...a,
        project_id: projectId,
        owner_id: user.id,
        is_system: true,
        enabled: true,
      }));
      supabase.from("ai_agents").insert(seedAgents).then(({ error }) => {
        if (error) {
          console.error("Failed to seed agents:", error);
        }
        queryClient.invalidateQueries({ queryKey: ["ai-agents", projectId] });
      });
    }
  }, [projectId, user, agents]);

  const handleCreateAgent = async (form: any) => {
    if (!projectId || !user) return;
    const { error } = await supabase.from("ai_agents").insert({
      project_id: projectId,
      owner_id: user.id,
      name: form.name,
      description: form.description,
      instructions: form.instructions,
      speciality: form.speciality,
      avatar_url: form.avatar_url || null,
      whatsapp_number: form.whatsapp_number || null,
      notification_destination: form.notification_destination || null,
      notification_triggers: form.notification_triggers,
      enabled: form.enabled,
    });
    if (error) { toast.error(error.message); throw error; }
    queryClient.invalidateQueries({ queryKey: ["ai-agents", projectId] });
    toast.success("Agente criado!");
  };

  const handleEditAgent = async (form: any) => {
    if (!editingAgent) return;
    const { error } = await supabase.from("ai_agents").update({
      name: form.name,
      description: form.description,
      instructions: form.instructions,
      speciality: form.speciality,
      avatar_url: form.avatar_url || null,
      whatsapp_number: form.whatsapp_number || null,
      notification_destination: form.notification_destination || null,
      notification_triggers: form.notification_triggers,
      enabled: form.enabled,
    }).eq("id", editingAgent.id);
    if (error) { toast.error(error.message); throw error; }
    queryClient.invalidateQueries({ queryKey: ["ai-agents", projectId] });
    setEditingAgent(null);
    toast.success("Agente atualizado!");
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await supabase.from("ai_agents").update({ enabled }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["ai-agents", projectId] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ai_agents").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["ai-agents", projectId] });
    toast.success("Agente excluído");
  };

  const handleOpenEdit = (id: string) => {
    const agent = agents.find((a: any) => a.id === id);
    if (agent) setEditingAgent(agent);
  };

  const handleOpenChat = (agent: any) => {
    setChatAgent({ name: agent.name, instructions: agent.instructions || "" });
    setTab("chat");
  };

  return (
    <>
      <TopBar title="Agentes IA" subtitle="Converse com a IA, configure agentes autônomos e crie seus próprios robôs" />
      <div className="p-4 sm:p-6 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="chat" className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" /> Chat</TabsTrigger>
              <TabsTrigger value="agents" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Agentes</TabsTrigger>
            </TabsList>
            {tab === "agents" && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="text-xs gap-1.5">
                <Plus className="h-3 w-3" /> Criar Agente
              </Button>
            )}
            {tab === "chat" && chatAgent && (
              <Button size="sm" variant="outline" onClick={() => setChatAgent(null)} className="text-xs gap-1.5">
                <Sparkles className="h-3 w-3" /> Voltar ao Rankito
              </Button>
            )}
          </div>

          <TabsContent value="chat" className="mt-4">
            <AgentChatTab
              agentName={chatAgent?.name}
              agentInstructions={chatAgent?.instructions}
            />
          </TabsContent>

          <TabsContent value="agents" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent: any) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onToggle={handleToggle}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  onChat={handleOpenChat}
                />
              ))}
              {agents.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm">Nenhum agente configurado. Clique em "Criar Agente" para começar.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Agent Dialog */}
        <CreateAgentDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSave={handleCreateAgent}
        />

        {/* Edit Agent Dialog */}
        {editingAgent && (
          <CreateAgentDialog
            open={!!editingAgent}
            onOpenChange={(o) => !o && setEditingAgent(null)}
            onSave={handleEditAgent}
            initialData={{
              name: editingAgent.name,
              description: editingAgent.description || "",
              instructions: editingAgent.instructions || "",
              speciality: editingAgent.speciality,
              avatar_url: editingAgent.avatar_url || "",
              whatsapp_number: editingAgent.whatsapp_number || "",
              notification_destination: editingAgent.notification_destination || "",
              notification_triggers: editingAgent.notification_triggers || [],
              enabled: editingAgent.enabled,
            }}
            isEditing
          />
        )}
      </div>
    </>
  );
}
