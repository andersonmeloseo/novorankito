import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateBody, jsonResponse, errorResponse, getGoogleAccessToken } from "../_shared/utils.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();

    let clientEmail: string;
    let privateKey: string;

    // Mode 1: Test existing connection by project_id (reads credentials from DB)
    if (body.project_id) {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: conn } = await sb.from("gsc_connections").select("client_email, private_key").eq("project_id", body.project_id).maybeSingle();
      if (!conn) {
        return errorResponse("Nenhuma conexão GSC encontrada para este projeto.", cors, 404);
      }
      clientEmail = conn.client_email;
      privateKey = conn.private_key;
    }
    // Mode 2: Validate new credentials passed directly
    else if (body.credentials) {
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
      clientEmail = credentials.client_email;
      privateKey = credentials.private_key;
    } else {
      return errorResponse("Envie 'project_id' ou 'credentials'.", cors, 400);
    }

    const accessToken = await getGoogleAccessToken({ client_email: clientEmail, private_key: privateKey }, "https://www.googleapis.com/auth/webmasters.readonly");

    const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sitesRes.ok) {
      const err = await sitesRes.text();
      throw new Error(`Search Console API error [${sitesRes.status}]: ${err}`);
    }

    const sitesData = await sitesRes.json();
    const sites = (sitesData.siteEntry || []).map((s: any) => ({
      siteUrl: s.siteUrl,
      permissionLevel: s.permissionLevel,
    }));

    return jsonResponse({ success: true, sites }, cors);
  } catch (error: unknown) {
    console.error("GSC verify error:", error);
    return errorResponse(error instanceof Error ? error.message : "Erro desconhecido", cors);
  }
});
