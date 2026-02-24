import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, errorResponse } from "../_shared/utils.ts";

/**
 * Rankito MCP Server — Streamable HTTP Transport
 * Exposes SEO, GA4, Indexing & AI tools for Claude/Antigravity integration.
 *
 * Protocol: MCP over Streamable HTTP (JSON-RPC 2.0)
 * Auth: Bearer token = Supabase service role key or API key
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Tool definitions ─────────────────────────────────────────────────────
const TOOLS = [
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
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
      },
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
      properties: {
        project_id: { type: "string", description: "UUID do projeto" },
      },
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
];

// ─── Tool handlers ─────────────────────────────────────────────────────────
async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const pid = args.project_id as string | undefined;

  switch (name) {
    case "list_projects": {
      const { data, error } = await sb.from("projects").select("id, name, domain, site_type, country, status, created_at").order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_project_overview": {
      if (!pid) throw new Error("project_id required");
      const { data, error } = await sb.rpc("get_project_overview_v2", { p_project_id: pid });
      if (error) throw new Error(error.message);
      return data;
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
      return data;
    }

    case "get_analytics_sessions": {
      if (!pid) throw new Error("project_id required");
      const days = (args.days as number) || 30;
      const limit = (args.limit as number) || 50;
      const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data, error } = await sb.from("analytics_sessions").select("session_date, sessions_count, users_count, bounce_rate, engagement_rate, source, medium, channel, country, device, revenue, conversions_count").eq("project_id", pid).gte("session_date", startDate).order("session_date", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_site_urls": {
      if (!pid) throw new Error("project_id required");
      const limit = (args.limit as number) || 100;
      const { data, error } = await sb.from("site_urls").select("url, status, url_type, url_group, priority, meta_title, meta_description, last_crawl").eq("project_id", pid).order("priority", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_indexing_status": {
      if (!pid) throw new Error("project_id required");
      const limit = (args.limit as number) || 50;
      const { data, error } = await sb.from("indexing_requests").select("url, status, request_type, submitted_at, completed_at, response_code, fail_reason, retries").eq("project_id", pid).order("submitted_at", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_index_coverage": {
      if (!pid) throw new Error("project_id required");
      const { data, error } = await sb.from("index_coverage").select("url, verdict, coverage_state, indexing_state, crawled_as, last_crawl_time, robotstxt_state, page_fetch_state").eq("project_id", pid).limit(100);
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_conversions": {
      if (!pid) throw new Error("project_id required");
      const days = (args.days as number) || 30;
      const startDate = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await sb.from("conversions").select("event_type, page, source, medium, campaign, device, location, value, lead_name, lead_email, converted_at").eq("project_id", pid).gte("converted_at", startDate).order("converted_at", { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return data;
    }

    case "ask_rankito_ai": {
      const question = args.question as string;
      if (!question) throw new Error("question required");
      // Call ai-chat internally (non-streaming for MCP)
      const messages = [{ role: "user", content: question }];
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          messages,
          agent_name: (args.agent_name as string) || "Rankito SEO",
          project_id: pid,
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`AI error: ${err}`);
      }
      // Parse SSE stream to get full response
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch { /* partial */ }
        }
      }
      return { answer: fullText };
    }

    case "list_ai_agents": {
      if (!pid) throw new Error("project_id required");
      const { data, error } = await sb.from("ai_agents").select("id, name, speciality, description, enabled, is_system").eq("project_id", pid).order("name");
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_orchestrator_runs": {
      if (!pid) throw new Error("project_id required");
      const limit = (args.limit as number) || 10;
      const { data, error } = await sb.from("orchestrator_runs").select("id, status, started_at, completed_at, summary, agent_results, delivery_status, deployment_id").eq("project_id", pid).order("started_at", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return data;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── JSON-RPC handler ──────────────────────────────────────────────────────
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
  // Accept service role key directly
  if (token === SUPABASE_SERVICE_ROLE_KEY) return true;
  // Accept API keys via hash lookup
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

  // Only POST for JSON-RPC
  if (req.method !== "POST") {
    // GET returns server info (for discovery)
    if (req.method === "GET") {
      return new Response(JSON.stringify({
        name: "rankito-mcp-server",
        version: "1.0.0",
        description: "MCP Server do Rankito — acesse dados de SEO, Analytics, Indexação e Agentes IA",
        tools: TOOLS.map(t => t.name),
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  // Authenticate
  const authed = await authenticate(req);
  if (!authed) {
    return new Response(JSON.stringify(jsonRpcError(null, -32000, "Unauthorized. Use Bearer token with API key or service role key.")), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Support batched requests
    const requests = Array.isArray(body) ? body : [body];
    const responses = [];

    for (const rpc of requests) {
      const { id, method, params } = rpc;

      if (method === "initialize") {
        responses.push(jsonRpcResponse(id, {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "rankito-mcp-server", version: "1.0.0" },
          capabilities: { tools: { listChanged: false } },
        }));
      } else if (method === "notifications/initialized") {
        // No response needed for notifications
      } else if (method === "tools/list") {
        responses.push(jsonRpcResponse(id, { tools: TOOLS }));
      } else if (method === "tools/call") {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        try {
          const result = await handleTool(toolName, toolArgs);
          responses.push(jsonRpcResponse(id, {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          }));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          responses.push(jsonRpcResponse(id, {
            content: [{ type: "text", text: `Error: ${msg}` }],
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
    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify(jsonRpcError(null, -32700, `Parse error: ${msg}`)), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
