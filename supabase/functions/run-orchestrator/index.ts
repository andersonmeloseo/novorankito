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
    
    // Fetch OpenAI key from api_configurations table
    const { data: apiKeyRow, error: apiKeyErr } = await supabase
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Sort roles: leaves first (analysts), then managers, then CEO
    const rolesArr = roles as RoleConfig[];
    const hierarchyMap = hierarchy as Record<string, string>;
    
    // Build execution order: bottom-up (analysts → managers → CEO)
    const getDepth = (roleId: string): number => {
      const parentId = hierarchyMap[roleId];
      if (!parentId) return 0; // CEO
      return getDepth(parentId) + 1;
    };

    const sortedRoles = [...rolesArr].sort((a, b) => getDepth(b.id) - getDepth(a.id));
    
    const agentResults: AgentResult[] = [];
    const resultsByRole = new Map<string, string>();

    // Execute each agent in order (bottom-up)
    for (const role of sortedRoles) {
      const startedAt = new Date().toISOString();
      
      try {
        // Build context from subordinates
        const subordinateResults = rolesArr
          .filter(r => hierarchyMap[r.id] === role.id)
          .map(r => {
            const subResult = resultsByRole.get(r.id);
            return subResult ? `\n### Relatório de ${r.emoji} ${r.title}:\n${subResult}` : "";
          })
          .filter(Boolean)
          .join("\n");

        // Build the prompt
        const systemPrompt = `${role.instructions}

Você faz parte de uma equipe autônoma de agentes de IA. Hoje é ${new Date().toLocaleDateString("pt-BR")}.

## Sua Rotina (${role.routine.frequency})
Tarefas: ${role.routine.tasks.join("; ")}
Fontes de dados: ${role.routine.dataSources.join(", ")}
Outputs esperados: ${role.routine.outputs.join(", ")}
Ações autônomas permitidas: ${role.routine.autonomousActions.join(", ")}

${projectContext}

${subordinateResults ? `## Relatórios Recebidos dos Subordinados:\n${subordinateResults}` : ""}

IMPORTANTE:
- Analise os dados REAIS do projeto fornecidos acima
- Gere insights acionáveis e específicos (com URLs, queries, números)
- Indique claramente as ações autônomas que você está executando
- Se reporta a alguém, estruture seu output para ser útil ao seu superior
- Seja conciso mas completo (máximo 800 palavras)`;

        const userPrompt = `Execute sua rotina ${role.routine.frequency} agora. Analise os dados do projeto, gere seu relatório e liste as ações autônomas que está tomando.`;

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
