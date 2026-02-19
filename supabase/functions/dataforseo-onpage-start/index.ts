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

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get project domain
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("domain")
      .eq("id", project_id)
      .single();

    if (projErr || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = project.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

    // Get DataForSEO credentials from api_configurations
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const login = Deno.env.get("DATAFORSEO_LOGIN");
    const password = Deno.env.get("DATAFORSEO_PASSWORD");

    if (!login || !password) {
      return new Response(
        JSON.stringify({ error: "DataForSEO credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call DataForSEO On-Page Task Post
    const basicAuth = btoa(`${login}:${password}`);
    const taskPayload = [
      {
        target: domain,
        max_crawl_pages: 500,
        load_resources: true,
        enable_javascript: true,
        enable_browser_rendering: true,
        store_raw_html: false,
      },
    ];

    const dfsResponse = await fetch(
      "https://api.dataforseo.com/v3/on_page/task_post",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskPayload),
      }
    );

    const dfsData = await dfsResponse.json();

    if (
      !dfsData.tasks ||
      dfsData.tasks.length === 0 ||
      dfsData.tasks[0].status_code !== 20100
    ) {
      const errMsg =
        dfsData.tasks?.[0]?.status_message || "Failed to create task";
      return new Response(
        JSON.stringify({ error: errMsg, details: dfsData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskId = dfsData.tasks[0].id;

    // Save audit record
    const { data: audit, error: insertErr } = await supabase
      .from("onpage_audits")
      .insert({
        project_id,
        owner_id: user.id,
        task_id: taskId,
        domain,
        status: "crawling",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ audit_id: audit.id, task_id: taskId, domain }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
