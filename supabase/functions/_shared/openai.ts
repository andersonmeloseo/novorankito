import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Fetches the OpenAI API key from admin api_configurations (decrypted view).
 * Returns null if not configured or not active.
 */
export async function getOpenAIKey(): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Variáveis de ambiente do Supabase não configuradas.");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from("api_configurations_decrypted")
    .select("secret_value")
    .eq("secret_key_name", "OPENAI_API_KEY")
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Error fetching OpenAI key:", error.message);
    throw new Error("Erro ao buscar chave da OpenAI no banco de dados.");
  }

  if (!data?.secret_value) {
    throw new Error("Chave da OpenAI não configurada. Vá em Admin > APIs & Chaves para configurar.");
  }

  return data.secret_value;
}

/**
 * Calls OpenAI chat completions API.
 */
export async function callOpenAI(params: {
  apiKey: string;
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  stream?: boolean;
}): Promise<Response> {
  const { apiKey, messages, model = "gpt-4o-mini", temperature = 0.3, stream = false } = params;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature, stream }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OpenAI API error:", response.status, text);

    if (response.status === 429) {
      throw new OpenAIError("Rate limit da OpenAI excedido. Tente novamente em alguns segundos.", 429);
    }
    if (response.status === 401) {
      throw new OpenAIError("Chave da OpenAI inválida. Verifique em Admin > APIs & Chaves.", 401);
    }
    if (response.status === 402 || response.status === 403) {
      throw new OpenAIError("Sem créditos na OpenAI ou acesso negado. Verifique sua conta.", 402);
    }
    throw new OpenAIError(`Erro na OpenAI: ${response.status}`, 500);
  }

  return response;
}

export class OpenAIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
