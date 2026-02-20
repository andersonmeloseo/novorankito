import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audit_id } = await req.json();
    if (!audit_id) {
      return new Response(
        JSON.stringify({ error: "audit_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get audit record
    const { data: audit, error: auditErr } = await supabase
      .from("onpage_audits")
      .select("*")
      .eq("id", audit_id)
      .eq("owner_id", user.id)
      .single();

    if (auditErr || !audit) {
      return new Response(
        JSON.stringify({ error: "Audit not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (audit.status === "completed" || audit.status === "failed") {
      return new Response(
        JSON.stringify({ status: audit.status, audit }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const login = Deno.env.get("DATAFORSEO_LOGIN");
    const password = Deno.env.get("DATAFORSEO_PASSWORD");
    const basicAuth = btoa(`${login}:${password}`);

    // Call DataForSEO summary endpoint
    const summaryRes = await fetch(
      `https://api.dataforseo.com/v3/on_page/summary/${audit.task_id}`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${basicAuth}` },
      }
    );

    const summaryData = await summaryRes.json();
    const task = summaryData.tasks?.[0];

    if (!task || task.status_code !== 20000) {
      // Task still processing or error
      if (task?.status_code === 40602) {
        // Task not ready yet
        return new Response(
          JSON.stringify({ status: "crawling", crawl_progress: audit.crawl_progress }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          status: "crawling",
          crawl_progress: audit.crawl_progress,
          message: task?.status_message || "Processing...",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = task.result?.[0];
    if (!result) {
      return new Response(
        JSON.stringify({ status: "crawling", crawl_progress: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const crawlProgress = result.crawl_progress === "finished" ? 100 : 
      result.pages_crawled && result.pages_count 
        ? Math.round((result.pages_crawled / result.pages_count) * 100)
        : 0;

    const isComplete = result.crawl_progress === "finished";

    // Update audit record
    const updateData: Record<string, any> = {
      crawl_progress: crawlProgress,
      pages_crawled: result.pages_crawled || 0,
      pages_total: result.pages_count || 0,
      summary: result,
    };

    if (isComplete) {
      updateData.status = "completed";
      updateData.completed_at = new Date().toISOString();
    }

    await supabase
      .from("onpage_audits")
      .update(updateData)
      .eq("id", audit_id);

    // If complete, fetch pages and store them
    if (isComplete) {
      const adminSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Fetch pages from DataForSEO (first 500)
      const pagesRes = await fetch(
        "https://api.dataforseo.com/v3/on_page/pages",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            {
              id: audit.task_id,
              limit: 500,
              order_by: ["meta.scripts_count,desc"],
            },
          ]),
        }
      );

      const pagesData = await pagesRes.json();
      const pages = pagesData.tasks?.[0]?.result?.[0]?.items || [];

      if (pages.length > 0) {
        const rows = pages.map((p: any) => ({
          audit_id,
          project_id: audit.project_id,
          owner_id: user.id,
          url: p.url || "",
          status_code: p.status_code || null,
          checks: p.checks || {},
          meta_title: p.meta?.title || null,
          meta_description: p.meta?.description || null,
          h1: p.meta?.htags?.h1?.[0] || null,
          page_score: p.onpage_score || null,
          load_time: p.page_timing?.duration_time || null,
          size: p.size || null,
          internal_links_count: p.internal_links_count || 0,
          external_links_count: p.external_links_count || 0,
          images_count: p.images_count || 0,
          images_without_alt: p.images_without_alt_count || 0,
        }));

        // Insert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          await adminSupabase.from("onpage_pages").insert(batch);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: isComplete ? "completed" : "crawling",
        crawl_progress: crawlProgress,
        pages_crawled: result.pages_crawled || 0,
        pages_total: result.pages_count || 0,
        summary: isComplete ? result : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
