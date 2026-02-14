import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { messages, agent_instructions, agent_name, project_id } = await req.json();

    console.log("ai-chat called:", { agent_name, project_id: project_id || "NONE", msgCount: messages?.length, hasInstructions: !!agent_instructions });

    // Fetch project context from DB
    let projectContext = "";
    if (project_id) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Fetch project info
      const { data: project } = await sb.from("projects").select("*").eq("id", project_id).single();

      // Fetch recent SEO metrics
      const { data: seoMetrics } = await sb.from("seo_metrics")
        .select("query, url, clicks, impressions, ctr, position, metric_date")
        .eq("project_id", project_id)
        .order("metric_date", { ascending: false })
        .limit(30);

      // Fetch site URLs
      const { data: siteUrls } = await sb.from("site_urls")
        .select("url, status, meta_title, meta_description, url_type, priority")
        .eq("project_id", project_id)
        .limit(50);

      // Fetch analytics sessions
      const { data: sessions } = await sb.from("analytics_sessions")
        .select("session_date, sessions_count, users_count, bounce_rate, engagement_rate, source, medium, channel, country, device")
        .eq("project_id", project_id)
        .order("session_date", { ascending: false })
        .limit(30);

      // Fetch indexing requests
      const { data: indexing } = await sb.from("indexing_requests")
        .select("url, status, request_type, submitted_at, completed_at, fail_reason")
        .eq("project_id", project_id)
        .order("submitted_at", { ascending: false })
        .limit(20);

      // Fetch index coverage
      const { data: coverage } = await sb.from("index_coverage")
        .select("url, verdict, coverage_state, indexing_state, last_crawl_time")
        .eq("project_id", project_id)
        .limit(30);

      // Fetch conversions
      const { data: conversions } = await sb.from("conversions")
        .select("event_type, page, source, value, converted_at")
        .eq("project_id", project_id)
        .order("converted_at", { ascending: false })
        .limit(20);

      // Fetch GSC connection
      const { data: gscConn } = await sb.from("gsc_connections")
        .select("site_url, connection_name, last_sync_at")
        .eq("project_id", project_id)
        .limit(1);

      // Fetch GA4 connection
      const { data: ga4Conn } = await sb.from("ga4_connections")
        .select("property_name, property_id, last_sync_at")
        .eq("project_id", project_id)
        .limit(1);

      projectContext = `
=== DADOS DO PROJETO ===
Nome: ${project?.name || "N/A"}
Domínio: ${project?.domain || "N/A"}
Tipo: ${project?.site_type || "N/A"}
País: ${project?.country || "N/A"}
Cidade: ${project?.city || "N/A"}
Status: ${project?.status || "N/A"}

=== CONEXÕES ===
GSC: ${gscConn?.[0] ? `${gscConn[0].site_url} (${gscConn[0].connection_name}) - Último sync: ${gscConn[0].last_sync_at || 'nunca'}` : 'Não conectado'}
GA4: ${ga4Conn?.[0] ? `${ga4Conn[0].property_name} (ID: ${ga4Conn[0].property_id}) - Último sync: ${ga4Conn[0].last_sync_at || 'nunca'}` : 'Não conectado'}

=== TOP QUERIES SEO (últimas) ===
${seoMetrics?.length ? seoMetrics.map(m => `• "${m.query}" → pos: ${m.position?.toFixed(1)}, cliques: ${m.clicks}, imp: ${m.impressions}, CTR: ${(m.ctr * 100).toFixed(1)}% | ${m.url}`).join('\n') : 'Sem dados de SEO'}

=== URLs DO SITE ===
${siteUrls?.length ? siteUrls.map(u => `• [${u.status}] ${u.url} (${u.url_type}, prioridade: ${u.priority}) - ${u.meta_title || 'sem title'}`).join('\n') : 'Sem URLs cadastradas'}

=== SESSÕES ANALYTICS (recentes) ===
${sessions?.length ? sessions.map(s => `• ${s.session_date}: ${s.sessions_count} sessões, ${s.users_count} usuários, bounce: ${s.bounce_rate}%, engajamento: ${s.engagement_rate}% | ${s.source}/${s.medium} (${s.channel}) | ${s.country} | ${s.device}`).join('\n') : 'Sem dados de analytics'}

=== COBERTURA DE INDEXAÇÃO ===
${coverage?.length ? coverage.map(c => `• ${c.url}: ${c.verdict} (${c.coverage_state}, indexação: ${c.indexing_state}) | último crawl: ${c.last_crawl_time || 'N/A'}`).join('\n') : 'Sem dados de cobertura'}

=== INDEXAÇÃO (pedidos recentes) ===
${indexing?.length ? indexing.map(r => `• ${r.url}: ${r.status} (${r.request_type}) | enviado: ${r.submitted_at}${r.fail_reason ? ` | erro: ${r.fail_reason}` : ''}`).join('\n') : 'Sem pedidos de indexação'}

=== CONVERSÕES (recentes) ===
${conversions?.length ? conversions.map(c => `• ${c.event_type}: ${c.page} | fonte: ${c.source} | valor: R$${c.value || 0} | ${c.converted_at}`).join('\n') : 'Sem conversões registradas'}
`;
      console.log("Project context loaded:", {
        project: project?.name,
        seoMetrics: seoMetrics?.length || 0,
        siteUrls: siteUrls?.length || 0,
        sessions: sessions?.length || 0,
        gsc: gscConn?.[0]?.site_url || "none",
        ga4: ga4Conn?.[0]?.property_name || "none",
      });
    } else {
      console.log("No project_id provided — skipping data fetch");
    }

    const systemPrompt = `Você é ${agent_name || "o Rankito"}, um assistente ultra-inteligente de SEO, Growth e Marketing Digital.

PERSONALIDADE:
- Você é conversacional, simpático e proativo — como um consultor sênior falando com um amigo
- NUNCA seja robótico ou genérico. Seja específico, cite dados reais do projeto
- Use humor leve quando apropriado, mas sempre seja profissional
- Quando não souber algo, admita e sugira como descobrir
- Antecipe perguntas do usuário e ofereça insights proativos

${agent_instructions ? `ESPECIALIZAÇÃO DO AGENTE:\n${agent_instructions}\n` : ""}

${projectContext ? `DADOS REAIS DO PROJETO (use estes dados nas suas análises):\n${projectContext}` : "Nenhum dado de projeto disponível ainda. Peça ao usuário para conectar o GSC e GA4."}

DIRETRIZES DE RESPOSTA:
- Responda SEMPRE em português brasileiro
- Use markdown rico: **negrito**, listas, \`código\`, > citações
- Quando citar métricas, cite os números reais do projeto
- Sugira ações concretas e priorizadas (ex: "Otimize o title da página X de 'Y' para 'Z'")
- Se o usuário perguntar sobre dados que existem no contexto, RESPONDA com os dados
- Se perguntar sobre dados que não existem, sugira como obtê-los
- Use emojis com moderação para tornar a leitura mais agradável: 📈 📊 🎯 ⚡ 🔍
- Formate tabelas quando apresentar comparativos
- Sempre termine com uma pergunta ou sugestão de próximo passo`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
