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

    // Build a prompt for the AI to fill schema properties
    const entityDescriptions = entities.map((e: any) => {
      const propsToFill = (e.properties || [])
        .filter((p: any) => !e.current_values?.[p.name]?.trim())
        .map((p: any) => `  - ${p.name} (${p.required ? "REQUIRED" : "optional"}): ${p.description}. Example: "${p.example}"`)
        .join("\n");

      return `Entity: "${e.name}" (type: ${e.entity_type}, schema: ${e.schema_type})
Description: ${e.description || "N/A"}
Already filled: ${JSON.stringify(e.current_values || {})}
Properties to fill:
${propsToFill || "  (none - all filled)"}`;
    }).join("\n\n---\n\n");

    const relationDescriptions = relations.map((r: any) =>
      `${r.subject} → ${r.predicate} → ${r.object}`
    ).join("\n");

    const systemPrompt = `You are a Schema.org SEO expert. Given a semantic graph of entities and their relationships, fill in the Schema.org properties for each entity with realistic, SEO-optimized values.

RULES:
- Return ONLY a JSON array with objects { "id": "entity_id", "properties": { "property_name": "value" } }
- Fill ALL empty required properties and as many optional ones as possible
- Use realistic Brazilian Portuguese values appropriate for the entity type
- For URLs, use placeholder paths like "https://www.example.com/page"
- For phone numbers, use Brazilian format like "+55 11 99999-9999"
- For addresses, use realistic Brazilian addresses
- Respect the entity relationships when filling values (e.g., if a Person "works_at" an Organization, reference the organization name)
- Do NOT include properties that are already filled
- Return valid JSON only, no markdown, no explanation`;

    const userPrompt = `Here are the entities to fill:

${entityDescriptions}

Relationships between entities:
${relationDescriptions}

Fill all empty Schema.org properties with realistic values. Return JSON array only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_schema_properties",
              description: "Fill Schema.org properties for all entities",
              parameters: {
                type: "object",
                properties: {
                  filled: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Entity ID" },
                        properties: {
                          type: "object",
                          description: "Key-value pairs of Schema.org properties to fill",
                          additionalProperties: { type: "string" },
                        },
                      },
                      required: ["id", "properties"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["filled"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "fill_schema_properties" } },
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    
    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let filled: any[] = [];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      filled = parsed.filled || [];
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
