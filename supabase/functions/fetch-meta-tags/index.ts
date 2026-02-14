import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();
    // urls: Array of { id: string, url: string }

    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "No URLs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to 50 URLs per batch
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

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const metaTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i);
        
        const title = metaTitleMatch?.[1]?.trim() || titleMatch?.[1]?.trim() || null;

        // Extract description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        
        const description = descMatch?.[1]?.trim() || null;

        results.push({ id: item.id, meta_title: title, meta_description: description });
      } catch (e: any) {
        results.push({ id: item.id, meta_title: null, meta_description: null, error: e.message || "Fetch failed" });
      }
    }

    // Update database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    return new Response(JSON.stringify({ success: true, results, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
