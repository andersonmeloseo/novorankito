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
  RefreshCw, Camera, Download, History, Trash2, Clock,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/* ── Types ── */
interface ClickPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vpW: number;
  vpH: number;
  docH: number;
}

interface HeatmapSnapshot {
  id: string;
  url: string;
  mode: "click" | "scroll";
  device: string;
  totalClicks: number;
  avgScroll: number;
  visitors: number;
  capturedAt: string;
  thumbnail: string; // base64 data URL
}

const SNAPSHOTS_KEY = "rankito_heatmap_snapshots";

function loadSnapshots(): HeatmapSnapshot[] {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]");
  } catch { return []; }
}

function saveSnapshots(snapshots: HeatmapSnapshot[]) {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots.slice(0, 30)));
}

/* ── Heatmap Canvas Renderer ── */
function drawHeatmap(
  canvas: HTMLCanvasElement,
  points: ClickPoint[],
  iframeRect: { width: number; height: number },
  referenceVpW: number,
  docH: number,
  scrollOffset: number,
  radius: number = 30,
  intensity: number = 0.6,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = iframeRect.width;
  canvas.height = iframeRect.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!points.length) return;

  const scale = iframeRect.width / referenceVpW;

  points.forEach((p) => {
    const x = p.x * scale;
    const y = (p.y - scrollOffset) * scale;
    if (y < -radius || y > canvas.height + radius) return;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * scale);
    gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity})`);
    gradient.addColorStop(0.4, `rgba(255, 165, 0, ${intensity * 0.6})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 0, ${intensity * 0.3})`);
    gradient.addColorStop(1, "rgba(0, 0, 255, 0)");

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(x, y, radius * scale, 0, Math.PI * 2);
    ctx.fill();
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    const ratio = alpha / 255;
    if (ratio > 0.7) {
      data[i] = 255; data[i + 1] = Math.round(255 * (1 - ratio) * 3); data[i + 2] = 0;
    } else if (ratio > 0.4) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 0;
    } else if (ratio > 0.2) {
      data[i] = 0; data[i + 1] = 255; data[i + 2] = Math.round(255 * (1 - ratio * 2));
    } else {
      data[i] = 0; data[i + 1] = Math.round(100 + 155 * ratio * 5); data[i + 2] = 255;
    }
    data[i + 3] = Math.min(alpha * 1.5, 200);
  }
  ctx.putImageData(imageData, 0, 0);
}

/* ── Scroll Depth Overlay ── */
function ScrollDepthOverlay({ events, iframeHeight }: { events: TrackingEvent[]; iframeHeight: number }) {
  const scrollData = useMemo(() => {
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const total = events.length || 1;
    const counts = buckets.map(() => 0);

    events.forEach((e) => {
      const depth = e.scroll_depth ?? 0;
      for (let i = 0; i < buckets.length; i++) {
        if (depth >= buckets[i]) counts[i]++;
      }
    });

    return buckets.map((pct, i) => ({
      pct,
      count: counts[i],
      ratio: counts[i] / total,
    }));
  }, [events]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {scrollData.map((d, i) => {
        const top = (d.pct / 100) * iframeHeight;
        const opacity = 1 - d.ratio;
        const color = `rgba(255, 69, 0, ${opacity * 0.35})`;

        return (
          <div key={d.pct} className="absolute left-0 right-0 flex items-center" style={{ top }}>
            <div
              className="absolute left-0 right-0"
              style={{
                height: i < scrollData.length - 1 ? `${(iframeHeight / scrollData.length)}px` : "20px",
                background: color,
              }}
            />
            <div className="relative z-20 flex items-center gap-1.5 ml-2">
              <div
                className="h-0.5 w-8"
                style={{ background: `color-mix(in srgb, hsl(var(--destructive)) ${Math.round((1 - d.ratio) * 100)}%, hsl(var(--success)))` }}
              />
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-background/80 backdrop-blur-sm border border-border/50 text-foreground">
                {d.pct}% — {Math.round(d.ratio * 100)}% dos usuários
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Draw Scroll on Canvas (for export) ── */
function drawScrollOnCanvas(
  canvas: HTMLCanvasElement,
  events: TrackingEvent[],
  height: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const total = events.length || 1;
  const counts = buckets.map(() => 0);
  events.forEach((e) => {
    const depth = e.scroll_depth ?? 0;
    for (let i = 0; i < buckets.length; i++) {
      if (depth >= buckets[i]) counts[i]++;
    }
  });

  buckets.forEach((pct, i) => {
    const ratio = counts[i] / total;
    const y = (pct / 100) * height;
    const bandH = i < buckets.length - 1 ? height / buckets.length : 20;
    const opacity = (1 - ratio) * 0.35;

    ctx.fillStyle = `rgba(255, 69, 0, ${opacity})`;
    ctx.fillRect(0, y, width, bandH);

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`${pct}% — ${Math.round(ratio * 100)}% usuários`, 10, y + 14);
  });
}

/* ── KPI Card ── */
function HeatKpi({ label, value, icon: Icon }: {
  label: string; value: string | number; icon: React.ElementType;
}) {
  return (
    <Card className="p-3 card-hover">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <span className="text-base font-bold text-foreground font-display">{value}</span>
    </Card>
  );
}

/* ── Snapshot Card ── */
function SnapshotCard({ snap, onDelete, onExport }: {
  snap: HeatmapSnapshot;
  onDelete: () => void;
  onExport: () => void;
}) {
  const date = new Date(snap.capturedAt);
  return (
    <Card className="overflow-hidden card-hover group">
      {/* Thumbnail */}
      <div className="relative h-32 bg-muted/30">
        <img
          src={snap.thumbnail}
          alt="Heatmap snapshot"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 pb-2">
          <Button size="sm" variant="secondary" className="h-7 text-[10px] gap-1" onClick={onExport}>
            <Download className="h-3 w-3" /> Exportar
          </Button>
          <Button size="sm" variant="destructive" className="h-7 text-[10px] gap-1" onClick={onDelete}>
            <Trash2 className="h-3 w-3" /> Excluir
          </Button>
        </div>
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 text-[8px] bg-background/80 backdrop-blur-sm"
        >
          {snap.mode === "click" ? "Cliques" : "Scroll"}
        </Badge>
      </div>
      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-[10px] text-muted-foreground truncate" title={snap.url}>
          {(() => { try { return new URL(snap.url).pathname; } catch { return snap.url; } })()}
        </p>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[8px]">{snap.device}</Badge>
          <Badge variant="outline" className="text-[8px]">{snap.totalClicks} cliques</Badge>
          <Badge variant="outline" className="text-[8px]">{snap.avgScroll}% scroll</Badge>
          <Badge variant="outline" className="text-[8px]">{snap.visitors} visitantes</Badge>
        </div>
      </div>
    </Card>
  );
}

/* ── Main Component ── */
export function HeatmapTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const { data: allEvents = [], isLoading } = useTrackingEvents(projectId);

  const [selectedUrl, setSelectedUrl] = useState<string>("");
  const [heatmapMode, setHeatmapMode] = useState<"click" | "scroll">("click");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [opacity] = useState(0.65);
  const [showHistory, setShowHistory] = useState(false);
  const [snapshots, setSnapshots] = useState<HeatmapSnapshot[]>(loadSnapshots);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // URL options
  const urlOptions = useMemo(() => {
    const map = new Map<string, { clicks: number; exits: number; views: number }>();
    allEvents.forEach((e) => {
      const url = e.page_url;
      if (!url) return;
      const entry = map.get(url) || { clicks: 0, exits: 0, views: 0 };
      if (["click", "button_click", "whatsapp_click", "phone_click", "email_click", "heatmap_click"].includes(e.event_type)) entry.clicks++;
      if (e.event_type === "page_exit") entry.exits++;
      if (e.event_type === "page_view") entry.views++;
      map.set(url, entry);
    });
    return Array.from(map.entries())
      .map(([url, stats]) => ({ url, ...stats }))
      .sort((a, b) => (b.clicks + b.views) - (a.clicks + a.views));
  }, [allEvents]);

  useEffect(() => {
    if (!selectedUrl && urlOptions.length > 0) setSelectedUrl(urlOptions[0].url);
  }, [urlOptions, selectedUrl]);

  const filteredEvents = useMemo(() => {
    if (!selectedUrl) return [];
    return allEvents.filter((e) => {
      if (e.page_url !== selectedUrl) return false;
      if (deviceFilter !== "all" && e.device !== deviceFilter) return false;
      return true;
    });
  }, [allEvents, selectedUrl, deviceFilter]);

  const clickPoints = useMemo((): ClickPoint[] => {
    return filteredEvents
      .filter((e) => e.metadata && typeof e.metadata === "object" && (e.metadata as any).click_x != null)
      .map((e) => {
        const m = e.metadata as any;
        return {
          x: m.click_x || 0, y: m.click_y || 0,
          vx: m.click_vx || 0, vy: m.click_vy || 0,
          vpW: m.vp_w || 1440, vpH: m.vp_h || 900, docH: m.doc_h || 3000,
        };
      });
  }, [filteredEvents]);

  const exitEvents = useMemo(() => filteredEvents.filter((e) => e.event_type === "page_exit"), [filteredEvents]);

  const referenceVpW = useMemo(() => {
    if (!clickPoints.length) return 1440;
    const counts = new Map<number, number>();
    clickPoints.forEach((p) => counts.set(p.vpW, (counts.get(p.vpW) || 0) + 1));
    let maxCount = 0, maxW = 1440;
    counts.forEach((c, w) => { if (c > maxCount) { maxCount = c; maxW = w; } });
    return maxW;
  }, [clickPoints]);

  const estimatedDocH = useMemo(() => {
    if (!clickPoints.length) return 3000;
    return Math.max(...clickPoints.map((p) => p.docH), 3000);
  }, [clickPoints]);

  const totalClicks = clickPoints.length;
  const uniqueVisitors = new Set(filteredEvents.map((e) => e.visitor_id).filter(Boolean)).size;
  const avgScrollDepth = exitEvents.length > 0
    ? Math.round(exitEvents.reduce((s, e) => s + (e.scroll_depth || 0), 0) / exitEvents.length)
    : 0;
  const hotZone = useMemo(() => {
    if (!clickPoints.length) return "—";
    const buckets = Array(10).fill(0);
    clickPoints.forEach((p) => {
      const pct = Math.min(Math.floor((p.y / estimatedDocH) * 10), 9);
      buckets[pct]++;
    });
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

  const redrawHeatmap = useCallback(() => {
    if (!canvasRef.current || heatmapMode !== "click") return;
    drawHeatmap(canvasRef.current, clickPoints, { width: containerSize.width, height: containerSize.height }, referenceVpW, estimatedDocH, 0, 28, opacity);
  }, [clickPoints, containerSize, referenceVpW, estimatedDocH, heatmapMode, opacity]);

  useEffect(() => { redrawHeatmap(); }, [redrawHeatmap]);

  /* ── Export as PNG ── */
  const exportAsImage = useCallback(() => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = containerSize.width * 2; // 2x for quality
    exportCanvas.height = containerSize.height * 2;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw heatmap data
    if (heatmapMode === "click" && canvasRef.current) {
      ctx.drawImage(canvasRef.current, 0, 0, exportCanvas.width, exportCanvas.height);
    } else if (heatmapMode === "scroll") {
      drawScrollOnCanvas(exportCanvas, exitEvents, exportCanvas.height);
    }

    // Add watermark header
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, exportCanvas.width, 60);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`Rankito Heatmap — ${heatmapMode === "click" ? "Cliques" : "Scroll"} — ${new Date().toLocaleDateString("pt-BR")}`, 16, 24);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    try { ctx.fillText(new URL(selectedUrl).pathname, 16, 46); } catch { ctx.fillText(selectedUrl, 16, 46); }

    // Add stats footer
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, exportCanvas.height - 40, exportCanvas.width, 40);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${totalClicks} cliques  •  ${uniqueVisitors} visitantes  •  ${avgScrollDepth}% scroll médio  •  Zona quente: ${hotZone}`, 16, exportCanvas.height - 14);

    // Download
    const link = document.createElement("a");
    link.download = `heatmap-${heatmapMode}-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
    toast.success("Imagem exportada com sucesso!");
  }, [containerSize, heatmapMode, exitEvents, selectedUrl, totalClicks, uniqueVisitors, avgScrollDepth, hotZone]);

  /* ── Save Snapshot ── */
  const saveSnapshot = useCallback(() => {
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 400;
    thumbCanvas.height = 260;
    const ctx = thumbCanvas.getContext("2d");
    if (!ctx) return;

    // Draw heatmap as thumbnail
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, 400, 260);

    if (heatmapMode === "click" && canvasRef.current) {
      ctx.drawImage(canvasRef.current, 0, 0, 400, 260);
    } else if (heatmapMode === "scroll") {
      drawScrollOnCanvas(thumbCanvas, exitEvents, 260);
    }

    const snap: HeatmapSnapshot = {
      id: crypto.randomUUID(),
      url: selectedUrl,
      mode: heatmapMode,
      device: deviceFilter,
      totalClicks,
      avgScroll: avgScrollDepth,
      visitors: uniqueVisitors,
      capturedAt: new Date().toISOString(),
      thumbnail: thumbCanvas.toDataURL("image/png", 0.7),
    };

    const updated = [snap, ...snapshots];
    setSnapshots(updated);
    saveSnapshots(updated);
    toast.success("Snapshot salvo no histórico!");
  }, [heatmapMode, exitEvents, selectedUrl, deviceFilter, totalClicks, avgScrollDepth, uniqueVisitors, snapshots]);

  /* ── Delete Snapshot ── */
  const deleteSnapshot = useCallback((id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    saveSnapshots(updated);
    toast("Snapshot excluído.");
  }, [snapshots]);

  /* ── Export Snapshot ── */
  const exportSnapshot = useCallback((snap: HeatmapSnapshot) => {
    const link = document.createElement("a");
    link.download = `heatmap-${snap.mode}-${new Date(snap.capturedAt).toISOString().slice(0, 10)}.png`;
    link.href = snap.thumbnail;
    link.click();
    toast.success("Imagem exportada!");
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const hasData = allEvents.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <FeatureBanner
        icon={Flame}
        title="Heatmaps Visuais"
        description={<>Visualize <strong>onde os usuários clicam</strong> e <strong>até onde rolam</strong> com mapas de calor sobrepostos ao seu site. Salve snapshots e exporte como imagem.</>}
      />

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HeatKpi label="Cliques Mapeados" value={totalClicks.toLocaleString("pt-BR")} icon={MousePointer2} />
        <HeatKpi label="Visitantes Únicos" value={uniqueVisitors.toLocaleString("pt-BR")} icon={Eye} />
        <HeatKpi label="Scroll Médio" value={`${avgScrollDepth}%`} icon={ArrowDownFromLine} />
        <HeatKpi label="Zona Quente" value={hotZone} icon={Target} />
      </StaggeredGrid>

      {/* Controls */}
      <AnimatedContainer delay={0.02}>
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* URL selector */}
            <div className="flex-1 min-w-[250px]">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Página</label>
              <Select value={selectedUrl} onValueChange={setSelectedUrl}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione uma página..." />
                </SelectTrigger>
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

            {/* Device filter */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Dispositivo</label>
              <div className="flex gap-1">
                {[
                  { value: "all", icon: Layers, label: "Todos" },
                  { value: "desktop", icon: Monitor, label: "Desktop" },
                  { value: "tablet", icon: Tablet, label: "Tablet" },
                  { value: "mobile", icon: Smartphone, label: "Mobile" },
                ].map((d) => (
                  <Button
                    key={d.value}
                    size="sm"
                    variant={deviceFilter === d.value ? "default" : "outline"}
                    className="h-9 gap-1.5 text-[10px]"
                    onClick={() => setDeviceFilter(d.value)}
                  >
                    <d.icon className="h-3.5 w-3.5" />
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Heatmap mode */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Tipo</label>
              <Tabs value={heatmapMode} onValueChange={(v) => setHeatmapMode(v as any)}>
                <TabsList className="h-9">
                  <TabsTrigger value="click" className="text-[10px] gap-1.5 h-7">
                    <MousePointer2 className="h-3.5 w-3.5" /> Cliques
                  </TabsTrigger>
                  <TabsTrigger value="scroll" className="text-[10px] gap-1.5 h-7">
                    <ArrowDownFromLine className="h-3.5 w-3.5" /> Scroll
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Action buttons */}
            <div className="self-end flex gap-1">
              <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-[10px]" onClick={redrawHeatmap}>
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-[10px]" onClick={saveSnapshot} disabled={!selectedUrl}>
                <Camera className="h-3.5 w-3.5" /> Salvar Snapshot
              </Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-[10px]" onClick={exportAsImage} disabled={!selectedUrl}>
                <Download className="h-3.5 w-3.5" /> Exportar PNG
              </Button>
              <Button
                size="sm"
                variant={showHistory ? "default" : "outline"}
                className="h-9 gap-1.5 text-[10px]"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-3.5 w-3.5" />
                Histórico
                {snapshots.length > 0 && (
                  <Badge variant="secondary" className="text-[8px] ml-0.5 h-4 min-w-[16px] px-1">{snapshots.length}</Badge>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Snapshot History Panel */}
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] text-destructive hover:text-destructive gap-1"
                  onClick={() => {
                    setSnapshots([]);
                    saveSnapshots([]);
                    toast("Histórico limpo.");
                  }}
                >
                  <Trash2 className="h-3 w-3" /> Limpar tudo
                </Button>
              )}
            </div>

            {snapshots.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhum snapshot salvo ainda. Clique em "Salvar Snapshot" para capturar o heatmap atual.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {snapshots.map((snap) => (
                  <SnapshotCard
                    key={snap.id}
                    snap={snap}
                    onDelete={() => deleteSnapshot(snap.id)}
                    onExport={() => exportSnapshot(snap)}
                  />
                ))}
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
              <span className="text-[10px] text-muted-foreground truncate">{selectedUrl || "Nenhuma página selecionada"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[9px] gap-1">
                <Flame className="h-3 w-3" />
                {heatmapMode === "click" ? `${totalClicks} cliques` : `${exitEvents.length} sessões`}
              </Badge>
              {selectedUrl && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                  <a href={selectedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative bg-muted/10"
            style={{ height: `${containerSize.height}px`, minHeight: "500px" }}
          >
            {selectedUrl ? (
              <>
                <iframe
                  ref={iframeRef}
                  src={selectedUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  style={{ zIndex: 1, pointerEvents: "none" }}
                  sandbox="allow-same-origin allow-scripts"
                  onLoad={() => { setIframeLoaded(true); setIframeError(false); }}
                  onError={() => { setIframeError(true); setIframeLoaded(false); }}
                  title="Heatmap preview"
                />

                {heatmapMode === "click" && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ zIndex: 5, pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.8 }}
                  />
                )}

                {heatmapMode === "scroll" && (
                  <ScrollDepthOverlay events={exitEvents} iframeHeight={containerSize.height} />
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
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 backdrop-blur-sm">
                    <div className="text-center space-y-3 max-w-md px-6">
                      <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                        <Flame className="h-6 w-6 text-warning" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">Não foi possível carregar o iframe</h3>
                      <p className="text-xs text-muted-foreground">
                        O site pode estar bloqueando o carregamento via iframe (X-Frame-Options).
                        Os dados de heatmap continuam sendo coletados normalmente.
                      </p>
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] text-muted-foreground font-medium">Dados disponíveis para esta página:</p>
                        <div className="flex justify-center gap-3">
                          <Badge variant="secondary" className="text-[10px]">{totalClicks} cliques</Badge>
                          <Badge variant="secondary" className="text-[10px]">{exitEvents.length} sessões</Badge>
                          <Badge variant="secondary" className="text-[10px]">{avgScrollDepth}% scroll médio</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MousePointer2 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">Selecione uma página acima para ver o heatmap</p>
                </div>
              </div>
            )}
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

      {/* No data state */}
      {!hasData && (
        <AnimatedContainer delay={0.06}>
          <Card className="p-8 text-center">
            <Flame className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-foreground mb-1">Nenhum dado de heatmap ainda</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Instale o Pixel Rankito v3.3.0 no seu site. Ele captura automaticamente coordenadas de cliques
              e profundidade de scroll para gerar heatmaps visuais.
            </p>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}

/* ── Top Clicked Elements Sub-component ── */
function TopClickedElements({ events }: { events: TrackingEvent[] }) {
  const elements = useMemo(() => {
    const map = new Map<string, { selector: string; text: string; count: number }>();
    events.forEach((e) => {
      if (!e.cta_selector) return;
      const key = e.cta_selector;
      const entry = map.get(key) || { selector: key, text: e.cta_text || "—", count: 0 };
      entry.count++;
      if (e.cta_text && e.cta_text.length > entry.text.length) entry.text = e.cta_text;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [events]);

  const maxCount = elements[0]?.count || 1;

  return (
    <div className="space-y-1.5">
      {elements.map((el, i) => (
        <div key={el.selector + i} className="flex items-center gap-3 group">
          <span className="text-[10px] font-mono text-muted-foreground w-6 text-right shrink-0">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="relative h-7 rounded overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: `${(el.count / maxCount) * 100}%`,
                  background: `color-mix(in srgb, hsl(var(--primary)) ${Math.round((el.count / maxCount) * 100)}%, hsl(var(--muted)))`,
                  opacity: 0.2,
                }}
              />
              <div className="relative flex items-center h-full px-2.5 gap-2">
                <code className="text-[9px] text-muted-foreground font-mono truncate max-w-[120px]">{el.selector}</code>
                <span className="text-[10px] text-foreground truncate flex-1">{el.text}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-[9px] shrink-0">{el.count}</Badge>
        </div>
      ))}
      {!elements.length && (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum elemento com cliques registrados.</p>
      )}
    </div>
  );
}
