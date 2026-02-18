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
    
    // ── Fetch GSC data ──
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

    // ── Fetch GA4 data directly via API ──
    let ga4Context = "### Google Analytics 4: sem conexão ou dados ainda não sincronizados.\n";
    try {
      const { data: ga4Conn } = await supabase
        .from("ga4_connections")
        .select("client_email, private_key, property_id")
        .eq("project_id", project_id)
        .maybeSingle();

      if (ga4Conn?.property_id && ga4Conn?.client_email && ga4Conn?.private_key) {
        // Build JWT + get access token
        const createGA4JWT = async (creds: { client_email: string; private_key: string }) => {
          const header = { alg: "RS256", typ: "JWT" };
          const now = Math.floor(Date.now() / 1000);
          const payload = {
            iss: creds.client_email,
            scope: "https://www.googleapis.com/auth/analytics.readonly",
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
          };
          const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          const unsignedToken = `${encode(header)}.${encode(payload)}`;
          const pemContents = creds.private_key
            .replace(/-----BEGIN PRIVATE KEY-----/, "")
            .replace(/-----END PRIVATE KEY-----/, "")
            .replace(/\n/g, "");
          const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
          const key = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
          const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
          const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          return `${unsignedToken}.${signatureB64}`;
        };

        const jwt = await createGA4JWT({ client_email: ga4Conn.client_email, private_key: ga4Conn.private_key });
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
        });
        const { access_token } = await tokenRes.json();

        if (access_token) {
          const ga4Url = `https://analyticsdata.googleapis.com/v1beta/properties/${ga4Conn.property_id}:runReport`;
          const dateRanges = [{ startDate: "28daysAgo", endDate: "yesterday" }];

          const parseGA4 = (report: any): any[] => {
            if (!report?.rows) return [];
            const dims = (report.dimensionHeaders || []).map((h: any) => h.name);
            const mets = (report.metricHeaders || []).map((h: any) => h.name);
            return report.rows.map((row: any) => {
              const obj: any = {};
              (row.dimensionValues || []).forEach((v: any, i: number) => { obj[dims[i]] = v.value; });
              (row.metricValues || []).forEach((v: any, i: number) => { obj[mets[i]] = parseFloat(v.value) || 0; });
              return obj;
            });
          };

          const ga4Fetch = (body: any) => fetch(ga4Url, {
            method: "POST",
            headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, dateRanges }),
          }).then(r => r.json());

          // Parallel GA4 requests: overview totals, channels, top pages, devices, countries
          const [ga4Totals, ga4Channels, ga4TopPages, ga4Devices, ga4Countries, ga4Trend] = await Promise.all([
            ga4Fetch({
              dimensions: [],
              metrics: [
                { name: "totalUsers" }, { name: "newUsers" }, { name: "sessions" },
                { name: "engagedSessions" }, { name: "engagementRate" },
                { name: "averageSessionDuration" }, { name: "bounceRate" },
                { name: "conversions" }, { name: "totalRevenue" }, { name: "screenPageViews" },
              ],
            }),
            ga4Fetch({
              dimensions: [{ name: "sessionDefaultChannelGroup" }],
              metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }, { name: "engagementRate" }],
              orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
              limit: 10,
            }),
            ga4Fetch({
              dimensions: [{ name: "pagePath" }],
              metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }, { name: "averageSessionDuration" }, { name: "engagementRate" }],
              orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
              limit: 15,
            }),
            ga4Fetch({
              dimensions: [{ name: "deviceCategory" }],
              metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagementRate" }, { name: "bounceRate" }],
              orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
              limit: 5,
            }),
            ga4Fetch({
              dimensions: [{ name: "country" }],
              metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }],
              orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
              limit: 10,
            }),
            ga4Fetch({
              dimensions: [{ name: "date" }],
              metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }, { name: "totalRevenue" }],
              orderBys: [{ metric: { metricName: "date" }, desc: false }],
              limit: 28,
            }),
          ]);

          const totals = parseGA4(ga4Totals)[0] || {};
          const channels = parseGA4(ga4Channels);
          const topPages = parseGA4(ga4TopPages);
          const devices = parseGA4(ga4Devices);
          const countries = parseGA4(ga4Countries);
          const trend = parseGA4(ga4Trend);

          // Calculate trend (last 7 days vs previous 7 days)
          const recentSessions = trend.slice(-7).reduce((s: number, r: any) => s + (r.sessions || 0), 0);
          const prevSessions = trend.slice(-14, -7).reduce((s: number, r: any) => s + (r.sessions || 0), 0);
          const sessionsDelta = prevSessions > 0 ? (((recentSessions - prevSessions) / prevSessions) * 100).toFixed(1) : "N/A";

          ga4Context = `
### Google Analytics 4 — Últimos 28 dias (propriedade: ${ga4Conn.property_id})
**Resumo Geral:**
- Usuários totais: ${totals.totalUsers?.toLocaleString("pt-BR") || 0}
- Novos usuários: ${totals.newUsers?.toLocaleString("pt-BR") || 0}
- Sessões: ${totals.sessions?.toLocaleString("pt-BR") || 0}
- Sessões engajadas: ${totals.engagedSessions?.toLocaleString("pt-BR") || 0}
- Taxa de engajamento: ${((totals.engagementRate || 0) * 100).toFixed(1)}%
- Taxa de rejeição: ${((totals.bounceRate || 0) * 100).toFixed(1)}%
- Duração média de sessão: ${Math.floor((totals.averageSessionDuration || 0) / 60)}min ${Math.floor((totals.averageSessionDuration || 0) % 60)}s
- Pageviews: ${totals.screenPageViews?.toLocaleString("pt-BR") || 0}
- Conversões: ${totals.conversions?.toLocaleString("pt-BR") || 0}
- Receita total: R$ ${(totals.totalRevenue || 0).toFixed(2)}
- Tendência (últimos 7 vs 7 anteriores): ${sessionsDelta}% em sessões

**Canais de Aquisição (top ${channels.length}):**
${channels.map((c: any) => `- ${c.sessionDefaultChannelGroup || "Desconhecido"}: ${Math.round(c.sessions || 0)} sessões, ${Math.round(c.totalUsers || 0)} usuários, ${Math.round(c.conversions || 0)} conv., eng. ${((c.engagementRate || 0) * 100).toFixed(0)}%`).join("\n") || "Sem dados"}

**Top Páginas por Visualizações:**
${topPages.slice(0, 10).map((p: any) => `- ${p.pagePath || "/"}: ${Math.round(p.screenPageViews || 0)} views, ${Math.round(p.totalUsers || 0)} usuários, ${Math.floor((p.averageSessionDuration || 0) / 60)}min${Math.floor((p.averageSessionDuration || 0) % 60)}s médio`).join("\n") || "Sem dados"}

**Dispositivos:**
${devices.map((d: any) => `- ${d.deviceCategory}: ${Math.round(d.sessions || 0)} sessões, eng. ${((d.engagementRate || 0) * 100).toFixed(0)}%, rejeição ${((d.bounceRate || 0) * 100).toFixed(0)}%`).join("\n") || "Sem dados"}

**Top Países:**
${countries.slice(0, 5).map((c: any) => `- ${c.country}: ${Math.round(c.sessions || 0)} sessões, ${Math.round(c.totalUsers || 0)} usuários, ${Math.round(c.conversions || 0)} conv.`).join("\n") || "Sem dados"}
`;
        }
      }
    } catch (ga4Err) {
      console.warn("GA4 fetch error in orchestrator:", ga4Err);
      ga4Context = "### Google Analytics 4: erro ao buscar dados — verifique a conexão nas configurações do projeto.\n";
    }

    const projectContext = `
## Dados do Projeto (contexto real) — ${todayStr}
### Overview GSC (Search Console):
${JSON.stringify(overviewData.data || {}, null, 2)}

### Top Queries/Páginas GSC (últimos 28 dias):
${(seoData.data || []).slice(0, 20).map((r: any) => 
  `- ${r.query || r.url}: ${r.clicks} cliques, ${r.impressions} impressões, pos ${r.position?.toFixed(1)}`
).join("\n")}

### Queries GSC com Alto Volume e Baixo CTR (oportunidades):
${(gscData.data || [])
  .filter((r: any) => r.impressions > 100 && r.position < 20)
  .slice(0, 10)
  .map((r: any) => `- "${r.query}": ${r.impressions} impressões, pos ${r.position?.toFixed(1)}, ${r.clicks} cliques`)
  .join("\n") || "Sem dados disponíveis"}

${ga4Context}
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

    // Helper: call AI and return text
    const callAI = async (systemPrompt: string, userPrompt: string, maxTokens = 3000): Promise<string> => {
      const resp = await fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        }),
      });
      if (!resp.ok) throw new Error(`AI error ${resp.status}: ${await resp.text()}`);
      const d = await resp.json();
      return d.choices?.[0]?.message?.content || "";
    };

    // ── Build rich data context snippets (used in all agents) ──
    const allSeoRows = (seoData.data || []);
    const topQueries = allSeoRows.filter((r: any) => r.query && r.clicks > 0).slice(0, 15)
      .map((r: any) => `"${r.query}": ${r.clicks} cliques, ${r.impressions} imp, pos ${r.position?.toFixed(1)}, CTR ${((r.ctr || 0) * 100).toFixed(1)}%`);
    const topUrls = allSeoRows.filter((r: any) => r.url && r.clicks > 0).slice(0, 10)
      .map((r: any) => `${r.url}: ${r.clicks} cliques, ${r.impressions} imp, pos ${r.position?.toFixed(1) || "?"}`);
    const quickWinOps = (gscData.data || [])
      .filter((r: any) => r.impressions > 200 && r.position > 3 && r.position <= 15)
      .slice(0, 8)
      .map((r: any) => `"${r.query}": pos ${r.position?.toFixed(1)}, ${r.impressions} imp, apenas ${r.clicks} cliques — potencial de +${Math.round((0.05 - (r.clicks / (r.impressions || 1))) * r.impressions)} cliques/mês melhorando CTR`);
    const lowCtrHighPos = (gscData.data || [])
      .filter((r: any) => r.position <= 3 && (r.clicks / (r.impressions || 1)) < 0.05 && r.impressions > 50)
      .slice(0, 5)
      .map((r: any) => `"${r.query}": TOP ${r.position?.toFixed(0)} mas CTR só ${((r.clicks / (r.impressions || 1)) * 100).toFixed(1)}% — urgente melhorar snippet`);

    const hasRealSeoData = topQueries.length > 0;

    // ── ROUND 1: Execute each agent top-down (cascade) ──
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
            return peerResult ? `\n### Relatório de ${r.emoji} ${r.title}:\n${peerResult.slice(0, 600)}` : "";
          })
          .filter(Boolean)
          .join("\n");

        const isCeo = getDepth(role.id) === 0;
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const dueDateStr = nextWeek.toISOString().split("T")[0];

        // ── Build specialist-specific additional context ──
        const roleTitleLower = role.title.toLowerCase();
        const isSeoSpecialist = roleTitleLower.includes("seo") || roleTitleLower.includes("orgânico") || roleTitleLower.includes("busca");
        const isContentSpec = roleTitleLower.includes("content") || roleTitleLower.includes("conteúdo") || roleTitleLower.includes("redator") || roleTitleLower.includes("editorial");
        const isLinksSpec = roleTitleLower.includes("link") || roleTitleLower.includes("autoridade") || roleTitleLower.includes("backlink");
        const isAdsSpec = roleTitleLower.includes("ads") || roleTitleLower.includes("mídia") || roleTitleLower.includes("paid") || roleTitleLower.includes("pago") || roleTitleLower.includes("tráfego pago");
        const isTechSpec = roleTitleLower.includes("técn") || roleTitleLower.includes("tech") || roleTitleLower.includes("desenvolv") || roleTitleLower.includes("core web");
        const isAnalyticsSpec = roleTitleLower.includes("analytic") || roleTitleLower.includes("dados") || roleTitleLower.includes("data") || roleTitleLower.includes("métricas");
        const isCroSpec = roleTitleLower.includes("cro") || roleTitleLower.includes("convers") || roleTitleLower.includes("ux");

        let specialistDataSection = "";
        if (isSeoSpecialist) {
          specialistDataSection = `
## 🔍 DADOS SEO ESPECÍFICOS PARA SUA ANÁLISE:
### Queries orgânicas com maior volume (GSC — últimos 28 dias):
${topQueries.length > 0 ? topQueries.join("\n") : "⚠️ Sem dados de GSC conectados ainda"}

### Quick Wins — Posição 4-15 com alto volume (MEG OPORTUNIDADE de 1ª página):
${quickWinOps.length > 0 ? quickWinOps.join("\n") : "Sem oportunidades quick-win identificadas"}

### Alertas de CTR Baixo (TOP 3 mas perdendo cliques):
${lowCtrHighPos.length > 0 ? lowCtrHighPos.join("\n") : "Nenhum alerta de CTR"}

### Top URLs por tráfego orgânico:
${topUrls.length > 0 ? topUrls.join("\n") : "Sem dados de URL"}`;
        } else if (isContentSpec) {
          specialistDataSection = `
## ✍️ DADOS DE CONTEÚDO PARA SUA ANÁLISE:
### Páginas com mais tráfego orgânico (oportunidades de expansão de conteúdo):
${topUrls.length > 0 ? topUrls.join("\n") : "Sem dados de URL ainda"}

### Queries sem conteúdo específico (gap de conteúdo identificado):
${quickWinOps.slice(0, 6).map((q: string) => `→ ${q}`).join("\n") || "Sem gaps identificados"}

### Queries com alta impressão mas sem clique (meta/título fraco):
${lowCtrHighPos.join("\n") || "Nenhum alerta"}`;
        } else if (isLinksSpec) {
          specialistDataSection = `
## 🔗 DADOS DE AUTORIDADE PARA SUA ANÁLISE:
### Páginas com maior potencial para link building (mais tráfego, mais autoridade):
${topUrls.slice(0, 8).join("\n") || "Sem dados de URL"}

### Keywords que precisam de boost de autoridade (posição 5-15):
${quickWinOps.slice(0, 6).join("\n") || "Sem dados"}`;
        } else if (isAdsSpec) {
          specialistDataSection = `
## 📣 DADOS DE ADS/MÍDIA PAGA PARA SUA ANÁLISE:
${ga4Context.slice(0, 1500)}
### Canais orgânicos (para complementar com paid):
${topQueries.slice(0, 8).join("\n") || "Sem dados"}`;
        } else if (isTechSpec) {
          specialistDataSection = `
## 🔧 DADOS TÉCNICOS PARA SUA ANÁLISE:
### URLs com problemas potenciais de indexação ou performance (baixo CTR / posição ruim):
${allSeoRows.filter((r: any) => r.url && r.position > 20).slice(0, 8).map((r: any) => `${r.url}: pos ${r.position?.toFixed(1)} — possível problema técnico`).join("\n") || "Sem dados"}

### Queries com impressão alta mas sem clique (pode ser problema de snippet/structured data):
${lowCtrHighPos.join("\n") || "Nenhum alerta"}`;
        } else if (isAnalyticsSpec) {
          specialistDataSection = `
## 📊 DADOS ANALYTICS PARA SUA ANÁLISE:
${ga4Context}`;
        } else if (isCroSpec) {
          specialistDataSection = `
## 🎯 DADOS CRO/CONVERSÃO PARA SUA ANÁLISE:
${ga4Context.slice(0, 1500)}
### Páginas com alto tráfego (candidatas a testes de CRO):
${topUrls.slice(0, 8).join("\n") || "Sem dados de URL"}`;
        } else {
          // CEO and managers get full context
          specialistDataSection = `
## 📊 DADOS GERAIS DO PROJETO:
### Top Queries GSC:
${topQueries.slice(0, 8).join("\n") || "Sem dados de queries"}

### Top URLs:
${topUrls.slice(0, 5).join("\n") || "Sem dados de URL"}

### Quick Wins Identificados:
${quickWinOps.slice(0, 5).join("\n") || "Sem oportunidades quick-win"}

${ga4Context.slice(0, 1200)}`;
        }

        const systemPrompt = `${role.instructions}

Você é ${role.emoji} ${role.title} — especialista sênior atuando em uma equipe profissional de IA para o projeto real descrito abaixo.
Hoje é ${today.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} (${todayStr}).

${specialistDataSection}

## Sua Especialidade e Rotina (frequência: ${role.routine?.frequency || "diária"}):
Responsabilidades: ${(role.routine?.tasks || []).join("; ") || "Análise e relatório da sua área"}
Fontes de dados: ${(role.routine?.dataSources || []).join(", ") || "Dados do projeto"}
Entregáveis esperados: ${(role.routine?.outputs || []).join(", ") || "Relatório + Tarefas"}
${(role.routine?.autonomousActions || []).length > 0 ? `Ações autônomas: ${role.routine.autonomousActions.join("; ")}` : ""}

${superiorResult && superiorRole ? `## 📋 DIRETRIZES ESTRATÉGICAS DO SUPERIOR (${superiorRole.emoji} ${superiorRole.title}):
${superiorResult.slice(0, 1000)}

⚠️ Sua análise DEVE estar alinhada com as prioridades acima. Especifique como sua área contribui para cada objetivo do superior.` : ""}

${peerResults ? `## 👥 CONTEXTO DOS COLEGAS DE EQUIPE:\n${peerResults.slice(0, 1500)}` : ""}

## ⚠️ REGRAS ABSOLUTAS:
${hasRealSeoData ? `- SEMPRE cite dados reais do projeto: queries com números exatos, CTRs, posições, páginas específicas
- NUNCA use exemplos genéricos como "keyword X" ou "página Y" — use os dados reais fornecidos acima` : `- Os dados do projeto ainda não foram sincronizados. Baseie-se no contexto do domínio e nas melhores práticas
- Seja específico sobre COMO implementar cada ação, mesmo sem dados históricos`}
- Cada tarefa deve ter ação CONCRETA com responsável, ferramentas e métrica de sucesso
- Tarefas devem ser implementáveis pelo time humano nos próximos 7 dias
- Prazo máximo das tarefas: ${dueDateStr}

## 📝 FORMATO DE SAÍDA OBRIGATÓRIO (siga exatamente):
Escreva seu relatório profissional abaixo (máximo 600 palavras, cite dados reais):

[Relatório narrativo aqui]

---TASKS_JSON---
[
  {
    "title": "Ação específica com dado real (ex: Otimizar title da /produto para keyword 'X' que tem CTR de 1.2%)",
    "description": "Passo a passo detalhado: 1) O que fazer 2) Como fazer 3) Onde implementar 4) Resultado esperado",
    "category": "seo|conteudo|links|ads|tecnico|estrategia|analytics",
    "priority": "urgente|alta|normal|baixa",
    "assigned_role": "${role.title}",
    "assigned_role_emoji": "${role.emoji}",
    "due_date": "${dueDateStr}",
    "success_metric": "Métrica objetiva e mensurável (ex: CTR sobe para >5% na query X em 14 dias)",
    "estimated_impact": "Impacto esperado com dados (ex: +180 cliques/mês baseado nas 3.600 impressões atuais)"
  }
]`;

        const userPrompt = isCeo
          ? `Como CEO desta equipe digital, com os dados REAIS do projeto acima, entregue:

1. **DIAGNÓSTICO EXECUTIVO** (100 palavras): Situação atual do projeto em 3 métricas-chave com números reais
2. **TOP 3 PRIORIDADES DA SEMANA** com impacto esperado e prazo
3. **DIRETRIZES POR ÁREA** (SEO, Conteúdo, Links, Ads, Técnico, Analytics) — instruções específicas para cada especialista
4. **TAREFAS ESTRATÉGICAS** (JSON): 3-5 tarefas de alto nível que a equipe deve executar esta semana

Lembre: seu relatório será a bússola estratégica para todos os agentes. Seja preciso, baseado em dados e acionável.`
          : `Execute sua análise especializada de ${role.title} com os dados REAIS do projeto acima. Entregue:

1. **ANÁLISE DA SUA ÁREA** (200-400 palavras): cite números reais, identifique problemas e oportunidades específicos
2. **TOP ACHADOS** (máx 5 bullets): insights mais importantes com dados concretos
3. **PLANO DE AÇÃO** (JSON): 3-5 tarefas MUITO específicas que o time humano pode implementar AGORA

⚠️ Importante: suas tarefas devem ser tão específicas que qualquer pessoa da equipe consiga executar sem precisar de briefing adicional.`;

        const fullOutput = await callAI(systemPrompt, userPrompt, 2000);

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
                    metadata: { source: "agent_round1" },
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

    // ── ROUND 2: Squad refinement — run only if < 4 agents total (to avoid timeout) ──
    const refinementsByRole = new Map<string, string>();
    if (sortedRoles.length <= 3) {
      const peerGroupsDone = new Set<string>();
      for (const role of sortedRoles) {
        const superiorId = hierarchyMap[role.id] || "";
        const groupKey = superiorId || "__root__";
        if (peerGroupsDone.has(groupKey)) continue;
        const peers = sortedRoles.filter(r => (hierarchyMap[r.id] || "") === superiorId);
        if (peers.length < 2) { peerGroupsDone.add(groupKey); continue; }
        peerGroupsDone.add(groupKey);
        await Promise.all(peers.map(async (reviewer) => {
          const reviewerReport = resultsByRole.get(reviewer.id);
          if (!reviewerReport) return;
          const othersReports = peers
            .filter(p => p.id !== reviewer.id && resultsByRole.get(p.id))
            .map(p => `### ${p.emoji} ${p.title}:\n${(resultsByRole.get(p.id) || "").slice(0, 600)}`)
            .join("\n\n---\n\n");
          if (!othersReports) return;
          try {
            const refinement = await callAI(
              `Você é ${reviewer.emoji} ${reviewer.title}. Leia os relatórios dos colegas e proponha 2-3 refinamentos específicos. Máximo 200 palavras.`,
              `Seu relatório:\n${reviewerReport.slice(0, 600)}\n\nColegas:\n${othersReports.slice(0, 1500)}\n\nRefinamentos:`,
              500
            );
            refinementsByRole.set(reviewer.id, refinement);
          } catch (e) {
            console.warn(`[run-orchestrator] Refinement failed for ${reviewer.id}:`, e);
          }
        }));
      }

      // Merge refinements into agent results for visibility
      for (const result of agentResults) {
        const refinement = refinementsByRole.get(result.role_id);
        if (refinement) {
          result.result = `${result.result}\n\n---\n\n💬 **Refinamento do Squad:**\n${refinement}`;
          resultsByRole.set(result.role_id, result.result);
        }
      }

      // Update DB with refined results
      await supabase
        .from("orchestrator_runs")
        .update({ agent_results: agentResults })
        .eq("id", runId);
    }

    // ── Generate Strategic Plan + 5-Day Daily Actions Plan ──
    const ceoRoleId = sortedRoles.find(r => getDepth(r.id) === 0)?.id || "ceo";
    const ceoResult = resultsByRole.get(ceoRoleId) || 
      agentResults.find(r => r.role_id === ceoRoleId || getDepth(r.role_id) === 0)?.result || "";

    const allReports = agentResults
      .filter(r => r.status === "success")
      .map(r => `### ${r.emoji} ${r.role_title}\n${r.result.slice(0, 1500)}`)
      .join("\n\n---\n\n");

    // Compute next 5 business days
    const getNextBusinessDays = (from: Date, count: number): string[] => {
      const days: string[] = [];
      const d = new Date(from);
      while (days.length < count) {
        d.setDate(d.getDate() + 1);
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          days.push(d.toISOString().split("T")[0]);
        }
      }
      return days;
    };
    const next5Days = getNextBusinessDays(today, 5);
    const dayNames: Record<number, string> = {
      1: "Segunda-feira", 2: "Terça-feira", 3: "Quarta-feira", 4: "Quinta-feira", 5: "Sexta-feira"
    };

    // Build a focused data snapshot for the daily plan
    const dailyPlanDataContext = `
## DADOS REAIS DO PROJETO:
### Dias a gerar: ${next5Days.map(d => `${d} (${dayNames[new Date(d + "T12:00:00").getDay()] || d})`).join(", ")}
### Top Queries GSC:
${topQueries.slice(0, 12).join("\n") || "Dados ainda não sincronizados"}
### Quick Wins (pos 4-15, alto volume):
${quickWinOps.slice(0, 8).join("\n") || "Sem quick wins"}
### Alertas de CTR baixo:
${lowCtrHighPos.join("\n") || "Nenhum"}
### Top URLs:
${topUrls.slice(0, 8).join("\n") || "Sem dados"}
${ga4Context.slice(0, 800)}
`;

    // Generate strategic plan + full daily actions (parallel)
    let strategicPlan = null;
    let dailyPlan: DailyPlanDay[] = [];

    const [planRes, dailyRes] = await Promise.allSettled([
      // Strategic weekly plan — with real data
      fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `Você é o CEO de uma empresa digital. Com base nos dados REAIS do projeto e relatórios da equipe, gere um planejamento estratégico em JSON PURO (APENAS JSON, sem markdown, sem texto antes/depois):
{
  "week_theme": "Tema concreto baseado nos dados (ex: Recuperação de CTR em 12 queries na posição 4-8)",
  "top_goals": [
    "Meta 1 com número real (ex: Subir CTR médio das queries pos 4-6 de 2.1% para >4%)",
    "Meta 2 com dado concreto e prazo",
    "Meta 3 mensurável com baseline dos dados"
  ],
  "daily_focus": {
    "segunda": "Foco concreto com ação específica baseada nos dados",
    "terca": "Foco do dia com dado real",
    "quarta": "Foco do dia",
    "quinta": "Foco do dia",
    "sexta": "Fechamento semanal e planejamento próxima semana"
  },
  "kpis_to_watch": [
    {"metric": "Nome da métrica real do projeto", "target": "Meta concreta", "current": "Valor atual dos dados"}
  ],
  "risk_alert": "Principal risco identificado nos dados esta semana com evidência",
  "quick_wins": [
    "Ação rápida CONCRETA (<1h) com dado real (ex: Atualizar meta title de /pagina com 3.200 impressões e CTR 1.1%)",
    "Ação rápida 2 baseada nos dados",
    "Ação rápida 3"
  ]
}`
            },
            {
              role: "user",
              content: `${dailyPlanDataContext}\n\nRelatório do CEO:\n${ceoResult.slice(0, 1500)}\n\nGere o planejamento estratégico JSON agora.`
            }
          ],
          max_tokens: 1500,
        }),
      }),

      // 5-day detailed daily plan — HIPER-SPECIFIC with real data
      fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `Você é um Chief of Staff experiente. Gere um plano de ações diárias HIPER-ESPECÍFICO para exatamente estes 5 dias: ${next5Days.map((d, i) => `${d} (${dayNames[new Date(d + "T12:00:00").getDay()] || "Dia " + (i + 1)})`).join(", ")}.

RETORNE APENAS UM ARRAY JSON VÁLIDO (sem markdown, sem texto, apenas JSON começando com [ e terminando com ]):
[
  {
    "date": "${next5Days[0] || "YYYY-MM-DD"}",
    "day_name": "${dayNames[new Date((next5Days[0] || "2025-01-01") + "T12:00:00").getDay()] || "Segunda-feira"}",
    "theme": "Tema focado com dado real (ex: Otimização de CTR — 12 queries na pos 4-8 com baixa taxa de clique)",
    "areas_covered": ["seo", "conteudo"],
    "kpi_targets": [
      {"metric": "CTR das queries pos 4-8", "target": ">4%", "area": "seo"}
    ],
    "actions": [
      {
        "time": "09:00",
        "title": "Título ACIONÁVEL e específico (ex: Reescrever meta title de /produto — 2.800 imp e CTR 1.1%)",
        "description": "1) Acesse o GSC e filtre esta URL 2) Identifique a keyword principal com mais impressões 3) Reescreva o title incluindo keyword + benefício único 4) Atualize no CMS e submeta URL para inspeção",
        "area": "seo",
        "priority": "urgente",
        "duration_min": 30,
        "responsible": "Especialista SEO",
        "success_metric": "CTR desta página sobe de 1.1% para >3% em 14 dias",
        "status": "scheduled",
        "tools": ["Google Search Console", "CMS do site", "URL Inspection Tool"]
      }
    ]
  }
]

REGRAS CRÍTICAS:
1. Use EXATAMENTE estes dates em ordem: ${next5Days.join(", ")}
2. Cada dia deve ter EXATAMENTE entre 4 e 6 ações (nunca menos de 4)
3. Cite dados reais do projeto: queries com CTR/posições, URLs, métricas GA4
4. Horários entre 09:00 e 18:00, distribuídos ao longo do dia
5. Distribuição semanal: SEO pesado na segunda/quarta, Conteúdo na terça/quinta, Links+Técnico na quarta/sexta
6. Cada descrição DEVE ter passo a passo numerado (mínimo 4 passos)
7. NUNCA use "keyword X", "página Y" — use dados reais ou nomes descritivos do contexto
8. Inclua as ferramentas específicas para cada ação`
            },
            {
              role: "user",
              content: `${dailyPlanDataContext}\n\n## Relatórios dos Agentes:\n${allReports.slice(0, 5000)}\n\nGere agora o array JSON do plano diário. Apenas o JSON, nada mais.`
            }
          ],
          max_tokens: 6000,
        }),
      }),
    ]);

    // Process strategic plan
    if (planRes.status === "fulfilled" && (planRes.value as Response).ok) {
      try {
        const planData = await (planRes.value as Response).json();
        const planText = planData.choices?.[0]?.message?.content || "";
        const jsonMatch = planText.match(/\{[\s\S]*\}/);
        if (jsonMatch) strategicPlan = JSON.parse(jsonMatch[0]);
      } catch (e) { console.warn("[run-orchestrator] Failed to parse strategic plan:", e); }
    } else {
      console.warn("[run-orchestrator] Strategic plan request failed:", (planRes as PromiseRejectedResult)?.reason || "unknown");
    }

    // Process daily plan — with robust multi-strategy parsing
    if (dailyRes.status === "fulfilled" && (dailyRes.value as Response).ok) {
      try {
        const dailyData = await (dailyRes.value as Response).json();
        const dailyText = dailyData.choices?.[0]?.message?.content || "";
        console.log(`[run-orchestrator] Daily plan raw response length: ${dailyText.length} chars`);

        // Strategy 1: direct parse or extract array
        let parsedArr: any[] | null = null;
        const arrMatch = dailyText.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          try { parsedArr = JSON.parse(arrMatch[0]); } catch (_e1) { /* try next */ }
        }
        // Strategy 2: try whole text
        if (!parsedArr) {
          try { parsedArr = JSON.parse(dailyText.trim()); } catch (_e2) { /* fail gracefully */ }
        }

        if (Array.isArray(parsedArr)) {
          dailyPlan = parsedArr.filter((d: any) => d.date && Array.isArray(d.actions) && d.actions.length > 0);
          // If dates are wrong but we have actions, accept it
          if (dailyPlan.length === 0 && parsedArr.length > 0) {
            dailyPlan = parsedArr.filter((d: any) => Array.isArray(d.actions) && d.actions.length > 0);
            // Assign correct dates
            dailyPlan = dailyPlan.slice(0, 5).map((d: any, i: number) => ({
              ...d,
              date: next5Days[i] || d.date,
              day_name: dayNames[new Date((next5Days[i] || d.date) + "T12:00:00").getDay()] || d.day_name,
            }));
          }
          console.log(`[run-orchestrator] Daily plan: ${dailyPlan.length} days, ${dailyPlan.reduce((s: number, d: any) => s + (d.actions?.length || 0), 0)} actions`);
        } else {
          console.warn("[run-orchestrator] Daily plan: no valid JSON array found");
        }
      } catch (e) { console.warn("[run-orchestrator] Daily plan parse error:", e); }
    } else {
      console.warn("[run-orchestrator] Daily plan request failed:", (dailyRes as PromiseRejectedResult)?.reason || "unknown");
    }

    // ── Convert daily plan actions → real orchestrator_tasks with date+time ──
    // This makes daily actions trackable by the GP just like agent tasks
    let dailyTasksCreated = 0;
    if (dailyPlan.length > 0) {
      const dailyTasksToInsert = [];
      for (const day of dailyPlan) {
        for (const action of (day.actions || [])) {
          // Map area to category
          const categoryMap: Record<string, string> = {
            seo: "seo", conteudo: "conteudo", links: "links",
            ads: "ads", tecnico: "tecnico", analytics: "analytics", estrategia: "estrategia",
          };
          const category = categoryMap[action.area] || "geral";

          dailyTasksToInsert.push({
            deployment_id,
            run_id: runId,
            project_id,
            owner_id,
            title: action.title,
            description: action.description || "",
            category,
            priority: action.priority || "normal",
            assigned_role: action.responsible || "Equipe",
            assigned_role_emoji: category === "seo" ? "🔍" : category === "conteudo" ? "✍️" : category === "links" ? "🔗" : category === "ads" ? "📣" : category === "tecnico" ? "🔧" : category === "analytics" ? "📊" : "🎯",
            due_date: day.date, // ISO date YYYY-MM-DD
            success_metric: action.success_metric || null,
            estimated_impact: null,
            status: "pending",
            metadata: {
              source: "daily_plan",
              day_name: day.day_name,
              day_theme: day.theme,
              scheduled_time: action.time || null,
              duration_min: action.duration_min || null,
              tools: action.tools || [],
              area: action.area,
            },
          });
        }
      }

      if (dailyTasksToInsert.length > 0) {
        const { error: dtErr } = await supabase.from("orchestrator_tasks").insert(dailyTasksToInsert);
        if (!dtErr) dailyTasksCreated = dailyTasksToInsert.length;
        else console.warn("[run-orchestrator] Failed to insert daily tasks:", dtErr);
      }
    }

    // Count all tasks created in this run
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
      daily_tasks_created: dailyTasksCreated,
      squad_refinement_done: refinementsByRole.size > 0,
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

    // ── Auto-populate Team Hub with agent outputs ──
    try {
      const hubEntries: any[] = [];

      // 1. Each successful agent generates a "report" entry
      for (const ar of agentResults.filter(r => r.status === "success")) {
        hubEntries.push({
          deployment_id,
          project_id,
          owner_id,
          type: "report",
          title: `${ar.emoji} Relatório: ${ar.role_title}`,
          content: ar.result.slice(0, 3000),
          notify_whatsapp: false,
          status: "open",
        });
      }

      // 2. Strategic plan → "strategic" entry
      if (strategicPlan) {
        const sp = strategicPlan as any;
        const content = [
          sp.week_theme ? `🎯 **Tema da Semana:** ${sp.week_theme}` : "",
          sp.top_goals?.length
            ? `\n**Metas Principais:**\n${sp.top_goals.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}`
            : "",
          sp.risk_alert ? `\n⚠️ **Alerta de Risco:** ${sp.risk_alert}` : "",
          sp.quick_wins?.length
            ? `\n⚡ **Quick Wins:**\n${sp.quick_wins.map((w: string) => `• ${w}`).join("\n")}`
            : "",
          sp.kpis_to_watch?.length
            ? `\n📊 **KPIs a Monitorar:**\n${sp.kpis_to_watch.map((k: any) => `• ${k.metric}: atual ${k.current} → meta ${k.target}`).join("\n")}`
            : "",
        ].filter(Boolean).join("\n");

        hubEntries.push({
          deployment_id,
          project_id,
          owner_id,
          type: "strategic",
          title: `📅 Planejamento Estratégico — ${new Date().toLocaleDateString("pt-BR")}`,
          content,
          notify_whatsapp: false,
          status: "open",
        });
      }

      // 3. Daily plan quick wins → "action_plan" entry
      if (dailyPlan.length > 0) {
        const urgentActions = dailyPlan.flatMap((day: any) =>
          (day.actions || [])
            .filter((a: any) => a.priority === "urgente" || a.priority === "alta")
            .slice(0, 3)
            .map((a: any) => `• [${day.day_name || day.date}] ${a.title}`)
        ).slice(0, 10);

        if (urgentActions.length > 0) {
          hubEntries.push({
            deployment_id,
            project_id,
            owner_id,
            type: "action_plan",
            title: `⚡ Ações Prioritárias — Próximos 5 dias`,
            content: urgentActions.join("\n"),
            notify_whatsapp: false,
            status: "open",
          });
        }
      }

      // 4. CEO summary → "suggestion" entry if available
      if (ceoResult) {
        hubEntries.push({
          deployment_id,
          project_id,
          owner_id,
          type: "suggestion",
          title: `💡 Análise Executiva do CEO — ${new Date().toLocaleDateString("pt-BR")}`,
          content: ceoResult.slice(0, 2000),
          notify_whatsapp: false,
          status: "open",
        });
      }

      if (hubEntries.length > 0) {
        const { error: hubErr } = await supabase.from("team_hub_entries" as any).insert(hubEntries);
        if (hubErr) console.warn("[run-orchestrator] Failed to insert team hub entries:", hubErr);
        else console.log(`[run-orchestrator] Inserted ${hubEntries.length} Team Hub entries`);
      }
    } catch (hubErr) {
      console.warn("[run-orchestrator] Team hub auto-populate error:", hubErr);
    }

    // Create notification
    const successCount = agentResults.filter(r => r.status === "success").length;
    await supabase.from("notifications").insert({
      user_id: owner_id,
      project_id,
      title: "🏢 Orquestrador Concluído",
      message: `${successCount}/${agentResults.length} agentes executados. ${tasksCreated || 0} tarefas criadas (${dailyTasksCreated} do plano diário). Refinamento do squad: ${refinementsByRole.size > 0 ? "✅" : "—"}`,
      type: "success",
      action_url: `/rankito-ai#canvas`,
    });

    // Auto-send WhatsApp to CEO if configured
    const { data: depRoles } = await supabase
      .from("orchestrator_deployments")
      .select("roles, name")
      .eq("id", deployment_id)
      .single();

    if (depRoles?.roles && ceoResult) {
      const ceoRole = (depRoles.roles as any[]).find((r: any) => !r.id || r.id === "ceo" || !(r as any).parent);
      // Find the root role (no parent in hierarchy)
      const { data: dep } = await supabase
        .from("orchestrator_deployments")
        .select("roles, hierarchy")
        .eq("id", deployment_id)
        .single();
      if (dep?.roles) {
        const hierarchy = dep.hierarchy as Record<string, string> || {};
        const rootRole = (dep.roles as any[]).find((r: any) => !hierarchy[r.id]);
        if (rootRole?.whatsapp) {
          try {
            await supabase.functions.invoke("send-workflow-notification", {
              body: {
                workflow_name: `🏢 ${depRoles.name || "Orquestrador"} — Relatório Executivo`,
                report: ceoResult,
                recipient_name: rootRole.title || "CEO",
                direct_send: {
                  phones: [rootRole.whatsapp],
                },
              },
            });
            console.log(`[run-orchestrator] WhatsApp enviado para CEO: ${rootRole.whatsapp}`);
          } catch (waErr) {
            console.warn("[run-orchestrator] Falha ao enviar WhatsApp para CEO:", waErr);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      run_id: runId,
      results_count: agentResults.length,
      success_count: successCount,
      tasks_created: tasksCreated || 0,
      daily_tasks_created: dailyTasksCreated,
      squad_refinements: refinementsByRole.size,
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
