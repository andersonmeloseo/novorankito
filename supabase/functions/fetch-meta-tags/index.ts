import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateBody, validateUUID, jsonResponse, errorResponse } from "../_shared/utils.ts";

const corsHeaders_fallback = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();

    const validationErr = validateBody(body, ["urls"], cors);
    if (validationErr) return validationErr;

    const { urls } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return errorResponse("urls must be a non-empty array", cors, 400);
    }

    // Validate each URL item
    for (const item of urls) {
      if (!item.id || !item.url || typeof item.url !== "string") {
        return errorResponse("Each item in urls must have 'id' and 'url' (string) fields", cors, 400);
      }
      try { new URL(item.url); } catch {
        return errorResponse(`Invalid URL: ${item.url}`, cors, 400);
      }
    }

    const batch = urls.slice(0, 50);
    const results: Array<{ id: string; meta_title: string | null; meta_description: string | null; error?: string }> = [];

    for (const item of batch) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(item.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Rankito-Bot/1.0 (+https://rankito.io)",
            "Accept": "text/html",
          },
          redirect: "follow",
        });
        clearTimeout(timeout);

        const html = await res.text();

        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const metaTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i);
        const title = metaTitleMatch?.[1]?.trim() || titleMatch?.[1]?.trim() || null;

        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        const description = descMatch?.[1]?.trim() || null;

        results.push({ id: item.id, meta_title: title, meta_description: description });
      } catch (e: any) {
        results.push({ id: item.id, meta_title: null, meta_description: null, error: e.message || "Fetch failed" });
      }
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let updated = 0;
    for (const r of results) {
      if (r.meta_title || r.meta_description) {
        const updateData: any = {};
        if (r.meta_title) updateData.meta_title = r.meta_title;
        if (r.meta_description) updateData.meta_description = r.meta_description;

        const { error } = await supabase.from("site_urls").update(updateData).eq("id", r.id);
        if (!error) updated++;
      }
    }

    return jsonResponse({ success: true, results, updated }, cors);
  } catch (e: any) {
    return errorResponse(e.message || "Unknown error", cors);
  }
});
