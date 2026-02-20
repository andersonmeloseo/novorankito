import { getGoogleAccessToken } from "./utils.ts";

export async function fetchGA4Context(
  supabase: any,
  project_id: string
): Promise<string> {
  try {
    const { data: ga4Conn } = await supabase
      .from("ga4_connections")
      .select("client_email, private_key, property_id")
      .eq("project_id", project_id)
      .maybeSingle();

    if (!ga4Conn?.property_id || !ga4Conn?.client_email || !ga4Conn?.private_key) {
      return "### Google Analytics 4: sem conexão ou dados ainda não sincronizados.\n";
    }

    const access_token = await getGoogleAccessToken(
      { client_email: ga4Conn.client_email, private_key: ga4Conn.private_key },
      "https://www.googleapis.com/auth/analytics.readonly"
    );

    if (!access_token) return "### Google Analytics 4: falha na autenticação.\n";

    const ga4Url = `https://analyticsdata.googleapis.com/v1beta/properties/${ga4Conn.property_id}:runReport`;
    const dateRanges = [{ startDate: "28daysAgo", endDate: "yesterday" }];

    const ga4Fetch = (body: any) =>
      fetch(ga4Url, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, dateRanges }),
      }).then((r) => r.json());

    const parseGA4 = (report: any): any[] => {
      if (!report?.rows) return [];
      const dims = (report.dimensionHeaders || []).map((h: any) => h.name);
      const mets = (report.metricHeaders || []).map((h: any) => h.name);
      return report.rows.map((row: any) => {
        const obj: any = {};
        (row.dimensionValues || []).forEach((v: any, i: number) => { obj[dims[i]] = v.value; });
        (row.metricValues || []).forEach((v: any, i: number) => { obj[mets[i]] = parseFloat(v.value) || 0; });
        return obj;
      });
    };

    const [ga4Totals, ga4Channels, ga4TopPages, ga4Devices, ga4Countries, ga4Trend] =
      await Promise.all([
        ga4Fetch({
          dimensions: [],
          metrics: [
            { name: "totalUsers" }, { name: "newUsers" }, { name: "sessions" },
            { name: "engagedSessions" }, { name: "engagementRate" },
            { name: "averageSessionDuration" }, { name: "bounceRate" },
            { name: "conversions" }, { name: "totalRevenue" }, { name: "screenPageViews" },
          ],
        }),
        ga4Fetch({
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }, { name: "engagementRate" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),
        ga4Fetch({
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }, { name: "averageSessionDuration" }, { name: "engagementRate" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 15,
        }),
        ga4Fetch({
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagementRate" }, { name: "bounceRate" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 5,
        }),
        ga4Fetch({
          dimensions: [{ name: "country" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),
        ga4Fetch({
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }, { name: "totalRevenue" }],
          orderBys: [{ metric: { metricName: "date" }, desc: false }],
          limit: 28,
        }),
      ]);

    const totals = parseGA4(ga4Totals)[0] || {};
    const channels = parseGA4(ga4Channels);
    const topPages = parseGA4(ga4TopPages);
    const devices = parseGA4(ga4Devices);
    const countries = parseGA4(ga4Countries);
    const trend = parseGA4(ga4Trend);

    const recentSessions = trend.slice(-7).reduce((s: number, r: any) => s + (r.sessions || 0), 0);
    const prevSessions = trend.slice(-14, -7).reduce((s: number, r: any) => s + (r.sessions || 0), 0);
    const sessionsDelta = prevSessions > 0 ? (((recentSessions - prevSessions) / prevSessions) * 100).toFixed(1) : "N/A";

    return `### Google Analytics 4 — Últimos 28 dias (${ga4Conn.property_id})
Usuários: ${totals.totalUsers?.toLocaleString("pt-BR") || 0} | Novos: ${totals.newUsers?.toLocaleString("pt-BR") || 0} | Sessões: ${totals.sessions?.toLocaleString("pt-BR") || 0}
Engajamento: ${((totals.engagementRate || 0) * 100).toFixed(1)}% | Rejeição: ${((totals.bounceRate || 0) * 100).toFixed(1)}% | Duração: ${Math.floor((totals.averageSessionDuration || 0) / 60)}min
Pageviews: ${totals.screenPageViews?.toLocaleString("pt-BR") || 0} | Conversões: ${totals.conversions?.toLocaleString("pt-BR") || 0} | Receita: R$ ${(totals.totalRevenue || 0).toFixed(2)}
Tendência sessões (7d vs 7d anterior): ${sessionsDelta}%

Canais: ${channels.slice(0, 5).map((c: any) => `${c.sessionDefaultChannelGroup}: ${Math.round(c.sessions || 0)} sess`).join(" | ")}
Top páginas: ${topPages.slice(0, 5).map((p: any) => `${p.pagePath}: ${Math.round(p.screenPageViews || 0)} views`).join(" | ")}
Dispositivos: ${devices.map((d: any) => `${d.deviceCategory}: ${Math.round(d.sessions || 0)} sess`).join(" | ")}
Países: ${countries.slice(0, 4).map((c: any) => `${c.country}: ${Math.round(c.sessions || 0)} sess`).join(" | ")}
`;
  } catch (err) {
    console.warn("[ga4-context] Error:", err);
    return "### Google Analytics 4: erro ao buscar dados.\n";
  }
}
