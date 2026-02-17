import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entities, relations } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!entities?.length) {
      return new Response(JSON.stringify({ filled: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    // Clean markdown fences if present
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
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
