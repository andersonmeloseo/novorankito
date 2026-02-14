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
    const body = await req.json();
    const { schedule_id, report, workflow_name, direct_send } = body;

    if (!report) {
      return new Response(JSON.stringify({ error: "report is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct send mode: no schedule needed, just recipients inline
    let schedule: any = null;
    if (direct_send) {
      // Build a virtual schedule from direct_send params
      schedule = {
        id: null,
        project_id: direct_send.project_id || null,
        workflow_id: direct_send.workflow_id || "direct",
        notify_email: !!(direct_send.emails && direct_send.emails.length > 0),
        notify_whatsapp: !!(direct_send.phones && direct_send.phones.length > 0),
        email_recipients: direct_send.emails || [],
        whatsapp_recipients: direct_send.phones || [],
        send_summary: true,
        send_pdf: false,
      };
    } else {
      if (!schedule_id) {
        return new Response(JSON.stringify({ error: "schedule_id or direct_send is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Fetch schedule config
      const { data: schedData, error: schedErr } = await sb
        .from("workflow_schedules")
        .select("*")
        .eq("id", schedule_id)
        .single();

      if (schedErr || !schedData) {
        return new Response(JSON.stringify({ error: "Schedule not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      schedule = schedData;
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
      // Convert markdown to WhatsApp-friendly plain text
      function mdToWhatsApp(text: string): string {
        return text
          // Convert markdown headers to WhatsApp bold
          .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
          // Convert markdown bold **text** to WhatsApp bold *text*
          .replace(/\*\*(.+?)\*\*/g, "*$1*")
          // Convert markdown italic _text_ (keep as is, WhatsApp uses same)
          // Convert markdown tables to aligned text
          .replace(/\|([^\n]+)\|/g, (match) => {
            const cells = match.split("|").filter(c => c.trim());
            return cells.map(c => c.trim()).join("  |  ");
          })
          // Remove table separator lines (---|---|---)
          .replace(/^[\s|:-]+$/gm, "")
          // Remove markdown links [text](url) -> text (url)
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
          // Remove markdown images
          .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
          // Convert markdown lists
          .replace(/^[\s]*[-*]\s+/gm, "• ")
          // Remove code blocks ```
          .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").trim())
          // Remove inline code backticks
          .replace(/`([^`]+)`/g, "$1")
          // Remove horizontal rules
          .replace(/^---+$/gm, "────────────")
          // Clean up excessive blank lines
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }

      const plainReport = mdToWhatsApp(report);
      const fullWhatsappMessage = schedule.send_summary
        ? `📊 *${workflow_name}*\n📅 ${new Date().toLocaleDateString("pt-BR")}\n\n${plainReport}`
        : `📊 *${workflow_name}* — Relatório disponível.`;

      // Split into chunks of ~4000 chars to avoid WhatsApp limits
      const MAX_CHUNK = 4000;
      const chunks: string[] = [];
      if (fullWhatsappMessage.length <= MAX_CHUNK) {
        chunks.push(fullWhatsappMessage);
      } else {
        // Split by double newlines (paragraph boundaries) to keep readability
        const paragraphs = fullWhatsappMessage.split(/\n{2,}/);
        let current = "";
        for (const para of paragraphs) {
          if (current.length + para.length + 2 > MAX_CHUNK && current.length > 0) {
            chunks.push(current.trim());
            current = para;
          } else {
            current += (current ? "\n\n" : "") + para;
          }
        }
        if (current.trim()) chunks.push(current.trim());
      }

      for (const phone of (schedule.whatsapp_recipients || [])) {
        try {
          const cleanPhone = phone.replace(/\D/g, "");
          const baseUrl = WHATSAPP_API_URL.replace(/\/+$/, "");
          
          console.log(`[WhatsApp] Sending ${chunks.length} chunk(s) to ${cleanPhone}`);
          
          for (let ci = 0; ci < chunks.length; ci++) {
            const chunkText = chunks.length > 1
              ? `${ci === 0 ? "" : `(${ci + 1}/${chunks.length})\n\n`}${chunks[ci]}`
              : chunks[ci];
            
            const res = await fetch(`${baseUrl}/message/sendText/rankito`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: WHATSAPP_API_KEY,
              },
              body: JSON.stringify({ number: cleanPhone, text: chunkText }),
            });

            const resText = await res.text();
            console.log(`[WhatsApp] Chunk ${ci + 1}/${chunks.length} - Response ${res.status}: ${resText.substring(0, 200)}`);

            if (!res.ok) {
              throw new Error(`WhatsApp API error ${res.status}: ${resText}`);
            }
            
            // Small delay between chunks to maintain order
            if (ci < chunks.length - 1) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }

          results.push({ channel: "whatsapp", recipient: phone, status: "sent" });
        } catch (err: any) {
          console.error(`WhatsApp error for ${phone}:`, err.message);
          results.push({ channel: "whatsapp", recipient: phone, status: "failed", error: err.message });
        }
      }
    }

    // Save delivery records (only if we have a real schedule)
    if (results.length > 0 && schedule.id) {
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

      // Update schedule tracking
      await sb
        .from("workflow_schedules")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: results.every((r) => r.status === "sent") ? "success" : "partial",
        })
        .eq("id", schedule.id);
    }

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
