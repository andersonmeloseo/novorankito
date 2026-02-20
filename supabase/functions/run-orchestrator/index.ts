import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchGA4Context } from "../_shared/ga4-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoleConfig {
  id: string;
  title: string;
  emoji: string;
  instructions: string;
  routine: { frequency: string; tasks: string[]; dataSources: string[]; outputs: string[]; autonomousActions: string[] };
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

interface DailyPlanDay {
  date: string;
  day_name: string;
  theme: string;
  actions: any[];
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

    // Fetch AI key
    const { data: apiKeyRow } = await supabase
      .from("api_configurations_decrypted")
      .select("secret_value")
      .eq("secret_key_name", "OPEN_AI_API_KEY")
      .eq("status", "active")
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const useOpenAI = !!(apiKeyRow?.secret_value);
    const aiApiKey = apiKeyRow?.secret_value || LOVABLE_API_KEY;
    const aiEndpoint = useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiModel = useOpenAI ? "gpt-4o-mini" : "google/gemini-2.5-flash";

    if (!aiApiKey) throw new Error("Nenhuma chave de IA configurada.");

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Fetch project data + GA4 in parallel
    const [seoRes, overviewRes, gscRes, ga4Context] = await Promise.all([
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
      fetchGA4Context(supabase, project_id),
    ]);

    const allSeoRows = seoRes.data || [];
    const topQueries = allSeoRows.filter((r: any) => r.query && r.clicks > 0).slice(0, 15)
      .map((r: any) => `"${r.query}": ${r.clicks} cliques, pos ${r.position?.toFixed(1)}, CTR ${((r.ctr || 0) * 100).toFixed(1)}%`);
    const topUrls = allSeoRows.filter((r: any) => r.url && r.clicks > 0).slice(0, 10)
      .map((r: any) => `${r.url}: ${r.clicks} cliques, pos ${r.position?.toFixed(1) || "?"}`);
    const quickWins = (gscRes.data || [])
      .filter((r: any) => r.impressions > 200 && r.position > 3 && r.position <= 15)
      .slice(0, 8)
      .map((r: any) => `"${r.query}": pos ${r.position?.toFixed(1)}, ${r.impressions} imp, ${r.clicks} cliques`);
    const lowCtr = (gscRes.data || [])
      .filter((r: any) => r.position <= 3 && (r.clicks / (r.impressions || 1)) < 0.05 && r.impressions > 50)
      .slice(0, 5)
      .map((r: any) => `"${r.query}": TOP ${r.position?.toFixed(0)} mas CTR ${((r.clicks / (r.impressions || 1)) * 100).toFixed(1)}%`);

    const hasData = topQueries.length > 0;

    // Create run record
    const { data: run, error: runErr } = await supabase
      .from("orchestrator_runs")
      .insert({ deployment_id, project_id, owner_id, status: "running" })
      .select("id").single();
    if (runErr) throw runErr;
    const runId = run.id;

    const rolesArr = roles as RoleConfig[];
    const hierarchyMap = hierarchy as Record<string, string>;
    const getDepth = (roleId: string): number => {
      const p = hierarchyMap[roleId];
      return p ? getDepth(p) + 1 : 0;
    };
    const sortedRoles = [...rolesArr].sort((a, b) => getDepth(a.id) - getDepth(b.id));
    const agentResults: AgentResult[] = [];
    const resultsByRole = new Map<string, string>();

    const callAI = async (system: string, user: string, maxTokens = 2000): Promise<string> => {
      const resp = await fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: aiModel, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTokens }),
      });
      if (!resp.ok) throw new Error(`AI error ${resp.status}`);
      const d = await resp.json();
      return d.choices?.[0]?.message?.content || "";
    };

    // Build specialist data section
    const buildSpecialistData = (role: RoleConfig): string => {
      const t = role.title.toLowerCase();
      const isSeo = t.includes("seo") || t.includes("orgân") || t.includes("busca");
      const isContent = t.includes("content") || t.includes("conteú") || t.includes("redator");
      const isLinks = t.includes("link") || t.includes("autoridade") || t.includes("backlink");
      const isAds = t.includes("ads") || t.includes("mídia") || t.includes("paid") || t.includes("pago");
      const isTech = t.includes("técn") || t.includes("tech") || t.includes("desenvolv");
      const isAnalytics = t.includes("analytic") || t.includes("dados") || t.includes("data");
      const isCro = t.includes("cro") || t.includes("convers") || t.includes("ux");

      if (isSeo) return `## Dados SEO:\nQueries: ${topQueries.join("\n")}\nQuick wins: ${quickWins.join("\n")}\nCTR baixo: ${lowCtr.join("\n")}\nURLs: ${topUrls.join("\n")}`;
      if (isContent) return `## Dados Conteúdo:\nURLs: ${topUrls.join("\n")}\nGaps: ${quickWins.slice(0, 6).join("\n")}\nCTR fraco: ${lowCtr.join("\n")}`;
      if (isLinks) return `## Dados Links:\nURLs: ${topUrls.slice(0, 8).join("\n")}\nKWs pos 5-15: ${quickWins.slice(0, 6).join("\n")}`;
      if (isAds) return `## Dados Ads:\n${ga4Context.slice(0, 1200)}\nQueries org: ${topQueries.slice(0, 8).join("\n")}`;
      if (isTech) return `## Dados Técnicos:\nURLs pos>20: ${allSeoRows.filter((r: any) => r.url && r.position > 20).slice(0, 8).map((r: any) => `${r.url}: pos ${r.position?.toFixed(1)}`).join("\n")}\nCTR baixo: ${lowCtr.join("\n")}`;
      if (isAnalytics) return `## Dados Analytics:\n${ga4Context}`;
      if (isCro) return `## Dados CRO:\n${ga4Context.slice(0, 1200)}\nURLs: ${topUrls.slice(0, 8).join("\n")}`;
      return `## Dados Gerais:\nQueries: ${topQueries.slice(0, 8).join("\n")}\nURLs: ${topUrls.slice(0, 5).join("\n")}\nQuick wins: ${quickWins.slice(0, 5).join("\n")}\n${ga4Context.slice(0, 800)}`;
    };

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dueDateStr = nextWeek.toISOString().split("T")[0];

    // Round 1: execute agents top-down
    for (const role of sortedRoles) {
      const startedAt = new Date().toISOString();
      try {
        const superiorId = hierarchyMap[role.id];
        const superiorResult = superiorId ? resultsByRole.get(superiorId) : undefined;
        const superiorRole = superiorId ? rolesArr.find((r) => r.id === superiorId) : undefined;
        const isCeo = getDepth(role.id) === 0;

        const peerContext = rolesArr
          .filter((r) => r.id !== role.id && hierarchyMap[r.id] === (superiorId || ""))
          .map((r) => { const pr = resultsByRole.get(r.id); return pr ? `### ${r.emoji} ${r.title}:\n${pr.slice(0, 500)}` : ""; })
          .filter(Boolean).join("\n");

        const system = `${role.instructions}
Você é ${role.emoji} ${role.title}. Hoje: ${todayStr}.
${buildSpecialistData(role)}
Rotina (${role.routine?.frequency || "diária"}): ${(role.routine?.tasks || []).join("; ")}
Saídas: ${(role.routine?.outputs || []).join(", ")}
${superiorResult && superiorRole ? `## Diretrizes do superior (${superiorRole.emoji} ${superiorRole.title}):\n${superiorResult.slice(0, 800)}` : ""}
${peerContext ? `## Contexto dos colegas:\n${peerContext.slice(0, 1000)}` : ""}
${hasData ? "Cite SEMPRE dados reais do projeto com números exatos." : "Dados ainda não sincronizados. Foque em melhores práticas."}
Prazo máximo das tarefas: ${dueDateStr}

FORMATO (obrigatório):
[Relatório de até 500 palavras]
---TASKS_JSON---
[{"title":"...","description":"...","category":"seo|conteudo|links|ads|tecnico|estrategia|analytics","priority":"urgente|alta|normal|baixa","assigned_role":"${role.title}","assigned_role_emoji":"${role.emoji}","due_date":"${dueDateStr}","success_metric":"...","estimated_impact":"..."}]`;

        const user = isCeo
          ? "Entregue: 1) Diagnóstico executivo com 3 métricas-chave 2) Top 3 prioridades da semana 3) Diretrizes por área 4) 3-5 tarefas estratégicas JSON"
          : `Execute sua análise de ${role.title}. Entregue: 1) Análise com dados reais 2) Top achados 3) 3-5 tarefas específicas JSON`;

        const fullOutput = await callAI(system, user, 2000);
        const [reportText, tasksJsonRaw] = fullOutput.split("---TASKS_JSON---").map((s: string) => s.trim());

        resultsByRole.set(role.id, reportText || fullOutput);

        if (tasksJsonRaw) {
          try {
            const m = tasksJsonRaw.match(/\[[\s\S]*\]/);
            if (m) {
              const tasks: OrchestratorTask[] = JSON.parse(m[0]);
              const valid = tasks.filter((t) => t.title && t.category && t.priority);
              if (valid.length > 0) {
                await supabase.from("orchestrator_tasks").insert(
                  valid.map((t) => ({
                    deployment_id, run_id: runId, project_id, owner_id,
                    title: t.title, description: t.description || "",
                    category: t.category || "geral", priority: t.priority || "normal",
                    assigned_role: t.assigned_role || role.title,
                    assigned_role_emoji: t.assigned_role_emoji || role.emoji,
                    due_date: t.due_date || null, success_metric: t.success_metric || null,
                    estimated_impact: t.estimated_impact || null,
                    status: "pending", metadata: { source: "agent_round1" },
                  }))
                );
              }
            }
          } catch (_e) { console.warn("Failed to parse tasks for role", role.id); }
        }

        agentResults.push({ role_id: role.id, role_title: role.title, emoji: role.emoji, status: "success", result: reportText || fullOutput, started_at: startedAt, completed_at: new Date().toISOString() });
        await supabase.from("orchestrator_runs").update({ agent_results: agentResults }).eq("id", runId);
      } catch (err) {
        agentResults.push({ role_id: role.id, role_title: role.title, emoji: role.emoji, status: "error", result: err instanceof Error ? err.message : "Unknown error", started_at, completed_at: new Date().toISOString() });
      }
    }

    // Round 2: squad refinement (only if ≤3 agents)
    const refinementsByRole = new Map<string, string>();
    if (sortedRoles.length <= 3) {
      const done = new Set<string>();
      for (const role of sortedRoles) {
        const supId = hierarchyMap[role.id] || "";
        const gk = supId || "__root__";
        if (done.has(gk)) continue;
        const peers = sortedRoles.filter((r) => (hierarchyMap[r.id] || "") === supId);
        if (peers.length < 2) { done.add(gk); continue; }
        done.add(gk);
        await Promise.all(peers.map(async (reviewer) => {
          const myReport = resultsByRole.get(reviewer.id);
          if (!myReport) return;
          const others = peers.filter((p) => p.id !== reviewer.id && resultsByRole.get(p.id))
            .map((p) => `### ${p.emoji} ${p.title}:\n${(resultsByRole.get(p.id) || "").slice(0, 500)}`).join("\n---\n");
          if (!others) return;
          try {
            const ref = await callAI(`Você é ${reviewer.emoji} ${reviewer.title}. Proponha 2-3 refinamentos com base nos colegas. Máx 200 palavras.`, `Seu relatório:\n${myReport.slice(0, 500)}\n\nColegas:\n${others.slice(0, 1200)}\n\nRefinamentos:`, 400);
            refinementsByRole.set(reviewer.id, ref);
          } catch (_e) { /* skip */ }
        }));
      }
      for (const result of agentResults) {
        const ref = refinementsByRole.get(result.role_id);
        if (ref) { result.result = `${result.result}\n\n---\n\n💬 **Refinamento:**\n${ref}`; resultsByRole.set(result.role_id, result.result); }
      }
      await supabase.from("orchestrator_runs").update({ agent_results: agentResults }).eq("id", runId);
    }

    // Strategic plan + 5-day daily plan
    const ceoRoleId = sortedRoles.find((r) => getDepth(r.id) === 0)?.id || "";
    const ceoResult = resultsByRole.get(ceoRoleId) || agentResults[0]?.result || "";
    const allReports = agentResults.filter((r) => r.status === "success")
      .map((r) => `### ${r.emoji} ${r.role_title}\n${r.result.slice(0, 1000)}`).join("\n---\n");

    const getNextBizDays = (from: Date, n: number): string[] => {
      const days: string[] = [];
      const d = new Date(from);
      while (days.length < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d.toISOString().split("T")[0]); }
      return days;
    };
    const next5Days = getNextBizDays(today, 5);
    const dayNames: Record<number, string> = { 1: "Segunda-feira", 2: "Terça-feira", 3: "Quarta-feira", 4: "Quinta-feira", 5: "Sexta-feira" };

    const dataCtx = `Top Queries: ${topQueries.slice(0, 10).join(" | ")}\nQuick Wins: ${quickWins.slice(0, 6).join(" | ")}\nCTR Baixo: ${lowCtr.join(" | ")}\nURLs: ${topUrls.slice(0, 6).join(" | ")}\n${ga4Context.slice(0, 600)}`;

    let strategicPlan = null;
    let dailyPlan: DailyPlanDay[] = [];

    const [planRes, dailyRes] = await Promise.allSettled([
      fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: "system", content: `CEO de empresa digital. Gere planejamento estratégico JSON PURO:\n{"week_theme":"...","top_goals":["..."],"daily_focus":{"segunda":"...","terca":"...","quarta":"...","quinta":"...","sexta":"..."},"kpis_to_watch":[{"metric":"...","target":"...","current":"..."}],"risk_alert":"...","quick_wins":["..."]}` },
            { role: "user", content: `${dataCtx}\n\nCEO:\n${ceoResult.slice(0, 1000)}\n\nGere o JSON agora.` }
          ],
          max_tokens: 1200,
        }),
      }),
      fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `Chief of Staff. Gere plano de ações para ${next5Days.map((d, i) => `${d} (${dayNames[new Date(d + "T12:00:00").getDay()] || "Dia " + (i + 1)})`).join(", ")}.
RETORNE APENAS JSON ARRAY válido:
[{"date":"YYYY-MM-DD","day_name":"...","theme":"...","areas_covered":["seo"],"kpi_targets":[{"metric":"...","target":"...","area":"..."}],"actions":[{"time":"09:00","title":"...","description":"1) ... 2) ... 3) ...","area":"seo","priority":"urgente","duration_min":30,"responsible":"...","success_metric":"...","status":"scheduled","tools":["..."]}]}]
REGRAS: Datas exatas ${next5Days.join(", ")}, 4-6 ações/dia, dados reais, horários 09-18h, passo a passo numerado.`
            },
            { role: "user", content: `${dataCtx}\n\nRelatórios:\n${allReports.slice(0, 3000)}\n\nGere o JSON array agora.` }
          ],
          max_tokens: 5000,
        }),
      }),
    ]);

    if (planRes.status === "fulfilled" && (planRes.value as Response).ok) {
      try {
        const pd = await (planRes.value as Response).json();
        const pt = pd.choices?.[0]?.message?.content || "";
        const m = pt.match(/\{[\s\S]*\}/);
        if (m) strategicPlan = JSON.parse(m[0]);
      } catch (_e) { console.warn("Strategic plan parse error"); }
    }

    if (dailyRes.status === "fulfilled" && (dailyRes.value as Response).ok) {
      try {
        const dd = await (dailyRes.value as Response).json();
        const dt = dd.choices?.[0]?.message?.content || "";
        const m = dt.match(/\[[\s\S]*\]/);
        let parsed: any[] | null = null;
        if (m) { try { parsed = JSON.parse(m[0]); } catch (_e) { /* skip */ } }
        if (!parsed) { try { parsed = JSON.parse(dt.trim()); } catch (_e) { /* skip */ } }
        if (Array.isArray(parsed)) {
          dailyPlan = parsed.filter((d: any) => d.date && Array.isArray(d.actions) && d.actions.length > 0);
          if (dailyPlan.length === 0 && parsed.length > 0) {
            dailyPlan = parsed.filter((d: any) => Array.isArray(d.actions) && d.actions.length > 0)
              .slice(0, 5).map((d: any, i: number) => ({ ...d, date: next5Days[i] || d.date, day_name: dayNames[new Date((next5Days[i] || d.date) + "T12:00:00").getDay()] || d.day_name }));
          }
        }
      } catch (_e) { console.warn("Daily plan parse error"); }
    }

    // Insert daily plan tasks
    let dailyTasksCreated = 0;
    if (dailyPlan.length > 0) {
      const catEmoji: Record<string, string> = { seo: "🔍", conteudo: "✍️", links: "🔗", ads: "📣", tecnico: "🔧", analytics: "📊" };
      const dtInsert = dailyPlan.flatMap((day) =>
        (day.actions || []).map((a: any) => ({
          deployment_id, run_id: runId, project_id, owner_id,
          title: a.title, description: a.description || "",
          category: a.area || "geral", priority: a.priority || "normal",
          assigned_role: a.responsible || "Equipe",
          assigned_role_emoji: catEmoji[a.area] || "🎯",
          due_date: day.date, success_metric: a.success_metric || null,
          estimated_impact: null, status: "pending",
          metadata: { source: "daily_plan", day_name: day.day_name, day_theme: day.theme, scheduled_time: a.time || null, duration_min: a.duration_min || null, tools: a.tools || [], area: a.area },
        }))
      );
      if (dtInsert.length > 0) {
        const { error: dtErr } = await supabase.from("orchestrator_tasks").insert(dtInsert);
        if (!dtErr) dailyTasksCreated = dtInsert.length;
      }
    }

    const { count: tasksCreated } = await supabase.from("orchestrator_tasks").select("*", { count: "exact", head: true }).eq("run_id", runId);

    const deliveryStatus = {
      ...(strategicPlan ? { strategic_plan: strategicPlan } : {}),
      ...(dailyPlan.length > 0 ? { daily_plan: dailyPlan } : {}),
      generated_at: new Date().toISOString(),
      tasks_created: tasksCreated || 0,
      daily_tasks_created: dailyTasksCreated,
      squad_refinement_done: refinementsByRole.size > 0,
    };

    await supabase.from("orchestrator_runs").update({
      status: agentResults.some((r) => r.status === "error") ? "partial" : "completed",
      completed_at: new Date().toISOString(),
      agent_results: agentResults,
      summary: ceoResult,
      delivery_status: deliveryStatus,
    }).eq("id", runId);

    // Update deployment
    const { data: depData } = await supabase.from("orchestrator_deployments").select("run_count").eq("id", deployment_id).single();
    await supabase.from("orchestrator_deployments").update({ last_run_at: new Date().toISOString(), run_count: (depData?.run_count || 0) + 1 }).eq("id", deployment_id);

    // Auto-populate Team Hub
    try {
      const hubEntries: any[] = agentResults.filter((r) => r.status === "success").map((ar) => ({
        deployment_id, project_id, owner_id, type: "report",
        title: `${ar.emoji} Relatório: ${ar.role_title}`,
        content: ar.result.slice(0, 3000),
        notify_whatsapp: false, status: "open",
      }));

      if (strategicPlan) {
        const sp = strategicPlan as any;
        hubEntries.push({
          deployment_id, project_id, owner_id, type: "strategic",
          title: `📅 Planejamento Estratégico — ${new Date().toLocaleDateString("pt-BR")}`,
          content: [sp.week_theme ? `🎯 **Tema:** ${sp.week_theme}` : "", sp.top_goals?.length ? `\n**Metas:**\n${sp.top_goals.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}` : "", sp.risk_alert ? `\n⚠️ **Risco:** ${sp.risk_alert}` : "", sp.quick_wins?.length ? `\n⚡ **Quick Wins:**\n${sp.quick_wins.map((w: string) => `• ${w}`).join("\n")}` : ""].filter(Boolean).join("\n"),
          notify_whatsapp: false, status: "open",
        });
      }

      if (dailyPlan.length > 0) {
        const urgent = dailyPlan.flatMap((day: any) =>
          (day.actions || []).filter((a: any) => a.priority === "urgente" || a.priority === "alta").slice(0, 3).map((a: any) => `• [${day.day_name || day.date}] ${a.title}`)
        ).slice(0, 10);
        if (urgent.length > 0) hubEntries.push({ deployment_id, project_id, owner_id, type: "action_plan", title: `⚡ Ações Prioritárias — Próximos 5 dias`, content: urgent.join("\n"), notify_whatsapp: false, status: "open" });
      }

      if (ceoResult) hubEntries.push({ deployment_id, project_id, owner_id, type: "suggestion", title: `💡 Análise Executiva — ${new Date().toLocaleDateString("pt-BR")}`, content: ceoResult.slice(0, 2000), notify_whatsapp: false, status: "open" });

      if (hubEntries.length > 0) await supabase.from("team_hub_entries" as any).insert(hubEntries);
    } catch (_hubErr) { console.warn("Team hub error:", _hubErr); }

    // Notification
    const successCount = agentResults.filter((r) => r.status === "success").length;
    await supabase.from("notifications").insert({ user_id: owner_id, project_id, title: "🏢 Orquestrador Concluído", message: `${successCount}/${agentResults.length} agentes. ${tasksCreated || 0} tarefas (${dailyTasksCreated} do plano diário).`, type: "success", action_url: `/rankito-ai#canvas` });

    // WhatsApp to CEO
    try {
      const { data: dep } = await supabase.from("orchestrator_deployments").select("roles, hierarchy, name").eq("id", deployment_id).single();
      if (dep?.roles) {
        const h = dep.hierarchy as Record<string, string> || {};
        const rootRole = (dep.roles as any[]).find((r: any) => !h[r.id]);
        if (rootRole?.whatsapp && ceoResult) {
          await supabase.functions.invoke("send-workflow-notification", { body: { workflow_name: `🏢 ${dep.name || "Orquestrador"} — Relatório Executivo`, report: ceoResult, recipient_name: rootRole.title || "CEO", direct_send: { phones: [rootRole.whatsapp] } } });
        }
      }
    } catch (_waErr) { console.warn("WhatsApp error:", _waErr); }

    return new Response(JSON.stringify({ success: true, run_id: runId, results_count: agentResults.length, success_count: successCount, tasks_created: tasksCreated || 0, daily_tasks_created: dailyTasksCreated, squad_refinements: refinementsByRole.size, has_strategic_plan: !!strategicPlan, daily_plan_days: dailyPlan.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-orchestrator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
