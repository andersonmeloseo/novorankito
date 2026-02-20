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

    const entitySummary = entities.map((e: any) => {
      const propsEntries = Object.entries(e.schema_properties || {})
        .filter(([_, v]) => v && String(v).trim())
        .map(([k, v]) => `    ${k}: "${String(v).substring(0, 80)}"`)
        .join("\n");
      return `- "${e.name}" [tipo: ${e.entity_type}] Schema: ${e.schema_type || "NÃO DEFINIDO"}${e.description ? ` | Desc: ${e.description}` : ""}${propsEntries ? `\n  Propriedades preenchidas:\n${propsEntries}` : "\n  Propriedades: NENHUMA preenchida"}`;
    }).join("\n");

    const relationSummary = relations.map((r: any) =>
      `- "${r.subject}" —[${r.predicate}]→ "${r.object}"`
    ).join("\n");

    const pageSummary = pages.map((p: any) =>
      `- ${p.slug}: "${p.title}" (schemas: ${p.schemas.join(", ")}) → links internos: ${p.linkedPages.join(", ") || "nenhum"}`
    ).join("\n");

    const systemPrompt = `Você é um engenheiro de dados estruturados e Schema.org com 20 anos de experiência. Sua especialidade é gerar código JSON-LD REAL e FUNCIONAL, com conexões via @id entre schemas.

MISSÃO: Gerar um plano de implementação TÉCNICO E CONCRETO — NÃO genérico.

O output deve ser JSON puro (sem markdown, sem code fences) com esta estrutura:

{
  "verdict": {
    "score": 0-100,
    "level": "iniciante|intermediário|avançado|expert",
    "summary": "2-3 frases objetivas",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "gaps": ["propriedade X faltando em Y", "schema Z não conectado via @id"]
  },
  "pages": [
    {
      "slug": "/caminho",
      "title": "Title SEO (max 60 chars)",
      "meta_description": "Meta description (max 155 chars)",
      "h1": "H1 da página",
      "priority": "critical|high|medium|low",
      "schemas": [
        {
          "type": "Organization",
          "id_value": "https://dominio.com/#organization",
          "connects_to": ["https://dominio.com/#website", "https://dominio.com/#address"],
          "required_properties": {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": "https://dominio.com/#organization",
            "name": "Nome Real",
            "url": "https://dominio.com",
            "logo": { "@type": "ImageObject", "@id": "https://dominio.com/#logo", "url": "https://dominio.com/logo.png" },
            "address": { "@id": "https://dominio.com/#address" },
            "sameAs": ["https://facebook.com/...", "https://instagram.com/..."]
          },
          "missing_properties": ["telephone", "email", "foundingDate"],
          "notes": "Explicação técnica de por que este schema é necessário aqui"
        }
      ],
      "full_jsonld": "<script type=\\"application/ld+json\\">\\n[array com todos os schemas desta página conectados via @id]\\n</script>",
      "internal_links": [
        { "to": "/outra-pagina", "anchor_text": "texto âncora", "context": "onde colocar" }
      ],
      "content_brief": "O que escrever nesta página (3-5 frases)",
      "seo_tips": ["dica 1", "dica 2"]
    }
  ],
  "id_graph": {
    "description": "Mapa de como os @id se conectam entre páginas",
    "connections": [
      { "from_id": "https://dominio.com/#organization", "to_id": "https://dominio.com/#website", "via_property": "publisher", "on_page": "/" },
      { "from_id": "https://dominio.com/#website", "to_id": "https://dominio.com/#organization", "via_property": "publisher", "on_page": "/" }
    ]
  },
  "knowledge_panel_strategy": {
    "steps": ["passo concreto 1", "passo concreto 2"],
    "entity_home": "/",
    "required_signals": ["..."],
    "estimated_timeline": "X meses"
  },
  "quick_wins": [
    { "action": "ação", "impact": "alto|médio", "effort": "baixo|médio", "description": "o que fazer EXATAMENTE" }
  ]
}

REGRAS CRÍTICAS:
1. Retorne APENAS JSON puro
2. O campo "full_jsonld" de CADA página deve conter o código JSON-LD COMPLETO e REAL pronto para colar no HTML
3. Use @id para CONECTAR schemas entre si (Organization → WebSite → WebPage → BreadcrumbList → Service/Product/Person)
4. Cada schema deve ter um @id único no formato "https://dominio.com/#tipo" 
5. O campo "connects_to" mostra quais outros @id este schema referencia
6. O "id_graph" mostra o MAPA COMPLETO de conexões @id entre todas as páginas
7. NÃO use texto genérico. Use os DADOS REAIS das entidades do cliente
8. Preencha as propriedades com os valores REAIS que o cliente já forneceu
9. Liste as propriedades que FALTAM preencher em "missing_properties"
10. Se o domínio não foi informado, use "https://seudominio.com" como placeholder
11. Cada página DEVE ter BreadcrumbList conectado
12. A Home DEVE ter Organization + WebSite + WebPage no mínimo`;

    const userPrompt = `Analise o grafo semântico e gere o plano de implementação TÉCNICO com JSON-LD real e conexões @id:

DOMÍNIO: ${domain || "https://seudominio.com"}

ENTIDADES (${entities.length}):
${entitySummary}

RELAÇÕES (${relations.length}):
${relationSummary || "Nenhuma relação definida ainda"}

PÁGINAS PRÉ-MAPEADAS (${pages.length}):
${pageSummary}

Gere o plano com JSON-LD COMPLETO para cada página, mapa de @id connections, e propriedades faltantes.`;

    const response = await callOpenAI({
      apiKey: openaiKey,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 16384,
    });

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let plan = null;
    let str = rawContent.trim();
    if (str.startsWith("```")) {
      str = str.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }
    try {
      plan = JSON.parse(str);
    } catch {
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
