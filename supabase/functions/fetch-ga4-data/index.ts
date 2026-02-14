import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function createGoogleJWT(credentials: { client_email: string; private_key: string }, scope: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createGoogleJWT(credentials, "https://www.googleapis.com/auth/analytics.readonly");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!tokenRes.ok) throw new Error(`Token error: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}

interface ReportRequest {
  dimensions: { name: string }[];
  metrics: { name: string }[];
  dateRanges: { startDate: string; endDate: string }[];
  limit?: number;
  orderBys?: { metric?: { metricName: string }; desc?: boolean }[];
  dimensionFilter?: any;
  metricFilter?: any;
}

async function runReport(accessToken: string, propertyId: string, request: ReportRequest) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 Data API error [${res.status}]: ${err}`);
  }
  return await res.json();
}

async function runRealtimeReport(accessToken: string, propertyId: string, dimensions: { name: string }[], metrics: { name: string }[]) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ dimensions, metrics, limit: 100 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 Realtime API error [${res.status}]: ${err}`);
  }
  return await res.json();
}

function parseRows(report: any): any[] {
  if (!report.rows) return [];
  const dimHeaders = (report.dimensionHeaders || []).map((h: any) => h.name);
  const metHeaders = (report.metricHeaders || []).map((h: any) => h.name);
  return report.rows.map((row: any) => {
    const obj: any = {};
    (row.dimensionValues || []).forEach((v: any, i: number) => { obj[dimHeaders[i]] = v.value; });
    (row.metricValues || []).forEach((v: any, i: number) => { obj[metHeaders[i]] = parseFloat(v.value) || 0; });
    return obj;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, report_type, start_date, end_date } = await req.json();
    if (!project_id) throw new Error("project_id obrigatório");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: conn } = await sb.from("ga4_connections").select("*").eq("project_id", project_id).maybeSingle();
    if (!conn) throw new Error("Nenhuma conexão GA4 encontrada para este projeto.");
    if (!conn.property_id) throw new Error("Property ID do GA4 não configurado.");

    const accessToken = await getAccessToken({ client_email: conn.client_email, private_key: conn.private_key });
    const propId = conn.property_id;
    const sDate = start_date || "28daysAgo";
    const eDate = end_date || "yesterday";
    const dateRanges = [{ startDate: sDate, endDate: eDate }];

    let result: any = {};

    switch (report_type) {
      case "overview": {
        // Main KPIs + trend
        const [overview, trend] = await Promise.all([
          runReport(accessToken, propId, {
            dimensions: [],
            metrics: [
              { name: "totalUsers" }, { name: "newUsers" }, { name: "sessions" },
              { name: "engagedSessions" }, { name: "engagementRate" },
              { name: "averageSessionDuration" }, { name: "screenPageViews" },
              { name: "screenPageViewsPerSession" }, { name: "bounceRate" },
              { name: "eventCount" }, { name: "conversions" },
              { name: "totalRevenue" }, { name: "ecommercePurchases" },
            ],
            dateRanges,
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "date" }],
            metrics: [
              { name: "totalUsers" }, { name: "sessions" }, { name: "screenPageViews" },
              { name: "engagementRate" }, { name: "bounceRate" }, { name: "averageSessionDuration" },
              { name: "eventCount" }, { name: "conversions" }, { name: "totalRevenue" },
            ],
            dateRanges,
            orderBys: [{ metric: { metricName: "sessions" }, desc: false }],
            limit: 500,
          }),
        ]);
        result = {
          totals: parseRows(overview)[0] || {},
          trend: parseRows(trend),
        };
        break;
      }

      case "acquisition": {
        const [channels, sources, campaigns, firstUser] = await Promise.all([
          runReport(accessToken, propId, {
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [
              { name: "totalUsers" }, { name: "sessions" }, { name: "engagedSessions" },
              { name: "engagementRate" }, { name: "conversions" }, { name: "totalRevenue" },
            ],
            dateRanges, limit: 50,
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
            metrics: [
              { name: "totalUsers" }, { name: "sessions" }, { name: "engagementRate" },
              { name: "conversions" }, { name: "totalRevenue" },
            ],
            dateRanges, limit: 100,
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "sessionCampaignName" }],
            metrics: [
              { name: "totalUsers" }, { name: "sessions" }, { name: "conversions" },
              { name: "totalRevenue" },
            ],
            dateRanges, limit: 50,
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "firstUserDefaultChannelGroup" }],
            metrics: [
              { name: "totalUsers" }, { name: "newUsers" }, { name: "engagementRate" },
              { name: "conversions" },
            ],
            dateRanges, limit: 50,
            orderBys: [{ metric: { metricName: "newUsers" }, desc: true }],
          }),
        ]);
        result = {
          channels: parseRows(channels),
          sources: parseRows(sources),
          campaigns: parseRows(campaigns),
          firstUserChannels: parseRows(firstUser),
        };
        break;
      }

      case "engagement": {
        const [pages, events, landingPages] = await Promise.all([
          runReport(accessToken, propId, {
            dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
            metrics: [
              { name: "screenPageViews" }, { name: "totalUsers" },
              { name: "averageSessionDuration" }, { name: "engagementRate" },
              { name: "bounceRate" }, { name: "eventCount" },
            ],
            dateRanges, limit: 200,
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "eventName" }],
            metrics: [
              { name: "eventCount" }, { name: "totalUsers" },
              { name: "eventCountPerUser" }, { name: "eventValue" },
            ],
            dateRanges, limit: 100,
            orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "landingPage" }],
            metrics: [
              { name: "sessions" }, { name: "totalUsers" },
              { name: "engagementRate" }, { name: "bounceRate" },
              { name: "averageSessionDuration" }, { name: "conversions" },
            ],
            dateRanges, limit: 200,
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          }),
        ]);
        result = {
          pages: parseRows(pages),
          events: parseRows(events),
          landingPages: parseRows(landingPages),
        };
        break;
      }

      case "demographics": {
        const [countries, cities, languages, age, gender] = await Promise.all([
          runReport(accessToken, propId, {
            dimensions: [{ name: "country" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "engagementRate" }, { name: "conversions" }],
            dateRanges, limit: 100,
            orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "city" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "engagementRate" }],
            dateRanges, limit: 100,
            orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "language" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }],
            dateRanges, limit: 50,
            orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "userAgeBracket" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "engagementRate" }],
            dateRanges, limit: 10,
            orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "userGender" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "engagementRate" }],
            dateRanges, limit: 10,
          }),
        ]);
        result = {
          countries: parseRows(countries),
          cities: parseRows(cities),
          languages: parseRows(languages),
          ageGroups: parseRows(age),
          genders: parseRows(gender),
        };
        break;
      }

      case "technology": {
        const [browsers, os, devices, screenRes] = await Promise.all([
          runReport(accessToken, propId, {
            dimensions: [{ name: "browser" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "engagementRate" }, { name: "bounceRate" }],
            dateRanges, limit: 30,
            orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "operatingSystem" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "engagementRate" }],
            dateRanges, limit: 20,
            orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "deviceCategory" }],
            metrics: [
              { name: "totalUsers" }, { name: "sessions" },
              { name: "engagementRate" }, { name: "bounceRate" },
              { name: "averageSessionDuration" }, { name: "screenPageViewsPerSession" },
            ],
            dateRanges, limit: 10,
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "screenResolution" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }],
            dateRanges, limit: 20,
            orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          }),
        ]);
        result = {
          browsers: parseRows(browsers),
          operatingSystems: parseRows(os),
          devices: parseRows(devices),
          screenResolutions: parseRows(screenRes),
        };
        break;
      }

      case "realtime": {
        const [activeUsers, byPage, bySource, byCountry, byDevice] = await Promise.all([
          runRealtimeReport(accessToken, propId, [], [{ name: "activeUsers" }]),
          runRealtimeReport(accessToken, propId, [{ name: "unifiedPagePathScreen" }], [{ name: "activeUsers" }, { name: "screenPageViews" }]),
          runRealtimeReport(accessToken, propId, [{ name: "source" }], [{ name: "activeUsers" }]),
          runRealtimeReport(accessToken, propId, [{ name: "country" }], [{ name: "activeUsers" }]),
          runRealtimeReport(accessToken, propId, [{ name: "deviceCategory" }], [{ name: "activeUsers" }]),
        ]);
        result = {
          activeUsers: parseRows(activeUsers)[0]?.activeUsers || 0,
          byPage: parseRows(byPage),
          bySource: parseRows(bySource),
          byCountry: parseRows(byCountry),
          byDevice: parseRows(byDevice),
        };
        break;
      }

      case "retention": {
        const [newVsReturning, cohort] = await Promise.all([
          runReport(accessToken, propId, {
            dimensions: [{ name: "newVsReturning" }],
            metrics: [
              { name: "totalUsers" }, { name: "sessions" },
              { name: "engagementRate" }, { name: "averageSessionDuration" },
              { name: "screenPageViewsPerSession" }, { name: "conversions" },
            ],
            dateRanges,
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "date" }, { name: "newVsReturning" }],
            metrics: [{ name: "totalUsers" }, { name: "sessions" }],
            dateRanges, limit: 500,
            orderBys: [{ metric: { metricName: "sessions" }, desc: false }],
          }),
        ]);
        result = {
          newVsReturning: parseRows(newVsReturning),
          cohortTrend: parseRows(cohort),
        };
        break;
      }

      case "ecommerce": {
        const [transactions, items] = await Promise.all([
          runReport(accessToken, propId, {
            dimensions: [{ name: "date" }],
            metrics: [
              { name: "ecommercePurchases" }, { name: "totalRevenue" },
              { name: "purchaseRevenue" }, { name: "averagePurchaseRevenue" },
              { name: "totalPurchasers" }, { name: "transactions" },
            ],
            dateRanges, limit: 500,
            orderBys: [{ metric: { metricName: "totalRevenue" }, desc: false }],
          }),
          runReport(accessToken, propId, {
            dimensions: [{ name: "itemName" }],
            metrics: [
              { name: "itemsViewed" }, { name: "itemsAddedToCart" },
              { name: "itemsPurchased" }, { name: "itemRevenue" },
            ],
            dateRanges, limit: 100,
            orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
          }),
        ]);
        result = {
          revenueTrend: parseRows(transactions),
          topItems: parseRows(items),
        };
        break;
      }

      default:
        throw new Error(`report_type inválido: ${report_type}`);
    }

    // Update last sync
    await sb.from("ga4_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("GA4 fetch error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
