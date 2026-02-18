import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoleConfig {
  id: string;
  title: string;
  emoji: string;
  instructions: string;
  routine: {
    frequency: string;
    tasks: string[];
    dataSources: string[];
    outputs: string[];
    autonomousActions: string[];
  };
}

interface AgentResult {
  role_id: string;
  role_title: string;
  emoji: string;
  status: "success" | "error" | "skipped";
  result: string;
  started_at: string;
  completed_at: string;
}

interface OrchestratorTask {
  title: string;
  description: string;
  category: string;
  priority: string;
  assigned_role: string;
  assigned_role_emoji: string;
  due_date: string;
  success_metric: string;
  estimated_impact: string;
}

interface DailyAction {
  time: string; // e.g. "09:00"
  title: string;
  description: string;
  area: string; // seo | conteudo | links | ads | tecnico | analytics
  priority: "urgente" | "alta" | "normal" | "baixa";
  duration_min: number;
  responsible: string;
  success_metric: string;
  status: "pending" | "in_progress" | "done" | "scheduled";
  tools?: string[];
}

interface DailyPlanDay {
  date: string; // ISO date
  day_name: string; // "Segunda-feira"
  theme: string;
  actions: DailyAction[];
  kpi_targets: { metric: string; target: string; area: string }[];
  areas_covered: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { deployment_id, project_id, owner_id, roles, hierarchy, trigger_type } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch OpenAI key from api_configurations table
    const { data: apiKeyRow } = await supabase
      .from("api_configurations_decrypted")
      .select("secret_value")
      .eq("secret_key_name", "OPEN_AI_API_KEY")
      .eq("status", "active")
      .maybeSingle();

    // Fallback to LOVABLE_API_KEY if no OpenAI key configured
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const useOpenAI = !!(apiKeyRow?.secret_value);
    const aiApiKey = apiKeyRow?.secret_value || LOVABLE_API_KEY;
    const aiEndpoint = useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiModel = useOpenAI ? "gpt-4o-mini" : "google/gemini-2.5-flash";

    if (!aiApiKey) throw new Error("Nenhuma chave de IA configurada. Configure a OpenAI em Admin > APIs ou ative o Lovable AI.");

    // Fetch project context data
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    const [seoData, overviewData, gscData] = await Promise.all([
      supabase.from("seo_metrics")
        .select("query, url, clicks, impressions, position, ctr")
        .eq("project_id", project_id)
        .order("clicks", { ascending: false })
        .limit(50),
      supabase.rpc("get_project_overview", { p_project_id: project_id }),
      supabase.from("seo_metrics")
        .select("query, clicks, impressions, position")
        .eq("project_id", project_id)
        .eq("dimension_type", "query")
        .order("impressions", { ascending: false })
        .limit(30),
    ]);

    const projectContext = `
## Dados do Projeto (contexto real) — ${todayStr}
### Overview:
${JSON.stringify(overviewData.data || {}, null, 2)}

### Top Queries/Páginas (últimos 28 dias):
${(seoData.data || []).slice(0, 20).map((r: any) => 
  `- ${r.query || r.url}: ${r.clicks} cliques, ${r.impressions} impressões, pos ${r.position?.toFixed(1)}`
).join("\n")}

### Queries com Alto Volume e Baixo CTR (oportunidades):
${(gscData.data || [])
  .filter((r: any) => r.impressions > 100 && r.position < 20)
  .slice(0, 10)
  .map((r: any) => `- "${r.query}": ${r.impressions} impressões, pos ${r.position?.toFixed(1)}, ${r.clicks} cliques`)
  .join("\n") || "Sem dados disponíveis"}
`;

    // Create run record
    const { data: run, error: runErr } = await supabase
      .from("orchestrator_runs")
      .insert({
        deployment_id,
        project_id,
        owner_id,
        status: "running",
      })
      .select("id")
      .single();

    if (runErr) throw runErr;
    const runId = run.id;

    // Sort roles: top-down cascade (CEO → managers → analysts)
    const rolesArr = roles as RoleConfig[];
    const hierarchyMap = hierarchy as Record<string, string>;
    
    const getDepth = (roleId: string): number => {
      const parentId = hierarchyMap[roleId];
      if (!parentId) return 0;
      return getDepth(parentId) + 1;
    };

    const sortedRoles = [...rolesArr].sort((a, b) => getDepth(a.id) - getDepth(b.id));
    
    const agentResults: AgentResult[] = [];
    const resultsByRole = new Map<string, string>();

    // ── Execute each agent in hierarchy order ──
    for (const role of sortedRoles) {
      const startedAt = new Date().toISOString();
      
      try {
        const superiorId = hierarchyMap[role.id];
        const superiorResult = superiorId ? resultsByRole.get(superiorId) : undefined;
        const superiorRole = superiorId ? rolesArr.find(r => r.id === superiorId) : undefined;
        
        const peerResults = rolesArr
          .filter(r => r.id !== role.id && hierarchyMap[r.id] === (superiorId || ""))
          .map(r => {
            const peerResult = resultsByRole.get(r.id);
            return peerResult ? `\n### Relatório de ${r.emoji} ${r.title}:\n${peerResult}` : "";
          })
          .filter(Boolean)
          .join("\n");

        const isCeo = getDepth(role.id) === 0;
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const dueDateStr = nextWeek.toISOString().split("T")[0];

        const systemPrompt = `${role.instructions}

Você faz parte de uma equipe profissional de IA organizada como uma empresa real. Hoje é ${today.toLocaleDateString("pt-BR")} (${todayStr}).

## Sua Rotina (${role.routine?.frequency || "daily"})
Tarefas: ${(role.routine?.tasks || []).join("; ") || "Análise geral e relatório de resultados"}
Fontes de dados: ${(role.routine?.dataSources || []).join(", ") || "Dados do projeto"}
Outputs esperados: ${(role.routine?.outputs || []).join(", ") || "Relatório com ações recomendadas"}
Ações autônomas permitidas: ${(role.routine?.autonomousActions || []).join(", ") || "Análise e recomendações"}

${projectContext}

${superiorResult && superiorRole ? `## Instruções do seu Superior (${superiorRole.emoji} ${superiorRole.title}):\n${superiorResult}\n\nVocê deve executar sua parte com base nas diretrizes acima.` : ""}

${peerResults ? `## Relatórios de Colegas (mesmo nível hierárquico):\n${peerResults}` : ""}

IMPORTANTE:
- Analise os dados REAIS do projeto fornecidos acima
- Se você tem um superior, siga as diretrizes e prioridades definidas por ele
- Gere seu relatório detalhando o que PRECISA SER FEITO
- Liste ações específicas com responsáveis, prazos e métricas
- Comunique-se como um profissional real: objetivo, claro e acionável
- Seja conciso mas completo (máximo 600 palavras para o relatório)

## FORMATO DE SAÍDA OBRIGATÓRIO:
Seu output deve conter DUAS seções separadas por "---TASKS_JSON---":

SEÇÃO 1: Relatório narrativo (máximo 600 palavras)
Escreva aqui seu relatório profissional.

---TASKS_JSON---
SEÇÃO 2: JSON com tarefas acionáveis para o time humano
Gere de 3 a 6 tarefas específicas e acionáveis baseadas na sua análise:
[
  {
    "title": "Título curto e acionável da tarefa",
    "description": "Descrição detalhada do que precisa ser feito e como fazer",
    "category": "seo|conteudo|links|ads|tecnico|estrategia|analytics",
    "priority": "urgente|alta|normal|baixa",
    "assigned_role": "${role.title}",
    "assigned_role_emoji": "${role.emoji}",
    "due_date": "${dueDateStr}",
    "success_metric": "Como medir o sucesso desta tarefa",
    "estimated_impact": "Impacto estimado ex: +15% CTR, -30% erros de indexação"
  }
]`;

        const userPrompt = isCeo
          ? `Como CEO, analise todos os dados do projeto e:
1) Defina visão estratégica para esta semana
2) Liste top 3 prioridades com métricas esperadas
3) Dê instruções específicas para cada membro da equipe
4) Gere tarefas de nível estratégico para o time executar

Lembre: seu relatório será repassado para gerentes que distribuirão as tarefas.`
          : `Execute sua rotina ${role.routine?.frequency || "diária"}. Analise os dados, siga as instruções do superior, e gere:
1) Relatório detalhado da sua área com achados e oportunidades
2) Lista de tarefas específicas e acionáveis para o time humano implementar`;

        const aiResponse = await fetch(aiEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${aiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 3000,
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          throw new Error(`AI error ${aiResponse.status}: ${errText}`);
        }

        const aiData = await aiResponse.json();
        const fullOutput = aiData.choices?.[0]?.message?.content || "Sem resposta";

        // Split report from tasks JSON
        const parts = fullOutput.split("---TASKS_JSON---");
        const reportText = parts[0]?.trim() || fullOutput;
        const tasksJsonRaw = parts[1]?.trim() || "";

        resultsByRole.set(role.id, reportText);

        // Parse and save tasks to DB
        if (tasksJsonRaw) {
          try {
            const jsonMatch = tasksJsonRaw.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const tasks: OrchestratorTask[] = JSON.parse(jsonMatch[0]);
              const validTasks = tasks.filter(t => t.title && t.category && t.priority);
              
              if (validTasks.length > 0) {
                await supabase.from("orchestrator_tasks").insert(
                  validTasks.map(t => ({
                    deployment_id,
                    run_id: runId,
                    project_id,
                    owner_id,
                    title: t.title,
                    description: t.description || "",
                    category: t.category || "geral",
                    priority: t.priority || "normal",
                    assigned_role: t.assigned_role || role.title,
                    assigned_role_emoji: t.assigned_role_emoji || role.emoji,
                    due_date: t.due_date || null,
                    success_metric: t.success_metric || null,
                    estimated_impact: t.estimated_impact || null,
                    status: "pending",
                  }))
                );
              }
            }
          } catch (parseErr) {
            console.warn("Failed to parse tasks JSON for role", role.id, parseErr);
          }
        }

        agentResults.push({
          role_id: role.id,
          role_title: role.title,
          emoji: role.emoji,
          status: "success",
          result: reportText,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
        });

        // Update run with partial results
        await supabase
          .from("orchestrator_runs")
          .update({ agent_results: agentResults })
          .eq("id", runId);

      } catch (err) {
        agentResults.push({
          role_id: role.id,
          role_title: role.title,
          emoji: role.emoji,
          status: "error",
          result: err instanceof Error ? err.message : "Unknown error",
          started_at: startedAt,
          completed_at: new Date().toISOString(),
        });
      }
    }

    // ── Generate Strategic Plan + 5-Day Daily Actions Plan ──
    const ceoResult = resultsByRole.get("ceo") || 
      agentResults.find(r => r.role_id === "ceo" || getDepth(r.role_id) === 0)?.result || "";

    const allReports = agentResults
      .filter(r => r.status === "success")
      .map(r => `### ${r.emoji} ${r.role_title}\n${r.result}`)
      .join("\n\n---\n\n");

    // Generate strategic plan + full daily actions (parallel)
    let strategicPlan = null;
    let dailyPlan: DailyPlanDay[] = [];

    const [planRes, dailyRes] = await Promise.allSettled([
      // Strategic weekly plan
      aiApiKey ? fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `Você é o CEO de uma empresa digital. Com base nos relatórios da equipe, gere um planejamento estratégico da semana em JSON puro (sem markdown, sem explicações, apenas o JSON):
{
  "week_theme": "Tema principal da semana",
  "top_goals": ["meta 1", "meta 2", "meta 3"],
  "daily_focus": {
    "segunda": "Foco do dia",
    "terca": "Foco do dia",
    "quarta": "Foco do dia",
    "quinta": "Foco do dia",
    "sexta": "Foco do dia"
  },
  "kpis_to_watch": [
    {"metric": "nome da métrica", "target": "meta", "current": "valor atual se souber"}
  ],
  "risk_alert": "Principal risco desta semana",
  "quick_wins": ["Ação rápida 1 (menos de 1h)", "Ação rápida 2", "Ação rápida 3"]
}`
            },
            {
              role: "user",
              content: `Com base neste relatório do CEO e dos dados do projeto:\n\n${ceoResult}\n\nGere o planejamento estratégico da semana em JSON.`
            }
          ],
          max_tokens: 1200,
        }),
      }) : Promise.reject("no key"),

      // 5-day detailed daily plan
      aiApiKey ? fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `Você é um Chief of Staff gerando um plano de ações diárias detalhado para os próximos 5 dias úteis. Hoje é ${todayStr}.

Com base nos relatórios de todos os agentes, gere um plano DIÁRIO por ÁREA (SEO, conteúdo, links, ads, técnico, analytics) com ações específicas agendadas para cada dia.

Retorne SOMENTE JSON válido, sem markdown:
[
  {
    "date": "YYYY-MM-DD",
    "day_name": "Segunda-feira",
    "theme": "Tema/foco principal do dia",
    "areas_covered": ["seo", "conteudo"],
    "kpi_targets": [
      {"metric": "CTR médio", "target": ">3.5%", "area": "seo"}
    ],
    "actions": [
      {
        "time": "09:00",
        "title": "Título acionável curto",
        "description": "O que fazer exatamente, passo a passo",
        "area": "seo",
        "priority": "alta",
        "duration_min": 45,
        "responsible": "Especialista SEO",
        "success_metric": "Como saber se foi feito com sucesso",
        "status": "scheduled",
        "tools": ["Google Search Console", "Semrush"]
      }
    ]
  }
]

REGRAS:
- Gere exatamente 5 dias a partir de hoje (${todayStr})
- Cada dia deve ter entre 3-6 ações distribuídas ao longo do dia
- Priorize ações de ALTO IMPACTO nas primeiras horas (manhã)
- Distribua as áreas equilibradamente ao longo da semana
- Seja MUITO específico: cite queries reais dos dados, páginas reais, ações concretas
- Inclua horários realistas (09:00 às 18:00)
- Sempre inclua ao menos 1 ação de cada área principal (seo, conteudo, links)`
            },
            {
              role: "user",
              content: `Dados do projeto e relatórios dos agentes:\n\n${projectContext}\n\n---\n\n${allReports.slice(0, 6000)}\n\nGere o plano de ações diárias para os próximos 5 dias úteis em JSON puro.`
            }
          ],
          max_tokens: 4000,
        }),
      }) : Promise.reject("no key"),
    ]);

    // Process strategic plan
    if (planRes.status === "fulfilled" && planRes.value.ok) {
      try {
        const planData = await planRes.value.json();
        const planText = planData.choices?.[0]?.message?.content || "";
        const jsonMatch = planText.match(/\{[\s\S]*\}/);
        if (jsonMatch) strategicPlan = JSON.parse(jsonMatch[0]);
      } catch (e) { console.warn("Failed to parse strategic plan:", e); }
    }

    // Process daily plan
    if (dailyRes.status === "fulfilled" && dailyRes.value.ok) {
      try {
        const dailyData = await dailyRes.value.json();
        const dailyText = dailyData.choices?.[0]?.message?.content || "";
        const jsonMatch = dailyText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          dailyPlan = JSON.parse(jsonMatch[0]);
          // Validate and clean the data
          dailyPlan = dailyPlan.filter(d => d.date && d.actions?.length > 0);
        }
      } catch (e) { console.warn("Failed to parse daily plan:", e); }
    }

    // Count tasks created
    const { count: tasksCreated } = await supabase
      .from("orchestrator_tasks")
      .select("*", { count: "exact", head: true })
      .eq("run_id", runId);

    // Complete the run — store everything in delivery_status
    const deliveryStatus = {
      ...(strategicPlan ? { strategic_plan: strategicPlan } : {}),
      ...(dailyPlan.length > 0 ? { daily_plan: dailyPlan } : {}),
      generated_at: new Date().toISOString(),
      tasks_created: tasksCreated || 0,
    };

    await supabase
      .from("orchestrator_runs")
      .update({
        status: agentResults.some(r => r.status === "error") ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        agent_results: agentResults,
        summary: ceoResult,
        delivery_status: deliveryStatus,
      })
      .eq("id", runId);

    // Update deployment
    const { data: depData } = await supabase
      .from("orchestrator_deployments")
      .select("run_count")
      .eq("id", deployment_id)
      .single();

    await supabase
      .from("orchestrator_deployments")
      .update({
        last_run_at: new Date().toISOString(),
        run_count: (depData?.run_count || 0) + 1,
      })
      .eq("id", deployment_id);

    // Create notification
    const successCount = agentResults.filter(r => r.status === "success").length;
    await supabase.from("notifications").insert({
      user_id: owner_id,
      project_id,
      title: "🏢 Orquestrador Concluído",
      message: `${successCount}/${agentResults.length} agentes executados. ${tasksCreated || 0} tarefas + plano de ${dailyPlan.length} dias gerado.`,
      type: "success",
      action_url: `/rankito-ai#canvas`,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      run_id: runId,
      results_count: agentResults.length,
      success_count: successCount,
      tasks_created: tasksCreated || 0,
      has_strategic_plan: !!strategicPlan,
      daily_plan_days: dailyPlan.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("run-orchestrator error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
