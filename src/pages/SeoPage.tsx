import { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSeoMetrics } from "@/hooks/use-data-modules";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Search, Download, ArrowUpDown, ChevronLeft, ChevronRight,
  Calendar, Filter, TrendingUp, Globe, Monitor, FileText, RefreshCw, Loader2, ArrowLeft,
  Link2, MapPin, Compass, ScanSearch, Sparkles, Target, TrendingDown, Copy, Shield,
  History, FolderTree,
} from "lucide-react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { UrlInspectionTab } from "@/components/seo/UrlInspectionTab";
import { SitemapsTab } from "@/components/seo/SitemapsTab";
import { LinksTab } from "@/components/seo/LinksTab";
import { DiscoverNewsTab } from "@/components/seo/DiscoverNewsTab";
import { SearchAppearanceTab } from "@/components/seo/SearchAppearanceTab";
import { OpportunitiesTab } from "@/components/seo/OpportunitiesTab";
import { ContentDecayTab } from "@/components/seo/ContentDecayTab";
import { CannibalizationTab } from "@/components/seo/CannibalizationTab";
import { IndexCoverageTab } from "@/components/seo/IndexCoverageTab";
import { PositionHistoryTab } from "@/components/seo/PositionHistoryTab";
import { UrlGroupingTab } from "@/components/seo/UrlGroupingTab";
import { AiInsightsTab } from "@/components/seo/AiInsightsTab";
import { ExportMenu } from "@/components/ui/export-menu";
import { exportCSV as exportCSVUtil, exportXML } from "@/lib/export-utils";
import { format, subDays, subYears, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortDir = "asc" | "desc";
type DateRange = "1" | "7" | "28" | "90" | "180" | "480" | "custom";
type CompareMode = "previous" | "year" | "custom" | "none";

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

const PAGE_SIZE = 20;

export default function SeoPage() {
  const { user } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id").eq("owner_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });
  const storedId = typeof window !== "undefined" ? localStorage.getItem("rankito_current_project") : null;
  const projectId = (storedId && projects.find(p => p.id === storedId)?.id) || projects[0]?.id;
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  // Check GSC connection
  const { data: gscConnection } = useQuery({
    queryKey: ["gsc-connection", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("gsc_connections").select("id, connection_name, site_url, last_sync_at").eq("project_id", projectId!).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const syncGscData = async () => {
    if (!projectId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-gsc-data", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["seo-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["gsc-connection"] });
      toast({ title: `Sincronização concluída!`, description: `${data?.inserted?.toLocaleString() || 0} métricas importadas do GSC.` });
    } catch (e: any) {
      toast({ title: "Erro ao sincronizar GSC", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>("28");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [compareMode, setCompareMode] = useState<CompareMode>("previous");

  // Search / filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  // Active KPI for chart overlay
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["clicks", "impressions"]);

  // Pagination per tab
  const [pagesPage, setPagesPage] = useState(1);
  const [queriesPage, setQueriesPage] = useState(1);
  const [countriesPage, setCountriesPage] = useState(1);
  const [devicesPage, setDevicesPage] = useState(1);

  // Sort state per tab
  const [pagesSort, setPagesSort] = useState<{ key: string; dir: SortDir }>({ key: "clicks", dir: "desc" });
  const [queriesSort, setQueriesSort] = useState<{ key: string; dir: SortDir }>({ key: "clicks", dir: "desc" });
  const [countriesSort, setCountriesSort] = useState<{ key: string; dir: SortDir }>({ key: "clicks", dir: "desc" });

  // Separate queries per dimension type for accuracy
  const { data: dateMetrics = [], isLoading: loadingDate } = useSeoMetrics(projectId, "date");
  const { data: queryMetrics = [], isLoading: loadingQuery } = useSeoMetrics(projectId, "query");
  const { data: pageMetrics = [], isLoading: loadingPage } = useSeoMetrics(projectId, "page");
  const { data: countryMetrics = [], isLoading: loadingCountry } = useSeoMetrics(projectId, "country");
  const { data: deviceMetrics = [], isLoading: loadingDevice } = useSeoMetrics(projectId, "device");
  const { data: dateDeviceMetrics = [] } = useSeoMetrics(projectId, "date_device");
  const { data: dateCountryMetrics = [] } = useSeoMetrics(projectId, "date_country");
  const { data: queryPageMetrics = [] } = useSeoMetrics(projectId, "query_page");
  
  // Fallback: also load combined (legacy data before migration)
  const { data: combinedMetrics = [], isLoading: loadingCombined } = useSeoMetrics(projectId, "combined");

  // Drill-down state
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  
  // Choose the right data source based on active filters
  const baseMetrics = useMemo(() => {
    if (deviceFilter !== "all" && dateDeviceMetrics.length > 0) {
      return dateDeviceMetrics.filter((m: any) => m.device === deviceFilter);
    }
    if (countryFilter !== "all" && dateCountryMetrics.length > 0) {
      return dateCountryMetrics.filter((m: any) => m.country === countryFilter);
    }
    return dateMetrics.length > 0 ? dateMetrics : combinedMetrics;
  }, [dateMetrics, combinedMetrics, dateDeviceMetrics, dateCountryMetrics, deviceFilter, countryFilter]);
  
  const isLoading = loadingDate || loadingCombined;

  // Date filtering for KPIs and trend chart
  const fmtDateStr = (d: Date) => d.toISOString().split("T")[0];

  const { filteredMetrics, prevMetrics, currentDateRange, prevDateRange } = useMemo(() => {
    let from: Date, to: Date;

    if (dateRange === "custom" && customFrom && customTo) {
      from = parseISO(customFrom);
      to = parseISO(customTo);
    } else {
      // GSC "Last 28 days" = 28 days ending at the last day with complete data (~3 days ago).
      // Verified: Jan 18–Feb 14 returns 836 clicks matching GSC's 835. Without delay (Jan 20–Feb 17) returns only 794.
      const today = new Date();
      const days = parseInt(dateRange);
      to = subDays(today, 3);
      from = subDays(to, days - 1);
    }

    const periodLength = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    let prevFrom: Date, prevTo: Date;

    if (compareMode === "year") {
      prevFrom = subYears(from, 1);
      prevTo = subYears(to, 1);
    } else if (compareMode === "previous") {
      prevTo = subDays(from, 1);
      prevFrom = subDays(prevTo, periodLength - 1);
    } else {
      prevFrom = new Date(0);
      prevTo = new Date(0);
    }

    const filtered = baseMetrics.filter((m: any) => {
      const d = parseISO(m.metric_date);
      return isWithinInterval(d, { start: from, end: to });
    });

    const prev = compareMode !== "none" ? baseMetrics.filter((m: any) => {
      const d = parseISO(m.metric_date);
      return isWithinInterval(d, { start: prevFrom, end: prevTo });
    }) : [];

    return {
      filteredMetrics: filtered,
      prevMetrics: prev,
      currentDateRange: { start: fmtDateStr(from), end: fmtDateStr(to) },
      prevDateRange: compareMode !== "none" ? { start: fmtDateStr(prevFrom), end: fmtDateStr(prevTo) } : null,
    };
  }, [baseMetrics, dateRange, customFrom, customTo, compareMode]);

  const metrics = filteredMetrics;

  const prevFiltered = prevMetrics;

  // Live data from GSC API - always fetch when GSC is connected
  const hasGsc = !!gscConnection;
  const isComparing = compareMode !== "none" && hasGsc;
  const { data: comparisonData, isLoading: loadingComparison } = useQuery({
    queryKey: ["gsc-live", projectId, dateRange, customFrom, customTo, compareMode],
    queryFn: async () => {
      const isCustom = dateRange === "custom" && customFrom && customTo;
      const { data, error } = await supabase.functions.invoke("query-gsc-live", {
        body: {
          project_id: projectId,
          days: dateRange,
          compare_mode: compareMode,
          ...(isCustom ? { custom_start: customFrom, custom_end: customTo } : {}),
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: hasGsc && !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // KPIs - use exact GSC aggregate totals (queried without dimensions = exact match with GSC UI)
  const liveCurrentTotals = comparisonData?.totals?.current;
  const livePrevTotals = comparisonData?.totals?.previous;
  const useLive = !!liveCurrentTotals;

  const totalClicks = useLive
    ? liveCurrentTotals.clicks
    : metrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const totalImpressions = useLive
    ? liveCurrentTotals.impressions
    : metrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const avgCtr = useLive
    ? liveCurrentTotals.ctr
    : (totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0);
  const avgPosition = useLive
    ? liveCurrentTotals.position
    : (totalImpressions > 0
      ? metrics.reduce((s: number, m: any) => s + (Number(m.position || 0) * (m.impressions || 0)), 0) / totalImpressions
      : 0);

  const prevClicks = useLive
    ? livePrevTotals.clicks
    : prevFiltered.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const prevImpressions = useLive
    ? livePrevTotals.impressions
    : prevFiltered.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const prevAvgCtr = useLive
    ? livePrevTotals.ctr
    : (prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0);
  const prevAvgPosition = useLive
    ? livePrevTotals.position
    : (prevImpressions > 0
      ? prevFiltered.reduce((s: number, m: any) => s + (Number(m.position || 0) * (m.impressions || 0)), 0) / prevImpressions
      : 0);

  const pctChange = (curr: number, prev: number) => prev === 0 ? 0 : parseFloat((((curr - prev) / prev) * 100).toFixed(1));

  // Unique values for filters (from dedicated dimension data)
  const uniqueDevices = useMemo(() => deviceMetrics.map((m: any) => m.device).filter(Boolean), [deviceMetrics]);
  const uniqueCountries = useMemo(() => countryMetrics.map((m: any) => m.country).filter(Boolean), [countryMetrics]);

  // Tables use their dedicated dimension data (already aggregated by GSC)
  function filterAndSort(data: any[], nameKey: string, sort: { key: string; dir: SortDir }) {
    let filtered = data.map((m: any) => ({
      name: m[nameKey] || "—",
      clicks: m.clicks || 0,
      impressions: m.impressions || 0,
      ctr: m.ctr || 0,
      position: m.position || 0,
    }));
    if (searchTerm) {
      filtered = filtered.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return sortData(filtered, sort.key, sort.dir);
  }

  const pageRows = useMemo(() => filterAndSort(pageMetrics.length > 0 ? pageMetrics : combinedMetrics, "url", pagesSort), [pageMetrics, combinedMetrics, searchTerm, pagesSort]);
  const queryRows = useMemo(() => filterAndSort(queryMetrics.length > 0 ? queryMetrics : combinedMetrics, "query", queriesSort), [queryMetrics, combinedMetrics, searchTerm, queriesSort]);
  const countryRows = useMemo(() => filterAndSort(countryMetrics.length > 0 ? countryMetrics : combinedMetrics, "country", countriesSort), [countryMetrics, combinedMetrics, searchTerm, countriesSort]);
  const deviceRows = useMemo(() => {
    const src = deviceMetrics.length > 0 ? deviceMetrics : combinedMetrics;
    return src.filter((m: any) => m.device).map((m: any) => ({
      name: m.device,
      clicks: m.clicks || 0,
      impressions: m.impressions || 0,
      ctr: m.ctr || 0,
      position: m.position || 0,
    }));
  }, [deviceMetrics, combinedMetrics]);

  // Merge comparison data into rows
  function mergeWithComparison(currentRows: any[], previousRows: any[]): any[] {
    const prevMap = new Map(previousRows.map((r: any) => [r.name, r]));
    return currentRows.map((row: any) => {
      const prev = prevMap.get(row.name);
      return {
        ...row,
        prevClicks: prev?.clicks ?? 0,
        prevImpressions: prev?.impressions ?? 0,
        prevCtr: prev?.ctr ?? 0,
        prevPosition: prev?.position ?? 0,
        diffClicks: row.clicks - (prev?.clicks ?? 0),
        diffImpressions: row.impressions - (prev?.impressions ?? 0),
        diffCtr: parseFloat((row.ctr - (prev?.ctr ?? 0)).toFixed(2)),
        diffPosition: parseFloat((row.position - (prev?.position ?? 0)).toFixed(1)),
      };
    });
  }

  // Build comparison-aware rows when data is available
  const compQueryRows = useMemo(() => {
    if (!comparisonData?.query) return null;
    const current = comparisonData.query.current || [];
    const previous = comparisonData.query.previous || [];
    let rows = mergeWithComparison(current, previous);
    if (searchTerm) rows = rows.filter((r: any) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(rows, queriesSort.key, queriesSort.dir);
  }, [comparisonData, searchTerm, queriesSort]);

  const compPageRows = useMemo(() => {
    if (!comparisonData?.page) return null;
    const current = comparisonData.page.current || [];
    const previous = comparisonData.page.previous || [];
    let rows = mergeWithComparison(current, previous);
    if (searchTerm) rows = rows.filter((r: any) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(rows, pagesSort.key, pagesSort.dir);
  }, [comparisonData, searchTerm, pagesSort]);

  const compCountryRows = useMemo(() => {
    if (!comparisonData?.country) return null;
    const current = comparisonData.country.current || [];
    const previous = comparisonData.country.previous || [];
    let rows = mergeWithComparison(current, previous);
    if (searchTerm) rows = rows.filter((r: any) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(rows, countriesSort.key, countriesSort.dir);
  }, [comparisonData, searchTerm, countriesSort]);

  const compDeviceRows = useMemo(() => {
    if (!comparisonData?.device) return null;
    const current = comparisonData.device.current || [];
    const previous = comparisonData.device.previous || [];
    let rows = mergeWithComparison(current, previous);
    return rows;
  }, [comparisonData]);

  // Column definitions for comparison mode
  const baseColumns = (nameLabel: string) => [
    { key: "name", label: nameLabel },
    { key: "clicks", label: "Cliques" },
    { key: "impressions", label: "Impressões" },
    { key: "ctr", label: "CTR" },
    { key: "position", label: "Posição" },
  ];

  const comparisonColumns = (nameLabel: string) => [
    { key: "name", label: nameLabel },
    { key: "clicks", label: "Cliques" },
    { key: "prevClicks", label: "Ant." },
    { key: "diffClicks", label: "Dif." },
    { key: "impressions", label: "Impressões" },
    { key: "prevImpressions", label: "Ant." },
    { key: "diffImpressions", label: "Dif." },
    { key: "ctr", label: "CTR" },
    { key: "prevCtr", label: "Ant." },
    { key: "diffCtr", label: "Dif." },
    { key: "position", label: "Posição" },
    { key: "prevPosition", label: "Ant." },
    { key: "diffPosition", label: "Dif." },
  ];

  const getColumns = (nameLabel: string) => isComparing && comparisonData ? comparisonColumns(nameLabel) : baseColumns(nameLabel);

  const drillPagesForQuery = useMemo(() => {
    if (!selectedQuery) return [];
    return queryPageMetrics
      .filter((m: any) => m.query === selectedQuery)
      .map((m: any) => ({
        name: m.url || "—",
        clicks: m.clicks || 0,
        impressions: m.impressions || 0,
        ctr: m.ctr || 0,
        position: m.position || 0,
      }))
      .sort((a: any, b: any) => b.clicks - a.clicks);
  }, [selectedQuery, queryPageMetrics]);

  // Drill-down: queries for a selected page
  const drillQueriesForPage = useMemo(() => {
    if (!selectedPage) return [];
    return queryPageMetrics
      .filter((m: any) => m.url === selectedPage)
      .map((m: any) => ({
        name: m.query || "—",
        clicks: m.clicks || 0,
        impressions: m.impressions || 0,
        ctr: m.ctr || 0,
        position: m.position || 0,
      }))
      .sort((a: any, b: any) => b.clicks - a.clicks);
  }, [selectedPage, queryPageMetrics]);

  // Trend data - prefer live GSC "date" dimension when available, fallback to stored metrics
  const trendData = useMemo(() => {
    const liveCurrentDates = comparisonData?.date?.current || [];
    const livePrevDates = comparisonData?.date?.previous || [];
    const useLiveForTrend = liveCurrentDates.length > 0;

    if (useLiveForTrend) {
      const currentSorted = [...liveCurrentDates]
        .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      const prevSorted = [...livePrevDates]
        .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));

      return currentSorted.map((m: any, i: number) => {
        const prev = prevSorted[i];
        return {
          date: format(parseISO(m.name), "dd MMM", { locale: ptBR }),
          rawDate: m.name,
          clicks: m.clicks || 0,
          impressions: m.impressions || 0,
          ctr: m.ctr || 0,
          position: m.position || 0,
          prevClicks: prev ? (prev.clicks || 0) : undefined,
          prevImpressions: prev ? (prev.impressions || 0) : undefined,
          prevCtr: prev ? (prev.ctr || 0) : undefined,
          prevPosition: prev ? (prev.position || 0) : undefined,
        };
      });
    }

    const currentSorted = [...metrics]
      .sort((a: any, b: any) => (a.metric_date || "").localeCompare(b.metric_date || ""));
    const prevSorted = [...prevFiltered]
      .sort((a: any, b: any) => (a.metric_date || "").localeCompare(b.metric_date || ""));

    return currentSorted.map((m: any, i: number) => {
      const prev = prevSorted[i];
      return {
        date: format(parseISO(m.metric_date), "dd MMM", { locale: ptBR }),
        rawDate: m.metric_date,
        clicks: m.clicks || 0,
        impressions: m.impressions || 0,
        ctr: (m.impressions || 0) > 0 ? parseFloat((((m.clicks || 0) / (m.impressions || 0)) * 100).toFixed(2)) : 0,
        position: m.position || 0,
        prevClicks: prev ? (prev.clicks || 0) : undefined,
        prevImpressions: prev ? (prev.impressions || 0) : undefined,
        prevCtr: prev && (prev.impressions || 0) > 0 ? parseFloat((((prev.clicks || 0) / (prev.impressions || 0)) * 100).toFixed(2)) : undefined,
        prevPosition: prev ? (prev.position || 0) : undefined,
      };
    });
  }, [metrics, prevFiltered, comparisonData]);

  // Device distribution for pie chart (from dedicated device data)
  const deviceDistribution = useMemo(() => {
    return deviceRows.map((d: any) => ({ name: d.name, value: d.clicks }));
  }, [deviceRows]);

  const hasData = metrics.length > 0 || (comparisonData?.date?.current || []).length > 0;

  // Export
  function exportCSV(rows: any[], filename: string) {
    exportCSVUtil(rows, filename);
  }
  function exportXMLData(rows: any[], filename: string) {
    exportXML(rows, filename, "seoData", "row");
  }

  function toggleMetric(metric: string) {
    setActiveMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  }

  return (
    <>
      <TopBar title="SEO" subtitle="Performance completa via Google Search Console" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <FeatureBanner icon={Search} title="SEO & Search Console" description={<>Analise <strong>posições</strong>, <strong>cliques</strong>, <strong>impressões</strong>, <strong>CTR</strong> e oportunidades de otimização com dados reais do Google Search Console.</>} />
        {/* Sync bar */}
        {gscConnection && (
          <AnimatedContainer>
            <Card className="p-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-muted-foreground">GSC conectado:</span>
                <span className="font-medium text-foreground">{gscConnection.site_url}</span>
                {gscConnection.last_sync_at && (
                  <span className="text-muted-foreground">
                    · Último sync: {format(parseISO(gscConnection.last_sync_at), "dd/MM HH:mm")}
                  </span>
                )}
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" onClick={syncGscData} disabled={syncing}>
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {syncing ? "Sincronizando..." : "Sincronizar dados"}
              </Button>
            </Card>
          </AnimatedContainer>
        )}
        {/* Filters bar */}
        <AnimatedContainer>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={dateRange} onValueChange={(v) => { setDateRange(v as DateRange); setPagesPage(1); setQueriesPage(1); }}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Últimas 24 horas</SelectItem>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="28">Últimos 28 dias</SelectItem>
                    <SelectItem value="90">Últimos 3 meses</SelectItem>
                    <SelectItem value="180">Últimos 6 meses</SelectItem>
                    <SelectItem value="480">Últimos 16 meses</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">vs</span>
                <Select value={compareMode} onValueChange={(v) => setCompareMode(v as CompareMode)}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous">Período anterior</SelectItem>
                    <SelectItem value="year">Mesmo período ano anterior</SelectItem>
                    <SelectItem value="none">Sem comparação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-9 text-xs w-[140px]" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-9 text-xs w-[140px]" />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Dispositivo</label>
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Dispositivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos dispositivos</SelectItem>
                    {uniqueDevices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">País</label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos países</SelectItem>
                    {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[180px] space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar páginas, queries..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </Card>
        </AnimatedContainer>

        {isLoading ? (
          <>
            <KpiSkeleton />
            <ChartSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            {/* KPI Cards with period comparison */}
            <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Cliques" value={totalClicks} change={pctChange(totalClicks, prevClicks)} prevValue={prevClicks} showComparison={compareMode !== "none" && prevClicks > 0}
                sparklineData={trendData.map(d => d.clicks)} sparklinePrevData={compareMode !== "none" ? trendData.map(d => d.prevClicks ?? 0) : undefined} sparklineColor="hsl(var(--chart-1))" />
              <KpiCard label="Impressões" value={totalImpressions} change={pctChange(totalImpressions, prevImpressions)} prevValue={prevImpressions} showComparison={compareMode !== "none" && prevImpressions > 0}
                sparklineData={trendData.map(d => d.impressions)} sparklinePrevData={compareMode !== "none" ? trendData.map(d => d.prevImpressions ?? 0) : undefined} sparklineColor="hsl(var(--chart-2))" />
              <KpiCard label="CTR Médio" value={Number(avgCtr.toFixed(2))} change={pctChange(avgCtr, prevAvgCtr)} suffix="%" prevValue={Number(prevAvgCtr.toFixed(2))} showComparison={compareMode !== "none" && prevImpressions > 0}
                sparklineData={trendData.map(d => d.ctr)} sparklinePrevData={compareMode !== "none" ? trendData.map(d => d.prevCtr ?? 0) : undefined} sparklineColor="hsl(var(--chart-3))" />
              <KpiCard label="Posição Média" value={Number(avgPosition.toFixed(1))} change={pctChange(avgPosition, prevAvgPosition)} prevValue={Number(prevAvgPosition.toFixed(1))} showComparison={compareMode !== "none" && prevImpressions > 0}
                sparklineData={trendData.map(d => d.position)} sparklinePrevData={compareMode !== "none" ? trendData.map(d => d.prevPosition ?? 0) : undefined} sparklineColor="hsl(var(--chart-4))" />
            </StaggeredGrid>

            {/* Charts Section */}
            {hasData && trendData.length > 1 && (
              <>
                {/* Main trend chart - full width */}
                <AnimatedContainer delay={0.1}>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Tendência de Performance
                      </h3>
                      <div className="flex gap-1">
                        {[
                          { key: "clicks", label: "Cliques", color: "hsl(var(--chart-1))" },
                          { key: "impressions", label: "Impressões", color: "hsl(var(--chart-2))" },
                          { key: "ctr", label: "CTR", color: "hsl(var(--chart-3))" },
                          { key: "position", label: "Posição", color: "hsl(var(--chart-4))" },
                        ].map(item => (
                          <Button
                            key={item.key}
                            variant={activeMetrics.includes(item.key) ? "default" : "outline"}
                            size="sm"
                            className="text-[10px] h-7 px-2"
                            onClick={() => toggleMetric(item.key)}
                          >
                            <span className="w-2 h-2 rounded-full mr-1" style={{ background: item.color }} />
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                          <defs>
                            <linearGradient id="clicksGradSeo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="impressionsGradSeo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="ctrGradSeo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: 12,
                            }}
                          />
                          {activeMetrics.includes("clicks") && (
                            <Area type="monotone" dataKey="clicks" name="Cliques" stroke="hsl(var(--chart-1))" fill="url(#clicksGradSeo)" strokeWidth={2} />
                          )}
                          {activeMetrics.includes("clicks") && compareMode !== "none" && (
                            <Area type="monotone" dataKey="prevClicks" name="Cliques (anterior)" stroke="hsl(var(--chart-1))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" strokeOpacity={0.4} dot={false} />
                          )}
                          {activeMetrics.includes("impressions") && (
                            <Area type="monotone" dataKey="impressions" name="Impressões" stroke="hsl(var(--chart-2))" fill="url(#impressionsGradSeo)" strokeWidth={2} />
                          )}
                          {activeMetrics.includes("impressions") && compareMode !== "none" && (
                            <Area type="monotone" dataKey="prevImpressions" name="Impressões (anterior)" stroke="hsl(var(--chart-2))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" strokeOpacity={0.4} dot={false} />
                          )}
                          {activeMetrics.includes("ctr") && (
                            <Area type="monotone" dataKey="ctr" name="CTR %" stroke="hsl(var(--chart-3))" fill="url(#ctrGradSeo)" strokeWidth={2} />
                          )}
                          {activeMetrics.includes("ctr") && compareMode !== "none" && (
                            <Area type="monotone" dataKey="prevCtr" name="CTR % (anterior)" stroke="hsl(var(--chart-3))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" strokeOpacity={0.4} dot={false} />
                          )}
                          {activeMetrics.includes("position") && (
                            <Area type="monotone" dataKey="position" name="Posição" stroke="hsl(var(--chart-4))" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                          )}
                          {activeMetrics.includes("position") && compareMode !== "none" && (
                            <Area type="monotone" dataKey="prevPosition" name="Posição (anterior)" stroke="hsl(var(--chart-4))" fill="none" strokeWidth={1.5} strokeDasharray="2 3" strokeOpacity={0.4} dot={false} />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </AnimatedContainer>

                {/* Device distribution + Top queries side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <AnimatedContainer delay={0.15}>
                    <Card className="p-5 h-full">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-4">
                        <Monitor className="h-4 w-4 text-primary" />
                        Cliques por Dispositivo
                      </h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deviceDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {deviceDistribution.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: 12,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </AnimatedContainer>

                  {queryRows.length > 0 && (
                    <AnimatedContainer delay={0.2}>
                      <Card className="p-5 h-full">
                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-4">
                          <FileText className="h-4 w-4 text-primary" />
                          Top 10 Consultas por Cliques
                        </h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={queryRows.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 9 }}
                                stroke="hsl(var(--muted-foreground))"
                                width={140}
                                tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + "…" : v}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  fontSize: 12,
                                }}
                              />
                              <Bar dataKey="clicks" name="Cliques" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </AnimatedContainer>
                  )}
                </div>
              </>
            )}

            {!hasData && (
              <EmptyState
                icon={Search}
                title="Nenhuma métrica SEO"
                description="Conecte o Google Search Console ou adicione dados para visualizar performance."
              />
            )}

            {/* Data tables with tabs */}
            {hasData && (
              <AnimatedContainer delay={0.25}>
                {isComparing && loadingComparison && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregando dados de comparação do GSC...
                  </div>
                )}
                <Tabs defaultValue="queries">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                     <TabsList className="flex-wrap h-auto gap-1">
                      <TabsTrigger value="queries" className="text-xs gap-1" onClick={() => { setSelectedQuery(null); setSelectedPage(null); }}><Search className="h-3 w-3" />Consultas</TabsTrigger>
                      <TabsTrigger value="pages" className="text-xs gap-1" onClick={() => { setSelectedQuery(null); setSelectedPage(null); }}><FileText className="h-3 w-3" />Páginas</TabsTrigger>
                      <TabsTrigger value="countries" className="text-xs gap-1"><Globe className="h-3 w-3" />Países</TabsTrigger>
                      <TabsTrigger value="devices" className="text-xs gap-1"><Monitor className="h-3 w-3" />Dispositivos</TabsTrigger>
                      <TabsTrigger value="appearance" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Aparência</TabsTrigger>
                      <TabsTrigger value="opportunities" className="text-xs gap-1"><Target className="h-3 w-3" />Oportunidades</TabsTrigger>
                      <TabsTrigger value="decay" className="text-xs gap-1"><TrendingDown className="h-3 w-3" />Declínio de Conteúdo</TabsTrigger>
                      <TabsTrigger value="cannibalization" className="text-xs gap-1"><Copy className="h-3 w-3" />Canibalização</TabsTrigger>
                       <TabsTrigger value="inspection" className="text-xs gap-1"><ScanSearch className="h-3 w-3" />Inspeção</TabsTrigger>
                       <TabsTrigger value="coverage" className="text-xs gap-1"><Shield className="h-3 w-3" />Cobertura</TabsTrigger>
                      <TabsTrigger value="sitemaps" className="text-xs gap-1"><MapPin className="h-3 w-3" />Sitemaps</TabsTrigger>
                      <TabsTrigger value="links" className="text-xs gap-1"><Link2 className="h-3 w-3" />Links</TabsTrigger>
                       <TabsTrigger value="discover" className="text-xs gap-1"><Compass className="h-3 w-3" />Discover & News</TabsTrigger>
                       <TabsTrigger value="history" className="text-xs gap-1"><History className="h-3 w-3" />Histórico</TabsTrigger>
                       <TabsTrigger value="grouping" className="text-xs gap-1"><FolderTree className="h-3 w-3" />Agrupamento</TabsTrigger>
                       <TabsTrigger value="ai-insights" className="text-xs gap-1.5 border border-primary/30 bg-primary/5 text-primary"><Sparkles className="h-3 w-3" />IA Insights</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="queries" className="mt-0">
                    {selectedQuery ? (
                      <div>
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSelectedQuery(null)}>
                            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                          </Button>
                          <span className="text-xs text-muted-foreground">Páginas para:</span>
                          <span className="text-xs font-medium font-mono text-foreground">{selectedQuery}</span>
                        </div>
                        <SortableTable
                          columns={[
                            { key: "name", label: "Página" },
                            { key: "clicks", label: "Cliques" },
                            { key: "impressions", label: "Impressões" },
                            { key: "ctr", label: "CTR" },
                            { key: "position", label: "Posição" },
                          ]}
                          rows={drillPagesForQuery}
                          sort={pagesSort}
                          onSort={(key) => { setPagesSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" })); setPagesPage(1); }}
                          page={pagesPage}
                          onPageChange={setPagesPage}
                           onExport={() => exportCSV(drillPagesForQuery, `seo-paginas-${selectedQuery}`)}
                           onExportXML={() => exportXMLData(drillPagesForQuery, `seo-paginas-${selectedQuery}`)}
                        />
                      </div>
                    ) : (
                      <SortableTable
                        columns={getColumns("Consulta")}
                        rows={compQueryRows || queryRows}
                        sort={queriesSort}
                        onSort={(key) => { setQueriesSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" })); setQueriesPage(1); }}
                        page={queriesPage}
                        onPageChange={setQueriesPage}
                         onExport={() => exportCSV(compQueryRows || queryRows, "seo-consultas")}
                         onExportXML={() => exportXMLData(compQueryRows || queryRows, "seo-consultas")}
                        onRowClick={(row) => { setSelectedQuery(row.name); setPagesPage(1); }}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="pages" className="mt-0">
                    {selectedPage ? (
                      <div>
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSelectedPage(null)}>
                            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                          </Button>
                          <span className="text-xs text-muted-foreground">Consultas para:</span>
                          <span className="text-xs font-medium font-mono text-foreground truncate max-w-[400px]">{selectedPage}</span>
                        </div>
                        <SortableTable
                          columns={[
                            { key: "name", label: "Consulta" },
                            { key: "clicks", label: "Cliques" },
                            { key: "impressions", label: "Impressões" },
                            { key: "ctr", label: "CTR" },
                            { key: "position", label: "Posição" },
                          ]}
                          rows={drillQueriesForPage}
                          sort={queriesSort}
                          onSort={(key) => setQueriesSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" }))}
                          page={queriesPage}
                          onPageChange={setQueriesPage}
                           onExport={() => exportCSV(drillQueriesForPage, `seo-consultas-${selectedPage}`)}
                           onExportXML={() => exportXMLData(drillQueriesForPage, `seo-consultas-${selectedPage}`)}
                        />
                      </div>
                    ) : (
                      <SortableTable
                        columns={getColumns("Página")}
                        rows={compPageRows || pageRows}
                        sort={pagesSort}
                        onSort={(key) => { setPagesSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" })); setPagesPage(1); }}
                        page={pagesPage}
                        onPageChange={setPagesPage}
                         onExport={() => exportCSV(compPageRows || pageRows, "seo-paginas")}
                         onExportXML={() => exportXMLData(compPageRows || pageRows, "seo-paginas")}
                        onRowClick={(row) => { setSelectedPage(row.name); setQueriesPage(1); }}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="countries" className="mt-0">
                    <SortableTable
                      columns={getColumns("País")}
                      rows={compCountryRows || countryRows}
                      sort={countriesSort}
                      onSort={(key) => { setCountriesSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" })); setCountriesPage(1); }}
                      page={countriesPage}
                      onPageChange={setCountriesPage}
                       onExport={() => exportCSV(compCountryRows || countryRows, "seo-paises")}
                       onExportXML={() => exportXMLData(compCountryRows || countryRows, "seo-paises")}
                    />
                  </TabsContent>

                  <TabsContent value="devices" className="mt-0">
                    <SortableTable
                      columns={getColumns("Dispositivo")}
                      rows={compDeviceRows || deviceRows}
                      sort={{ key: "clicks", dir: "desc" }}
                      onSort={() => {}}
                      page={devicesPage}
                      onPageChange={setDevicesPage}
                       onExport={() => exportCSV(compDeviceRows || deviceRows, "seo-dispositivos")}
                       onExportXML={() => exportXMLData(compDeviceRows || deviceRows, "seo-dispositivos")}
                    />
                  </TabsContent>

                  <TabsContent value="appearance" className="mt-0">
                    <SearchAppearanceTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="opportunities" className="mt-0">
                    <OpportunitiesTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="decay" className="mt-0">
                    <ContentDecayTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="cannibalization" className="mt-0">
                    <CannibalizationTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="inspection" className="mt-0">
                    <UrlInspectionTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="coverage" className="mt-0">
                    <IndexCoverageTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="sitemaps" className="mt-0">
                    <SitemapsTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="links" className="mt-0">
                    <LinksTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="discover" className="mt-0">
                    <DiscoverNewsTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <PositionHistoryTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="grouping" className="mt-0">
                    <UrlGroupingTab projectId={projectId} />
                  </TabsContent>

                  <TabsContent value="ai-insights" className="mt-0">
                    <AiInsightsTab
                      projectId={projectId}
                      kpis={{
                        totalClicks,
                        totalImpressions,
                        avgCtr,
                        avgPosition,
                        prevClicks,
                        prevImpressions,
                        prevAvgCtr: prevAvgCtr,
                        prevAvgPosition: prevAvgPosition,
                      }}
                      topQueries={queryRows}
                      topPages={pageRows}
                      dateRange={dateRange}
                    />
                  </TabsContent>
                </Tabs>
              </AnimatedContainer>
            )}
          </>
        )}
      </div>
    </>
  );
}

// Helpers
function sortData(data: any[], key: string, dir: SortDir) {
  return [...data].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return dir === "desc" ? bv - av : av - bv;
    return dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
}

interface Column { key: string; label: string }

function SortableTable({
  columns, rows, sort, onSort, page, onPageChange, onExport, onExportXML, onRowClick,
}: {
  columns: Column[];
  rows: any[];
  sort: { key: string; dir: SortDir };
  onSort: (key: string) => void;
  page: number;
  onPageChange: (p: number) => void;
  onExport: () => void;
  onExportXML?: () => void;
  onRowClick?: (row: any) => void;
}) {
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatCell = (row: any, key: string) => {
    const v = row[key];
    // Diff columns with color
    if (key.startsWith("diff")) {
      const isPosition = key === "diffPosition";
      const isGood = isPosition ? v < 0 : v > 0; // Lower position = better
      const isBad = isPosition ? v > 0 : v < 0;
      const colorClass = v === 0 ? "text-muted-foreground" : isGood ? "text-success" : isBad ? "text-destructive" : "";
      if (key === "diffCtr") return <span className={colorClass}>{v > 0 ? "+" : ""}{Number(v).toFixed(2)}%</span>;
      if (key === "diffPosition") return <span className={colorClass}>{v > 0 ? "+" : ""}{Number(v).toFixed(1)}</span>;
      return <span className={colorClass}>{v > 0 ? "+" : ""}{Number(v).toLocaleString()}</span>;
    }
    // Previous period columns (muted)
    if (key.startsWith("prev")) {
      if (key === "prevCtr") return <span className="text-muted-foreground/60">{Number(v).toFixed(2)}%</span>;
      if (key === "prevPosition") return <span className="text-muted-foreground/60">{Number(v).toFixed(1)}</span>;
      return <span className="text-muted-foreground/60">{Number(v).toLocaleString()}</span>;
    }
    if (key === "ctr") return `${Number(v).toFixed(2)}%`;
    if (key === "position") return Number(v).toFixed(1);
    if (key === "clicks" || key === "impressions") return Number(v).toLocaleString();
    return v;
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs text-muted-foreground">{rows.length} resultados</span>
        {onExportXML ? (
          <ExportMenu onExportCSV={onExport} onExportXML={onExportXML} />
        ) : (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onExport}>
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => onSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className={`h-3 w-3 ${sort.key === col.key ? "text-primary" : "opacity-40"}`} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border last:border-0 table-row-hover ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                   {columns.map(col => (
                     <td key={col.key} title={col.key === "name" ? row[col.key] : undefined} className={`px-4 py-3 text-xs ${col.key === "name" ? "font-mono text-foreground max-w-[300px] truncate" : "text-muted-foreground"}`}>
                       {col.key === "name" && typeof row[col.key] === "string" && row[col.key].startsWith("http") ? (
                         <a href={row[col.key]} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                           {formatCell(row, col.key)}
                         </a>
                       ) : formatCell(row, col.key)}
                     </td>
                   ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
