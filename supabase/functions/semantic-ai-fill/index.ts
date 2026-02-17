import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getOpenAIKey(): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from("api_configurations_decrypted")
    .select("secret_value")
    .eq("secret_key_name", "OPENAI_API_KEY")
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Error fetching OpenAI key:", error.message);
    return null;
  }
  return data?.secret_value || null;
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

    // Try OpenAI key from admin config first, fallback to Lovable AI
    const openaiKey = await getOpenAIKey();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!openaiKey && !LOVABLE_API_KEY) {
      throw new Error("Nenhuma API de IA configurada. Configure a OpenAI API no painel Admin > APIs & Chaves.");
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

    let response: Response;

    if (openaiKey) {
      // Use OpenAI directly
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });
    } else {
      // Fallback to Lovable AI
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    }

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
      console.error("AI error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

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
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
