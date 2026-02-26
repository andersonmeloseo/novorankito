import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Try to repair truncated JSON array */
function tryParseJson(raw: string): any[] {
  let str = raw.trim();
  if (str.startsWith("```")) {
    str = str.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  str = str.trim();

  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch { /* continue */ }

  if (str.startsWith("[")) {
    let lastClose = str.lastIndexOf("}");
    while (lastClose > 0) {
      const attempt = str.substring(0, lastClose + 1) + "]";
      try {
        const parsed = JSON.parse(attempt);
        if (Array.isArray(parsed)) {
          console.log(`Repaired truncated JSON: recovered ${parsed.length} entities`);
          return parsed;
        }
      } catch { /* try earlier */ }
      lastClose = str.lastIndexOf("}", lastClose - 1);
    }
  }

  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entities, relations } = await req.json();

    if (!entities?.length) {
      return new Response(JSON.stringify({ filled: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada.");
    }

    // Process entities in batches of 3 to avoid token limits
    const BATCH_SIZE = 3;
    const allFilled: any[] = [];

    for (let i = 0; i < entities.length; i += BATCH_SIZE) {
      const batch = entities.slice(i, i + BATCH_SIZE);

      const entityDescriptions = batch.map((e: any) => {
        const propsToFill = (e.properties || [])
          .filter((p: any) => {
            const val = e.current_values?.[p.name];
            return !val || !String(val).trim();
          })
          .map((p: any) => `  - ${p.name} (${p.required ? "OBRIGATÓRIO" : "opcional"}): ${p.description}. Exemplo: "${p.example}"`)
          .join("\n");

        return `Entidade "${e.name}" [id=${e.id}]
Tipo Schema.org: ${e.schema_type || "Thing"}
Tipo no Grafo: ${e.entity_type}
Descrição: ${e.description || "Sem descrição"}
Valores já preenchidos: ${JSON.stringify(e.current_values || {})}
Propriedades a preencher:
${propsToFill || "  (nenhuma)"}`;
      }).join("\n\n===\n\n");

      const relDescriptions = (relations || [])
        .filter((r: any) => batch.some((e: any) => 
          r.subject === e.name || r.object === e.name
        ))
        .map((r: any) => `"${r.subject}" → ${r.predicate} → "${r.object}"`)
        .join("\n");

      const systemPrompt = `Você é um especialista sênior em Schema.org e SEO Técnico com profundo conhecimento em dados estruturados.

MISSÃO: Preencher TODAS as propriedades Schema.org das entidades de forma COMPLETA, REALISTA e PROFISSIONAL.

REGRAS CRÍTICAS:
1. Retorne APENAS um JSON array puro: [{"id":"entity_id","properties":{"prop":"valor"}}]
2. SEM markdown, SEM code fences, SEM explicações — APENAS o JSON array
3. Preencha TODAS as propriedades listadas — obrigatórias E opcionais
4. Use valores REALISTAS em português brasileiro que façam sentido para o contexto do negócio
5. NÃO repita propriedades já preenchidas
6. Respeite os relacionamentos entre entidades ao preencher valores

PADRÕES DE QUALIDADE Schema.org:
- "@type": Use EXATAMENTE o tipo Schema.org correto (ex: "Organization", "LocalBusiness")
- "name": Nome completo e profissional
- "url": URLs realistas com https:// (ex: "https://www.nomedaempresa.com.br")
- "telephone": Formato brasileiro "+55 11 99999-9999"
- "address": Endereço completo com rua, número, bairro, cidade, estado e CEP
- "openingHoursSpecification": Formato "Seg-Sex 08:00-18:00, Sáb 09:00-13:00"
- "image": URL plausível como "https://www.nomedaempresa.com.br/images/foto.jpg"
- "logo": URL plausível como "https://www.nomedaempresa.com.br/images/logo.png"
- "sameAs": Array com perfis sociais realistas (LinkedIn, Instagram, Facebook)
- "description": Texto rico com 1-3 frases descrevendo bem a entidade
- "geo": Coordenadas brasileiras realistas (ex: "-23.5505, -46.6333")
- "aggregateRating": Nota entre 4.0 e 5.0 com número de reviews
- "priceRange": Use formato "$", "$$", "$$$" ou "$$$$"
- "email": Email profissional (ex: "contato@empresa.com.br")
- "knowsAbout": Lista de competências relevantes ao nicho
- "foundingDate": Data no formato ISO "2020-01-15"
- "areaServed": Cidade ou região relevante

IMPORTANTE: Quanto MAIS propriedades preenchidas com valores de QUALIDADE, melhor o Schema Markup ficará para SEO.`;

      const userPrompt = `Preencha TODAS as propriedades das seguintes entidades:

${entityDescriptions}

Relacionamentos entre entidades:
${relDescriptions || "Nenhum relacionamento direto"}

Retorne o JSON array com propriedades preenchidas para cada entidade.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        if (response.status === 429) {
          throw new GatewayError("Rate limit excedido. Tente novamente em alguns segundos.", 429);
        }
        if (response.status === 402) {
          throw new GatewayError("Créditos de IA esgotados. Adicione créditos no workspace.", 402);
        }
        throw new GatewayError(`Erro no gateway de IA: ${response.status}`, 500);
      }

      const aiData = await response.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "";
      const finishReason = aiData.choices?.[0]?.finish_reason;

      console.log(`Batch ${i / BATCH_SIZE + 1}: finish_reason=${finishReason}, len=${rawContent.length}`);

      const batchFilled = tryParseJson(rawContent);
      allFilled.push(...batchFilled);
    }

    console.log(`Total filled: ${allFilled.length} entities`);

    return new Response(JSON.stringify({ filled: allFilled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("semantic-ai-fill error:", e);
    const status = e instanceof GatewayError ? e.status : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

class GatewayError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
