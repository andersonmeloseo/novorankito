import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const todayStr = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().getDay(); // 0=Sunday, 5=Friday
    const isFriday = dayOfWeek === 5;

    console.log(`[task-monitor] Running on ${todayStr}, isFriday=${isFriday}`);

    // ── 1. Find overdue tasks (due_date < today, not done) ──
    const { data: overdueTasks } = await sb
      .from("orchestrator_tasks")
      .select("id, title, due_date, priority, assigned_role, assigned_role_emoji, deployment_id, owner_id, project_id")
      .lt("due_date", todayStr)
      .neq("status", "done")
      .not("deployment_id", "is", null);

    console.log(`[task-monitor] Found ${overdueTasks?.length || 0} overdue tasks`);

    // Group overdue tasks by deployment
    const byDeployment: Record<string, typeof overdueTasks> = {};
    for (const task of (overdueTasks || [])) {
      if (!byDeployment[task.deployment_id]) byDeployment[task.deployment_id] = [];
      byDeployment[task.deployment_id]!.push(task);
    }

    const alertsSent: string[] = [];

    // For each deployment with overdue tasks, notify the CEO
    for (const [deploymentId, tasks] of Object.entries(byDeployment)) {
      try {
        const { data: dep } = await sb
          .from("orchestrator_deployments")
          .select("roles, hierarchy, name, owner_id")
          .eq("id", deploymentId)
          .single();

        if (!dep?.roles) continue;

        const hierarchy = (dep.hierarchy as Record<string, string>) || {};
        const rootRole = (dep.roles as any[]).find((r: any) => !hierarchy[r.id]);

        if (!rootRole?.whatsapp) continue; // No WhatsApp configured

        const ownerId = dep.owner_id;

        // Build alert message
        const taskLines = tasks!.map((t: any) => {
          const daysLate = Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24));
          return `• ${t.assigned_role_emoji || "📋"} *${t.title}*\n  ⏰ Atrasada ${daysLate} dia${daysLate > 1 ? "s" : ""} (era para ${new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")})`;
        }).join("\n\n");

        const alertMessage = `🚨 *Alerta do Gestor de Projetos — ${dep.name || "Equipe"}*

Olá! Identificamos tarefas pendentes que ultrapassaram o prazo e precisam da sua atenção imediata.

*${tasks!.length} tarefa${tasks!.length > 1 ? "s" : ""} atrasada${tasks!.length > 1 ? "s" : ""}:*

${taskLines}

💡 Acesse o painel de tarefas para atualizar o status ou redistribuir as responsabilidades.

— Gestor de Projetos 📊`;

        await sb.functions.invoke("send-workflow-notification", {
          body: {
            workflow_name: `⚠️ Alerta de Atraso — ${dep.name || "Equipe"}`,
            report: alertMessage,
            recipient_name: rootRole.title || "CEO",
            direct_send: {
              phones: [rootRole.whatsapp],
            },
          },
        });

        // Create in-app notification
        await sb.from("notifications").insert({
          user_id: ownerId,
          title: `⚠️ ${tasks!.length} tarefa${tasks!.length > 1 ? "s" : ""} atrasada${tasks!.length > 1 ? "s" : ""} — ${dep.name}`,
          message: tasks!.map((t: any) => t.title).join(", "),
          type: "warning",
          action_url: `/rankito-ai#orchestrator`,
        });

        alertsSent.push(deploymentId);
        console.log(`[task-monitor] Alert sent for deployment ${deploymentId}, ${tasks!.length} overdue tasks`);
      } catch (err) {
        console.warn(`[task-monitor] Error processing deployment ${deploymentId}:`, err);
      }
    }

    // ── 2. Friday: Generate weekly closure report ──
    let weeklyReports: string[] = [];

    if (isFriday) {
      console.log(`[task-monitor] Friday: generating weekly closure reports`);

      // Get all active deployments
      const { data: allDeployments } = await sb
        .from("orchestrator_deployments")
        .select("id, name, roles, hierarchy, owner_id, project_id")
        .eq("status", "active");

      for (const dep of (allDeployments || [])) {
        try {
          const hierarchy = (dep.hierarchy as Record<string, string>) || {};
          const rootRole = (dep.roles as any[]).find((r: any) => !hierarchy[r.id]);

          if (!rootRole?.whatsapp) continue;

          // Get tasks from this week
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
          const weekStartStr = weekStart.toISOString().split("T")[0];

          const { data: weekTasks } = await sb
            .from("orchestrator_tasks")
            .select("title, status, priority, assigned_role, assigned_role_emoji, due_date, completed_at")
            .eq("deployment_id", dep.id)
            .gte("created_at", weekStartStr + "T00:00:00Z");

          if (!weekTasks || weekTasks.length === 0) continue;

          const done = weekTasks.filter((t: any) => t.status === "done");
          const inProgress = weekTasks.filter((t: any) => t.status === "in_progress");
          const pending = weekTasks.filter((t: any) => t.status === "pending");
          const overdue = weekTasks.filter((t: any) => 
            t.status !== "done" && t.due_date && t.due_date < todayStr
          );

          const completionRate = Math.round((done.length / weekTasks.length) * 100);

          // AI-generated weekly summary
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          let aiSummary = "";

          if (LOVABLE_API_KEY && weekTasks.length > 0) {
            try {
              const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "system",
                      content: `Você é o Gestor de Projetos de uma agência digital. Gere um relatório executivo de fechamento de semana em português brasileiro. Seja direto, objetivo e profissional. Máximo 300 palavras. Use emojis moderadamente.`,
                    },
                    {
                      role: "user",
                      content: `Gere o relatório de fechamento de semana para a equipe "${dep.name}".

Taxa de conclusão: ${completionRate}%
Tarefas concluídas (${done.length}): ${done.map((t: any) => t.title).join(", ") || "nenhuma"}
Em progresso (${inProgress.length}): ${inProgress.map((t: any) => t.title).join(", ") || "nenhuma"}
Pendentes (${pending.length}): ${pending.map((t: any) => t.title).join(", ") || "nenhuma"}
Atrasadas (${overdue.length}): ${overdue.map((t: any) => t.title).join(", ") || "nenhuma"}

Gere: 1) Resumo dos resultados 2) Destaques positivos 3) Pontos de atenção para a próxima semana`,
                    },
                  ],
                  max_tokens: 800,
                }),
              });
              const aiData = await aiRes.json();
              aiSummary = aiData.choices?.[0]?.message?.content || "";
            } catch (aiErr) {
              console.warn(`[task-monitor] AI error for weekly report:`, aiErr);
            }
          }

          const weeklyReport = `📊 *Relatório de Fechamento de Semana — ${dep.name}*
📅 ${new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

━━━━━━━━━━━━━━━━━━━━
📈 *RESULTADO DA SEMANA*
━━━━━━━━━━━━━━━━━━━━
✅ Concluídas: ${done.length}/${weekTasks.length} (${completionRate}%)
⚡ Em progresso: ${inProgress.length}
📋 Pendentes: ${pending.length}
🚨 Atrasadas: ${overdue.length}

${aiSummary ? `━━━━━━━━━━━━━━━━━━━━\n📝 *ANÁLISE DO GESTOR*\n━━━━━━━━━━━━━━━━━━━━\n${aiSummary}` : ""}

— Gestor de Projetos | Rankito 🚀`;

          await sb.functions.invoke("send-workflow-notification", {
            body: {
              workflow_name: `📊 Fechamento de Semana — ${dep.name}`,
              report: weeklyReport,
              recipient_name: rootRole.title || "CEO",
              direct_send: {
                phones: [rootRole.whatsapp],
              },
            },
          });

          // Save weekly report as a notification
          await sb.from("notifications").insert({
            user_id: dep.owner_id,
            title: `📊 Relatório de Fechamento — ${dep.name} (${completionRate}% concluído)`,
            message: `${done.length} tarefas concluídas, ${overdue.length} atrasadas esta semana.`,
            type: "info",
            action_url: `/rankito-ai#orchestrator`,
          });

          weeklyReports.push(dep.id);
          console.log(`[task-monitor] Weekly report sent for deployment ${dep.id}`);
        } catch (err) {
          console.warn(`[task-monitor] Error generating weekly report for deployment ${dep.id}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      overdue_alerts_sent: alertsSent.length,
      weekly_reports_sent: weeklyReports.length,
      is_friday: isFriday,
      date: todayStr,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[task-monitor] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
