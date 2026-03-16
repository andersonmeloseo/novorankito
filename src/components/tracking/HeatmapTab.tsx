import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import {
  useTrackingEvents, TrackingEvent,
} from "@/hooks/use-tracking-events";
import {
  Flame, MousePointer2, ArrowDownFromLine, Loader2, ExternalLink,
  Monitor, Smartphone, Tablet, Eye, BarChart3, Target, Layers,
  RefreshCw, Camera, Download, History, Trash2, Move,
  ArrowLeft, Globe, Info, Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Sub-components
import type { ClickPoint, UrlOption, HeatmapSnapshot, DateRangeValue } from "./heatmap/types";
import { TRAIL_COLORS, DATE_RANGES, loadSnapshots, saveSnapshots } from "./heatmap/types";
import { drawHeatmap, drawMoveTrails } from "./heatmap/canvas-utils";
import { HeatKpi } from "./heatmap/HeatmapKpi";
import { PageRow, SortHeader } from "./heatmap/PageRow";
import { SnapshotCard } from "./heatmap/SnapshotCard";
import { ScrollDepthOverlay } from "./heatmap/ScrollDepthOverlay";
import { TopClickedElements } from "./heatmap/TopClickedElements";
import { DataAvailabilityBadge } from "./heatmap/DataAvailabilityBadge";
import { SmartPagination } from "./heatmap/SmartPagination";
import { SessionReplayViewer } from "./heatmap/SessionReplayViewer";

/* ══════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════ */
export function HeatmapTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const queryClient = useQueryClient();
  const { data: allEvents = [], isLoading } = useTrackingEvents(projectId);

  // ── Date range filter ──
  const [dateRange, setDateRange] = useState<DateRangeValue>(30);

  const filteredByDate = useMemo(() => {
    const cutoff = new Date(Date.now() - dateRange * 86400000).toISOString();
    return allEvents.filter((e) => e.created_at >= cutoff);
  }, [allEvents, dateRange]);

  // Previous period for trend calculation
  const prevPeriodEvents = useMemo(() => {
    const cutoffStart = new Date(Date.now() - dateRange * 2 * 86400000).toISOString();
    const cutoffEnd = new Date(Date.now() - dateRange * 86400000).toISOString();
    return allEvents.filter((e) => e.created_at >= cutoffStart && e.created_at < cutoffEnd);
  }, [allEvents, dateRange]);

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<"click" | "scroll" | "move">("click");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [listDeviceFilter, setListDeviceFilter] = useState<string>("all");
  const [listDataFilter, setListDataFilter] = useState<"all" | "clicks" | "scroll" | "mouse">("all");
  const [listSortBy, setListSortBy] = useState<string>("relevance");
  const [listSearch, setListSearch] = useState("");
  const [listPage, setListPage] = useState(0);
  const CARDS_PER_PAGE = 12;
  const [opacity] = useState(0.65);
  const [showHistory, setShowHistory] = useState(false);
  const [snapshots, setSnapshots] = useState<HeatmapSnapshot[]>(loadSnapshots);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Normalize URL to group pages
  const normalizeUrl = useCallback((raw: string): string => {
    try {
      const u = new URL(raw);
      let path = u.pathname.replace(/\/+$/, "") || "/";
      return u.origin + path;
    } catch {
      return raw.split("?")[0].split("#")[0].replace(/\/+$/, "") || raw;
    }
  }, []);

  // URL options with stats (uses date-filtered events)
  const urlOptions = useMemo((): UrlOption[] => {
    const map = new Map<string, { rawUrls: Set<string>; clicks: number; exits: number; views: number; visitors: Set<string>; moveSessions: number; scrollSum: number; scrollCount: number; firstEvent: string; lastEvent: string; cities: Map<string, number>; countries: Map<string, number>; devices: Set<string>; browsers: Map<string, number>; referrers: Map<string, number> }>();
    filteredByDate.forEach((e) => {
      const rawUrl = e.page_url;
      if (!rawUrl) return;
      const url = normalizeUrl(rawUrl);
      const entry = map.get(url) || { rawUrls: new Set<string>(), clicks: 0, exits: 0, views: 0, visitors: new Set<string>(), moveSessions: 0, scrollSum: 0, scrollCount: 0, firstEvent: e.created_at, lastEvent: e.created_at, cities: new Map<string, number>(), countries: new Map<string, number>(), devices: new Set<string>(), browsers: new Map<string, number>(), referrers: new Map<string, number>() };
      entry.rawUrls.add(rawUrl);
      if (["click", "button_click", "whatsapp_click", "phone_click", "email_click", "heatmap_click", "dead_click"].includes(e.event_type)) entry.clicks++;
      if (e.event_type === "page_exit") {
        entry.exits++;
        if (e.scroll_depth != null) { entry.scrollSum += e.scroll_depth; entry.scrollCount++; }
        const m = e.metadata as any;
        if (m?.move_samples?.length) entry.moveSessions++;
      }
      if (e.event_type === "page_view") entry.views++;
      if (e.visitor_id) entry.visitors.add(e.visitor_id);
      if (e.city) entry.cities.set(e.city, (entry.cities.get(e.city) || 0) + 1);
      if (e.country) entry.countries.set(e.country, (entry.countries.get(e.country) || 0) + 1);
      if (e.device) entry.devices.add(e.device);
      if (e.browser) entry.browsers.set(e.browser, (entry.browsers.get(e.browser) || 0) + 1);
      if (e.referrer) entry.referrers.set(e.referrer, (entry.referrers.get(e.referrer) || 0) + 1);
      if (e.created_at < entry.firstEvent) entry.firstEvent = e.created_at;
      if (e.created_at > entry.lastEvent) entry.lastEvent = e.created_at;
      map.set(url, entry);
    });
    return Array.from(map.entries())
      .map(([url, s]) => {
        let topCity = "", maxCityCount = 0;
        s.cities.forEach((count, city) => { if (count > maxCityCount) { maxCityCount = count; topCity = city; } });
        let topCountry = "", maxCountryCount = 0;
        s.countries.forEach((count, country) => { if (count > maxCountryCount) { maxCountryCount = count; topCountry = country; } });
        let topBrowser = "", maxBrowserCount = 0;
        s.browsers.forEach((count, browser) => { if (count > maxBrowserCount) { maxBrowserCount = count; topBrowser = browser; } });
        let topReferrer = "", maxRefCount = 0;
        s.referrers.forEach((count, ref) => { if (count > maxRefCount) { maxRefCount = count; topReferrer = ref; } });
        return {
          url, rawUrls: Array.from(s.rawUrls), clicks: s.clicks, exits: s.exits, views: s.views,
          visitors: s.visitors.size,
          avgScroll: s.scrollCount > 0 ? Math.round(s.scrollSum / s.scrollCount) : 0,
          moveCount: s.moveSessions,
          firstEvent: s.firstEvent, lastEvent: s.lastEvent,
          topCity, topCountry, topBrowser, topReferrer,
          devices: Array.from(s.devices),
        };
      })
      .sort((a, b) => (b.clicks + b.views) - (a.clicks + a.views));
  }, [filteredByDate, normalizeUrl]);

  // ── Trend calculations ──
  const currentClicks = useMemo(() => filteredByDate.filter(e => ["click", "button_click", "whatsapp_click", "phone_click", "email_click", "heatmap_click"].includes(e.event_type)).length, [filteredByDate]);
  const prevClicks = useMemo(() => prevPeriodEvents.filter(e => ["click", "button_click", "whatsapp_click", "phone_click", "email_click", "heatmap_click"].includes(e.event_type)).length, [prevPeriodEvents]);
  const currentVisitors = useMemo(() => new Set(filteredByDate.map(e => e.visitor_id).filter(Boolean)).size, [filteredByDate]);
  const prevVisitors = useMemo(() => new Set(prevPeriodEvents.map(e => e.visitor_id).filter(Boolean)).size, [prevPeriodEvents]);

  const calcTrend = (current: number, prev: number): number | undefined => {
    if (prev === 0) return current > 0 ? 100 : undefined;
    return Math.round(((current - prev) / prev) * 100);
  };

  const filteredEvents = useMemo(() => {
    if (!selectedUrl) return [];
    return filteredByDate.filter((e) => {
      if (!e.page_url) return false;
      if (normalizeUrl(e.page_url) !== selectedUrl) return false;
      if (deviceFilter !== "all" && e.device !== deviceFilter) return false;
      return true;
    });
  }, [filteredByDate, selectedUrl, deviceFilter, normalizeUrl]);

  const clickPoints = useMemo((): ClickPoint[] => {
    return filteredEvents
      .filter((e) => e.metadata && typeof e.metadata === "object" && (e.metadata as any).click_x != null)
      .map((e) => {
        const m = e.metadata as any;
        return { x: m.click_x || 0, y: m.click_y || 0, vx: m.click_vx || 0, vy: m.click_vy || 0, vpW: m.vp_w || 1440, vpH: m.vp_h || 900, docH: m.doc_h || 3000 };
      });
  }, [filteredEvents]);

  const moveSessions = useMemo(() => {
    const sessions: { sessionId: string; points: { x: number; y: number; t: number }[]; vpW: number }[] = [];
    filteredEvents.forEach((e) => {
      if (e.event_type !== "page_exit") return;
      const m = e.metadata as any;
      if (!m?.move_samples?.length) return;
      sessions.push({ sessionId: e.session_id || e.visitor_id || "unknown", points: m.move_samples, vpW: m.vp_w || 1440 });
    });
    return sessions;
  }, [filteredEvents]);

  const totalMovePoints = useMemo(() => moveSessions.reduce((s, sess) => s + sess.points.length, 0), [moveSessions]);
  const exitEvents = useMemo(() => filteredEvents.filter((e) => e.event_type === "page_exit"), [filteredEvents]);

  const referenceVpW = useMemo(() => {
    if (heatmapMode === "move" && moveSessions.length) {
      const counts = new Map<number, number>();
      moveSessions.forEach((s) => counts.set(s.vpW, (counts.get(s.vpW) || 0) + 1));
      let maxCount = 0, maxW = 1440;
      counts.forEach((c, w) => { if (c > maxCount) { maxCount = c; maxW = w; } });
      return maxW;
    }
    if (!clickPoints.length) return 1440;
    const counts = new Map<number, number>();
    clickPoints.forEach((p) => counts.set(p.vpW, (counts.get(p.vpW) || 0) + 1));
    let maxCount = 0, maxW = 1440;
    counts.forEach((c, w) => { if (c > maxCount) { maxCount = c; maxW = w; } });
    return maxW;
  }, [clickPoints, moveSessions, heatmapMode]);

  const estimatedDocH = useMemo(() => {
    if (!clickPoints.length) return 3000;
    return Math.max(...clickPoints.map((p) => p.docH), 3000);
  }, [clickPoints]);

  const totalClicks = clickPoints.length;
  const uniqueVisitors = new Set(filteredEvents.map((e) => e.visitor_id).filter(Boolean)).size;
  const avgScrollDepth = exitEvents.length > 0 ? Math.round(exitEvents.reduce((s, e) => s + (e.scroll_depth || 0), 0) / exitEvents.length) : 0;
  const hotZone = useMemo(() => {
    if (!clickPoints.length) return "—";
    const buckets = Array(10).fill(0);
    clickPoints.forEach((p) => { const pct = Math.min(Math.floor((p.y / estimatedDocH) * 10), 9); buckets[pct]++; });
    const maxIdx = buckets.indexOf(Math.max(...buckets));
    return `${maxIdx * 10}–${(maxIdx + 1) * 10}%`;
  }, [clickPoints, estimatedDocH]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerSize({ width: entry.contentRect.width, height: Math.max(entry.contentRect.width * 0.65, 500) });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const fullPageHeight = useMemo(() => Math.max(containerSize.height, estimatedDocH * (containerSize.width / referenceVpW)), [containerSize, estimatedDocH, referenceVpW]);

  const redrawHeatmap = useCallback(() => {
    if (!canvasRef.current) return;
    if (heatmapMode === "click") {
      drawHeatmap(canvasRef.current, clickPoints, { width: containerSize.width, height: fullPageHeight }, referenceVpW, estimatedDocH, 0, 28, opacity);
    } else if (heatmapMode === "move") {
      const sessionsWithColors = moveSessions.map((s, i) => ({
        points: s.points,
        color: TRAIL_COLORS[i % TRAIL_COLORS.length],
      }));
      drawMoveTrails(canvasRef.current, sessionsWithColors, { width: containerSize.width, height: fullPageHeight }, referenceVpW);
    }
  }, [clickPoints, moveSessions, containerSize, referenceVpW, estimatedDocH, heatmapMode, opacity, fullPageHeight]);

  useEffect(() => { redrawHeatmap(); }, [redrawHeatmap]);

  /* ── Export as PNG ── */
  const exportAsImage = useCallback(() => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = containerSize.width * 2;
    exportCanvas.height = containerSize.height * 2;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    if (canvasRef.current) ctx.drawImage(canvasRef.current, 0, 0, exportCanvas.width, exportCanvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, exportCanvas.width, 60);
    ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif";
    const modeLabel = heatmapMode === "click" ? "Cliques" : heatmapMode === "scroll" ? "Scroll" : "Movimento";
    ctx.fillText(`Rankito Heatmap — ${modeLabel} — ${new Date().toLocaleDateString("pt-BR")}`, 16, 24);
    ctx.font = "13px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.7)";
    try { ctx.fillText(new URL(selectedUrl || "").pathname, 16, 46); } catch { ctx.fillText(selectedUrl || "", 16, 46); }
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, exportCanvas.height - 40, exportCanvas.width, 40);
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "12px sans-serif";
    ctx.fillText(`${totalClicks} cliques  •  ${uniqueVisitors} visitantes  •  ${avgScrollDepth}% scroll médio  •  ${moveSessions.length} trilhas de mouse`, 16, exportCanvas.height - 14);
    const link = document.createElement("a");
    link.download = `heatmap-${heatmapMode}-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
    toast.success("Imagem exportada com sucesso!");
  }, [containerSize, heatmapMode, selectedUrl, totalClicks, uniqueVisitors, avgScrollDepth, moveSessions.length]);

  /* ── Save Snapshot ── */
  const saveSnapshot = useCallback(() => {
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 400; thumbCanvas.height = 260;
    const ctx = thumbCanvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, 400, 260);
    if (canvasRef.current) ctx.drawImage(canvasRef.current, 0, 0, 400, 260);
    const snap: HeatmapSnapshot = {
      id: crypto.randomUUID(), url: selectedUrl || "", mode: heatmapMode, device: deviceFilter,
      totalClicks, avgScroll: avgScrollDepth, visitors: uniqueVisitors,
      capturedAt: new Date().toISOString(), thumbnail: thumbCanvas.toDataURL("image/png", 0.7),
    };
    const updated = [snap, ...snapshots];
    setSnapshots(updated); saveSnapshots(updated);
    toast.success("Snapshot salvo no histórico!");
  }, [heatmapMode, selectedUrl, deviceFilter, totalClicks, avgScrollDepth, uniqueVisitors, snapshots]);

  const deleteSnapshot = useCallback((id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated); saveSnapshots(updated); toast("Snapshot excluído.");
  }, [snapshots]);

  const exportSnapshot = useCallback((snap: HeatmapSnapshot) => {
    const link = document.createElement("a");
    link.download = `heatmap-${snap.mode}-${new Date(snap.capturedAt).toISOString().slice(0, 10)}.png`;
    link.href = snap.thumbnail; link.click(); toast.success("Imagem exportada!");
  }, []);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const hasData = filteredByDate.length > 0;

  /* ── Date Range Selector ── */
  const DateRangeSelector = (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
      {DATE_RANGES.map((r) => (
        <Button
          key={r.value}
          size="sm"
          variant={dateRange === r.value ? "default" : "ghost"}
          className={`h-7 text-[10px] px-2.5 ${dateRange === r.value ? "" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => { setDateRange(r.value); setListPage(0); }}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );

  /* ══════════════════════════════════════════════
     LISTING VIEW — cards per URL
     ══════════════════════════════════════════════ */
  if (!selectedUrl) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <FeatureBanner icon={Flame} title="Heatmaps Visuais & Session Replay" description={<>Visualize <strong>cliques</strong>, <strong>scroll</strong>, <strong>rastro do mouse</strong> e <strong>grave sessões completas</strong> dos seus visitantes. Dados com retenção automática de <strong>30 dias</strong>.</>} />

        {/* Date range + cleanup */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {DateRangeSelector}
          </div>
          {hasData && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[10px] text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={async () => {
                if (!projectId) return;
                const confirmed = window.confirm("Tem certeza que deseja excluir TODOS os eventos de heatmap deste projeto? Esta ação não pode ser desfeita.");
                if (!confirmed) return;
                const heatmapTypes = ["click", "button_click", "whatsapp_click", "phone_click", "email_click", "heatmap_click", "page_exit", "page_view", "rage_click", "dead_click"];
                const { error } = await supabase
                  .from("tracking_events")
                  .delete()
                  .eq("project_id", projectId)
                  .in("event_type", heatmapTypes);
                if (error) { toast.error("Erro ao limpar dados: " + error.message); return; }
                toast.success("Todos os dados de heatmap foram excluídos!");
                queryClient.invalidateQueries({ queryKey: ["tracking-events", projectId] });
              }}
            >
              <Trash2 className="h-3 w-3" /> Limpar todos os dados
            </Button>
          )}
        </div>

        {/* KPIs with trends */}
        <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <HeatKpi
            label="Páginas Rastreadas"
            value={urlOptions.length}
            icon={Globe}
          />
          <HeatKpi
            label="Total de Cliques"
            value={currentClicks.toLocaleString("pt-BR")}
            icon={MousePointer2}
            trend={calcTrend(currentClicks, prevClicks)}
            trendLabel={`vs ${dateRange}d ant.`}
          />
          <HeatKpi
            label="Visitantes Únicos"
            value={currentVisitors.toLocaleString("pt-BR")}
            icon={Eye}
            trend={calcTrend(currentVisitors, prevVisitors)}
            trendLabel={`vs ${dateRange}d ant.`}
          />
          <HeatKpi label="Snapshots Salvos" value={snapshots.length} icon={Camera} />
        </StaggeredGrid>

        {/* Snapshot History toggle */}
        {snapshots.length > 0 && (
          <div className="flex justify-end">
            <Button size="sm" variant={showHistory ? "default" : "outline"} className="h-8 gap-1.5 text-[10px]" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-3.5 w-3.5" /> Histórico de Snapshots
              <Badge variant="secondary" className="text-[8px] ml-0.5 h-4 min-w-[16px] px-1">{snapshots.length}</Badge>
            </Button>
          </div>
        )}

        {showHistory && (
          <AnimatedContainer delay={0.02}>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold font-display">Histórico de Snapshots</h4>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive hover:text-destructive gap-1" onClick={() => { setSnapshots([]); saveSnapshots([]); toast("Histórico limpo."); }}>
                  <Trash2 className="h-3 w-3" /> Limpar tudo
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {snapshots.map((snap) => <SnapshotCard key={snap.id} snap={snap} onDelete={() => deleteSnapshot(snap.id)} onExport={() => exportSnapshot(snap)} />)}
              </div>
            </Card>
          </AnimatedContainer>
        )}

        {/* Filters */}
        <AnimatedContainer delay={0.02}>
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Buscar Página</label>
                <Input
                  placeholder="Filtrar por URL..."
                  value={listSearch}
                  onChange={(e) => { setListSearch(e.target.value); setListPage(0); }}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Dispositivo</label>
                <div className="flex gap-1">
                  {[
                    { value: "all", icon: Layers, label: "Todos" },
                    { value: "desktop", icon: Monitor, label: "Desktop" },
                    { value: "tablet", icon: Tablet, label: "Tablet" },
                    { value: "mobile", icon: Smartphone, label: "Mobile" },
                  ].map((d) => {
                    const isActive = listDeviceFilter === d.value;
                    return (
                      <Button
                        key={d.value}
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 gap-1.5 text-[10px] ${!isActive ? "hover:bg-primary hover:text-primary-foreground hover:border-primary" : ""}`}
                        onClick={() => setListDeviceFilter(d.value)}
                      >
                        <d.icon className="h-3.5 w-3.5" />{d.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Tipo de Dados</label>
                <div className="flex gap-1">
                  {[
                    { value: "all" as const, icon: Layers, label: "Todos" },
                    { value: "clicks" as const, icon: MousePointer2, label: "Com Cliques" },
                    { value: "scroll" as const, icon: ArrowDownFromLine, label: "Com Scroll" },
                    { value: "mouse" as const, icon: Move, label: "Com Trilhas" },
                  ].map((d) => {
                    const isActive = listDataFilter === d.value;
                    return (
                      <Button
                        key={d.value}
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 gap-1.5 text-[10px] ${!isActive ? "hover:bg-primary hover:text-primary-foreground hover:border-primary" : ""}`}
                        onClick={() => { setListDataFilter(d.value); setListPage(0); }}
                      >
                        <d.icon className="h-3.5 w-3.5" />{d.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </AnimatedContainer>

        {/* Page table */}
        {(() => {
          let filtered = urlOptions.filter((opt) => {
            if (listSearch && !opt.url.toLowerCase().includes(listSearch.toLowerCase())) return false;
            if (listDeviceFilter !== "all" && !opt.devices.includes(listDeviceFilter)) return false;
            if (listDataFilter === "clicks" && opt.clicks === 0) return false;
            if (listDataFilter === "scroll" && opt.avgScroll === 0) return false;
            if (listDataFilter === "mouse" && opt.moveCount === 0) return false;
            return true;
          });
          const sortField = listSortBy.replace(/^-/, "");
          const sortAsc = listSortBy.startsWith("-");
          const sortFn = (a: typeof filtered[0], b: typeof filtered[0]) => {
            let diff = 0;
            if (sortField === "clicks") diff = b.clicks - a.clicks;
            else if (sortField === "views") diff = b.views - a.views;
            else if (sortField === "visitors") diff = b.visitors - a.visitors;
            else if (sortField === "scroll") diff = b.avgScroll - a.avgScroll;
            else if (sortField === "recent") diff = b.lastEvent.localeCompare(a.lastEvent);
            else diff = (b.clicks + b.views) - (a.clicks + a.views);
            return sortAsc ? -diff : diff;
          };
          filtered.sort(sortFn);

          const totalPages = Math.ceil(filtered.length / CARDS_PER_PAGE);
          const safePage = Math.min(listPage, Math.max(totalPages - 1, 0));
          const paginated = filtered.slice(safePage * CARDS_PER_PAGE, (safePage + 1) * CARDS_PER_PAGE);

          return filtered.length > 0 ? (
            <div className="space-y-4">
              <AnimatedContainer delay={0.04}>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Página</th>
                          <SortHeader label="Views" field="views" current={listSortBy} onSort={setListSortBy} className="text-center" />
                          <SortHeader label="Cliques" field="clicks" current={listSortBy} onSort={setListSortBy} className="text-center" />
                          <SortHeader label="Visitantes" field="visitors" current={listSortBy} onSort={setListSortBy} className="text-center" />
                          <SortHeader label="Scroll" field="scroll" current={listSortBy} onSort={setListSortBy} className="text-center hidden lg:table-cell" />
                          <th className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground text-center hidden lg:table-cell">Dispositivo</th>
                          <th className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground hidden xl:table-cell">Navegador</th>
                          <th className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground hidden md:table-cell">Localização</th>
                          <th className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground hidden xl:table-cell">Origem</th>
                          <SortHeader label="Último evento" field="recent" current={listSortBy} onSort={setListSortBy} className="text-right hidden md:table-cell" />
                          <th className="py-2.5 px-2 w-[60px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((opt, idx) => (
                          <PageRow
                            key={opt.url}
                            url={opt.url}
                            clicks={opt.clicks}
                            views={opt.views}
                            visitors={opt.visitors}
                            avgScroll={opt.avgScroll}
                            lastEvent={opt.lastEvent}
                            topCity={opt.topCity}
                            topCountry={opt.topCountry}
                            topBrowser={opt.topBrowser}
                            topReferrer={opt.topReferrer}
                            devices={opt.devices}
                            isEven={idx % 2 === 1}
                            onClick={() => setSelectedUrl(opt.url)}
                            onDelete={async (e) => {
                              e.stopPropagation();
                              if (!projectId) return;
                              if (!window.confirm(`Excluir todos os dados de heatmap da página "${(() => { try { return new URL(opt.url).pathname; } catch { return opt.url; } })()}"?`)) return;
                              const { error } = await supabase
                                .from("tracking_events")
                                .delete()
                                .eq("project_id", projectId)
                                .in("page_url", opt.rawUrls);
                              if (error) { toast.error("Erro ao excluir: " + error.message); return; }
                              toast.success("Dados da página excluídos!");
                              queryClient.invalidateQueries({ queryKey: ["tracking-events", projectId] });
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </AnimatedContainer>
              <SmartPagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPageChange={setListPage}
                itemLabel="páginas"
              />
            </div>
          ) : (
            <AnimatedContainer delay={0.06}>
              <Card className="p-10 text-center border-dashed">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <Flame className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h4 className="text-sm font-bold text-foreground mb-2">
                  {urlOptions.length === 0 ? "Nenhum dado de heatmap ainda" : "Nenhuma página encontrada"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {urlOptions.length === 0
                    ? "Instale o Pixel Rankito no seu site para começar a capturar cliques, scroll e movimentos dos visitantes automaticamente."
                    : "Tente ajustar os filtros de busca, dispositivo ou período de tempo."}
                </p>
                {urlOptions.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs" onClick={() => { /* Could navigate to pixel install */ }}>
                    <Info className="h-3.5 w-3.5" /> Como instalar o Pixel
                  </Button>
                )}
              </Card>
            </AnimatedContainer>
          );
        })()}

        {/* Session Replay section */}
        {projectId && (
          <AnimatedContainer delay={0.08}>
            <SessionReplayViewer projectId={projectId} />
          </AnimatedContainer>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     DETAIL VIEW — heatmap for selected URL
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Back + Date Range */}
      <AnimatedContainer>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { setSelectedUrl(null); setIframeLoaded(false); setIframeError(false); }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para páginas
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {DateRangeSelector}
          </div>
        </div>
      </AnimatedContainer>

      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <HeatKpi label="Cliques Mapeados" value={totalClicks.toLocaleString("pt-BR")} icon={MousePointer2} />
        <HeatKpi label="Visitantes Únicos" value={uniqueVisitors.toLocaleString("pt-BR")} icon={Eye} />
        <HeatKpi label="Scroll Médio" value={`${avgScrollDepth}%`} icon={ArrowDownFromLine} />
        <HeatKpi label="Zona Quente" value={hotZone} icon={Target} />
        <HeatKpi label="Trilhas de Mouse" value={`${moveSessions.length} sessões (${totalMovePoints} pts)`} icon={Move} />
      </StaggeredGrid>

      {/* Data Availability Feedback */}
      <AnimatedContainer delay={0.01}>
        <div className="flex flex-wrap gap-2">
          <DataAvailabilityBadge available={totalClicks > 0} count={totalClicks} label="Cliques com coordenadas" icon={MousePointer2} />
          <DataAvailabilityBadge available={exitEvents.length > 0} count={exitEvents.length} label="Sessões com scroll" icon={ArrowDownFromLine} />
          <DataAvailabilityBadge available={moveSessions.length > 0} count={moveSessions.length} label="Trilhas de mouse" icon={Move} />
          {!totalClicks && !exitEvents.length && !moveSessions.length && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-warning/5 border-warning/20 text-warning text-[10px]">
              <Info className="h-3 w-3" />
              <span>Aguardando dados do pixel de rastreamento.</span>
            </div>
          )}
        </div>
      </AnimatedContainer>

      {/* Controls */}
      <AnimatedContainer delay={0.02}>
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[250px]">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Página</label>
              <Select value={selectedUrl} onValueChange={setSelectedUrl}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione uma página..." /></SelectTrigger>
                <SelectContent>
                  {urlOptions.map((opt) => (
                    <SelectItem key={opt.url} value={opt.url} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[300px]">{(() => { try { return new URL(opt.url).pathname; } catch { return opt.url; } })()}</span>
                        <Badge variant="secondary" className="text-[9px] shrink-0">{opt.clicks} cliques</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Dispositivo</label>
              <div className="flex gap-1">
                {[
                  { value: "all", icon: Layers, label: "Todos" },
                  { value: "desktop", icon: Monitor, label: "Desktop" },
                  { value: "tablet", icon: Tablet, label: "Tablet" },
                  { value: "mobile", icon: Smartphone, label: "Mobile" },
                ].map((d) => (
                  <Button key={d.value} size="sm" variant={deviceFilter === d.value ? "default" : "outline"} className="h-9 gap-1.5 text-[10px]" onClick={() => setDeviceFilter(d.value)}>
                    <d.icon className="h-3.5 w-3.5" />{d.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Tipo</label>
              <Tabs value={heatmapMode} onValueChange={(v) => setHeatmapMode(v as any)}>
                <TabsList className="h-9">
                  <TabsTrigger value="click" className="text-[10px] gap-1.5 h-7"><MousePointer2 className="h-3.5 w-3.5" /> Cliques</TabsTrigger>
                  <TabsTrigger value="move" className="text-[10px] gap-1.5 h-7"><Move className="h-3.5 w-3.5" /> Movimento</TabsTrigger>
                  <TabsTrigger value="scroll" className="text-[10px] gap-1.5 h-7"><ArrowDownFromLine className="h-3.5 w-3.5" /> Scroll</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="self-end flex gap-1">
              <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-[10px]" onClick={redrawHeatmap}><RefreshCw className="h-3.5 w-3.5" /> Atualizar</Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-[10px]" onClick={saveSnapshot}><Camera className="h-3.5 w-3.5" /> Snapshot</Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-[10px]" onClick={exportAsImage}><Download className="h-3.5 w-3.5" /> PNG</Button>
              <Button size="sm" variant={showHistory ? "default" : "outline"} className="h-9 gap-1.5 text-[10px]" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-3.5 w-3.5" /> Histórico
                {snapshots.length > 0 && <Badge variant="secondary" className="text-[8px] ml-0.5 h-4 min-w-[16px] px-1">{snapshots.length}</Badge>}
              </Button>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Snapshot History */}
      {showHistory && (
        <AnimatedContainer delay={0.02}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold font-display">Histórico de Snapshots</h4>
                <Badge variant="secondary" className="text-[9px]">{snapshots.length} gravações</Badge>
              </div>
              {snapshots.length > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive hover:text-destructive gap-1" onClick={() => { setSnapshots([]); saveSnapshots([]); toast("Histórico limpo."); }}>
                  <Trash2 className="h-3 w-3" /> Limpar tudo
                </Button>
              )}
            </div>
            {snapshots.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-3">
                  <Camera className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <p className="text-xs text-muted-foreground">Nenhum snapshot salvo ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {snapshots.map((snap) => <SnapshotCard key={snap.id} snap={snap} onDelete={() => deleteSnapshot(snap.id)} onExport={() => exportSnapshot(snap)} />)}
              </div>
            )}
          </Card>
        </AnimatedContainer>
      )}

      {/* Heatmap Viewport */}
      <AnimatedContainer delay={0.04}>
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-muted-foreground truncate">{selectedUrl}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[9px] gap-1">
                <Flame className="h-3 w-3" />
                {heatmapMode === "click" ? `${totalClicks} cliques` : heatmapMode === "move" ? `${moveSessions.length} trilhas` : `${exitEvents.length} sessões`}
              </Badge>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                <a href={selectedUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
              </Button>
            </div>
          </div>

          <div ref={containerRef} className="relative bg-muted/10 overflow-y-auto" style={{ height: `${containerSize.height}px`, minHeight: "500px" }}>
            <div className="relative" style={{ minHeight: `${Math.max(containerSize.height, estimatedDocH * (containerSize.width / referenceVpW))}px` }}>
              <iframe ref={iframeRef} src={selectedUrl} className="absolute inset-0 w-full border-0" style={{ zIndex: 1, pointerEvents: "none", height: `${Math.max(containerSize.height, estimatedDocH * (containerSize.width / referenceVpW))}px` }}
                sandbox="allow-same-origin allow-scripts"
                onLoad={() => { setIframeLoaded(true); setIframeError(false); }}
                onError={() => { setIframeError(true); setIframeLoaded(false); }}
                title="Heatmap preview"
              />

              {(heatmapMode === "click" || heatmapMode === "move") && (
                <canvas ref={canvasRef} className="absolute inset-0 w-full"
                  style={{ zIndex: 5, pointerEvents: "none", mixBlendMode: heatmapMode === "click" ? "multiply" : "normal", opacity: 0.8, height: `${Math.max(containerSize.height, estimatedDocH * (containerSize.width / referenceVpW))}px` }}
                />
              )}

              {heatmapMode === "scroll" && <ScrollDepthOverlay events={exitEvents} iframeHeight={containerSize.height} />}

              {heatmapMode === "move" && moveSessions.length > 0 && (
                <div className="absolute top-3 right-3 z-20 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2.5 max-h-[200px] overflow-y-auto">
                  <p className="text-[9px] font-bold text-foreground mb-1.5 uppercase tracking-wider">Sessões ({moveSessions.length})</p>
                  {moveSessions.slice(0, 10).map((s, i) => (
                    <div key={s.sessionId} className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      <div className="w-3 h-1 rounded-full" style={{ backgroundColor: TRAIL_COLORS[i % TRAIL_COLORS.length] }} />
                      <span className="truncate max-w-[80px]">{s.sessionId.slice(-8)}</span>
                      <span className="text-muted-foreground/60">{s.points.length} pts</span>
                    </div>
                  ))}
                  {moveSessions.length > 10 && <p className="text-[8px] text-muted-foreground/50 mt-1">+{moveSessions.length - 10} mais</p>}
                </div>
              )}

              {heatmapMode === "move" && moveSessions.length === 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center space-y-2 max-w-md px-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-2">
                      <Move className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Nenhuma trilha de mouse ainda</h3>
                    <p className="text-xs text-muted-foreground">
                      O Pixel Rankito v3.3.0 captura automaticamente o movimento do mouse. As trilhas aparecerão nos dados de <code className="bg-muted px-1 rounded text-[10px]">page_exit</code> quando usuários navegarem pelo site.
                    </p>
                  </div>
                </div>
              )}

              {!iframeLoaded && !iframeError && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando página...</p>
                  </div>
                </div>
              )}

              {iframeError && (
                <div className="absolute inset-0 z-6">
                  <div className="absolute inset-0" style={{
                    backgroundImage: "linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                    backgroundColor: "hsl(var(--muted) / 0.3)",
                  }} />
                  <div className="absolute inset-x-0 top-0 h-14 bg-muted/50 border-b border-border/30 flex items-center px-6">
                    <div className="h-4 w-24 bg-muted-foreground/10 rounded" />
                    <div className="flex-1" />
                    <div className="flex gap-3">
                      <div className="h-3 w-12 bg-muted-foreground/10 rounded" />
                      <div className="h-3 w-12 bg-muted-foreground/10 rounded" />
                      <div className="h-3 w-12 bg-muted-foreground/10 rounded" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 top-14 bottom-0 p-8 space-y-4">
                    <div className="h-8 w-64 bg-muted-foreground/8 rounded" />
                    <div className="h-4 w-96 bg-muted-foreground/5 rounded" />
                    <div className="h-4 w-80 bg-muted-foreground/5 rounded" />
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="h-24 bg-muted-foreground/5 rounded-lg" />
                      <div className="h-24 bg-muted-foreground/5 rounded-lg" />
                      <div className="h-24 bg-muted-foreground/5 rounded-lg" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 z-20 bg-background/90 backdrop-blur-sm border border-warning/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="p-1.5 rounded-lg bg-warning/10">
                        <Info className="h-4 w-4 text-warning shrink-0" />
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground font-medium text-[11px]">Site bloqueou o iframe</p>
                        <p className="text-muted-foreground text-[10px]">O heatmap é renderizado sobre um grid de referência com seus dados reais.</p>
                      </div>
                      <a href={selectedUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-[10px] shrink-0 font-medium">
                        Abrir site <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Top Click Elements */}
      {clickPoints.length > 0 && (
        <AnimatedContainer delay={0.06}>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold font-display">Elementos Mais Clicados</h4>
            </div>
            <TopClickedElements events={filteredEvents} />
          </Card>
        </AnimatedContainer>
      )}

      {!hasData && (
        <AnimatedContainer delay={0.06}>
          <Card className="p-10 text-center border-dashed">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Flame className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h4 className="text-sm font-bold text-foreground mb-2">Nenhum dado de heatmap ainda</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Nenhum evento de clique, scroll ou movimento registrado para este projeto no período selecionado.
            </p>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}
