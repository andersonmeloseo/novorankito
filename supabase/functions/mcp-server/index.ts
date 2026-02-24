import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, errorResponse } from "../_shared/utils.ts";

/**
 * Rankito MCP Server v2 — Streamable HTTP Transport
 * Data + Action tools for Claude/Antigravity integration.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Tool definitions ─────────────────────────────────────────────────────
const TOOLS = [
  // === DATA TOOLS ===
  {
    name: "list_projects",
    description: "Lista todos os projetos cadastrados no Rankito com domínio, tipo e status.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_project_overview",
    description: "Retorna visão geral do projeto: cliques, impressões, posição média, CTR, cobertura de indexação, top páginas, queries, devices e trend diário.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string", description: "UUID do projeto" } },
      required: ["project_id"],
    },
  },
  {
    name: "get_seo_metrics",
    description: "Retorna métricas SEO (queries e páginas) do Google Search Console: cliques, impressões, CTR, posição por data.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        days: { type: "number", description: "Período em dias (default 28)" },
        dimension: { type: "string", description: "'query' ou 'page' (default ambos)" },
        limit: { type: "number", description: "Máximo de resultados (default 50)" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_analytics_sessions",
    description: "Retorna dados do GA4: sessões, usuários, bounce rate, engajamento, fontes de tráfego, países e devices.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        days: { type: "number", description: "Período em dias (default 30)" },
        limit: { type: "number", description: "Máximo de resultados (default 50)" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_site_urls",
    description: "Lista URLs do site com status, meta tags, tipo e prioridade.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        limit: { type: "number", description: "Máximo de resultados (default 100)" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_indexing_status",
    description: "Retorna status de indexação: pedidos enviados, cobertura e resultados de cada URL.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        limit: { type: "number", description: "Máximo de resultados (default 50)" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_index_coverage",
    description: "Retorna cobertura de indexação do Google: verdict, crawl state, indexing state por URL.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string", description: "UUID do projeto" } },
      required: ["project_id"],
    },
  },
  {
    name: "get_conversions",
    description: "Retorna conversões registradas: leads, vendas, eventos com fonte, valor e detalhes.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        days: { type: "number", description: "Período em dias (default 30)" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_anomalies",
    description: "Retorna anomalias detectadas automaticamente: quedas de tráfego, erros de indexação, oportunidades de SEO.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        status: { type: "string", description: "'new', 'sent_to_claude', 'actioned', 'dismissed' (default: todos)" },
        severity: { type: "string", description: "'low', 'medium', 'high', 'critical' (default: todos)" },
      },
      required: ["project_id"],
    },
  },
  // === AI TOOLS ===
  {
    name: "ask_rankito_ai",
    description: "Faz uma pergunta ao Rankito IA (agente de SEO/Growth) com contexto completo do projeto. Útil para análises, recomendações e insights.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto para contexto" },
        question: { type: "string", description: "Pergunta ou instrução para o agente IA" },
        agent_name: { type: "string", description: "Nome do agente (ex: 'Rankito SEO', 'Rankito Analytics')" },
      },
      required: ["question"],
    },
  },
  {
    name: "list_ai_agents",
    description: "Lista os agentes de IA configurados para um projeto.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string", description: "UUID do projeto" } },
      required: ["project_id"],
    },
  },
  {
    name: "get_orchestrator_runs",
    description: "Retorna execuções recentes do orquestrador de agentes com resultados e status.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        limit: { type: "number", description: "Máximo de resultados (default 10)" },
      },
      required: ["project_id"],
    },
  },
  // === ACTION TOOLS ===
  {
    name: "run_orchestrator",
    description: "Executa o orquestrador de agentes para um deployment específico. Retorna o resultado completo da execução multi-agente.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        deployment_id: { type: "string", description: "UUID do deployment do orquestrador" },
      },
      required: ["project_id", "deployment_id"],
    },
  },
  {
    name: "create_task",
    description: "Cria uma tarefa no Kanban do orquestrador a partir de um insight ou recomendação.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        title: { type: "string", description: "Título da tarefa" },
        description: { type: "string", description: "Descrição detalhada" },
        category: { type: "string", description: "'seo' | 'content' | 'technical' | 'analytics' | 'growth'" },
        priority: { type: "string", description: "'low' | 'medium' | 'high' | 'critical'" },
        assigned_role: { type: "string", description: "Role do agente (ex: 'SEO Specialist')" },
      },
      required: ["project_id", "title"],
    },
  },
  {
    name: "trigger_anomaly_scan",
    description: "Executa uma varredura de anomalias em todos os projetos ou em um projeto específico. Detecta quedas de tráfego, erros de indexação e oportunidades.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto (opcional, se vazio varre todos)" },
      },
      required: [],
    },
  },
  {
    name: "update_anomaly_status",
    description: "Atualiza o status de uma anomalia (ex: marcar como acionada pelo Claude).",
    inputSchema: {
      type: "object",
      properties: {
        anomaly_id: { type: "string", description: "UUID da anomalia" },
        status: { type: "string", description: "'sent_to_claude' | 'actioned' | 'dismissed'" },
        claude_response: { type: "string", description: "Resposta/ação tomada pelo Claude" },
      },
      required: ["anomaly_id", "status"],
    },
  },
  {
    name: "generate_seo_report",
    description: "Gera um relatório SEO completo usando o Rankito IA, incluindo análise de dados, oportunidades, riscos e plano de ação.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        report_type: { type: "string", description: "'full' | 'opportunities' | 'risks' | 'quick_wins' | 'strategy'" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_mcp_action_log",
    description: "Retorna histórico de ações executadas via MCP (chamadas do Claude, automações, etc).",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
        limit: { type: "number", description: "Máximo de resultados (default 20)" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "sync_project_context",
    description: "Sincroniza todos os dados do projeto (SEO, analytics, indexação, anomalias, agentes) em um snapshot unificado para contexto do Claude. Use antes de análises complexas.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_latest_sync",
    description: "Retorna o snapshot mais recente de um projeto sincronizado via sync_project_context.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
      },
      required: ["project_id"],
    },
  },
];

// ─── Anomaly detection logic ───────────────────────────────────────────────
async function detectAnomalies(sb: any, projectId?: string) {
  const projects = projectId
    ? [{ id: projectId, owner_id: null as string | null }]
    : await sb.from("projects").select("id, owner_id").then((r: any) => r.data || []);

  const anomalies: any[] = [];

  for (const proj of projects) {
    const pid = proj.id;
    let ownerId = proj.owner_id;
    if (!ownerId) {
      const { data: p } = await sb.from("projects").select("owner_id").eq("id", pid).single();
      ownerId = p?.owner_id;
    }
    if (!ownerId) continue;

    // 1. Traffic drop detection (compare last 7 days vs previous 7 days)
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const d14 = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);

    const { data: recent } = await sb.from("seo_metrics").select("clicks, impressions").eq("project_id", pid).eq("dimension_type", "page").gte("metric_date", d7);
    const { data: previous } = await sb.from("seo_metrics").select("clicks, impressions").eq("project_id", pid).eq("dimension_type", "page").gte("metric_date", d14).lt("metric_date", d7);

    const recentClicks = (recent || []).reduce((s: number, r: any) => s + (r.clicks || 0), 0);
    const prevClicks = (previous || []).reduce((s: number, r: any) => s + (r.clicks || 0), 0);

    if (prevClicks > 10 && recentClicks < prevClicks * 0.7) {
      const dropPct = Math.round((1 - recentClicks / prevClicks) * 100);
      anomalies.push({
        project_id: pid, owner_id: ownerId,
        anomaly_type: "traffic_drop", severity: dropPct > 50 ? "critical" : "high",
        title: `Queda de ${dropPct}% nos cliques nos últimos 7 dias`,
        description: `Cliques caíram de ${prevClicks} para ${recentClicks} comparando os últimos 7 dias com a semana anterior.`,
        metric_data: { recent_clicks: recentClicks, previous_clicks: prevClicks, drop_pct: dropPct },
      });
    }

    // 2. Indexing errors
    const { data: failedIdx } = await sb.from("indexing_requests").select("url, fail_reason").eq("project_id", pid).eq("status", "failed").order("submitted_at", { ascending: false }).limit(10);
    if (failedIdx && failedIdx.length >= 3) {
      anomalies.push({
        project_id: pid, owner_id: ownerId,
        anomaly_type: "indexing_error", severity: failedIdx.length >= 5 ? "high" : "medium",
        title: `${failedIdx.length} erros de indexação detectados`,
        description: `URLs com falha: ${failedIdx.slice(0, 5).map((f: any) => f.url).join(", ")}`,
        metric_data: { failed_count: failedIdx.length, urls: failedIdx.slice(0, 5) },
      });
    }

    // 3. Position improvements (opportunities)
    const { data: topQueries } = await sb.from("seo_metrics").select("query, position, impressions").eq("project_id", pid).eq("dimension_type", "query").gte("metric_date", d7).order("impressions", { ascending: false }).limit(20);
    const opportunities = (topQueries || []).filter((q: any) => q.position >= 4 && q.position <= 15 && q.impressions > 50);
    if (opportunities.length >= 3) {
      anomalies.push({
        project_id: pid, owner_id: ownerId,
        anomaly_type: "opportunity", severity: "medium",
        title: `${opportunities.length} queries com potencial de página 1`,
        description: `Queries entre posição 4-15 com alto volume: ${opportunities.slice(0, 5).map((q: any) => `"${q.query}" (pos ${q.position.toFixed(1)})`).join(", ")}`,
        metric_data: { opportunities: opportunities.slice(0, 10) },
      });
    }
  }

  // Insert anomalies (avoid duplicates: check if similar exists in last 24h)
  const inserted = [];
  for (const a of anomalies) {
    const { data: existing } = await sb.from("mcp_anomalies").select("id").eq("project_id", a.project_id).eq("anomaly_type", a.anomaly_type).gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString()).limit(1);
    if (existing && existing.length > 0) continue;
    const { data: ins } = await sb.from("mcp_anomalies").insert(a).select("id, title, severity").single();
    if (ins) inserted.push(ins);
  }

  return { scanned_projects: projects.length, anomalies_found: anomalies.length, new_anomalies: inserted };
}

// ─── Tool handlers ─────────────────────────────────────────────────────────
async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const pid = args.project_id as string | undefined;
  const startTime = Date.now();

  let result: unknown;

  try {
    switch (name) {
      case "list_projects": {
        const { data, error } = await sb.from("projects").select("id, name, domain, site_type, country, status, created_at").order("created_at", { ascending: false }).limit(50);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_project_overview": {
        if (!pid) throw new Error("project_id required");
        const { data, error } = await sb.rpc("get_project_overview_v2", { p_project_id: pid });
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_seo_metrics": {
        if (!pid) throw new Error("project_id required");
        const days = (args.days as number) || 28;
        const limit = (args.limit as number) || 50;
        const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
        let query = sb.from("seo_metrics").select("metric_date, query, url, clicks, impressions, ctr, position, dimension_type").eq("project_id", pid).gte("metric_date", startDate).order("clicks", { ascending: false }).limit(limit);
        if (args.dimension) query = query.eq("dimension_type", args.dimension as string);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_analytics_sessions": {
        if (!pid) throw new Error("project_id required");
        const days = (args.days as number) || 30;
        const limit = (args.limit as number) || 50;
        const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
        const { data, error } = await sb.from("analytics_sessions").select("session_date, sessions_count, users_count, bounce_rate, engagement_rate, source, medium, channel, country, device, revenue, conversions_count").eq("project_id", pid).gte("session_date", startDate).order("session_date", { ascending: false }).limit(limit);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_site_urls": {
        if (!pid) throw new Error("project_id required");
        const limit = (args.limit as number) || 100;
        const { data, error } = await sb.from("site_urls").select("url, status, url_type, url_group, priority, meta_title, meta_description, last_crawl").eq("project_id", pid).order("priority", { ascending: false }).limit(limit);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_indexing_status": {
        if (!pid) throw new Error("project_id required");
        const limit = (args.limit as number) || 50;
        const { data, error } = await sb.from("indexing_requests").select("url, status, request_type, submitted_at, completed_at, response_code, fail_reason, retries").eq("project_id", pid).order("submitted_at", { ascending: false }).limit(limit);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_index_coverage": {
        if (!pid) throw new Error("project_id required");
        const { data, error } = await sb.from("index_coverage").select("url, verdict, coverage_state, indexing_state, crawled_as, last_crawl_time, robotstxt_state, page_fetch_state").eq("project_id", pid).limit(100);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_conversions": {
        if (!pid) throw new Error("project_id required");
        const days = (args.days as number) || 30;
        const startDate = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await sb.from("conversions").select("event_type, page, source, medium, campaign, device, location, value, lead_name, lead_email, converted_at").eq("project_id", pid).gte("converted_at", startDate).order("converted_at", { ascending: false }).limit(200);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_anomalies": {
        if (!pid) throw new Error("project_id required");
        let query = sb.from("mcp_anomalies").select("*").eq("project_id", pid).order("created_at", { ascending: false }).limit(50);
        if (args.status) query = query.eq("status", args.status as string);
        if (args.severity) query = query.eq("severity", args.severity as string);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "ask_rankito_ai": {
        const question = args.question as string;
        if (!question) throw new Error("question required");
        const messages = [{ role: "user", content: question }];
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ messages, agent_name: (args.agent_name as string) || "Rankito SEO", project_id: pid }),
        });
        if (!resp.ok) throw new Error(`AI error: ${await resp.text()}`);
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "", buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) fullText += c; } catch { /* partial */ }
          }
        }
        result = { answer: fullText };
        break;
      }

      case "list_ai_agents": {
        if (!pid) throw new Error("project_id required");
        const { data, error } = await sb.from("ai_agents").select("id, name, speciality, description, enabled, is_system").eq("project_id", pid).order("name");
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "get_orchestrator_runs": {
        if (!pid) throw new Error("project_id required");
        const limit = (args.limit as number) || 10;
        const { data, error } = await sb.from("orchestrator_runs").select("id, status, started_at, completed_at, summary, agent_results, delivery_status, deployment_id").eq("project_id", pid).order("started_at", { ascending: false }).limit(limit);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      // === ACTION TOOLS ===

      case "run_orchestrator": {
        if (!pid) throw new Error("project_id required");
        const deploymentId = args.deployment_id as string;
        if (!deploymentId) throw new Error("deployment_id required");
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/run-orchestrator`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ deployment_id: deploymentId, project_id: pid }),
        });
        if (!resp.ok) throw new Error(`Orchestrator error: ${await resp.text()}`);
        result = await resp.json();
        break;
      }

      case "create_task": {
        if (!pid) throw new Error("project_id required");
        const title = args.title as string;
        if (!title) throw new Error("title required");
        const { data: proj } = await sb.from("projects").select("owner_id").eq("id", pid).single();
        if (!proj) throw new Error("Project not found");
        const { data, error } = await sb.from("orchestrator_tasks").insert({
          project_id: pid, owner_id: proj.owner_id,
          title, description: (args.description as string) || "",
          category: (args.category as string) || "seo",
          priority: (args.priority as string) || "medium",
          assigned_role: (args.assigned_role as string) || null,
          status: "todo",
        }).select("id, title, category, priority").single();
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "trigger_anomaly_scan": {
        result = await detectAnomalies(sb, pid || undefined);
        break;
      }

      case "update_anomaly_status": {
        const anomalyId = args.anomaly_id as string;
        if (!anomalyId) throw new Error("anomaly_id required");
        const status = args.status as string;
        const update: any = { status };
        if (args.claude_response) update.claude_response = args.claude_response;
        if (status === "actioned") update.actioned_at = new Date().toISOString();
        const { data, error } = await sb.from("mcp_anomalies").update(update).eq("id", anomalyId).select("id, status").single();
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "generate_seo_report": {
        if (!pid) throw new Error("project_id required");
        const reportType = (args.report_type as string) || "full";
        const prompts: Record<string, string> = {
          full: "Gere um relatório SEO completo e detalhado com todas as métricas, análise de tendências, problemas identificados e plano de ação priorizado.",
          opportunities: "Identifique as 10 maiores oportunidades de crescimento SEO com base nos dados, priorizadas por impacto potencial.",
          risks: "Analise os riscos e problemas críticos de SEO, incluindo quedas de performance, erros técnicos e ameaças competitivas.",
          quick_wins: "Liste os 10 quick wins de SEO mais impactantes que podem ser implementados em menos de 1 hora cada.",
          strategy: "Crie um plano estratégico de SEO detalhado para os próximos 30 dias, com marcos semanais e KPIs.",
        };
        const messages = [{ role: "user", content: prompts[reportType] || prompts.full }];
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ messages, agent_name: "Rankito SEO Analyst", project_id: pid }),
        });
        if (!resp.ok) throw new Error(`AI error: ${await resp.text()}`);
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "", buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) fullText += c; } catch { /* partial */ }
          }
        }
        result = { report_type: reportType, report: fullText };
        break;
      }

      case "get_mcp_action_log": {
        if (!pid) throw new Error("project_id required");
        const limit = (args.limit as number) || 20;
        const { data, error } = await sb.from("mcp_action_log").select("*").eq("project_id", pid).order("created_at", { ascending: false }).limit(limit);
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "sync_project_context": {
        if (!pid) throw new Error("project_id required");
        const syncStart = Date.now();
        const sections: string[] = [];
        let totalRecords = 0;
        const snapshot: Record<string, unknown> = {};

        // 1. Project overview
        const { data: overview } = await sb.rpc("get_project_overview_v2", { p_project_id: pid });
        if (overview) { snapshot.overview = overview; sections.push("overview"); totalRecords++; }

        // 2. SEO metrics (last 28 days, top 30)
        const d28 = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
        const { data: seoPages } = await sb.from("seo_metrics").select("metric_date, url, clicks, impressions, ctr, position").eq("project_id", pid).eq("dimension_type", "page").gte("metric_date", d28).order("clicks", { ascending: false }).limit(30);
        if (seoPages?.length) { snapshot.seo_pages = seoPages; sections.push("seo_pages"); totalRecords += seoPages.length; }

        const { data: seoQueries } = await sb.from("seo_metrics").select("metric_date, query, clicks, impressions, ctr, position").eq("project_id", pid).eq("dimension_type", "query").gte("metric_date", d28).order("clicks", { ascending: false }).limit(30);
        if (seoQueries?.length) { snapshot.seo_queries = seoQueries; sections.push("seo_queries"); totalRecords += seoQueries.length; }

        // 3. Analytics sessions (last 30 days)
        const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const { data: sessions } = await sb.from("analytics_sessions").select("session_date, sessions_count, users_count, bounce_rate, engagement_rate, source, medium, channel, country, device, revenue, conversions_count").eq("project_id", pid).gte("session_date", d30).order("session_date", { ascending: false }).limit(50);
        if (sessions?.length) { snapshot.analytics = sessions; sections.push("analytics"); totalRecords += sessions.length; }

        // 4. Indexing status
        const { data: indexReqs } = await sb.from("indexing_requests").select("url, status, request_type, submitted_at, fail_reason").eq("project_id", pid).order("submitted_at", { ascending: false }).limit(30);
        if (indexReqs?.length) { snapshot.indexing = indexReqs; sections.push("indexing"); totalRecords += indexReqs.length; }

        // 5. Index coverage
        const { data: coverage } = await sb.from("index_coverage").select("url, verdict, coverage_state, indexing_state").eq("project_id", pid).limit(50);
        if (coverage?.length) { snapshot.coverage = coverage; sections.push("coverage"); totalRecords += coverage.length; }

        // 6. Conversions (last 30 days)
        const { data: convs } = await sb.from("conversions").select("event_type, page, source, medium, value, converted_at").eq("project_id", pid).gte("converted_at", new Date(Date.now() - 30 * 86400000).toISOString()).order("converted_at", { ascending: false }).limit(30);
        if (convs?.length) { snapshot.conversions = convs; sections.push("conversions"); totalRecords += convs.length; }

        // 7. Active anomalies
        const { data: anom } = await sb.from("mcp_anomalies").select("title, severity, anomaly_type, status, description, created_at").eq("project_id", pid).in("status", ["new", "sent_to_claude"]).order("created_at", { ascending: false }).limit(20);
        if (anom?.length) { snapshot.anomalies = anom; sections.push("anomalies"); totalRecords += anom.length; }

        // 8. AI agents
        const { data: agents } = await sb.from("ai_agents").select("name, speciality, enabled").eq("project_id", pid);
        if (agents?.length) { snapshot.agents = agents; sections.push("agents"); totalRecords += agents.length; }

        // 9. Site URLs sample
        const { data: urls } = await sb.from("site_urls").select("url, status, url_type, priority").eq("project_id", pid).order("priority", { ascending: false }).limit(30);
        if (urls?.length) { snapshot.site_urls = urls; sections.push("site_urls"); totalRecords += urls.length; }

        const syncDuration = Date.now() - syncStart;

        // Persist snapshot
        const { data: proj } = await sb.from("projects").select("owner_id").eq("id", pid).single();
        await sb.from("mcp_sync_snapshots").insert({
          project_id: pid,
          owner_id: proj?.owner_id,
          snapshot_data: snapshot,
          sections_synced: sections,
          total_records: totalRecords,
          sync_duration_ms: syncDuration,
          status: "completed",
        });

        result = {
          synced_at: new Date().toISOString(),
          sections,
          total_records: totalRecords,
          duration_ms: syncDuration,
          snapshot,
        };
        break;
      }

      case "get_latest_sync": {
        if (!pid) throw new Error("project_id required");
        const { data, error } = await sb.from("mcp_sync_snapshots").select("*").eq("project_id", pid).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw new Error(error.message);
        result = data || { message: "No sync found. Run sync_project_context first." };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Log action
    if (pid && !["list_projects", "get_mcp_action_log"].includes(name)) {
      const { data: proj } = await sb.from("projects").select("owner_id").eq("id", pid).maybeSingle();
      await sb.from("mcp_action_log").insert({
        project_id: pid, owner_id: proj?.owner_id,
        tool_name: name, tool_args: args,
        result: typeof result === "object" ? { summary: `${name} completed` } : { value: result },
        source: "claude", status: "success",
        duration_ms: Date.now() - startTime,
      });
    }

    return result;
  } catch (err) {
    // Log error
    if (pid) {
      const { data: proj } = await sb.from("projects").select("owner_id").eq("id", pid).maybeSingle();
      await sb.from("mcp_action_log").insert({
        project_id: pid, owner_id: proj?.owner_id,
        tool_name: name, tool_args: args,
        source: "claude", status: "error",
        error_message: err instanceof Error ? err.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      });
    }
    throw err;
  }
}

// ─── JSON-RPC helpers ──────────────────────────────────────────────────────
function jsonRpcResponse(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// ─── Auth ──────────────────────────────────────────────────────────────────
async function authenticate(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const token = auth.replace("Bearer ", "");
  if (token === SUPABASE_SERVICE_ROLE_KEY) return true;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from("api_keys").select("id").eq("key_hash", keyHash).eq("is_active", true).maybeSingle();
  if (data) {
    await sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
    return true;
  }
  return false;
}

// ─── Main server ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  if (req.method !== "POST") {
    if (req.method === "GET") {
      const dataTools = TOOLS.filter(t => !["run_orchestrator","create_task","trigger_anomaly_scan","update_anomaly_status","generate_seo_report","sync_project_context"].includes(t.name));
      const actionTools = TOOLS.filter(t => ["run_orchestrator","create_task","trigger_anomaly_scan","update_anomaly_status","generate_seo_report","sync_project_context"].includes(t.name));
      return new Response(JSON.stringify({
        name: "rankito-mcp-server", version: "2.0.0",
        description: "MCP Server do Rankito — dados de SEO, Analytics, Indexação, Agentes IA + ações automatizadas para Claude Command Center",
        data_tools: dataTools.map(t => t.name),
        action_tools: actionTools.map(t => t.name),
        total_tools: TOOLS.length,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  const authed = await authenticate(req);
  if (!authed) {
    return new Response(JSON.stringify(jsonRpcError(null, -32000, "Unauthorized")), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const requests = Array.isArray(body) ? body : [body];
    const responses = [];

    for (const rpc of requests) {
      const { id, method, params } = rpc;
      if (method === "initialize") {
        responses.push(jsonRpcResponse(id, {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "rankito-mcp-server", version: "2.0.0" },
          capabilities: { tools: { listChanged: false } },
        }));
      } else if (method === "notifications/initialized") {
        // noop
      } else if (method === "tools/list") {
        responses.push(jsonRpcResponse(id, { tools: TOOLS }));
      } else if (method === "tools/call") {
        try {
          const result = await handleTool(params?.name, params?.arguments || {});
          responses.push(jsonRpcResponse(id, {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          }));
        } catch (err: unknown) {
          responses.push(jsonRpcResponse(id, {
            content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : "Unknown"}` }],
            isError: true,
          }));
        }
      } else if (method === "ping") {
        responses.push(jsonRpcResponse(id, {}));
      } else {
        responses.push(jsonRpcError(id, -32601, `Method not found: ${method}`));
      }
    }

    const result = Array.isArray(body) ? responses : responses[0];
    return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    return new Response(JSON.stringify(jsonRpcError(null, -32700, `Parse error: ${err instanceof Error ? err.message : "Unknown"}`)), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
