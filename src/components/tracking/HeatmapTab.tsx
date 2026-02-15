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
  RefreshCw, Camera, Download, History, Trash2, Clock, Move,
  ArrowLeft, Globe, Play, AlertCircle, CheckCircle2, Info,
  Video, PauseCircle, SkipForward, SkipBack,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/* ── Types ── */
interface ClickPoint {
  x: number; y: number; vx: number; vy: number;
  vpW: number; vpH: number; docH: number;
}

interface MovePoint { x: number; y: number; t: number; }

interface HeatmapSnapshot {
  id: string; url: string; mode: string; device: string;
  totalClicks: number; avgScroll: number; visitors: number;
  capturedAt: string; thumbnail: string;
}

const SNAPSHOTS_KEY = "rankito_heatmap_snapshots";
function loadSnapshots(): HeatmapSnapshot[] { try { return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]"); } catch { return []; } }
function saveSnapshots(s: HeatmapSnapshot[]) { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(s.slice(0, 30))); }

/* ── Heatmap Canvas Renderer ── */
function drawHeatmap(
  canvas: HTMLCanvasElement, points: { x: number; y: number }[],
  iframeRect: { width: number; height: number }, referenceVpW: number,
  _docH: number, scrollOffset: number, radius: number = 30, intensity: number = 0.6,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = iframeRect.width; canvas.height = iframeRect.height;
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
    ctx.beginPath(); ctx.fillStyle = gradient;
    ctx.arc(x, y, radius * scale, 0, Math.PI * 2); ctx.fill();
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    const ratio = alpha / 255;
    if (ratio > 0.7) { data[i] = 255; data[i + 1] = Math.round(255 * (1 - ratio) * 3); data[i + 2] = 0; }
    else if (ratio > 0.4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 0; }
    else if (ratio > 0.2) { data[i] = 0; data[i + 1] = 255; data[i + 2] = Math.round(255 * (1 - ratio * 2)); }
    else { data[i] = 0; data[i + 1] = Math.round(100 + 155 * ratio * 5); data[i + 2] = 255; }
    data[i + 3] = Math.min(alpha * 1.5, 200);
  }
  ctx.putImageData(imageData, 0, 0);
}

/* ── Draw Move Trails ── */
function drawMoveTrails(
  canvas: HTMLCanvasElement, sessions: { points: MovePoint[]; color: string }[],
  iframeRect: { width: number; height: number }, referenceVpW: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = iframeRect.width; canvas.height = iframeRect.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scale = iframeRect.width / referenceVpW;

  sessions.forEach(({ points, color }) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.5;

    const sx = points[0].x * scale, sy = points[0].y * scale;
    ctx.moveTo(sx, sy);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale, points[i].y * scale);
    }
    ctx.stroke();

    points.forEach((p, i) => {
      const px = p.x * scale, py = p.y * scale;
      ctx.globalAlpha = 0.3 + (i / points.length) * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  });

  const allPts = sessions.flatMap(s => s.points);
  if (allPts.length > 10) {
    ctx.globalAlpha = 0.3;
    allPts.forEach((p) => {
      const x = p.x * scale, y = p.y * scale;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20 * scale);
      gradient.addColorStop(0, "rgba(255, 100, 0, 0.15)");
      gradient.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.beginPath(); ctx.fillStyle = gradient;
      ctx.arc(x, y, 20 * scale, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

/* ── Scroll Depth Overlay ── */
function ScrollDepthOverlay({ events, iframeHeight }: { events: TrackingEvent[]; iframeHeight: number }) {
  const scrollData = useMemo(() => {
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const total = events.length || 1;
    const counts = buckets.map(() => 0);
    events.forEach((e) => {
      const depth = e.scroll_depth ?? 0;
      for (let i = 0; i < buckets.length; i++) { if (depth >= buckets[i]) counts[i]++; }
    });
    return buckets.map((pct, i) => ({ pct, count: counts[i], ratio: counts[i] / total }));
  }, [events]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {scrollData.map((d, i) => {
        const top = (d.pct / 100) * iframeHeight;
        const opacity = 1 - d.ratio;
        return (
          <div key={d.pct} className="absolute left-0 right-0 flex items-center" style={{ top }}>
            <div className="absolute left-0 right-0" style={{ height: i < scrollData.length - 1 ? `${iframeHeight / scrollData.length}px` : "20px", background: `rgba(255, 69, 0, ${opacity * 0.35})` }} />
            <div className="relative z-20 flex items-center gap-1.5 ml-2">
              <div className="h-0.5 w-8" style={{ background: `color-mix(in srgb, hsl(var(--destructive)) ${Math.round((1 - d.ratio) * 100)}%, hsl(var(--success)))` }} />
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

/* ── KPI Card ── */
function HeatKpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <Card className="p-3 sm:p-4 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex flex-col items-center text-center gap-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xl font-bold text-foreground font-display tracking-tight">{value}</span>
        <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </Card>
  );
}

/* ── Snapshot Card ── */
function SnapshotCard({ snap, onDelete, onExport }: { snap: HeatmapSnapshot; onDelete: () => void; onExport: () => void }) {
  const date = new Date(snap.capturedAt);
  return (
    <Card className="overflow-hidden card-hover group">
      <div className="relative h-32 bg-muted/30">
        <img src={snap.thumbnail} alt="Heatmap snapshot" className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 pb-2">
          <Button size="sm" variant="secondary" className="h-7 text-[10px] gap-1" onClick={onExport}><Download className="h-3 w-3" /> Exportar</Button>
          <Button size="sm" variant="destructive" className="h-7 text-[10px] gap-1" onClick={onDelete}><Trash2 className="h-3 w-3" /> Excluir</Button>
        </div>
        <Badge variant="secondary" className="absolute top-2 right-2 text-[8px] bg-background/80 backdrop-blur-sm">{snap.mode === "click" ? "Cliques" : snap.mode === "scroll" ? "Scroll" : "Movimento"}</Badge>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-[10px] text-muted-foreground truncate" title={snap.url}>{(() => { try { return new URL(snap.url).pathname; } catch { return snap.url; } })()}</p>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[8px]">{snap.device}</Badge>
          <Badge variant="outline" className="text-[8px]">{snap.totalClicks} cliques</Badge>
          <Badge variant="outline" className="text-[8px]">{snap.avgScroll}% scroll</Badge>
        </div>
      </div>
    </Card>
  );
}

/* ── Session Trail Colors ── */
const TRAIL_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];

/* ── Page Card for listing view ── */
function PageCard({ url, clicks, exits, views, visitors, avgScroll, moveCount, firstEvent, lastEvent, topCity, onClick }: {
  url: string; clicks: number; exits: number; views: number; visitors: number; avgScroll: number; moveCount: number; firstEvent: string; lastEvent: string; topCity: string; onClick: () => void;
}) {
  let pathname = url;
  try { pathname = new URL(url).pathname; } catch { /* keep full url */ }

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="card-hover cursor-pointer group transition-all hover:border-primary/40" onClick={onClick}>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate" title={url}>{pathname}</p>
            <p className="text-[10px] text-muted-foreground truncate" title={url}>{url}</p>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        {/* Date & city info */}
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Primeiro: <strong className="text-foreground">{fmtDate(firstEvent)}</strong></span>
          </div>
          <span className="text-muted-foreground/40">•</span>
          <div className="flex items-center gap-1">
            <span>Último: <strong className="text-foreground">{fmtDate(lastEvent)}</strong></span>
          </div>
          {topCity && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>Cidade: <strong className="text-foreground">{topCity}</strong></span>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">{views.toLocaleString("pt-BR")}</p>
            <p className="text-[9px] text-muted-foreground">Views</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">{clicks.toLocaleString("pt-BR")}</p>
            <p className="text-[9px] text-muted-foreground">Cliques</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">{visitors.toLocaleString("pt-BR")}</p>
            <p className="text-[9px] text-muted-foreground">Visitantes</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">{avgScroll}%</p>
            <p className="text-[9px] text-muted-foreground">Scroll</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">{exits.toLocaleString("pt-BR")}</p>
            <p className="text-[9px] text-muted-foreground">Saídas</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">{moveCount}</p>
            <p className="text-[9px] text-muted-foreground">Trilhas</p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <Badge variant="outline" className="text-[8px] gap-1"><MousePointer2 className="h-2.5 w-2.5" /> Click Map</Badge>
          <Badge variant="outline" className="text-[8px] gap-1"><ArrowDownFromLine className="h-2.5 w-2.5" /> Scroll Map</Badge>
          <Badge variant="outline" className="text-[8px] gap-1"><Move className="h-2.5 w-2.5" /> Movement</Badge>
        </div>
      </div>
    </Card>
  );
}

/* ── Data Availability Indicator ── */
function DataAvailabilityBadge({ available, count, label, icon: Icon }: { available: boolean; count: number; label: string; icon: React.ElementType }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[10px] ${available ? "bg-success/5 border-success/20 text-success" : "bg-muted/50 border-border text-muted-foreground"}`}>
      {available ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      <Icon className="h-3 w-3" />
      <span className="font-medium">{label}</span>
      <Badge variant="secondary" className="text-[8px] h-4 min-w-[16px] px-1">{count}</Badge>
    </div>
  );
}

/* ── Session Replay Viewer ── */
function SessionReplayViewer({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["session-recordings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_recordings")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const [selectedRecording, setSelectedRecording] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopPlayback = useCallback(() => {
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (!selectedRecording) return;
    const events = selectedRecording.recording_data || [];
    if (!events.length) return;
    setIsPlaying(true);
    let idx = currentEventIdx;
    replayTimerRef.current = setInterval(() => {
      idx++;
      if (idx >= events.length) { stopPlayback(); return; }
      setCurrentEventIdx(idx);
    }, Math.round(150 / playbackSpeed));
  }, [selectedRecording, stopPlayback, currentEventIdx, playbackSpeed]);

  useEffect(() => { return () => { if (replayTimerRef.current) clearInterval(replayTimerRef.current); }; }, []);

  // Restart playback when speed changes
  useEffect(() => {
    if (isPlaying) { stopPlayback(); startPlayback(); }
  }, [playbackSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteRecording = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const { error } = await supabase.from("session_recordings").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir gravação"); return; }
    toast.success("Gravação excluída");
    queryClient.invalidateQueries({ queryKey: ["session-recordings", projectId] });
    if (selectedRecording?.id === id) { setSelectedRecording(null); stopPlayback(); }
  }, [projectId, queryClient, selectedRecording, stopPlayback]);

  const deleteAllRecordings = useCallback(async () => {
    if (!window.confirm("Excluir TODAS as gravações de sessão deste projeto? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("session_recordings").delete().eq("project_id", projectId);
    if (error) { toast.error("Erro ao limpar gravações"); return; }
    toast.success("Todas as gravações foram excluídas");
    queryClient.invalidateQueries({ queryKey: ["session-recordings", projectId] });
    setSelectedRecording(null); stopPlayback();
  }, [projectId, queryClient, stopPlayback]);

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (recordings.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Video className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-foreground mb-1">Nenhuma gravação de sessão ainda</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Atualize o Pixel Rankito para v3.4.0+ para capturar gravações de sessão automaticamente.
          As gravações incluem movimentos do mouse, cliques, scroll e mudanças na tela.
        </p>
      </Card>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "click": return <MousePointer2 className="h-2.5 w-2.5 text-destructive" />;
      case "scroll": return <ArrowDownFromLine className="h-2.5 w-2.5 text-warning" />;
      case "navigate": return <Globe className="h-2.5 w-2.5 text-info" />;
      default: return <Move className="h-2.5 w-2.5 text-muted-foreground" />;
    }
  };

  if (selectedRecording) {
    const events = selectedRecording.recording_data || [];
    const currentEvent = events[currentEventIdx];
    const clickEvents = events.filter((e: any) => e.type === "click");
    const scrollEvents = events.filter((e: any) => e.type === "scroll");
    const navEvents = events.filter((e: any) => e.type === "navigate");

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { stopPlayback(); setSelectedRecording(null); }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para lista
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive" onClick={() => deleteRecording(selectedRecording.id)}>
            <Trash2 className="h-3 w-3" /> Excluir
          </Button>
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold font-display">Replay da Sessão</h4>
              <Badge variant="secondary" className="text-[9px]">{selectedRecording.session_id?.slice(-8)}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <MousePointer2 className="h-3 w-3 text-destructive" /> {clickEvents.length}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ArrowDownFromLine className="h-3 w-3 text-warning" /> {scrollEvents.length}
              </div>
              {navEvents.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Globe className="h-3 w-3 text-info" /> {navEvents.length}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {Math.round((selectedRecording.duration_ms || 0) / 1000)}s
              </div>
            </div>
          </div>

          {/* Replay viewport */}
          <div className="relative bg-muted/20 border border-border rounded-lg overflow-hidden" style={{ height: "400px" }}>
            <div className="absolute inset-0">
              {currentEvent ? (
                <div className="relative w-full h-full">
                  <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-muted-foreground">
                    {selectedRecording.page_url || "—"}
                  </div>
                  {/* Cursor */}
                  {currentEvent.x != null && currentEvent.y != null && (
                    <>
                      <div
                        className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-lg transition-all duration-100"
                        style={{
                          left: `${(currentEvent.x / (selectedRecording.screen_width || 1440)) * 100}%`,
                          top: `${(currentEvent.y / (selectedRecording.screen_height || 900)) * 100}%`,
                          background: currentEvent.type === "click" ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                          transform: currentEvent.type === "click" ? "scale(1.5)" : "scale(1)",
                        }}
                      />
                      {/* Click ripple effect */}
                      {currentEvent.type === "click" && (
                        <div
                          className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-destructive/50 animate-ping"
                          style={{
                            left: `${(currentEvent.x / (selectedRecording.screen_width || 1440)) * 100}%`,
                            top: `${(currentEvent.y / (selectedRecording.screen_height || 900)) * 100}%`,
                          }}
                        />
                      )}
                    </>
                  )}
                  {/* Current action badge */}
                  <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
                    {getEventIcon(currentEvent.type || "move")}
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {currentEvent.type === "click" ? "Clique" : currentEvent.type === "scroll" ? "Scroll" : currentEvent.type === "navigate" ? "Navegação" : "Movimento"}
                      {currentEvent.tag && ` → <${currentEvent.tag}>`}
                      {currentEvent.text && ` "${currentEvent.text.slice(0, 40)}"`}
                      {currentEvent.url && ` → ${(() => { try { return new URL(currentEvent.url).pathname; } catch { return currentEvent.url; } })()}`}
                    </span>
                  </div>
                  {/* Event counter */}
                  <div className="absolute bottom-2 right-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-muted-foreground tabular-nums">
                    {currentEventIdx + 1} / {events.length}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Play className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Clique em Play para iniciar</p>
                </div>
              )}
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => { stopPlayback(); setCurrentEventIdx(Math.max(0, currentEventIdx - 10)); }}>
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={isPlaying ? stopPlayback : startPlayback}>
              {isPlaying ? <PauseCircle className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? "Pausar" : "Play"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => { stopPlayback(); setCurrentEventIdx(Math.min(events.length - 1, currentEventIdx + 10)); }}>
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            {/* Speed selector */}
            <Select value={String(playbackSpeed)} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
              <SelectTrigger className="h-8 w-[70px] text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5" className="text-xs">0.5×</SelectItem>
                <SelectItem value="1" className="text-xs">1×</SelectItem>
                <SelectItem value="2" className="text-xs">2×</SelectItem>
                <SelectItem value="4" className="text-xs">4×</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 mx-2">
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                stopPlayback();
                setCurrentEventIdx(Math.round(pct * (events.length - 1)));
              }}>
                <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${events.length ? (currentEventIdx / events.length) * 100 : 0}%` }} />
                {/* Click markers on timeline */}
                {clickEvents.map((_: any, i: number) => {
                  const idx = events.indexOf(clickEvents[i]);
                  return <div key={i} className="absolute top-0 bottom-0 w-0.5 bg-destructive/60" style={{ left: `${(idx / events.length) * 100}%` }} />;
                })}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{currentEventIdx + 1}/{events.length}</span>
          </div>

          {/* Session metadata */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[8px]">{selectedRecording.device}</Badge>
            <Badge variant="outline" className="text-[8px]">{selectedRecording.browser}</Badge>
            <Badge variant="outline" className="text-[8px]">{selectedRecording.os}</Badge>
            <Badge variant="outline" className="text-[8px]">{selectedRecording.screen_width}×{selectedRecording.screen_height}</Badge>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-bold font-display">Gravações de Sessão</h4>
          <Badge variant="secondary" className="text-[9px]">{recordings.length} sessões</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={deleteAllRecordings}
        >
          <Trash2 className="h-3 w-3" /> Limpar todas
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recordings.map((rec: any) => {
          const date = new Date(rec.created_at);
          const events = (rec.recording_data as any[]) || [];
          const clickCount = events.filter((e: any) => e.type === "click").length;
          return (
            <Card key={rec.id} className="card-hover cursor-pointer group relative" onClick={() => setSelectedRecording(rec)}>
              {/* Delete button */}
              <button
                className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/30"
                onClick={(e) => deleteRecording(rec.id, e)}
                title="Excluir gravação"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{rec.page_url ? (() => { try { return new URL(rec.page_url).pathname; } catch { return rec.page_url; } })() : "—"}</p>
                    <p className="text-[9px] text-muted-foreground">{date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[8px]">{rec.device || "—"}</Badge>
                  <Badge variant="outline" className="text-[8px]">{Math.round((rec.duration_ms || 0) / 1000)}s</Badge>
                  <Badge variant="outline" className="text-[8px]">{rec.events_count || 0} eventos</Badge>
                  {clickCount > 0 && <Badge variant="outline" className="text-[8px] border-destructive/30 text-destructive">{clickCount} cliques</Badge>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════ */
export function HeatmapTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const { data: allEvents = [], isLoading } = useTrackingEvents(projectId);

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<"click" | "scroll" | "move">("click");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [listDeviceFilter, setListDeviceFilter] = useState<string>("all");
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

  // URL options with stats
  const urlOptions = useMemo(() => {
    const map = new Map<string, { clicks: number; exits: number; views: number; visitors: Set<string>; moveSessions: number; scrollSum: number; scrollCount: number; firstEvent: string; lastEvent: string; cities: Map<string, number> }>();
    allEvents.forEach((e) => {
      const url = e.page_url;
      if (!url) return;
      const entry = map.get(url) || { clicks: 0, exits: 0, views: 0, visitors: new Set<string>(), moveSessions: 0, scrollSum: 0, scrollCount: 0, firstEvent: e.created_at, lastEvent: e.created_at, cities: new Map<string, number>() };
      if (["click", "button_click", "whatsapp_click", "phone_click", "email_click", "heatmap_click"].includes(e.event_type)) entry.clicks++;
      if (e.event_type === "page_exit") {
        entry.exits++;
        if (e.scroll_depth != null) { entry.scrollSum += e.scroll_depth; entry.scrollCount++; }
        const m = e.metadata as any;
        if (m?.move_samples?.length) entry.moveSessions++;
      }
      if (e.event_type === "page_view") entry.views++;
      if (e.visitor_id) entry.visitors.add(e.visitor_id);
      if (e.city) entry.cities.set(e.city, (entry.cities.get(e.city) || 0) + 1);
      if (e.created_at < entry.firstEvent) entry.firstEvent = e.created_at;
      if (e.created_at > entry.lastEvent) entry.lastEvent = e.created_at;
      map.set(url, entry);
    });
    return Array.from(map.entries())
      .map(([url, s]) => {
        let topCity = "";
        let maxCityCount = 0;
        s.cities.forEach((count, city) => { if (count > maxCityCount) { maxCityCount = count; topCity = city; } });
        return {
          url, clicks: s.clicks, exits: s.exits, views: s.views,
          visitors: s.visitors.size,
          avgScroll: s.scrollCount > 0 ? Math.round(s.scrollSum / s.scrollCount) : 0,
          moveCount: s.moveSessions,
          firstEvent: s.firstEvent,
          lastEvent: s.lastEvent,
          topCity,
        };
      })
      .sort((a, b) => (b.clicks + b.views) - (a.clicks + a.views));
  }, [allEvents]);

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
        return { x: m.click_x || 0, y: m.click_y || 0, vx: m.click_vx || 0, vy: m.click_vy || 0, vpW: m.vp_w || 1440, vpH: m.vp_h || 900, docH: m.doc_h || 3000 };
      });
  }, [filteredEvents]);

  const moveSessions = useMemo(() => {
    const sessions: { sessionId: string; points: MovePoint[]; vpW: number }[] = [];
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

  const redrawHeatmap = useCallback(() => {
    if (!canvasRef.current) return;
    if (heatmapMode === "click") {
      drawHeatmap(canvasRef.current, clickPoints, { width: containerSize.width, height: containerSize.height }, referenceVpW, estimatedDocH, 0, 28, opacity);
    } else if (heatmapMode === "move") {
      const sessionsWithColors = moveSessions.map((s, i) => ({
        points: s.points,
        color: TRAIL_COLORS[i % TRAIL_COLORS.length],
      }));
      drawMoveTrails(canvasRef.current, sessionsWithColors, { width: containerSize.width, height: containerSize.height }, referenceVpW);
    }
  }, [clickPoints, moveSessions, containerSize, referenceVpW, estimatedDocH, heatmapMode, opacity]);

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

  const hasData = allEvents.length > 0;

  /* ══════════════════════════════════════════════
     LISTING VIEW — cards per URL
     ══════════════════════════════════════════════ */
  if (!selectedUrl) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <FeatureBanner icon={Flame} title="Heatmaps Visuais & Session Replay" description={<>Visualize <strong>cliques</strong>, <strong>scroll</strong>, <strong>rastro do mouse</strong> e <strong>grave sessões completas</strong> dos seus visitantes. Os dados atualizam em <strong>tempo real</strong> (a cada 30s ou ao receber novos eventos).</>} />

        {/* Global KPIs + cleanup */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1" />
          {hasData && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[10px] text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={async () => {
                if (!projectId) return;
                const confirmed = window.confirm("Tem certeza que deseja excluir TODOS os eventos de heatmap deste projeto? Esta ação não pode ser desfeita.");
                if (!confirmed) return;
                const heatmapTypes = ["click", "button_click", "whatsapp_click", "phone_click", "email_click", "heatmap_click", "page_exit", "page_view"];
                const { error } = await supabase
                  .from("tracking_events")
                  .delete()
                  .eq("project_id", projectId)
                  .in("event_type", heatmapTypes);
                if (error) { toast.error("Erro ao limpar dados: " + error.message); return; }
                toast.success("Dados de heatmap limpos com sucesso!");
                window.location.reload();
              }}
            >
              <Trash2 className="h-3 w-3" /> Limpar todos os dados
            </Button>
          )}
        </div>
        <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <HeatKpi label="Páginas Rastreadas" value={urlOptions.length} icon={Globe} />
          <HeatKpi label="Total de Cliques" value={allEvents.filter(e => ["click", "button_click", "whatsapp_click", "phone_click", "email_click", "heatmap_click"].includes(e.event_type)).length.toLocaleString("pt-BR")} icon={MousePointer2} />
          <HeatKpi label="Visitantes Únicos" value={new Set(allEvents.map(e => e.visitor_id).filter(Boolean)).size.toLocaleString("pt-BR")} icon={Eye} />
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
                  ].map((d) => (
                    <Button key={d.value} size="sm" variant={listDeviceFilter === d.value ? "default" : "outline"} className="h-9 gap-1.5 text-[10px]" onClick={() => setListDeviceFilter(d.value)}>
                      <d.icon className="h-3.5 w-3.5" />{d.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Ordenar por</label>
                <Select value={listSortBy} onValueChange={setListSortBy}>
                  <SelectTrigger className="h-9 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance" className="text-xs">Relevância</SelectItem>
                    <SelectItem value="clicks" className="text-xs">Mais Cliques</SelectItem>
                    <SelectItem value="views" className="text-xs">Mais Views</SelectItem>
                    <SelectItem value="visitors" className="text-xs">Mais Visitantes</SelectItem>
                    <SelectItem value="scroll" className="text-xs">Maior Scroll</SelectItem>
                    <SelectItem value="recent" className="text-xs">Mais Recente</SelectItem>
                    <SelectItem value="oldest" className="text-xs">Mais Antigo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </AnimatedContainer>

        {/* Page cards */}
        {(() => {
          let filtered = urlOptions.filter((opt) => {
            if (listSearch && !opt.url.toLowerCase().includes(listSearch.toLowerCase())) return false;
            if (listDeviceFilter !== "all") {
              const deviceEvents = allEvents.filter(e => e.page_url === opt.url && e.device === listDeviceFilter);
              if (deviceEvents.length === 0) return false;
            }
            return true;
          });
          if (listSortBy === "clicks") filtered.sort((a, b) => b.clicks - a.clicks);
          else if (listSortBy === "views") filtered.sort((a, b) => b.views - a.views);
          else if (listSortBy === "visitors") filtered.sort((a, b) => b.visitors - a.visitors);
          else if (listSortBy === "scroll") filtered.sort((a, b) => b.avgScroll - a.avgScroll);
          else if (listSortBy === "recent") filtered.sort((a, b) => b.lastEvent.localeCompare(a.lastEvent));
          else if (listSortBy === "oldest") filtered.sort((a, b) => a.firstEvent.localeCompare(b.firstEvent));

          const totalPages = Math.ceil(filtered.length / CARDS_PER_PAGE);
          const safePage = Math.min(listPage, totalPages - 1);
          const paginated = filtered.slice(safePage * CARDS_PER_PAGE, (safePage + 1) * CARDS_PER_PAGE);

          return filtered.length > 0 ? (
            <div className="space-y-4">
              <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginated.map((opt) => (
                  <PageCard
                    key={opt.url}
                    url={opt.url}
                    clicks={opt.clicks}
                    exits={opt.exits}
                    views={opt.views}
                    visitors={opt.visitors}
                    avgScroll={opt.avgScroll}
                    moveCount={opt.moveCount}
                    firstEvent={opt.firstEvent}
                    lastEvent={opt.lastEvent}
                    topCity={opt.topCity}
                    onClick={() => setSelectedUrl(opt.url)}
                  />
                ))}
              </StaggeredGrid>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" disabled={safePage === 0} onClick={() => setListPage(safePage - 1)}>
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Button key={i} size="sm" variant={i === safePage ? "default" : "outline"} className="h-8 w-8 text-xs p-0" onClick={() => setListPage(i)}>
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs" disabled={safePage >= totalPages - 1} onClick={() => setListPage(safePage + 1)}>
                    Próximo
                  </Button>
                  <span className="text-[10px] text-muted-foreground ml-2">{filtered.length} páginas</span>
                </div>
              )}
            </div>
          ) : (
            <AnimatedContainer delay={0.06}>
              <Card className="p-8 text-center">
                <Flame className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-foreground mb-1">
                  {urlOptions.length === 0 ? "Nenhum dado de heatmap ainda" : "Nenhuma página encontrada"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {urlOptions.length === 0
                    ? "Instale o Pixel Rankito v3.3.0 no seu site para capturar cliques, scroll e movimento do mouse automaticamente."
                    : "Tente ajustar os filtros de busca ou dispositivo."}
                </p>
              </Card>
            </AnimatedContainer>
          );
        })()}

      </div>
    );
  }

  /* ══════════════════════════════════════════════
     DETAIL VIEW — heatmap for selected URL
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Back button */}
      <AnimatedContainer>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { setSelectedUrl(null); setIframeLoaded(false); setIframeError(false); }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para páginas
        </Button>
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
              <span>Aguardando dados. Instale o Pixel Rankito v3.3.0+ no seu site.</span>
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
                <Camera className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
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

          <div ref={containerRef} className="relative bg-muted/10" style={{ height: `${containerSize.height}px`, minHeight: "500px" }}>
            <iframe ref={iframeRef} src={selectedUrl} className="absolute inset-0 w-full h-full border-0" style={{ zIndex: 1, pointerEvents: "none" }}
              sandbox="allow-same-origin allow-scripts"
              onLoad={() => { setIframeLoaded(true); setIframeError(false); }}
              onError={() => { setIframeError(true); setIframeLoaded(false); }}
              title="Heatmap preview"
            />

            {(heatmapMode === "click" || heatmapMode === "move") && (
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
                style={{ zIndex: 5, pointerEvents: "none", mixBlendMode: heatmapMode === "click" ? "multiply" : "normal", opacity: 0.8 }}
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
                  <Move className="h-10 w-10 text-muted-foreground/30 mx-auto" />
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
                {/* Fallback grid background when iframe can't load */}
                <div className="absolute inset-0" style={{
                  backgroundImage: "linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                }} />
                {/* Page structure skeleton */}
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
                {/* Info banner */}
                <div className="absolute bottom-3 left-3 right-3 z-20 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Info className="h-4 w-4 text-warning shrink-0" />
                    <span className="text-muted-foreground">O site bloqueia iframe. O heatmap é renderizado sobre um grid de referência com seus dados reais.</span>
                    <a href={selectedUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 shrink-0">
                      Abrir site <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
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

      {!hasData && (
        <AnimatedContainer delay={0.06}>
          <Card className="p-8 text-center">
            <Flame className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-foreground mb-1">Nenhum dado de heatmap ainda</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Instale o Pixel Rankito v3.3.0 no seu site para capturar cliques, scroll e movimento do mouse automaticamente.
            </p>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}

/* ── Top Clicked Elements ── */
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
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${(el.count / maxCount) * 100}%`, background: `color-mix(in srgb, hsl(var(--primary)) ${Math.round((el.count / maxCount) * 100)}%, hsl(var(--muted)))`, opacity: 0.2 }} />
              <div className="relative flex items-center h-full px-2.5 gap-2">
                <code className="text-[9px] text-muted-foreground font-mono truncate max-w-[120px]">{el.selector}</code>
                <span className="text-[10px] text-foreground truncate flex-1">{el.text}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-[9px] shrink-0">{el.count}</Badge>
        </div>
      ))}
      {!elements.length && <p className="text-xs text-muted-foreground text-center py-4">Nenhum elemento com cliques registrados.</p>}
    </div>
  );
}
