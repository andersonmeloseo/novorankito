import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateUUID, jsonResponse, errorResponse } from "../_shared/utils.ts";
import { createLogger, getRequestId } from "../_shared/logger.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const requestId = getRequestId(req);
  const log = createLogger("ai-chat", requestId);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return errorResponse("messages array is required and cannot be empty", cors, 400);
    }

    for (const msg of body.messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return errorResponse("Each message must have 'role' and 'content' (string) fields", cors, 400);
      }
      if (!["user", "assistant", "system"].includes(msg.role)) {
        return errorResponse("Message role must be 'user', 'assistant', or 'system'", cors, 400);
      }
      if (msg.content.length > 50000) {
        return errorResponse("Message content exceeds maximum length of 50000 characters", cors, 400);
      }
    }

    const { messages, agent_instructions, agent_name, project_id } = body;

    if (project_id) {
      const uuidErr = validateUUID({ project_id }, ["project_id"], cors);
      if (uuidErr) return uuidErr;
    }

    log.info("Chat request", { agent_name, project_id: project_id || "NONE", msg_count: messages?.length });

    let projectContext = "";
    if (project_id) {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const [
        { data: project },
        { data: seoMetrics },
        { data: siteUrls },
        { data: sessions },
        { data: indexing },
        { data: coverage },
        { data: conversions },
        { data: gscConn },
        { data: ga4Conn },
      ] = await log.time("fetch-project-context", () => Promise.all([
        sb.from("projects").select("*").eq("id", project_id).single(),
        sb.from("seo_metrics").select("query, url, clicks, impressions, ctr, position, metric_date").eq("project_id", project_id).order("metric_date", { ascending: false }).limit(30),
        sb.from("site_urls").select("url, status, meta_title, meta_description, url_type, priority").eq("project_id", project_id).limit(50),
        sb.from("analytics_sessions").select("session_date, sessions_count, users_count, bounce_rate, engagement_rate, source, medium, channel, country, device").eq("project_id", project_id).order("session_date", { ascending: false }).limit(30),
        sb.from("indexing_requests").select("url, status, request_type, submitted_at, completed_at, fail_reason").eq("project_id", project_id).order("submitted_at", { ascending: false }).limit(20),
        sb.from("index_coverage").select("url, verdict, coverage_state, indexing_state, last_crawl_time").eq("project_id", project_id).limit(30),
        sb.from("conversions").select("event_type, page, source, value, converted_at").eq("project_id", project_id).order("converted_at", { ascending: false }).limit(20),
        sb.from("gsc_connections").select("site_url, connection_name, last_sync_at").eq("project_id", project_id).limit(1),
        sb.from("ga4_connections").select("property_name, property_id, last_sync_at").eq("project_id", project_id).limit(1),
      ]), { project_id });

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
${seoMetrics?.length ? seoMetrics.map(m => `• "${m.query}" → pos: ${(m.position as number)?.toFixed(1)}, cliques: ${m.clicks}, imp: ${m.impressions}, CTR: ${((m.ctr as number) * 100).toFixed(1)}% | ${m.url}`).join('\n') : 'Sem dados de SEO'}

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
- Sugira ações concretas e priorizadas
- Use emojis com moderação: 📈 📊 🎯 ⚡ 🔍
- Formate tabelas quando apresentar comparativos
- Sempre termine com uma pergunta ou sugestão de próximo passo`;

    const response = await log.time("ai-gateway-call", () => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    }), { project_id: project_id || "NONE" });

    if (!response.ok) {
      if (response.status === 429) return errorResponse("Limite de requisições excedido. Tente novamente em alguns segundos.", cors, 429);
      if (response.status === 402) return errorResponse("Créditos de IA esgotados. Adicione créditos ao workspace.", cors, 402);
      log.error("AI gateway error", null, { status: response.status });
      return errorResponse("Erro no gateway de IA", cors);
    }

    log.info("Streaming response started", { project_id: project_id || "NONE" });

    return new Response(response.body, {
      headers: { ...cors, "Content-Type": "text/event-stream", "X-Request-ID": requestId },
    });
  } catch (e) {
    log.error("Request failed", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido", cors);
  }
});
