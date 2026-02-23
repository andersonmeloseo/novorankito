import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationTarget {
  user_id: string;
  display_name: string;
  whatsapp_phone: string;
  plan: string;
  expires_at: string | null;
  notification_type: string;
}

const MESSAGES: Record<string, (name: string, plan: string, days?: number) => string> = {
  welcome: (name, plan) =>
    `🎉 Olá, ${name}! Seja muito bem-vindo(a) ao *Rankito*!\n\nSua conta foi criada com sucesso no plano *${plan}*. Estamos animados em ter você aqui!\n\n📊 Acesse sua dashboard e comece a monitorar seu SEO agora mesmo.\n\n💬 Qualquer dúvida, é só chamar por aqui!\n\n— Equipe Rankito 🚀`,

  expiring_7d: (name, plan) =>
    `⏰ Oi, ${name}! Passando para avisar que seu plano *${plan}* no Rankito vence em *7 dias*.\n\nRenove para não perder acesso aos seus dados e relatórios.\n\n💳 Acesse sua conta para renovar: rankito.com\n\n— Equipe Rankito`,

  expiring_3d: (name, plan) =>
    `⚠️ ${name}, seu plano *${plan}* vence em *3 dias*!\n\nNão deixe para a última hora — renove agora e mantenha seu monitoramento ativo.\n\n💳 Renovar: rankito.com\n\n— Equipe Rankito`,

  expiring_1d: (name, plan) =>
    `🚨 ${name}, *último dia* do seu plano *${plan}*!\n\nAmanhã seu acesso será suspenso. Renove agora para não perder nenhum dado.\n\n💳 Renovar: rankito.com\n\n— Equipe Rankito`,

  expired: (name, plan) =>
    `🚫 ${name}, seu plano *${plan}* no Rankito *expirou*.\n\nSeu acesso foi limitado. Renove para voltar a ter acesso completo aos seus projetos e relatórios.\n\n💳 Renovar: rankito.com\n\nSentimos sua falta! — Equipe Rankito`,

  payment_reminder: (name, plan) =>
    `💰 Oi, ${name}! Lembrete de que a cobrança do seu plano *${plan}* está próxima.\n\nVerifique se seus dados de pagamento estão atualizados para evitar interrupções.\n\n💳 Gerenciar pagamento: rankito.com\n\n— Equipe Rankito`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY");
    const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");

    if (!WHATSAPP_API_KEY || !WHATSAPP_API_URL) {
      return new Response(JSON.stringify({ error: "WhatsApp API not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const { mode, user_id, notification_type } = body;

    // Mode: "manual" = send specific type to specific user
    // Mode: "cron" or default = scan all subscriptions and send appropriate notifications
    const targets: NotificationTarget[] = [];

    if (mode === "manual" && user_id && notification_type) {
      // Manual send from admin
      const { data: profile } = await sb
        .from("profiles")
        .select("user_id, display_name, whatsapp_phone")
        .eq("user_id", user_id)
        .single();

      if (!profile?.whatsapp_phone) {
        return new Response(JSON.stringify({ error: "User has no WhatsApp number" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: sub } = await sb
        .from("billing_subscriptions")
        .select("plan, expires_at")
        .eq("user_id", user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      targets.push({
        user_id: profile.user_id,
        display_name: profile.display_name || "Cliente",
        whatsapp_phone: profile.whatsapp_phone,
        plan: sub?.plan || "start",
        expires_at: sub?.expires_at || null,
        notification_type,
      });
    } else {
      // Cron mode: scan all users with whatsapp + active subscriptions
      const { data: profiles } = await sb
        .from("profiles")
        .select("user_id, display_name, whatsapp_phone")
        .not("whatsapp_phone", "is", null)
        .neq("whatsapp_phone", "");

      if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No users with WhatsApp", sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: subs } = await sb
        .from("billing_subscriptions")
        .select("user_id, plan, expires_at, status, created_at")
        .in("user_id", profiles.map(p => p.user_id));

      const now = new Date();
      const today = now.toISOString().split("T")[0];

      for (const profile of profiles) {
        const sub = subs?.find(s => s.user_id === profile.user_id && s.status === "active");
        if (!sub) continue;

        const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
        if (!expiresAt) continue;

        const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const typesToSend: string[] = [];
        if (diffDays === 7) typesToSend.push("expiring_7d");
        if (diffDays === 3) typesToSend.push("expiring_3d");
        if (diffDays === 1) typesToSend.push("expiring_1d");
        if (diffDays === 0 || diffDays === -1) typesToSend.push("expired");
        // Payment reminder 5 days before expiry
        if (diffDays === 5) typesToSend.push("payment_reminder");

        for (const type of typesToSend) {
          // Check if already sent today for this type
          const { data: existing } = await sb
            .from("billing_notifications")
            .select("id")
            .eq("user_id", profile.user_id)
            .eq("notification_type", type)
            .gte("created_at", today)
            .limit(1);

          if (existing && existing.length > 0) continue;

          targets.push({
            user_id: profile.user_id,
            display_name: profile.display_name || "Cliente",
            whatsapp_phone: profile.whatsapp_phone,
            plan: sub.plan,
            expires_at: sub.expires_at,
            notification_type: type,
          });
        }
      }

      // Also check for welcome messages (users created in the last hour without a welcome notification)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const { data: newUsers } = await sb
        .from("profiles")
        .select("user_id, display_name, whatsapp_phone, created_at")
        .not("whatsapp_phone", "is", null)
        .neq("whatsapp_phone", "")
        .gte("created_at", oneHourAgo);

      if (newUsers) {
        for (const nu of newUsers) {
          const { data: existing } = await sb
            .from("billing_notifications")
            .select("id")
            .eq("user_id", nu.user_id)
            .eq("notification_type", "welcome")
            .limit(1);

          if (existing && existing.length > 0) continue;

          const sub = subs?.find(s => s.user_id === nu.user_id);
          targets.push({
            user_id: nu.user_id,
            display_name: nu.display_name || "Cliente",
            whatsapp_phone: nu.whatsapp_phone,
            plan: sub?.plan || "start",
            expires_at: sub?.expires_at || null,
            notification_type: "welcome",
          });
        }
      }
    }

    // Send WhatsApp messages
    const results: Array<{ user_id: string; type: string; status: string; error?: string }> = [];
    const baseUrl = WHATSAPP_API_URL.replace(/\/+$/, "");

    for (const target of targets) {
      const messageFn = MESSAGES[target.notification_type];
      if (!messageFn) continue;

      const firstName = target.display_name.split(" ")[0];
      const message = messageFn(firstName, target.plan);
      const cleanPhone = target.whatsapp_phone.replace(/\D/g, "");

      try {
        const res = await fetch(`${baseUrl}/message/sendText/rankito`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: WHATSAPP_API_KEY },
          body: JSON.stringify({ number: cleanPhone, text: message }),
        });

        const resText = await res.text();
        console.log(`[Billing WA] ${target.notification_type} to ${cleanPhone}: ${res.status}`);

        if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${resText.substring(0, 200)}`);

        // Log success
        await sb.from("billing_notifications").insert({
          user_id: target.user_id,
          notification_type: target.notification_type,
          channel: "whatsapp",
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: { plan: target.plan, phone: cleanPhone },
        });

        // Also create in-app notification
        await sb.from("notifications").insert({
          user_id: target.user_id,
          title: getNotificationTitle(target.notification_type),
          message: getNotificationMessage(target.notification_type, target.plan),
          type: getNotificationType(target.notification_type),
          action_url: target.notification_type === "welcome" ? "/onboarding" : "/account/billing",
        });

        results.push({ user_id: target.user_id, type: target.notification_type, status: "sent" });
      } catch (err: any) {
        console.error(`[Billing WA] Error ${target.notification_type} to ${cleanPhone}:`, err.message);

        await sb.from("billing_notifications").insert({
          user_id: target.user_id,
          notification_type: target.notification_type,
          channel: "whatsapp",
          status: "failed",
          error_message: err.message,
          metadata: { plan: target.plan, phone: cleanPhone },
        });

        results.push({ user_id: target.user_id, type: target.notification_type, status: "failed", error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, sent: results.filter(r => r.status === "sent").length, failed: results.filter(r => r.status === "failed").length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("billing-lifecycle-notifications error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    welcome: "🎉 Bem-vindo ao Rankito!",
    expiring_7d: "⏰ Plano vence em 7 dias",
    expiring_3d: "⚠️ Plano vence em 3 dias",
    expiring_1d: "🚨 Plano vence amanhã",
    expired: "🚫 Plano expirado",
    payment_reminder: "💰 Lembrete de cobrança",
  };
  return titles[type] || "Notificação";
}

function getNotificationMessage(type: string, plan: string): string {
  const messages: Record<string, string> = {
    welcome: `Sua conta no plano ${plan} está pronta! Comece a monitorar seu SEO.`,
    expiring_7d: `Seu plano ${plan} vence em 7 dias. Renove para manter o acesso.`,
    expiring_3d: `Seu plano ${plan} vence em 3 dias. Renove agora!`,
    expiring_1d: `Último dia do seu plano ${plan}! Renove para não perder acesso.`,
    expired: `Seu plano ${plan} expirou. Renove para voltar a ter acesso completo.`,
    payment_reminder: `A cobrança do plano ${plan} está próxima. Verifique seus dados de pagamento.`,
  };
  return messages[type] || "";
}

function getNotificationType(type: string): string {
  if (type === "welcome") return "success";
  if (type.includes("expir")) return "warning";
  if (type === "expired") return "error";
  return "info";
}
