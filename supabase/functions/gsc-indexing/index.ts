import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function createGoogleJWT(credentials: { client_email: string; private_key: string }, scope: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: credentials.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const pemContents = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createGoogleJWT(credentials, "https://www.googleapis.com/auth/indexing");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!tokenRes.ok) throw new Error(`Failed to get access token: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, action, urls, request_type, request_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get GSC connection
    const { data: conn, error: connErr } = await supabase.from("gsc_connections").select("*").eq("project_id", project_id).single();
    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "No GSC connection found. Connect Google Search Console first." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: "list" — return stored indexing requests
    if (action === "list") {
      const { data, error } = await supabase
        .from("indexing_requests")
        .select("*")
        .eq("project_id", project_id)
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return new Response(JSON.stringify({ rows: data || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: "submit" — submit URLs to Google Indexing API
    if (action === "submit") {
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return new Response(JSON.stringify({ error: "urls array is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const type = request_type || "URL_UPDATED";
      const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key });

      // Get owner_id from the connection
      const ownerId = conn.owner_id;

      const results: { url: string; status: string; response_code?: number; response_message?: string; fail_reason?: string }[] = [];

      // Google Indexing API limit: ~200/day. Process in batch.
      const batch = urls.slice(0, 50);

      for (const url of batch) {
        try {
          const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, type }),
          });

          const body = await res.json();

          if (res.ok) {
            results.push({ url, status: "success", response_code: res.status, response_message: body.urlNotificationMetadata?.latestUpdate?.type || type });
          } else if (res.status === 429) {
            results.push({ url, status: "quota_exceeded", response_code: 429, fail_reason: "Quota exceeded. Try again later." });
          } else {
            results.push({ url, status: "failed", response_code: res.status, fail_reason: body.error?.message || `HTTP ${res.status}` });
          }

          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          results.push({ url, status: "failed", fail_reason: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      // Save all results to indexing_requests table
      const rows = results.map(r => ({
        project_id,
        owner_id: ownerId,
        url: r.url,
        request_type: type,
        status: r.status,
        response_code: r.response_code || null,
        response_message: r.response_message || null,
        fail_reason: r.fail_reason || null,
        completed_at: r.status !== "pending" ? new Date().toISOString() : null,
        submitted_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await supabase.from("indexing_requests").insert(rows);
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({
        submitted: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "failed").length,
        quota_exceeded: results.filter(r => r.status === "quota_exceeded").length,
        total: results.length,
        results,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: "retry" — retry a specific failed request
    if (action === "retry") {
      if (!request_id) {
        return new Response(JSON.stringify({ error: "request_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: req_data, error: reqErr } = await supabase
        .from("indexing_requests")
        .select("*")
        .eq("id", request_id)
        .single();
      if (reqErr || !req_data) {
        return new Response(JSON.stringify({ error: "Request not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key });

      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: req_data.url, type: req_data.request_type }),
      });

      const body = await res.json();
      const newStatus = res.ok ? "success" : res.status === 429 ? "quota_exceeded" : "failed";

      await supabase
        .from("indexing_requests")
        .update({
          status: newStatus,
          response_code: res.status,
          response_message: res.ok ? (body.urlNotificationMetadata?.latestUpdate?.type || "") : null,
          fail_reason: !res.ok ? (body.error?.message || `HTTP ${res.status}`) : null,
          retries: (req_data.retries || 0) + 1,
          completed_at: new Date().toISOString(),
        })
        .eq("id", request_id);

      return new Response(JSON.stringify({ status: newStatus, response_code: res.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: "status" — get notification status for a URL
    if (action === "status") {
      if (!urls || urls.length === 0) {
        return new Response(JSON.stringify({ error: "urls array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key });

      const statuses: any[] = [];
      for (const url of urls.slice(0, 20)) {
        try {
          const res = await fetch(`https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(url)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = await res.json();
          statuses.push({ url, ...data });
          await new Promise(r => setTimeout(r, 100));
        } catch {
          statuses.push({ url, error: "Failed to fetch status" });
        }
      }

      return new Response(JSON.stringify({ statuses }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: list, submit, retry, status" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("gsc-indexing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
