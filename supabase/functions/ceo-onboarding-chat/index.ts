import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AVAILABLE_ROLES = [
  { id: "ceo", title: "CEO / Diretor", emoji: "👔", department: "Diretoria" },
  { id: "project_manager", title: "Gestor de Projetos", emoji: "📋", department: "Gestão" },
  { id: "seo_manager", title: "Gerente de SEO", emoji: "🎯", department: "SEO" },
  { id: "seo_analyst", title: "Analista de SEO", emoji: "🔍", department: "SEO" },
  { id: "content_strategist", title: "Estrategista de Conteúdo", emoji: "✍️", department: "Conteúdo" },
  { id: "analytics_manager", title: "Gerente de Analytics", emoji: "📊", department: "Analytics" },
  { id: "ads_manager", title: "Gestor de Tráfego Pago", emoji: "💰", department: "Ads" },
  { id: "cs_analyst", title: "Analista de CS", emoji: "🤝", department: "Customer Success" },
  { id: "dev_tech", title: "Desenvolvedor Técnico", emoji: "💻", department: "Tecnologia" },
  { id: "social_media", title: "Social Media Manager", emoji: "📱", department: "Social" },
  { id: "designer", title: "Designer / UX", emoji: "🎨", department: "Design" },
  { id: "link_builder", title: "Especialista em Link Building", emoji: "🔗", department: "SEO" },
];

const SYSTEM_PROMPT = `Você é o CEO virtual de uma agência de marketing digital e SEO. Você está conduzindo um onboarding para montar a equipe de IA ideal para o cliente.

## Seu Papel
- Guiar o usuário com perguntas inteligentes, uma de cada vez
- Dar dicas e insights de mercado baseados nas respostas
- Sugerir estratégias baseadas no nicho/contexto do usuário
- Ser consultivo: se o usuário não sabe algo, AJUDE com exemplos práticos do mercado
- Ser conciso mas valioso (máx 3 parágrafos por resposta)

## Regras
- SEMPRE responda em português brasileiro
- Use emojis moderadamente para tornar a conversa amigável
- Quando o usuário der respostas vagas ou curtas, ELABORE com exemplos e sugestões do mercado
- Nunca pergunte mais de uma coisa por vez
- Seja proativo: dê insights de mercado relevantes ao nicho do usuário

## Fluxo do Onboarding (siga esta ordem)
1. **Missão**: Pergunte sobre o objetivo principal do projeto. Se vago, dê exemplos específicos do setor.
2. **Metas**: Pergunte sobre 2-3 metas mensuráveis. Sugira KPIs relevantes para o nicho.
3. **Nicho**: Identifique o segmento. Dê insights sobre tendências do setor.
4. **Horas**: Pergunte dedicação semanal. Sugira o ideal para o nicho.
5. **Sugestão de Equipe**: Quando tiver informações suficientes, use a tool suggest_team para recomendar a equipe ideal, explicando POR QUE cada membro é importante para o contexto do cliente.

## Profissionais Disponíveis
${AVAILABLE_ROLES.map(r => `- ${r.emoji} ${r.title} (${r.department})`).join("\n")}

## Importante
- Se o usuário mencionar e-commerce, destaque a importância do Gestor de Tráfego Pago e Analytics
- Se mencionar blog/conteúdo, destaque Estrategista de Conteúdo e Link Building
- Se mencionar serviços locais, destaque SEO técnico e Google Business Profile
- Se mencionar SaaS, destaque Analytics, CRO (Designer) e Ads
- Se for agência, destaque CS e PM para gestão de múltiplos clientes
- SEMPRE inclua CEO e Gestor de Projetos como base mínima`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();

    // Fetch OpenAI key from admin api_configurations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: apiKeyRow, error: keyError } = await supabase
      .from("api_configurations_decrypted")
      .select("secret_value")
      .eq("secret_key_name", "OPEN_AI_API_KEY")
      .eq("status", "active")
      .maybeSingle();

    if (keyError || !apiKeyRow?.secret_value) {
      return new Response(JSON.stringify({ 
        error: "Chave da OpenAI não configurada. Vá em Admin > APIs & Chaves para configurar." 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openAiKey = apiKeyRow.secret_value;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_team",
              description: "Sugere a equipe ideal de profissionais de IA baseado no perfil do projeto. Chame esta função quando tiver coletado informações suficientes (missão, metas, nicho e horas).",
              parameters: {
                type: "object",
                properties: {
                  team_ids: {
                    type: "array",
                    items: { type: "string", enum: AVAILABLE_ROLES.map(r => r.id) },
                    description: "IDs dos profissionais recomendados para a equipe"
                  },
                  explanation: {
                    type: "string",
                    description: "Explicação em português de por que cada membro foi escolhido, com insights de mercado"
                  },
                  team_name: {
                    type: "string",
                    description: "Nome sugerido para a equipe baseado na missão do projeto"
                  }
                },
                required: ["team_ids", "explanation", "team_name"],
                additionalProperties: false,
              }
            }
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit da OpenAI excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Chave da OpenAI inválida. Verifique em Admin > APIs & Chaves." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Sem créditos na OpenAI. Verifique sua conta OpenAI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro na API da OpenAI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ceo-onboarding-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
