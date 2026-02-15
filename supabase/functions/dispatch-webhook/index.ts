import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, jsonResponse, errorResponse } from "../_shared/utils.ts";
import { createLogger } from "../_shared/logger.ts";

/**
 * Webhook Dispatcher - fires webhooks for project events.
 * Called internally by other functions when events occur.
 * 
 * Body: { project_id, event_type, payload }
 */
serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const log = createLogger("dispatch-webhook", req);

  try {
    const { project_id, event_type, payload } = await req.json();
    if (!project_id || !event_type) {
      return errorResponse("Missing project_id or event_type", cors, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find active webhooks for this project + event
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("project_id", project_id)
      .eq("is_active", true);

    if (error) throw new Error(error.message);

    const matchingWebhooks = (webhooks || []).filter(
      (w: any) => w.events.includes("*") || w.events.includes(event_type)
    );

    if (matchingWebhooks.length === 0) {
      return jsonResponse({ delivered: 0, message: "No matching webhooks" }, cors);
    }

    log.info(`Dispatching ${matchingWebhooks.length} webhooks for ${event_type}`);

    const results = [];

    for (const webhook of matchingWebhooks) {
      const body = JSON.stringify({
        event: event_type,
        project_id,
        timestamp: new Date().toISOString(),
        data: payload || {},
      });

      // HMAC signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhook.secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      let responseStatus = 0;
      let responseBody = "";

      try {
        const res = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": `sha256=${signature}`,
            "X-Webhook-Event": event_type,
          },
          body,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        responseStatus = res.status;
        responseBody = await res.text().catch(() => "");

        if (res.ok) {
          await supabase.from("webhooks").update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
          }).eq("id", webhook.id);
        } else {
          const newFailCount = (webhook.failure_count || 0) + 1;
          await supabase.from("webhooks").update({
            failure_count: newFailCount,
            is_active: newFailCount < 10, // Disable after 10 consecutive failures
          }).eq("id", webhook.id);
        }
      } catch (err: unknown) {
        responseBody = err instanceof Error ? err.message : "Delivery failed";
        const newFailCount = (webhook.failure_count || 0) + 1;
        await supabase.from("webhooks").update({
          failure_count: newFailCount,
          is_active: newFailCount < 10,
        }).eq("id", webhook.id);
      }

      // Log delivery
      await supabase.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        project_id,
        event_type,
        payload: payload || {},
        response_status: responseStatus || null,
        response_body: responseBody.substring(0, 2000),
        delivered_at: responseStatus >= 200 && responseStatus < 300 ? new Date().toISOString() : null,
      });

      results.push({
        webhook_id: webhook.id,
        status: responseStatus,
        success: responseStatus >= 200 && responseStatus < 300,
      });
    }

    return jsonResponse({ delivered: results.length, results }, cors);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("Webhook dispatch error", { error: msg });
    return errorResponse(msg, cors, 500);
  }
});
