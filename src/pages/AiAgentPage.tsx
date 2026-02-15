import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, MessageSquare, Plus, Sparkles, Users, GitBranch, Globe, Calendar } from "lucide-react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AgentChatTab } from "@/components/ai-agent/AgentChatTab";
import { AgentCard } from "@/components/ai-agent/AgentCard";
import { CreateAgentDialog } from "@/components/ai-agent/CreateAgentDialog";
import { AgentWorkflows } from "@/components/ai-agent/AgentWorkflows";
import { WorkflowSchedulesTab } from "@/components/ai-agent/WorkflowSchedulesTab";

const SYSTEM_AGENTS = [
  {
    speciality: "growth",
    name: "Agente Growth",
    description: "Monitora métricas de crescimento, identifica oportunidades de expansão e sugere estratégias para aumentar tráfego e conversões.",
    instructions: `Você é o AGENTE GROWTH, um estrategista de crescimento digital de elite com 15 anos de experiência em startups e empresas de alto crescimento.

EXPERTISE:
- Growth Hacking: loops virais, product-led growth, referral programs
- Aquisição: SEO, paid media, content marketing, social, partnerships
- Retenção: cohort analysis, churn prevention, engagement loops
- Monetização: pricing strategy, upsell/cross-sell, LTV optimization
- Experimentação: A/B testing frameworks, statistical significance, test velocity

COMO VOCÊ OPERA:
1. Analise os dados REAIS do projeto (tráfego, conversões, fontes, dispositivos)
2. Identifique os maiores gargalos no funil (aquisição → ativação → retenção → receita → referral)
3. Priorize ações pelo framework ICE (Impacto × Confiança × Facilidade)
4. Sugira experimentos específicos com hipótese, métrica e critério de sucesso
5. Sempre calcule o potencial de ROI das sugestões

ESTILO:
- Orientado a dados, cite números específicos
- Priorize quick wins que geram resultado em 7-14 dias
- Sempre quantifique o impacto potencial
- Use frameworks: AARRR, North Star Metric, OKRs`,
  },
  {
    speciality: "seo",
    name: "Agente SEO",
    description: "Analisa posições, backlinks, oportunidades de keywords e problemas técnicos de SEO para melhorar o ranking orgânico.",
    instructions: `Você é o AGENTE SEO, um especialista técnico e estratégico em Search Engine Optimization com domínio absoluto do algoritmo do Google.

EXPERTISE:
- SEO Técnico: Core Web Vitals, crawlability, indexação, schema markup, hreflang, canonical
- SEO On-Page: title tags, meta descriptions, heading hierarchy, internal linking, content optimization
- SEO Off-Page: link building, digital PR, guest posting, broken link building
- Keyword Research: search intent, keyword clustering, topic authority, SERP analysis
- Content Strategy: content gaps, topic clusters, pillar pages, content decay

COMO VOCÊ OPERA:
1. Analise as posições REAIS do projeto (queries, CTR, impressões, URLs)
2. Identifique keywords em posição 4-20 (striking distance) com alto volume
3. Detecte páginas com CTR abaixo do benchmark para a posição
4. Mapeie problemas de indexação e cobertura
5. Identifique canibalizacão de keywords entre URLs
6. Sugira otimizações específicas com antes/depois (ex: title tag atual → sugestão)

ESTILO:
- Ultra técnico quando necessário, mas explique em linguagem simples
- Sempre priorize ações por impacto potencial de tráfego
- Cite as URLs e keywords específicas do projeto
- Use tabelas para comparativos
- Calcule o tráfego potencial de cada otimização`,
  },
  {
    speciality: "analytics",
    name: "Agente Analytics",
    description: "Interpreta dados do GA4 e GSC, gera relatórios de performance e identifica anomalias nos dados do projeto.",
    instructions: `Você é o AGENTE ANALYTICS, um cientista de dados especializado em web analytics, com expertise em GA4, Search Console e business intelligence.

EXPERTISE:
- Google Analytics 4: eventos, conversões, funis, cohorts, explorations, audiences
- Search Console: performance, cobertura, core web vitals, experiência da página
- Data Visualization: dashboards, storytelling com dados, relatórios executivos
- Statistical Analysis: tendências, anomalias, correlações, previsões
- Attribution: modelos de atribuição, customer journey mapping

COMO VOCÊ OPERA:
1. Analise os dados REAIS de sessões, usuários, bounce rate e engajamento
2. Compare períodos (semana vs semana anterior, mês vs mês anterior)
3. Identifique anomalias (picos ou quedas incomuns)
4. Cruze dados de SEO com analytics (keywords → landing pages → conversões)
5. Segmente por fonte, dispositivo, localização e canal
6. Gere insights acionáveis, não apenas descreva os dados

ESTILO:
- Sempre comece com um resumo executivo (3-5 pontos-chave)
- Use percentuais de variação (↑ +15% ou ↓ -8%)
- Destaque outliers e anomalias com ⚠️
- Sugira ações baseadas em cada insight
- Use formato de relatório quando pedido`,
  },
];

export default function AiAgentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("chat");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [chatAgent, setChatAgent] = useState<{ name: string; instructions: string } | null>(null);

  // Project selection with localStorage persistence
  const [projectId, setProjectId] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem("rankito_current_project") : null;
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-agent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, domain")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Auto-select first project if none selected
  useEffect(() => {
    if (!projectId && projects.length > 0) {
      const firstId = projects[0].id;
      setProjectId(firstId);
      localStorage.setItem("rankito_current_project", firstId);
    }
  }, [projects, projectId]);

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    localStorage.setItem("rankito_current_project", id);
  };

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

  // Seed system agents - with retry and auth check
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!projectId || !user || seeded) return;
    if (agents === undefined || agents.length > 0) return;
    
    const doSeed = async () => {
      // Verify we have an active session before inserting
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("No active session, skipping agent seed");
        return;
      }

      const seedAgents = SYSTEM_AGENTS.map(a => ({
        ...a,
        project_id: projectId,
        owner_id: user.id,
        is_system: true,
        enabled: true,
      }));
      
      const { error } = await supabase.from("ai_agents").insert(seedAgents);
      if (error) {
        console.error("Failed to seed agents:", error);
        toast.error("Falha ao criar agentes. Tente recarregar a página.");
      } else {
        setSeeded(true);
        toast.success("Agentes de sistema criados! 🤖");
      }
      queryClient.invalidateQueries({ queryKey: ["ai-agents", projectId] });
    };
    
    // Small delay to ensure auth is fully ready
    const timer = setTimeout(doSeed, 500);
    return () => clearTimeout(timer);
  }, [projectId, user, agents, seeded]);

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
      <TopBar title="Agentes IA" subtitle="Assistente conversacional com dados reais, agentes autônomos e workflows automatizados" />
      <div className="p-4 sm:p-6 space-y-4">
        <FeatureBanner icon={Bot} title="Agentes de IA" description={<>Converse com <strong>agentes especializados</strong> que analisam dados reais do seu projeto, criam <strong>workflows automatizados</strong> e enviam relatórios por e-mail e WhatsApp.</>} />
        {/* Project Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Projeto:</span>
          </div>
          <Select value={projectId || ""} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-[280px] h-8 text-xs">
              <SelectValue placeholder="Selecione um projeto..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground ml-2">({p.domain})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!projectId && projects.length === 0 && (
            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
              Nenhum projeto encontrado
            </Badge>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="chat" className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" /> Chat</TabsTrigger>
              <TabsTrigger value="agents" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Agentes</TabsTrigger>
              <TabsTrigger value="workflows" className="text-xs gap-1.5"><GitBranch className="h-3 w-3" /> Workflows</TabsTrigger>
              <TabsTrigger value="schedules" className="text-xs gap-1.5"><Calendar className="h-3 w-3" /> Agendamentos</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
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
          </div>

          <TabsContent value="chat" className="mt-4">
            <AgentChatTab
              agentName={chatAgent?.name}
              agentInstructions={chatAgent?.instructions}
              projectId={projectId || undefined}
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
                  <p className="text-sm">Nenhum agente configurado. Os agentes de sistema serão criados automaticamente.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="mt-4">
            <AgentWorkflows
              projectId={projectId || undefined}
              onExecuteWorkflow={(name, steps) => {
                const allPrompts = steps.map((s, i) => `**Passo ${i + 1} (${s.emoji} ${s.agent}):** ${s.prompt}`).join("\n\n");
                setChatAgent({
                  name: `Workflow: ${name}`,
                  instructions: `Você está executando o workflow "${name}". Execute cada passo em sequência, usando os dados do projeto:\n\n${allPrompts}\n\nExecute TODOS os passos e apresente os resultados de forma estruturada.`,
                });
                setTab("chat");
              }}
            />
          </TabsContent>

          <TabsContent value="schedules" className="mt-4">
            <WorkflowSchedulesTab projectId={projectId || undefined} />
          </TabsContent>
        </Tabs>

        <CreateAgentDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSave={handleCreateAgent}
        />

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
