import { getCorsHeaders, validateBody, jsonResponse, errorResponse } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const validationErr = validateBody(body, ["urls"], cors);
    if (validationErr) return validationErr;

    const { urls } = body;
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > 10) {
      return errorResponse("urls must be an array with 1-10 items", cors, 400);
    }

    // Validate URLs
    for (const url of urls) {
      if (typeof url !== "string") return errorResponse("Each url must be a string", cors, 400);
      try { new URL(url); } catch { return errorResponse(`Invalid URL: ${url}`, cors, 400); }
    }

    const results: Array<{
      url: string;
      domain: string;
      schemas: Array<{ type: string; properties: Record<string, unknown> }>;
      error?: string;
    }> = [];

    for (const url of urls) {
      const domain = new URL(url).hostname.replace("www.", "");
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RankitoBot/1.0)",
            "Accept": "text/html,application/xhtml+xml",
          },
          redirect: "follow",
        });
        clearTimeout(timeout);

        const html = await res.text();
        const schemas = extractJsonLd(html);
        results.push({ url, domain, schemas });
      } catch (e: any) {
        results.push({ url, domain, schemas: [], error: e.message || "Fetch failed" });
      }
    }

    return jsonResponse({ success: true, results }, cors);
  } catch (e: any) {
    return errorResponse(e.message || "Unknown error", cors);
  }
});

function extractJsonLd(html: string): Array<{ type: string; properties: Record<string, unknown> }> {
  const schemas: Array<{ type: string; properties: Record<string, unknown> }> = [];
  // Match all <script type="application/ld+json"> blocks
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      flattenSchema(parsed, schemas);
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  return schemas;
}

function flattenSchema(
  obj: any,
  acc: Array<{ type: string; properties: Record<string, unknown> }>
) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => flattenSchema(item, acc));
    return;
  }

  if (obj && typeof obj === "object") {
    // Handle @graph
    if (obj["@graph"] && Array.isArray(obj["@graph"])) {
      obj["@graph"].forEach((item: any) => flattenSchema(item, acc));
      return;
    }

    const type = obj["@type"];
    if (type) {
      const types = Array.isArray(type) ? type : [type];
      const properties: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith("@") && key !== "@id") continue;
        // Simplify nested objects to their @type or name
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const nested = value as Record<string, unknown>;
          properties[key] = nested["@type"] || nested["name"] || "[object]";
          // Also extract nested schemas
          flattenSchema(value, acc);
        } else if (Array.isArray(value)) {
          properties[key] = value.map((v) => {
            if (v && typeof v === "object") {
              flattenSchema(v, acc);
              return v["@type"] || v["name"] || "[object]";
            }
            return v;
          });
        } else {
          properties[key] = value;
        }
      }

      for (const t of types) {
        // Avoid duplicates
        if (!acc.some((s) => s.type === t && JSON.stringify(s.properties) === JSON.stringify(properties))) {
          acc.push({ type: t, properties });
        }
      }
    }
  }
}
