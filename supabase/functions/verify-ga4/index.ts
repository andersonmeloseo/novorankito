import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, validateBody, jsonResponse, errorResponse, getGoogleAccessToken } from "../_shared/utils.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();

    const validationErr = validateBody(body, ["credentials"], cors);
    if (validationErr) return validationErr;

    const { credentials } = body;

    if (!credentials?.client_email || !credentials?.private_key) {
      return errorResponse("Credenciais inválidas: client_email e private_key são obrigatórios.", cors, 400);
    }

    if (typeof credentials.client_email !== "string" || !credentials.client_email.includes("@")) {
      return errorResponse("client_email deve ser um email válido.", cors, 400);
    }

    if (typeof credentials.private_key !== "string" || !credentials.private_key.includes("PRIVATE KEY")) {
      return errorResponse("private_key deve ser uma chave privada PEM válida.", cors, 400);
    }

    const accessToken = await getGoogleAccessToken(credentials, "https://www.googleapis.com/auth/analytics.readonly");

    const res = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GA4 Admin API error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    const properties: { propertyId: string; displayName: string; account: string }[] = [];

    for (const account of data.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        properties.push({
          propertyId: prop.property?.replace("properties/", "") || "",
          displayName: prop.displayName || prop.property || "",
          account: account.displayName || account.account || "",
        });
      }
    }

    return jsonResponse({ success: true, properties }, cors);
  } catch (error: unknown) {
    console.error("GA4 verify error:", error);
    return errorResponse(error instanceof Error ? error.message : "Erro desconhecido", cors);
  }
});
