import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAIKey, callOpenAI, OpenAIError } from "../_shared/openai.ts";

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

  // Try direct parse first
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch { /* continue */ }

  // Try to repair truncated JSON: find last complete object
  if (str.startsWith("[")) {
    // Find last '}' that closes an object
    let lastClose = str.lastIndexOf("}");
    while (lastClose > 0) {
      const attempt = str.substring(0, lastClose + 1) + "]";
      try {
        const parsed = JSON.parse(attempt);
        if (Array.isArray(parsed)) {
          console.log(`Repaired truncated JSON: recovered ${parsed.length} entities`);
          return parsed;
        }
      } catch { /* try earlier closing brace */ }
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

    const openaiKey = await getOpenAIKey();

    // Limit to max 5 properties per entity to reduce token usage
    const entityDescriptions = entities.map((e: any) => {
      const propsToFill = (e.properties || [])
        .filter((p: any) => !e.current_values?.[p.name]?.trim())
        .slice(0, 8) // max 8 props per entity
        .map((p: any) => `  - ${p.name}: ${p.description}. Ex: "${p.example}"`)
        .join("\n");

      return `"${e.name}" [id=${e.id}] (${e.schema_type})
Props to fill:
${propsToFill || "  (none)"}`;
    }).join("\n---\n");

    const relationDescriptions = (relations || []).slice(0, 10).map((r: any) =>
      `${r.subject} → ${r.predicate} → ${r.object}`
    ).join("\n");

    const systemPrompt = `You are a Schema.org SEO expert. Fill properties for entities.
Return ONLY a JSON array: [{"id":"entity_id","properties":{"prop":"value"}}]
NO markdown, NO explanation. Use Brazilian Portuguese values. Be concise.`;

    const userPrompt = `Entities:\n${entityDescriptions}\n\nRelationships:\n${relationDescriptions || "none"}\n\nReturn JSON array.`;

    const response = await callOpenAI({
      apiKey: openaiKey,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 4096,
    });

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    const finishReason = aiData.choices?.[0]?.finish_reason;
    
    console.log("AI finish_reason:", finishReason, "content length:", rawContent.length);

    const filled = tryParseJson(rawContent);
    
    if (filled.length === 0 && rawContent.length > 10) {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
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
