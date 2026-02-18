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
    const [seoData, overviewData] = await Promise.all([
      supabase.from("seo_metrics")
        .select("query, url, clicks, impressions, position, ctr")
        .eq("project_id", project_id)
        .order("clicks", { ascending: false })
        .limit(50),
      supabase.rpc("get_project_overview", { p_project_id: project_id }),
    ]);

    const projectContext = `
## Dados do Projeto (contexto real)
### Overview:
${JSON.stringify(overviewData.data || {}, null, 2)}

### Top Queries/Páginas (últimos 28 dias):
${(seoData.data || []).slice(0, 20).map((r: any) => 
  `- ${r.query || r.url}: ${r.clicks} cliques, ${r.impressions} impressões, pos ${r.position?.toFixed(1)}`
).join("\n")}
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
    
    // Build execution order: top-down cascade (CEO first, then managers, then specialists)
    const getDepth = (roleId: string): number => {
      const parentId = hierarchyMap[roleId];
      if (!parentId) return 0; // CEO
      return getDepth(parentId) + 1;
    };

    const sortedRoles = [...rolesArr].sort((a, b) => getDepth(a.id) - getDepth(b.id));
    
    const agentResults: AgentResult[] = [];
    const resultsByRole = new Map<string, string>();

    // Execute each agent in order (bottom-up)
    for (const role of sortedRoles) {
      const startedAt = new Date().toISOString();
      
      try {
        // Build context from superior (cascade: receive instructions from above)
        const superiorId = hierarchyMap[role.id];
        const superiorResult = superiorId ? resultsByRole.get(superiorId) : undefined;
        const superiorRole = superiorId ? rolesArr.find(r => r.id === superiorId) : undefined;
        
        // Also include peer results (other subordinates of same superior)
        const peerResults = rolesArr
          .filter(r => r.id !== role.id && hierarchyMap[r.id] === (superiorId || ""))
          .map(r => {
            const peerResult = resultsByRole.get(r.id);
            return peerResult ? `\n### Relatório de ${r.emoji} ${r.title}:\n${peerResult}` : "";
          })
          .filter(Boolean)
          .join("\n");

        // Build the prompt
        const systemPrompt = `${role.instructions}

Você faz parte de uma equipe profissional de IA organizada como uma empresa real. Hoje é ${new Date().toLocaleDateString("pt-BR")}.

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
- Gere seu relatório detalhando o que PRECISA SER FEITO (não execute, descreva)
- Liste ações específicas com responsáveis, prazos e métricas
- Comunique-se como um profissional real: objetivo, claro e acionável
- Seja conciso mas completo (máximo 800 palavras)`;

        const userPrompt = role.id === "ceo"
          ? `Como CEO, analise todos os dados do projeto e defina: 1) Visão estratégica para esta semana, 2) Top 3 prioridades, 3) Instruções específicas para cada membro da equipe. Seu output será repassado para os gerentes que vão distribuir as tarefas.`
          : `Execute sua rotina ${role.routine.frequency}. Analise os dados, siga as instruções do seu superior, e gere seu relatório com as ações que precisam ser feitas.`;

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
            max_tokens: 2000,
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          throw new Error(`AI error ${aiResponse.status}: ${errText}`);
        }

        const aiData = await aiResponse.json();
        const result = aiData.choices?.[0]?.message?.content || "Sem resposta";

        resultsByRole.set(role.id, result);

        agentResults.push({
          role_id: role.id,
          role_title: role.title,
          emoji: role.emoji,
          status: "success",
          result,
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

    // Get CEO summary
    const ceoResult = resultsByRole.get("ceo") || agentResults.find(r => r.role_id === "ceo")?.result || "";

    // Complete the run
    await supabase
      .from("orchestrator_runs")
      .update({
        status: agentResults.some(r => r.status === "error") ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        agent_results: agentResults,
        summary: ceoResult,
      })
      .eq("id", runId);

    // Update deployment
    await supabase
      .from("orchestrator_deployments")
      .update({
        last_run_at: new Date().toISOString(),
        run_count: (await supabase.from("orchestrator_deployments").select("run_count").eq("id", deployment_id).single()).data?.run_count + 1 || 1,
      })
      .eq("id", deployment_id);

    // Create notification
    await supabase.from("notifications").insert({
      user_id: owner_id,
      project_id,
      title: "🏢 Orquestrador Concluído",
      message: `A equipe autônoma completou a rotina com ${agentResults.filter(r => r.status === "success").length}/${agentResults.length} agentes executados com sucesso.`,
      type: "success",
      action_url: `/rankito-ai#canvas`,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      run_id: runId,
      results_count: agentResults.length,
      success_count: agentResults.filter(r => r.status === "success").length,
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
