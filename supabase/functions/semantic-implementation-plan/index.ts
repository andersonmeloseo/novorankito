import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAIKey, callOpenAI, OpenAIError } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entities, relations, pages, domain } = await req.json();

    if (!entities?.length) {
      return new Response(JSON.stringify({ plan: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = await getOpenAIKey();

    const entitySummary = entities.map((e: any) =>
      `- "${e.name}" [${e.entity_type}] Schema: ${e.schema_type || "N/A"}, Props preenchidas: ${Object.keys(e.schema_properties || {}).length}`
    ).join("\n");

    const relationSummary = relations.map((r: any) =>
      `- "${r.subject}" → ${r.predicate} → "${r.object}"`
    ).join("\n");

    const pageSummary = pages.map((p: any) =>
      `- ${p.slug}: "${p.title}" (${p.schemas.join(", ")}) → links: ${p.linkedPages.join(", ") || "nenhum"}`
    ).join("\n");

    const systemPrompt = `Você é um consultor sênior de SEO Técnico, Schema.org e Knowledge Graph com mais de 20 anos de experiência em SEO, GEO (Generative Engine Optimization), biblioteconomia digital e ciência da informação.

Você é reconhecido como um dos maiores especialistas do mundo em:
- Dados estruturados e Schema.org
- Google Knowledge Panel e Entity SEO
- E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
- Topical Authority e grafos semânticos
- Internal linking architecture
- Rich Results e SERP Features

MISSÃO: Analisar o grafo semântico do cliente e gerar um PLANO DE IMPLEMENTAÇÃO COMPLETO e PROFISSIONAL.

FORMATO DA RESPOSTA — JSON puro, sem markdown:
{
  "verdict": {
    "score": 0-100,
    "level": "iniciante|intermediário|avançado|expert",
    "summary": "Resumo executivo em 2-3 frases sobre a maturidade semântica",
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "weaknesses": ["ponto fraco 1", "ponto fraco 2"],
    "opportunities": ["oportunidade 1", "oportunidade 2"]
  },
  "pages": [
    {
      "slug": "/caminho-da-pagina",
      "title": "Título SEO da Página (max 60 chars)",
      "meta_description": "Meta description otimizada (max 155 chars)",
      "h1": "Heading H1 principal",
      "schemas_required": ["Organization", "BreadcrumbList"],
      "content_brief": "Briefing detalhado do conteúdo: o que escrever, tópicos a cobrir, tamanho ideal, tom de voz",
      "internal_links": [{"to": "/outra-pagina", "anchor_text": "texto âncora sugerido", "context": "onde colocar o link"}],
      "priority": "critical|high|medium|low",
      "estimated_impact": "Impacto esperado em 1-2 frases",
      "seo_tips": ["dica técnica 1", "dica técnica 2"]
    }
  ],
  "knowledge_panel_strategy": {
    "steps": ["passo 1 para conquistar o Knowledge Panel", "passo 2"],
    "entity_home": "/pagina-entidade-principal",
    "required_signals": ["sinal 1", "sinal 2"],
    "estimated_timeline": "tempo estimado"
  },
  "internal_linking_map": {
    "hub_pages": [{"slug": "/hub", "spoke_pages": ["/spoke1", "/spoke2"]}],
    "strategy": "Explicação da estratégia de linking"
  },
  "quick_wins": [
    {"action": "ação rápida", "impact": "alto|médio", "effort": "baixo|médio|alto", "description": "o que fazer"}
  ],
  "advanced_recommendations": [
    {"title": "recomendação", "description": "explicação detalhada", "priority": "alta|média|baixa"}
  ]
}

REGRAS:
1. Retorne APENAS JSON puro — SEM markdown, SEM code fences
2. Seja EXTREMAMENTE detalhado e profissional
3. Use dados REAIS do grafo do cliente
4. O content_brief deve ser rico o suficiente para um redator produzir o conteúdo
5. Pense como se estivesse cobrando R$15.000 por esta consultoria
6. Foque em DOMINAR o Google e o Knowledge Panel
7. Todas as sugestões devem ser acionáveis e específicas`;

    const userPrompt = `Analise o seguinte grafo semântico e gere o plano de implementação completo:

DOMÍNIO: ${domain || "não informado"}

ENTIDADES DO GRAFO (${entities.length}):
${entitySummary}

RELAÇÕES SEMÂNTICAS (${relations.length}):
${relationSummary || "Nenhuma relação definida"}

PÁGINAS MAPEADAS (${pages.length}):
${pageSummary}

Gere o plano de implementação JSON completo com veredito profissional, estratégia de Knowledge Panel, mapa de links internos e quick wins.`;

    const response = await callOpenAI({
      apiKey: openaiKey,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 8192,
    });

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Try to parse JSON
    let plan = null;
    let str = rawContent.trim();
    if (str.startsWith("```")) {
      str = str.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }
    try {
      plan = JSON.parse(str);
    } catch {
      // Try to find JSON object
      const start = str.indexOf("{");
      const end = str.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          plan = JSON.parse(str.substring(start, end + 1));
        } catch {
          console.error("Failed to parse AI plan response");
        }
      }
    }

    console.log(`Implementation plan generated: ${plan ? "success" : "failed"}`);

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("semantic-implementation-plan error:", e);
    const status = e instanceof OpenAIError ? e.status : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
