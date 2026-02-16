import { useState, useMemo, useCallback } from "react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { useTrackingEvents, TrackingEvent, buildHeatmap, EVENT_LABELS } from "@/hooks/use-tracking-events";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  CartesianGrid,
} from "recharts";
import { Download, Search, Flame, ArrowUpDown, ChevronLeft, ChevronRight, FileJson, FileSpreadsheet, Users, Clock, Globe, Loader2, Bot } from "lucide-react";
import { detectBot, BOT_CATEGORY_LABELS, BOT_CATEGORY_STYLES } from "@/lib/bot-detection";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, LineGlowGradient, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, PipelineVisual, CohortHeatmap, DonutCenterLabel,
} from "@/components/analytics/ChartPrimitives";
import { EmptyState } from "@/components/ui/empty-state";

// Derive sessions from events grouped by session_id
interface DerivedSession {
  session_id: string;
  started_at: string;
  duration_sec: number;
  pages_viewed: number;
  landing_page: string;
  exit_page: string;
  referrer: string;
  source: string;
  medium: string;
  device: string;
  browser: string;
  city: string;
  is_bounce: boolean;
  bot_name: string;
  bot_emoji: string;
  bot_category: string;
}

function deriveSessionsFromEvents(events: TrackingEvent[]): DerivedSession[] {
  const map = new Map<string, TrackingEvent[]>();
  events.forEach(e => {
    const sid = e.session_id || e.visitor_id || "unknown";
    const arr = map.get(sid) || [];
    arr.push(e);
    map.set(sid, arr);
  });

  return Array.from(map.entries()).map(([session_id, evts]) => {
    evts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const first = evts[0];
    const last = evts[evts.length - 1];
    const duration_sec = Math.round((new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / 1000);
    const pages = new Set(evts.map(e => e.page_url).filter(Boolean));
    const exitEvent = evts.find(e => e.event_type === "page_exit");
    const bot = detectBot(first.browser, first.platform, { city: first.city, os: first.os, device: first.device, referrer: first.referrer });
    return {
      session_id,
      started_at: first.created_at,
      duration_sec: exitEvent?.time_on_page || duration_sec,
      pages_viewed: Math.max(pages.size, 1),
      landing_page: (first.page_url || "/").replace(/^https?:\/\/[^/]+/, "") || "/",
      exit_page: ((exitEvent || last).page_url || "/").replace(/^https?:\/\/[^/]+/, "") || "/",
      referrer: first.referrer || "direto",
      source: first.utm_source || (first.referrer ? first.referrer.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '') : "direct"),
      medium: first.utm_medium || "(none)",
      device: first.device || "desktop",
      browser: first.browser || "Other",
      city: first.city || "Desconhecido",
      is_bounce: pages.size <= 1 && duration_sec < 10,
      bot_name: bot.botName || "",
      bot_emoji: bot.botEmoji || "",
      bot_category: bot.botCategory || "",
    };
  }).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

function SparkKpi({ label, value, color, icon: Icon, smallValue }: {
  label: string; value: string | number; color: string; icon?: React.ElementType; smallValue?: boolean;
}) {
  return (
    <Card className="p-4 sm:p-5 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex flex-col items-center text-center gap-1.5">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
        <span className={`font-bold text-foreground font-display tracking-tight ${smallValue ? "text-sm" : "text-2xl"}`}>{value}</span>
      </div>
    </Card>
  );
}

const VIVID_COLORS = CHART_COLORS;
const STATUS_BADGE: Record<string, string> = {
  bounce: "bg-warning/15 text-warning border-warning/30",
  engaged: "bg-success/15 text-success border-success/30",
};

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s > 0 ? ` ${s}s` : ""}`;
}

function getSessionStatus(s: DerivedSession): string {
  return s.is_bounce ? "bounce" : "engaged";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 20;
type SortKey = keyof DerivedSession;
type SortDir = "asc" | "desc";

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "started_at", label: "Início" },
  { key: "duration_sec", label: "Duração" },
  { key: "pages_viewed", label: "Páginas" },
  { key: "landing_page", label: "Landing Page" },
  { key: "exit_page", label: "Saída" },
  { key: "referrer", label: "Referrer" },
  { key: "source", label: "Source / Medium" },
  { key: "device", label: "Dispositivo" },
  { key: "browser", label: "Browser" },
  { key: "city", label: "Cidade" },
  { key: "bot_name", label: "Bot" },
];

export function SessionsTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const { data: allEvents = [], isLoading } = useTrackingEvents(projectId);

  const sessions = useMemo(() => deriveSessionsFromEvents(allEvents), [allEvents]);
  const heatmapData = useMemo(() => buildHeatmap(allEvents), [allEvents]);

  const [deviceFilter, setDeviceFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [browserFilter, setBrowserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("started_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let data = sessions;
    if (deviceFilter !== "all") data = data.filter(s => s.device === deviceFilter);
    if (sourceFilter !== "all") data = data.filter(s => s.source === sourceFilter);
    if (browserFilter !== "all") data = data.filter(s => s.browser === browserFilter);
    if (cityFilter !== "all") data = data.filter(s => s.city === cityFilter);
    if (statusFilter !== "all") data = data.filter(s => getSessionStatus(s) === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(s => s.landing_page.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.source.toLowerCase().includes(q));
    }
    return data;
  }, [sessions, deviceFilter, sourceFilter, browserFilter, cityFilter, statusFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortKey]; const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  }, [sortKey]);

  // KPIs
  const totalSessions = filtered.length;
  const avgDuration = totalSessions > 0 ? Math.round(filtered.reduce((s, r) => s + r.duration_sec, 0) / totalSessions) : 0;
  const bounceCount = filtered.filter(s => s.is_bounce).length;
  const engagedCount = filtered.filter(s => !s.is_bounce).length;
  const avgPages = totalSessions > 0 ? Number((filtered.reduce((s, r) => s + r.pages_viewed, 0) / totalSessions).toFixed(1)) : 0;
  const peakInfo = (() => {
    let maxVal = 0, peakDay = "", peakHour = 0;
    heatmapData.forEach(row => row.hours.forEach(cell => {
      if (cell.value > maxVal) { maxVal = cell.value; peakDay = row.day; peakHour = cell.hour; }
    }));
    return { label: `${peakDay} ${peakHour}h`, count: maxVal };
  })();
  const lastSession = filtered[0] || null;

  // Derived chart data
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, { sessions: number; bounces: number; engaged: number; totalDuration: number }>();
    filtered.forEach(s => {
      const day = format(new Date(s.started_at), "dd/MMM");
      const entry = map.get(day) || { sessions: 0, bounces: 0, engaged: 0, totalDuration: 0 };
      entry.sessions++; entry.totalDuration += s.duration_sec;
      if (s.is_bounce) entry.bounces++; else entry.engaged++;
      map.set(day, entry);
    });
    return Array.from(map.entries()).map(([date, v]) => ({
      date, ...v,
      engagementRate: v.sessions > 0 ? Math.round((v.engaged / v.sessions) * 100) : 0,
      bounceRate: v.sessions > 0 ? Math.round((v.bounces / v.sessions) * 100) : 0,
    }));
  }, [filtered]);

  const qualityByDevice = useMemo(() => {
    const map = new Map<string, { total: number; bounces: number; totalDuration: number; totalPages: number }>();
    filtered.forEach(s => {
      const entry = map.get(s.device) || { total: 0, bounces: 0, totalDuration: 0, totalPages: 0 };
      entry.total++; if (s.is_bounce) entry.bounces++;
      entry.totalDuration += s.duration_sec; entry.totalPages += s.pages_viewed;
      map.set(s.device, entry);
    });
    return Array.from(map.entries()).map(([device, v]) => ({
      device: device.charAt(0).toUpperCase() + device.slice(1),
      engagementRate: Math.round(((v.total - v.bounces) / v.total) * 100),
      pagesPerSession: Number((v.totalPages / v.total).toFixed(1)),
      total: v.total,
    }));
  }, [filtered]);

  const sourcePieData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(s => map.set(s.source, (map.get(s.source) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const sessionFunnel = useMemo(() => {
    const total = filtered.length;
    const engaged = filtered.filter(s => !s.is_bounce).length;
    const multiPage = filtered.filter(s => s.pages_viewed >= 3).length;
    const longSessions = filtered.filter(s => s.duration_sec > 60).length;
    return [
      { label: "Total Sessões", value: total, color: "hsl(var(--primary))" },
      { label: "Engajadas", value: engaged, color: "hsl(var(--success))" },
      { label: "Multi-página (3+)", value: multiPage, color: "hsl(var(--info))" },
      { label: "Longas (>1min)", value: longSessions, color: "hsl(var(--warning))" },
    ];
  }, [filtered]);

  const sessionsByCity = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(s => map.set(s.city, (map.get(s.city) || 0) + 1));
    return Array.from(map.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered]);

  const exportData = useCallback((fmt: "csv" | "json") => {
    const headers = ["Início", "Duração", "Páginas", "Landing Page", "Saída", "Source", "Medium", "Dispositivo", "Browser", "Cidade", "Status"];
    const rows = sorted.map(s => [
      format(new Date(s.started_at), "dd/MM/yyyy HH:mm"), formatDuration(s.duration_sec), String(s.pages_viewed),
      s.landing_page, s.exit_page, s.source, s.medium, s.device, s.browser, s.city, getSessionStatus(s),
    ]);
    if (fmt === "json") {
      downloadBlob(new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" }), "sessoes.json");
    } else {
      const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
      downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), "sessoes.csv");
    }
  }, [sorted]);

  const statusLabel: Record<string, string> = { bounce: "Bounce", engaged: "Engajada" };
  const devices = Array.from(new Set(sessions.map(s => s.device))).sort();
  const sources = Array.from(new Set(sessions.map(s => s.source))).sort();
  const browsersList = Array.from(new Set(sessions.map(s => s.browser))).sort();
  const cities = Array.from(new Set(sessions.map(s => s.city))).sort();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (sessions.length === 0) {
    return <EmptyState title="Nenhuma sessão registrada" description="Instale o script de tracking para começar a capturar sessões de visitantes." />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <FeatureBanner
        icon={Users}
        title="Sessões de Visitantes"
        description={<>Analise <strong>sessões individuais</strong> dos visitantes com duração, páginas visitadas, landing/exit pages, referrers e geolocalização. Identifique bounces, sessões engajadas e padrões de navegação por dispositivo, horário e origem.</>}
      />
      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SparkKpi label="Total Sessões" value={totalSessions} color="hsl(var(--primary))" icon={Users} />
        <SparkKpi label="🤖 Bots" value={filtered.filter(s => s.bot_name).length} color="hsl(var(--chart-5))" icon={Bot} />
        <SparkKpi label="Duração Média" value={formatDuration(avgDuration)} color="hsl(var(--info))" icon={Clock} />
        <SparkKpi label="Pico de Atividade" value={`${peakInfo.label} (${peakInfo.count})`} color="hsl(var(--warning))" icon={Flame} smallValue />
        <SparkKpi label="Cidade" value={lastSession ? lastSession.city : "—"} color="hsl(var(--info))" icon={Globe} smallValue />
        <SparkKpi label="Source/Medium" value={lastSession ? `${lastSession.source} / ${lastSession.medium}` : "—"} color="hsl(var(--success))" icon={Globe} smallValue />
      </StaggeredGrid>

      {/* Heatmap */}
      <AnimatedContainer delay={0.03}>
        <Card className="p-5">
          <ChartHeader title="🔥 Mapa de Calor de Sessões (Dia × Hora)" subtitle="Identifique os horários de maior tráfego" />
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex gap-0.5 mb-1 ml-10">
                {Array.from({ length: 8 }, (_, i) => i * 3).map(h => (
                  <span key={h} className="text-[9px] text-muted-foreground" style={{ width: `${100 / 8}%` }}>{h}h</span>
                ))}
              </div>
              {heatmapData.map(row => (
                <div key={row.day} className="flex items-center gap-0.5 mb-0.5">
                  <span className="text-[10px] text-muted-foreground w-10 text-right pr-2">{row.day}</span>
                  {row.hours.map(cell => {
                    const maxVal = Math.max(...heatmapData.flatMap(r => r.hours.map(h => h.value)), 1);
                    const intensity = Math.max(0.05, cell.value / maxVal);
                    return (
                      <div key={cell.hour} className="flex-1 h-7 rounded-md flex items-center justify-center transition-transform hover:scale-[1.08] cursor-default"
                        style={{ background: `hsl(var(--info) / ${intensity})`, border: `1px solid hsl(var(--info) / ${intensity * 0.4})` }}
                        title={`${row.day} ${cell.hour}:00 — ${cell.value} sessões`}
                      >
                        <span className="text-[8px] font-semibold" style={{ color: `hsl(var(--foreground) / ${Math.max(0.25, Math.min(intensity * 1.5 + 0.2, 1))})` }}>{cell.value}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Quality over time */}
      {sessionsByDay.length > 1 && (
        <AnimatedContainer>
          <Card className="p-5">
            <ChartHeader title="Qualidade do Acesso ao Longo do Tempo" subtitle="Engajamento vs rejeição" />
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sessionsByDay}>
                  <defs>
                    <LineGlowGradient id="engGlow" color="hsl(var(--success))" />
                    <LineGlowGradient id="bounceGlow" color="hsl(var(--warning))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="date" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} unit="%" />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                  <Area type="monotone" dataKey="engagementRate" stroke="hsl(var(--success))" fill="url(#engGlow)" strokeWidth={2.5} name="Engajamento %" dot={false} />
                  <Area type="monotone" dataKey="bounceRate" stroke="hsl(var(--warning))" fill="url(#bounceGlow)" strokeWidth={2.5} name="Rejeição %" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* Session funnel */}
      <AnimatedContainer delay={0.08}>
        <Card className="p-5">
          <ChartHeader title="Funil de Qualidade de Sessão" subtitle="Total → Engajadas → Multi-página → Longas" />
          <div className="space-y-2">
            {sessionFunnel.map((step, i) => (
              <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={sessionFunnel[0].value} color={step.color} index={i} />
            ))}
          </div>
        </Card>
      </AnimatedContainer>

      {/* Device radar + Source donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {qualityByDevice.length > 0 && (
          <AnimatedContainer delay={0.15}>
            <Card className="p-5">
              <ChartHeader title="Engajamento por Dispositivo" subtitle="Compare métricas entre dispositivos" />
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={qualityByDevice}>
                    <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <PolarAngleAxis dataKey="device" {...AXIS_STYLE} />
                    <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                    <Radar name="Engajamento %" dataKey="engagementRate" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Págs/Sessão" dataKey="pagesPerSession" stroke="hsl(var(--info))" fill="hsl(var(--info))" fillOpacity={0.12} strokeWidth={2} />
                    <Legend {...LEGEND_STYLE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </AnimatedContainer>
        )}

        {sourcePieData.length > 0 && (
          <AnimatedContainer delay={0.25}>
            <Card className="p-5">
              <ChartHeader title="Distribuição por Source" subtitle="Proporção de cada canal de tráfego" />
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourcePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                      {sourcePieData.map((_, i) => <Cell key={i} fill={VIVID_COLORS[i % VIVID_COLORS.length]} />)}
                      <DonutCenterLabel viewBox={{ cx: "50%", cy: "50%" }} value={sourcePieData.reduce((s, d) => s + d.value, 0)} label="Total" />
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend {...LEGEND_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </AnimatedContainer>
        )}
      </div>

      {/* City bar */}
      {sessionsByCity.length > 0 && (
        <AnimatedContainer delay={0.35}>
          <Card className="p-5">
            <ChartHeader title="Sessões por Cidade" subtitle="De onde vem seu público" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionsByCity}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="city" {...AXIS_STYLE} angle={-25} textAnchor="end" height={50} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Sessões">
                    {sessionsByCity.map((_, i) => <Cell key={i} fill={VIVID_COLORS[i % VIVID_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* Detailed Table */}
      <AnimatedContainer delay={0.45}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Sessões Detalhadas</h3>
                <p className="text-[11px] text-muted-foreground">
                  {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar..." className="pl-8 h-8 text-xs w-[180px]" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="h-3.5 w-3.5" /> Exportar</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportData("csv")} className="text-xs gap-2"><FileSpreadsheet className="h-3.5 w-3.5" /> CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportData("json")} className="text-xs gap-2"><FileJson className="h-3.5 w-3.5" /> JSON</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">Source:</span>
                <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[120px] h-8 text-[11px]"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {sources.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">Dispositivo:</span>
                <Select value={deviceFilter} onValueChange={v => { setDeviceFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Device" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {devices.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">Browser:</span>
                <Select value={browserFilter} onValueChange={v => { setBrowserFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Browser" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {browsersList.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">Status:</span>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="bounce">Bounce</SelectItem>
                    <SelectItem value="engaged">Engajada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">Cidade:</span>
                <Select value={cityFilter} onValueChange={v => { setCityFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[120px] h-8 text-[11px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cities.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {SORTABLE_COLUMNS.map(col => (
                    <th key={col.key} className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort(col.key)}>
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className={`h-3 w-3 ${sortKey === col.key ? "text-primary" : "text-muted-foreground/40"}`} />
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(s => {
                  const status = getSessionStatus(s);
                  return (
                    <tr key={s.session_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedSession(s.session_id)}>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{format(new Date(s.started_at), "dd/MM HH:mm")}</td>
                      <td className="px-3 py-2 text-[11px] font-medium text-foreground">{formatDuration(s.duration_sec)}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground text-center">{s.pages_viewed}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[150px] truncate" title={s.landing_page}>{s.landing_page}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[150px] truncate" title={s.exit_page}>{s.exit_page}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[150px] truncate" title={s.referrer}>🔗 {s.referrer.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[9px] capitalize">{s.source} / {s.medium}</Badge></td>
                      <td className="px-3 py-2 text-[11px] capitalize text-foreground">{s.device === "mobile" ? "📱" : s.device === "desktop" ? "🖥️" : "📟"} {s.device}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground">{s.browser === "Chrome" ? "🌐" : s.browser === "Firefox" ? "🦊" : s.browser === "Safari" ? "🧭" : "🌐"} {s.browser}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground">📍 {s.city}</td>
                      <td className="px-3 py-2">
                        {s.bot_name ? (
                          <Badge variant="outline" className={`text-[9px] gap-1 ${BOT_CATEGORY_STYLES[s.bot_category] || ""}`}>
                            {s.bot_emoji} {s.bot_name}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[9px] ${STATUS_BADGE[status] || ""}`}>{statusLabel[status]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[11px] text-muted-foreground">{sorted.length} sessões</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-[11px]" onClick={() => setPage(p)}>{p}</Button>;
              })}
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Session Detail Drawer */}
      <SessionDetailDrawer
        sessionId={selectedSession}
        events={allEvents}
        onClose={() => setSelectedSession(null)}
      />
    </div>
  );
}

/* ── Session Detail Drawer ── */
function SessionDetailDrawer({ sessionId, events, onClose }: {
  sessionId: string | null;
  events: TrackingEvent[];
  onClose: () => void;
}) {
  const sessionEvents = useMemo(() => {
    if (!sessionId) return [];
    return events
      .filter(e => (e.session_id || e.visitor_id) === sessionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [sessionId, events]);

  if (!sessionId || !sessionEvents.length) {
    return (
      <Sheet open={!!sessionId} onOpenChange={() => onClose()}>
        <SheetContent className="w-[420px] sm:w-[500px] overflow-y-auto"><SheetHeader><SheetTitle>Sessão não encontrada</SheetTitle></SheetHeader></SheetContent>
      </Sheet>
    );
  }

  const first = sessionEvents[0];
  const last = sessionEvents[sessionEvents.length - 1];
  const exitEvent = sessionEvents.find(e => e.event_type === "page_exit");
  const duration = exitEvent?.time_on_page || Math.round((new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / 1000);
  const pages = new Set(sessionEvents.map(e => e.page_url).filter(Boolean));
  const scrollDepth = exitEvent?.scroll_depth ?? 0;
  const moveData = exitEvent?.metadata && typeof exitEvent.metadata === "object" ? (exitEvent.metadata as any).move_samples : null;

  return (
    <Sheet open={!!sessionId} onOpenChange={() => onClose()}>
      <SheetContent className="w-[420px] sm:w-[520px] overflow-y-auto p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-sm font-display">Detalhe da Sessão</SheetTitle>
        </SheetHeader>

        {/* Session Overview */}
        <div className="px-5 space-y-4">
          {/* Visitor info card */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {first.visitor_id?.slice(-2)?.toUpperCase() || "??"}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground font-mono">{first.visitor_id?.slice(-12) || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{first.session_id?.slice(-12) || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Início", value: format(new Date(first.created_at), "dd/MM/yyyy HH:mm:ss") },
                { label: "Duração", value: formatDuration(duration) },
                { label: "Páginas", value: `${pages.size} página(s)` },
                { label: "Scroll", value: `${scrollDepth}%` },
                { label: "Dispositivo", value: `${first.device === "mobile" ? "📱" : first.device === "desktop" ? "🖥️" : "📟"} ${first.device || "—"}` },
                { label: "Browser", value: `${first.browser || "—"} / ${first.os || "—"}` },
                { label: "Resolução", value: `${first.screen_width || "—"} × ${first.screen_height || "—"}` },
                { label: "Idioma", value: first.language || "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-[11px] font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Origin & Attribution */}
          <Card className="p-4 space-y-2">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Origem & Atribuição</h4>
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Referrer", value: first.referrer || "Direto" },
                { label: "UTM Source", value: first.utm_source || "—" },
                { label: "UTM Medium", value: first.utm_medium || "—" },
                { label: "UTM Campaign", value: first.utm_campaign || "—" },
                { label: "UTM Term", value: first.utm_term || "—" },
                { label: "UTM Content", value: first.utm_content || "—" },
                { label: "GCLID", value: first.gclid ? `${first.gclid.slice(0, 16)}...` : "—" },
                { label: "FBCLID", value: first.fbclid ? `${first.fbclid.slice(0, 16)}...` : "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-[11px] font-medium text-foreground truncate" title={item.value}>{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Geolocation */}
          <Card className="p-4 space-y-2">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">📍 Geolocalização</h4>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "País", value: first.country || "—" },
                { label: "Estado", value: first.state || "—" },
                { label: "Cidade", value: first.city || "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-[11px] font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Mouse movement summary */}
          {moveData && Array.isArray(moveData) && moveData.length > 0 && (
            <Card className="p-4 space-y-2">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🖱️ Movimento do Mouse</h4>
              <Separator />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pontos</p>
                  <p className="text-[11px] font-medium text-foreground">{moveData.length}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Primeiro</p>
                  <p className="text-[11px] font-medium text-foreground">{moveData[0].t}s</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Último</p>
                  <p className="text-[11px] font-medium text-foreground">{moveData[moveData.length - 1].t}s</p>
                </div>
              </div>
              {/* Mini trail preview */}
              <div className="bg-muted/30 rounded-lg p-2 h-20 relative overflow-hidden">
                <svg viewBox="0 0 400 80" className="w-full h-full" preserveAspectRatio="none">
                  {moveData.length > 1 && (() => {
                    const xs = moveData.map((p: any) => p.x);
                    const ys = moveData.map((p: any) => p.y);
                    const minX = Math.min(...xs), maxX = Math.max(...xs) || 1;
                    const minY = Math.min(...ys), maxY = Math.max(...ys) || 1;
                    const points = moveData.map((p: any) => {
                      const nx = ((p.x - minX) / (maxX - minX)) * 380 + 10;
                      const ny = ((p.y - minY) / (maxY - minY)) * 60 + 10;
                      return `${nx},${ny}`;
                    }).join(" ");
                    return <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />;
                  })()}
                  {moveData.slice(-5).map((p: any, i: number) => {
                    const xs = moveData.map((pp: any) => pp.x);
                    const ys = moveData.map((pp: any) => pp.y);
                    const minX = Math.min(...xs), maxX = Math.max(...xs) || 1;
                    const minY = Math.min(...ys), maxY = Math.max(...ys) || 1;
                    const nx = ((p.x - minX) / (maxX - minX)) * 380 + 10;
                    const ny = ((p.y - minY) / (maxY - minY)) * 60 + 10;
                    return <circle key={i} cx={nx} cy={ny} r="2" fill="hsl(var(--primary))" opacity={0.3 + (i / 5) * 0.7} />;
                  })}
                </svg>
              </div>
            </Card>
          )}

          {/* Timeline */}
          <div className="space-y-2 pb-6">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">📋 Timeline de Ações ({sessionEvents.length} eventos)</h4>
            <div className="relative pl-4 border-l-2 border-border space-y-0">
              {sessionEvents.map((e, i) => {
                const time = format(new Date(e.created_at), "HH:mm:ss");
                const eventLabel = EVENT_LABELS[e.event_type] || e.event_type;
                const isExit = e.event_type === "page_exit";
                const isView = e.event_type === "page_view";
                const isConversion = ["whatsapp_click", "phone_click", "email_click", "form_submit", "purchase"].includes(e.event_type);

                return (
                  <div key={e.id || i} className="relative pb-3 group">
                    {/* Dot */}
                    <div className={`absolute -left-[calc(0.5rem+5px)] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                      isConversion ? "bg-success border-success" :
                      isExit ? "bg-destructive border-destructive" :
                      isView ? "bg-primary border-primary" :
                      "bg-muted-foreground/30 border-muted-foreground/50"
                    }`} />

                    <div className="ml-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] text-muted-foreground font-mono">{time}</span>
                        <Badge
                          variant="outline"
                          className={`text-[8px] ${
                            isConversion ? "bg-success/10 text-success border-success/30" :
                            isExit ? "bg-destructive/10 text-destructive border-destructive/30" :
                            isView ? "bg-primary/10 text-primary border-primary/30" :
                            ""
                          }`}
                        >
                          {eventLabel}
                        </Badge>
                      </div>

                      {/* Event details */}
                      <div className="mt-0.5 text-[10px] text-muted-foreground space-y-0.5">
                        {e.page_url && (
                          <p className="truncate max-w-[350px]" title={e.page_url}>
                            📄 {e.page_url.replace(/^https?:\/\/[^/]+/, "")}
                          </p>
                        )}
                        {e.cta_text && <p>🖱️ <span className="text-foreground">"{e.cta_text}"</span></p>}
                        {e.cta_selector && <p className="font-mono text-[9px]">🎯 {e.cta_selector}</p>}
                        {e.form_id && <p>📝 Form: {e.form_id}</p>}
                        {e.scroll_depth != null && <p>📜 Scroll: {e.scroll_depth}%</p>}
                        {e.time_on_page != null && <p>⏱️ Tempo: {formatDuration(e.time_on_page)}</p>}
                        {e.product_name && <p>🛒 {e.product_name} {e.product_price ? `— R$ ${e.product_price.toFixed(2)}` : ""}</p>}
                        {e.cart_value != null && e.cart_value > 0 && <p>💰 Valor: R$ {e.cart_value.toFixed(2)}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
