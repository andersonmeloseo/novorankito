import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalyticsSessions, useConversions } from "@/hooks/use-data-modules";
import { OverviewWelcomeBanner } from "@/components/overview/OverviewWelcomeBanner";
import { OverviewKpiGrid } from "@/components/overview/OverviewKpiGrid";
import { OverviewIndexingCard } from "@/components/overview/OverviewIndexingCard";
import { OverviewGa4Row } from "@/components/overview/OverviewGa4Row";
import { OverviewTrendChart } from "@/components/overview/OverviewTrendChart";
import { OverviewDevicesCountries } from "@/components/overview/OverviewDevicesCountries";
import { OverviewTopTables } from "@/components/overview/OverviewTopTables";
import type { OverviewRpcData, IndexingStats } from "@/components/overview/types";

export default function Overview() {
  const { user } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState(localStorage.getItem("rankito_current_project"));

  // === Project selection ===
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects", currentProjectId],
    queryFn: async () => {
      if (currentProjectId) {
        const { data } = await supabase.from("projects").select("id, name, domain").eq("id", currentProjectId).maybeSingle();
        if (data) return [data];
      }
      const { data } = await supabase.from("projects").select("id, name, domain").eq("owner_id", user!.id).order("created_at", { ascending: false }).limit(1);
      if (data && data[0] && !currentProjectId) {
        localStorage.setItem("rankito_current_project", data[0].id);
        setCurrentProjectId(data[0].id);
      }
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;

  // === Date ranges ===
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const currentEnd = fmt(new Date(today.getTime() - 86400000));
  const currentStart = fmt(new Date(today.getTime() - 28 * 86400000));
  const previousEnd = fmt(new Date(today.getTime() - 29 * 86400000));
  const previousStart = fmt(new Date(today.getTime() - 56 * 86400000));

  // === Server-side aggregation via RPC v2 (uses Materialized Views) ===
  const { data: serverOverview, isLoading: overviewLoading } = useQuery({
    queryKey: ["project-overview-v2", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_project_overview_v2", { p_project_id: projectId! });
      if (error) { console.error("RPC error:", error); return null; }
      return data as unknown as OverviewRpcData | null;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  // === Previous period (for comparison %) ===
  const { data: previousSeoMetrics = [] } = useQuery({
    queryKey: ["seo-previous-period", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_metrics")
        .select("dimension_type, clicks, impressions, ctr, position")
        .eq("project_id", projectId!)
        .gte("metric_date", previousStart)
        .lte("metric_date", previousEnd);
      return data || [];
    },
    enabled: !!projectId,
  });

  // === GSC live for real-time comparison ===
  const { data: gscLive } = useQuery({
    queryKey: ["gsc-live-overview", projectId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("query-gsc-live", {
          body: { project_id: projectId, current_start: currentStart, current_end: currentEnd, previous_start: previousStart, previous_end: previousEnd },
        });
        if (error || data?.error) return null;
        return data;
      } catch { return null; }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // === GA4 ===
  const { data: ga4Overview } = useQuery({
    queryKey: ["ga4-overview-safe", projectId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-ga4-data", {
          body: { project_id: projectId, report_type: "overview", start_date: "28daysAgo", end_date: "yesterday" },
        });
        if (error || data?.error) return null;
        return data?.data || null;
      } catch { return null; }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // === Sessions & Conversions (for GA4 fallback) ===
  const { data: sessions = [], isLoading: sessionsLoading } = useAnalyticsSessions(projectId);
  const { data: conversions = [], isLoading: conversionsLoading } = useConversions(projectId);

  const isLoading = overviewLoading || sessionsLoading || conversionsLoading;

  // === Previous period calculations ===
  const prevPageMetrics = previousSeoMetrics.filter((m) => m.dimension_type === "page");
  const prevQueryMetrics = previousSeoMetrics.filter((m) => m.dimension_type === "query");
  const prevClicks = prevPageMetrics.reduce((s, m) => s + (m.clicks || 0), 0);
  const prevImpressions = prevPageMetrics.reduce((s, m) => s + (m.impressions || 0), 0);
  const prevPosCount = prevPageMetrics.filter((m) => m.position > 0).length;
  const prevAvgPosition = prevPosCount > 0 ? prevPageMetrics.reduce((s, m) => s + (m.position || 0), 0) / prevPosCount : 0;
  const prevAvgCtr = prevPageMetrics.length > 0 ? prevPageMetrics.reduce((s, m) => s + (Number(m.ctr) || 0), 0) / prevPageMetrics.length * 100 : 0;

  // === GSC live comparison ===
  const gscCurrent = gscLive?.query?.current || [];
  const gscPrevious = gscLive?.query?.previous || [];
  const liveCurrentClicks = gscCurrent.reduce((s: number, r: { clicks?: number }) => s + (r.clicks || 0), 0);
  const livePreviousClicks = gscPrevious.reduce((s: number, r: { clicks?: number }) => s + (r.clicks || 0), 0);
  const clicksChange = livePreviousClicks > 0 ? ((liveCurrentClicks - livePreviousClicks) / livePreviousClicks) * 100 : undefined;
  const liveCurrentImpressions = gscCurrent.reduce((s: number, r: { impressions?: number }) => s + (r.impressions || 0), 0);
  const livePreviousImpressions = gscPrevious.reduce((s: number, r: { impressions?: number }) => s + (r.impressions || 0), 0);
  const impressionsChange = livePreviousImpressions > 0 ? ((liveCurrentImpressions - livePreviousImpressions) / livePreviousImpressions) * 100 : undefined;

  // === GA4 KPIs ===
  const ga4Users = ga4Overview?.totalUsers || sessions.reduce((s: number, a: { users_count?: number }) => s + (a.users_count || 0), 0);
  const ga4Sessions = ga4Overview?.sessions || sessions.reduce((s: number, a: { sessions_count?: number }) => s + (a.sessions_count || 0), 0);

  // === Trend data from RPC ===
  const trendData = (serverOverview?.daily_trend || []).map((d) => ({
    date: new Date(d.metric_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    clicks: d.clicks || 0,
    impressions: d.impressions || 0,
    position: d.position || 0,
    ctr: d.ctr || 0,
  }));

  // === Indexing stats from RPC ===
  const indexingStats: IndexingStats | null = serverOverview ? {
    totalUrls: serverOverview.indexing.total_urls,
    submitted: serverOverview.indexing.submitted,
    failed: serverOverview.indexing.failed,
    inspected: serverOverview.indexing.inspected,
    indexed: serverOverview.indexing.indexed,
    totalRequests: serverOverview.indexing.total_requests,
    pending: serverOverview.indexing.total_urls - serverOverview.indexing.submitted,
  } : null;

  return (
    <>
      <TopBar title="Visão Geral" subtitle="Resumo de performance do seu projeto" />
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-auto">
        <OverviewWelcomeBanner
          user={user}
          project={projects[0] || null}
          overview={serverOverview ?? null}
          hasGscLive={!!gscLive}
          hasGa4={!!ga4Overview}
        />

        <OverviewKpiGrid
          isLoading={isLoading}
          overview={serverOverview ?? null}
          trendData={trendData}
          clicksChange={clicksChange}
          impressionsChange={impressionsChange}
          prevClicks={prevClicks}
          prevImpressions={prevImpressions}
          prevAvgCtr={prevAvgCtr}
          prevAvgPosition={prevAvgPosition}
          prevTotalPages={prevPageMetrics.length}
          prevTotalQueries={prevQueryMetrics.length}
        />

        <OverviewIndexingCard stats={indexingStats} />

        <OverviewGa4Row
          ga4Overview={ga4Overview}
          ga4Users={ga4Users}
          ga4Sessions={ga4Sessions}
          totalConversions={conversions.length}
        />

        <OverviewTrendChart isLoading={isLoading} trendData={trendData} />

        <OverviewDevicesCountries
          devices={serverOverview?.devices || []}
          countries={serverOverview?.countries || []}
        />

        <OverviewTopTables
          isLoading={isLoading}
          topPages={serverOverview?.top_pages || []}
          topQueries={serverOverview?.top_queries || []}
        />
      </div>
    </>
  );
}
