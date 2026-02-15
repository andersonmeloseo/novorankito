import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, validateBody, jsonResponse, errorResponse } from "../_shared/utils.ts";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

function extractTagContent(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "gi");
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) matches.push(match[1].trim());
  return matches;
}

function isSitemapIndex(xml: string): boolean {
  return xml.includes("<sitemapindex") || xml.includes("<sitemap>");
}

function parseUrlsFromSitemap(xml: string): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  const urlBlocks = xml.match(/<url[^>]*>[\s\S]*?<\/url>/gi) || [];
  for (const block of urlBlocks) {
    const locs = extractTagContent(block, "loc");
    if (locs.length > 0) {
      urls.push({ loc: locs[0], lastmod: extractTagContent(block, "lastmod")[0] || undefined });
    }
  }
  return urls;
}

function parseSitemapIndexUrls(xml: string): string[] {
  const sitemapBlocks = xml.match(/<sitemap[^>]*>[\s\S]*?<\/sitemap>/gi) || [];
  return sitemapBlocks.flatMap(block => extractTagContent(block, "loc"));
}

async function fetchSitemapContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, {
      headers: { "User-Agent": "RankitoCRM/1.0 Sitemap Parser" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();

    const validationErr = validateBody(body, ["url"], cors);
    if (validationErr) return validationErr;

    const { url } = body;

    if (typeof url !== "string" || url.length > 2000) {
      return errorResponse("URL must be a string under 2000 characters", cors, 400);
    }

    // Validate URL format
    try { new URL(url); } catch {
      return errorResponse("Invalid URL format", cors, 400);
    }

    const allUrls: SitemapUrl[] = [];
    const sitemapsProcessed: string[] = [];
    const queue: string[] = [url];
    const visited = new Set<string>();
    const MAX_SITEMAPS = 200;

    while (queue.length > 0 && sitemapsProcessed.length < MAX_SITEMAPS) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      const content = await fetchSitemapContent(currentUrl);
      if (!content) continue;

      sitemapsProcessed.push(currentUrl);

      if (isSitemapIndex(content)) {
        queue.push(...parseSitemapIndexUrls(content));
      } else {
        allUrls.push(...parseUrlsFromSitemap(content));
      }
    }

    return jsonResponse({ urls: allUrls, total: allUrls.length, sitemaps_processed: sitemapsProcessed }, cors);
  } catch (err: unknown) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", cors);
  }
});
