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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY");
    const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { schedule_id, report, workflow_name } = await req.json();

    if (!schedule_id || !report) {
      return new Response(JSON.stringify({ error: "schedule_id and report are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch schedule config
    const { data: schedule, error: schedErr } = await sb
      .from("workflow_schedules")
      .select("*")
      .eq("id", schedule_id)
      .single();

    if (schedErr || !schedule) {
      return new Response(JSON.stringify({ error: "Schedule not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate summary (first 500 chars of the report)
    const summary = report.length > 500
      ? report.substring(0, 500) + "..."
      : report;

    const results: Array<{ channel: string; recipient: string; status: string; error?: string }> = [];

    // Send email notifications
    if (schedule.notify_email && RESEND_API_KEY) {
      for (const email of (schedule.email_recipients || [])) {
        try {
          const emailBody = schedule.send_summary
            ? `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 18px;">📊 ${workflow_name}</h1>
                  <p style="margin: 8px 0 0; opacity: 0.7; font-size: 12px;">Relatório automático — ${new Date().toLocaleDateString("pt-BR")}</p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${report.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                <p style="text-align: center; color: #888; font-size: 11px; margin-top: 20px;">Enviado automaticamente pelo Rankito</p>
              </div>`
            : `<p>Relatório em anexo.</p>`;

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Rankito <noreply@resend.dev>",
              to: [email],
              subject: `📊 ${workflow_name} — Relatório ${new Date().toLocaleDateString("pt-BR")}`,
              html: emailBody,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Resend error ${res.status}: ${errText}`);
          }

          results.push({ channel: "email", recipient: email, status: "sent" });
        } catch (err: any) {
          console.error(`Email error for ${email}:`, err.message);
          results.push({ channel: "email", recipient: email, status: "failed", error: err.message });
        }
      }
    }

    // Send WhatsApp notifications
    if (schedule.notify_whatsapp && WHATSAPP_API_KEY && WHATSAPP_API_URL) {
      const whatsappMessage = schedule.send_summary
        ? `📊 *${workflow_name}*\n📅 ${new Date().toLocaleDateString("pt-BR")}\n\n${summary}`
        : `📊 *${workflow_name}* — Relatório disponível.`;

      for (const phone of (schedule.whatsapp_recipients || [])) {
        try {
          const cleanPhone = phone.replace(/\D/g, "");
          // Evolution API v2 format: /message/sendText/{instanceName}
          const baseUrl = WHATSAPP_API_URL.replace(/\/+$/, "");
          const body = {
            number: cleanPhone,
            text: whatsappMessage,
          };
          console.log(`[WhatsApp] Sending to ${cleanPhone} via ${baseUrl}/message/sendText/rankito`);
          const res = await fetch(`${baseUrl}/message/sendText/rankito`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: WHATSAPP_API_KEY,
            },
            body: JSON.stringify(body),
          });

          const resText = await res.text();
          console.log(`[WhatsApp] Response ${res.status}: ${resText}`);

          if (!res.ok) {
            throw new Error(`WhatsApp API error ${res.status}: ${resText}`);
          }

          results.push({ channel: "whatsapp", recipient: phone, status: "sent" });
        } catch (err: any) {
          console.error(`WhatsApp error for ${phone}:`, err.message);
          results.push({ channel: "whatsapp", recipient: phone, status: "failed", error: err.message });
        }
      }
    }

    // Save delivery records
    if (results.length > 0) {
      const deliveries = results.map((r) => ({
        schedule_id: schedule.id,
        project_id: schedule.project_id,
        workflow_id: schedule.workflow_id,
        channel: r.channel,
        recipient: r.recipient,
        status: r.status,
        error_message: r.error || null,
        report_summary: summary,
        full_report: report,
        delivered_at: r.status === "sent" ? new Date().toISOString() : null,
      }));

      await sb.from("workflow_deliveries").insert(deliveries);
    }

    // Update schedule tracking
    await sb
      .from("workflow_schedules")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: results.every((r) => r.status === "sent") ? "success" : "partial",
      })
      .eq("id", schedule.id);

    console.log(`Notification sent for workflow ${workflow_name}:`, results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-workflow-notification error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
