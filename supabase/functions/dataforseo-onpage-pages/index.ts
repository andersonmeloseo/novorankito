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

    const { audit_id, page = 1, page_size = 50, filter } = await req.json();
    if (!audit_id) {
      return new Response(
        JSON.stringify({ error: "audit_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    let query = supabase
      .from("onpage_pages")
      .select("*", { count: "exact" })
      .eq("audit_id", audit_id)
      .eq("owner_id", user.id)
      .order("page_score", { ascending: true, nullsFirst: false })
      .range(from, to);

    // Apply filters
    if (filter === "errors") {
      query = query.or("status_code.gte.400,status_code.is.null");
    } else if (filter === "warnings") {
      query = query.lt("page_score", 70).gte("page_score", 0);
    } else if (filter === "passed") {
      query = query.gte("page_score", 70);
    }

    const { data: pages, count, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        pages: pages || [],
        total: count || 0,
        page,
        page_size,
        total_pages: Math.ceil((count || 0) / page_size),
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
