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
    const { entities, relations } = await req.json();

    if (!entities?.length) {
      return new Response(JSON.stringify({ filled: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = await getOpenAIKey();

    const entityDescriptions = entities.map((e: any) => {
      const propsToFill = (e.properties || [])
        .filter((p: any) => !e.current_values?.[p.name]?.trim())
        .map((p: any) => `  - ${p.name} (${p.required ? "REQUIRED" : "optional"}): ${p.description}. Example: "${p.example}"`)
        .join("\n");

      return `Entity "${e.name}" [id=${e.id}] (type: ${e.entity_type}, schema: ${e.schema_type})
Description: ${e.description || "N/A"}
Already filled: ${JSON.stringify(e.current_values || {})}
Properties to fill:
${propsToFill || "  (none)"}`;
    }).join("\n\n---\n\n");

    const relationDescriptions = relations.map((r: any) =>
      `${r.subject} → ${r.predicate} → ${r.object}`
    ).join("\n");

    const systemPrompt = `You are a Schema.org SEO expert. Fill Schema.org properties for entities.

RULES:
- Return ONLY a raw JSON array: [{"id":"entity_id","properties":{"prop":"value"}}]
- NO markdown, NO code fences, NO explanation — just the JSON array
- Fill ALL empty required properties and as many optional ones as possible
- Use realistic Brazilian Portuguese values
- For URLs use "https://www.example.com/page"
- For phones use Brazilian format "+55 11 99999-9999"
- Respect entity relationships when filling values
- Do NOT include already-filled properties`;

    const userPrompt = `Entities:

${entityDescriptions}

Relationships:
${relationDescriptions}

Return a JSON array with filled properties for each entity.`;

    const response = await callOpenAI({
      apiKey: openaiKey,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.3,
    });

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    let filled: any[] = [];
    try {
      filled = JSON.parse(jsonStr);
      if (!Array.isArray(filled)) filled = [];
    } catch (parseErr) {
      console.error("Failed to parse AI response:", jsonStr.substring(0, 500));
      throw new Error("AI retornou formato inválido. Tente novamente.");
    }

    return new Response(JSON.stringify({ filled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("semantic-ai-fill error:", e);
    const status = e instanceof OpenAIError ? e.status : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
