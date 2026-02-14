import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function extractTagContent(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "gi");
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1].trim());
  }
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
      const lastmods = extractTagContent(block, "lastmod");
      urls.push({
        loc: locs[0],
        lastmod: lastmods[0] || undefined,
      });
    }
  }
  return urls;
}

function parseSitemapIndexUrls(xml: string): string[] {
  const sitemapBlocks = xml.match(/<sitemap[^>]*>[\s\S]*?<\/sitemap>/gi) || [];
  const urls: string[] = [];
  for (const block of sitemapBlocks) {
    const locs = extractTagContent(block, "loc");
    if (locs.length > 0) urls.push(locs[0]);
  }
  return urls;
}

async function fetchSitemapContent(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "RankitoCRM/1.0 Sitemap Parser" },
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        const childSitemaps = parseSitemapIndexUrls(content);
        queue.push(...childSitemaps);
      } else {
        const urls = parseUrlsFromSitemap(content);
        allUrls.push(...urls);
      }
    }

    return new Response(
      JSON.stringify({
        urls: allUrls,
        total: allUrls.length,
        sitemaps_processed: sitemapsProcessed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
