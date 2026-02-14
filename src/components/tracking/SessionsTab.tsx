import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  generateConversionsHeatmap,
  mockSessionsDetailed,
  type MockSession,
} from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, CartesianGrid,
} from "recharts";
import { Download, Search, Flame, ArrowUpDown, ChevronLeft, ChevronRight, FileJson, FileSpreadsheet, TrendingUp, Users, Clock, Layers, Globe, Smartphone } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, ChartGradient, LineGlowGradient, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, PipelineVisual, CohortHeatmap, DonutCenterLabel,
} from "@/components/analytics/ChartPrimitives";

const PERIOD_OPTIONS = [
  { value: "1", label: "Hoje" },
  { value: "7", label: "7 dias" },
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
  { value: "60", label: "60 dias" },
  { value: "90", label: "90 dias" },
];
const DEVICE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
];
const SOURCE_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "google", label: "Google" },
  { value: "direct", label: "Direct" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "bing", label: "Bing" },
  { value: "referral", label: "Referral" },
  { value: "twitter", label: "Twitter" },
];
const MEDIUM_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "organic", label: "Organic" },
  { value: "cpc", label: "CPC" },
  { value: "social", label: "Social" },
  { value: "referral", label: "Referral" },
  { value: "(none)", label: "(none)" },
];
const BROWSER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "Chrome", label: "Chrome" },
  { value: "Safari", label: "Safari" },
  { value: "Firefox", label: "Firefox" },
  { value: "Edge", label: "Edge" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "bounce", label: "Bounce" },
  { value: "engaged", label: "Engajada" },
];
const LANDING_PAGE_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockSessionsDetailed.map((s) => s.landing_page))).sort().map((p) => ({ value: p, label: p })),
];
const EXIT_PAGE_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockSessionsDetailed.map((s) => s.exit_page))).sort().map((p) => ({ value: p, label: p })),
];
const REFERRER_OPTIONS = [
  { value: "all", label: "Todos" },
  ...Array.from(new Set(mockSessionsDetailed.map((s) => s.referrer))).sort().map((r) => ({ value: r, label: r.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || r })),
];
const CITY_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockSessionsDetailed.map((s) => s.city))).sort().map((c) => ({ value: c, label: c })),
];

const VIVID_COLORS = CHART_COLORS;

const SOURCE_COLORS: Record<string, string> = {
  google: "hsl(var(--primary))",
  direct: "hsl(var(--success))",
  facebook: "hsl(var(--info))",
  instagram: "hsl(var(--warning))",
  bing: "hsl(var(--chart-5))",
  referral: "hsl(250 85% 72%)",
  twitter: "hsl(180 60% 50%)",
};

const STATUS_BADGE: Record<string, string> = {
  bounce: "bg-warning/15 text-warning border-warning/30",
  engaged: "bg-success/15 text-success border-success/30",
};

const heatmapData = generateConversionsHeatmap();

function generateSparkline(length = 12, base = 50, variance = 20): number[] {
  return Array.from({ length }, () => Math.max(0, base + Math.floor((Math.random() - 0.3) * variance)));
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="ml-auto">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkKpi({ label, value, change, suffix, prefix, sparkData, color, icon: Icon, hideSparkline, hideBadge, smallValue }: {
  label: string; value: string | number; change: number; suffix?: string; prefix?: string;
  sparkData: number[]; color: string; icon?: React.ElementType;
  hideSparkline?: boolean; hideBadge?: boolean; smallValue?: boolean;
}) {
  const isPositive = change >= 0;
  return (
    <Card className="p-3.5 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
          {!hideBadge && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isPositive ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
              {isPositive ? "+" : ""}{change}%
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className={`font-bold text-foreground font-display tracking-tight ${smallValue ? "text-xs" : "text-xl"}`}>
            {prefix}{value}{suffix}
          </span>
          {!hideSparkline && <Sparkline data={sparkData} color={color} />}
        </div>
      </div>
    </Card>
  );
}

// ── Derived data ──
const sessionsByDay = (() => {
  const map = new Map<string, { sessions: number; bounces: number; engaged: number; totalDuration: number }>();
  mockSessionsDetailed.forEach((s) => {
    const day = format(new Date(s.started_at), "dd/MMM");
    const entry = map.get(day) || { sessions: 0, bounces: 0, engaged: 0, totalDuration: 0 };
    entry.sessions++;
    entry.totalDuration += s.duration_sec;
    if (s.is_bounce) entry.bounces++;
    else entry.engaged++;
    map.set(day, entry);
  });
  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    ...v,
    engagementRate: v.sessions > 0 ? Math.round((v.engaged / v.sessions) * 100) : 0,
    bounceRate: v.sessions > 0 ? Math.round((v.bounces / v.sessions) * 100) : 0,
    avgDuration: v.sessions > 0 ? Math.round(v.totalDuration / v.sessions) : 0,
  }));
})();

const durationDistribution = (() => {
  const buckets = [
    { label: "0-10s", min: 0, max: 10, count: 0 },
    { label: "10-30s", min: 10, max: 30, count: 0 },
    { label: "30s-1m", min: 30, max: 60, count: 0 },
    { label: "1-3m", min: 60, max: 180, count: 0 },
    { label: "3-5m", min: 180, max: 300, count: 0 },
    { label: "5-10m", min: 300, max: 600, count: 0 },
    { label: "10m+", min: 600, max: Infinity, count: 0 },
  ];
  mockSessionsDetailed.forEach((s) => {
    const b = buckets.find((b) => s.duration_sec >= b.min && s.duration_sec < b.max);
    if (b) b.count++;
  });
  return buckets.map(({ label, count }) => ({ label, count }));
})();

const qualityByDevice = (() => {
  const map = new Map<string, { total: number; bounces: number; totalDuration: number; totalPages: number }>();
  mockSessionsDetailed.forEach((s) => {
    const entry = map.get(s.device) || { total: 0, bounces: 0, totalDuration: 0, totalPages: 0 };
    entry.total++;
    if (s.is_bounce) entry.bounces++;
    entry.totalDuration += s.duration_sec;
    entry.totalPages += s.pages_viewed;
    map.set(s.device, entry);
  });
  return Array.from(map.entries()).map(([device, v]) => ({
    device: device.charAt(0).toUpperCase() + device.slice(1),
    bounceRate: Math.round((v.bounces / v.total) * 100),
    engagementRate: Math.round(((v.total - v.bounces) / v.total) * 100),
    avgDuration: Math.round(v.totalDuration / v.total),
    pagesPerSession: Number((v.totalPages / v.total).toFixed(1)),
    total: v.total,
  }));
})();

const qualityBySource = (() => {
  const map = new Map<string, { total: number; engaged: number; totalDuration: number }>();
  mockSessionsDetailed.forEach((s) => {
    const entry = map.get(s.source) || { total: 0, engaged: 0, totalDuration: 0 };
    entry.total++;
    if (!s.is_bounce) entry.engaged++;
    entry.totalDuration += s.duration_sec;
    map.set(s.source, entry);
  });
  return Array.from(map.entries())
    .map(([source, v]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1),
      engagementRate: Math.round((v.engaged / v.total) * 100),
      avgDuration: Math.round(v.totalDuration / v.total),
      total: v.total,
    }))
    .sort((a, b) => b.engagementRate - a.engagementRate);
})();

const topLandingPages = (() => {
  const map = new Map<string, { count: number; bounces: number; totalDuration: number }>();
  mockSessionsDetailed.forEach((s) => {
    const entry = map.get(s.landing_page) || { count: 0, bounces: 0, totalDuration: 0 };
    entry.count++;
    if (s.is_bounce) entry.bounces++;
    entry.totalDuration += s.duration_sec;
    map.set(s.landing_page, entry);
  });
  return Array.from(map.entries())
    .map(([url, v]) => ({ url, count: v.count, bounceRate: Math.round((v.bounces / v.count) * 100), avgDuration: Math.round(v.totalDuration / v.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
})();

const sourcePieData = (() => {
  const map = new Map<string, number>();
  mockSessionsDetailed.forEach((s) => map.set(s.source, (map.get(s.source) || 0) + 1));
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
})();

const sessionsByCity = (() => {
  const map = new Map<string, number>();
  mockSessionsDetailed.forEach((s) => map.set(s.city, (map.get(s.city) || 0) + 1));
  return Array.from(map.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 8);
})();

// Scatter: duration vs pages per source
const scatterBySource = (() => {
  const map = new Map<string, { totalDuration: number; totalPages: number; count: number }>();
  mockSessionsDetailed.forEach((s) => {
    const entry = map.get(s.source) || { totalDuration: 0, totalPages: 0, count: 0 };
    entry.totalDuration += s.duration_sec;
    entry.totalPages += s.pages_viewed;
    entry.count++;
    map.set(s.source, entry);
  });
  return Array.from(map.entries()).map(([source, v]) => ({
    source: source.charAt(0).toUpperCase() + source.slice(1),
    avgDuration: Math.round(v.totalDuration / v.count),
    avgPages: Number((v.totalPages / v.count).toFixed(1)),
    count: v.count,
  }));
})();

// Session funnel: total → engaged → multi-page → long (>60s)
const sessionFunnel = (() => {
  const total = mockSessionsDetailed.length;
  const engaged = mockSessionsDetailed.filter((s) => !s.is_bounce).length;
  const multiPage = mockSessionsDetailed.filter((s) => s.pages_viewed >= 3).length;
  const longSessions = mockSessionsDetailed.filter((s) => s.duration_sec > 60).length;
  const deepEngaged = mockSessionsDetailed.filter((s) => s.pages_viewed >= 5 && s.duration_sec > 120).length;
  return [
    { label: "Total Sessões", value: total, color: "hsl(var(--primary))" },
    { label: "Engajadas", value: engaged, color: "hsl(var(--success))" },
    { label: "Multi-página (3+)", value: multiPage, color: "hsl(var(--info))" },
    { label: "Longas (>1min)", value: longSessions, color: "hsl(var(--warning))" },
    { label: "Deep Engaged", value: deepEngaged, color: "hsl(var(--chart-5))" },
  ];
})();

// Cohort: source × device
const cohortData = (() => {
  const sources = ["google", "direct", "facebook", "instagram"];
  const devices = ["mobile", "desktop", "tablet"];
  const data = sources.map((src) => devices.map((d) =>
    mockSessionsDetailed.filter((s) => s.source === src && s.device === d).length
  ));
  return {
    data,
    xLabels: devices.map(d => d.charAt(0).toUpperCase() + d.slice(1)),
    yLabels: sources.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
  };
})();

const PAGE_SIZE = 20;
type SortKey = keyof MockSession;
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
];

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s > 0 ? ` ${s}s` : ""}`;
}

function getSessionStatus(s: MockSession): string {
  if (s.is_bounce) return "bounce";
  return "engaged";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SessionsTab() {
  const [period, setPeriod] = useState("30");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [mediumFilter, setMediumFilter] = useState("all");
  const [browserFilter, setBrowserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [landingPageFilter, setLandingPageFilter] = useState("all");
  const [exitPageFilter, setExitPageFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [referrerFilter, setReferrerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("started_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = mockSessionsDetailed;
    if (deviceFilter !== "all") data = data.filter((s) => s.device === deviceFilter);
    if (sourceFilter !== "all") data = data.filter((s) => s.source === sourceFilter);
    if (mediumFilter !== "all") data = data.filter((s) => s.medium === mediumFilter);
    if (browserFilter !== "all") data = data.filter((s) => s.browser === browserFilter);
    if (landingPageFilter !== "all") data = data.filter((s) => s.landing_page === landingPageFilter);
    if (exitPageFilter !== "all") data = data.filter((s) => s.exit_page === exitPageFilter);
    if (cityFilter !== "all") data = data.filter((s) => s.city === cityFilter);
    if (referrerFilter !== "all") data = data.filter((s) => s.referrer === referrerFilter);
    if (statusFilter !== "all") data = data.filter((s) => getSessionStatus(s) === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((s) => s.landing_page.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.source.toLowerCase().includes(q) || s.referrer.toLowerCase().includes(q));
    }
    return data;
  }, [deviceFilter, sourceFilter, mediumFilter, browserFilter, landingPageFilter, exitPageFilter, cityFilter, referrerFilter, statusFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  }, [sortKey]);

  // KPIs
  const totalSessions = filtered.length;
  const avgDuration = totalSessions > 0 ? Math.round(filtered.reduce((s, r) => s + r.duration_sec, 0) / totalSessions) : 0;
  const bounceCount = filtered.filter((s) => s.is_bounce).length;
  const bounceRate = totalSessions > 0 ? Number(((bounceCount / totalSessions) * 100).toFixed(1)) : 0;
  const engagedCount = filtered.filter((s) => !s.is_bounce).length;
  const engagementRate = totalSessions > 0 ? Number(((engagedCount / totalSessions) * 100).toFixed(1)) : 0;
  const avgPages = totalSessions > 0 ? Number((filtered.reduce((s, r) => s + r.pages_viewed, 0) / totalSessions).toFixed(1)) : 0;
  const newUsersPercent = 62.4;
  const uniqueCities = new Set(filtered.map((s) => s.city)).size;
  const lastSession = filtered.length > 0 ? filtered.reduce((a, b) => new Date(a.started_at) > new Date(b.started_at) ? a : b) : null;
  const lastSourceMedium = lastSession ? `${lastSession.source} / ${lastSession.medium}` : "—";

  const exportData = useCallback((fmt: "csv" | "json" | "xlsx") => {
    const headers = ["Início", "Duração", "Páginas", "Landing Page", "Saída", "Source", "Medium", "Dispositivo", "Browser", "Cidade", "Status"];
    const rows = sorted.map((s) => [
      format(new Date(s.started_at), "dd/MM/yyyy HH:mm"),
      formatDuration(s.duration_sec), String(s.pages_viewed), s.landing_page, s.exit_page,
      s.source, s.medium, s.device, s.browser, s.city, getSessionStatus(s),
    ]);
    if (fmt === "json") {
      downloadBlob(new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" }), "sessoes.json");
    } else {
      const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), "sessoes.csv");
    }
  }, [sorted]);

  const statusLabel: Record<string, string> = { bounce: "Bounce", engaged: "Engajada" };
  const totalSourcePie = sourcePieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Period selector */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] gap-1">
            <TrendingUp className="h-3 w-3 text-success" /> vs período anterior ({period}d)
          </Badge>
        </div>
      </Card>

      {/* KPIs with Sparklines */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <SparkKpi label="Total Sessões" value={totalSessions} change={9.7} sparkData={generateSparkline(12, 80, 20)} color="hsl(var(--primary))" icon={Users} />
        <SparkKpi label="Taxa Engajamento" value={engagementRate} change={4.2} suffix="%" sparkData={generateSparkline(12, 70, 10)} color="hsl(var(--success))" />
        <SparkKpi label="Duração Média" value={formatDuration(avgDuration)} change={5.3} sparkData={generateSparkline(12, 120, 40)} color="hsl(var(--info))" icon={Clock} />
        <SparkKpi label="Páginas/Sessão" value={avgPages} change={3.8} sparkData={generateSparkline(12, 4, 2)} color="hsl(var(--warning))" icon={Layers} />
        <SparkKpi label="Taxa Rejeição" value={bounceRate} change={-2.1} suffix="%" sparkData={generateSparkline(12, 30, 8)} color="hsl(var(--warning))" />
        <SparkKpi label="Novos Usuários" value={newUsersPercent} change={-1.3} suffix="%" sparkData={generateSparkline(12, 62, 8)} color="hsl(var(--chart-5))" />
        <SparkKpi label="Cidade" value={lastSession ? lastSession.city : "—"} change={0} sparkData={[]} color="hsl(var(--info))" icon={Globe} hideSparkline hideBadge smallValue />
        <SparkKpi label="Source/Medium" value={lastSourceMedium} change={0} sparkData={[]} color="hsl(var(--success))" icon={Globe} hideSparkline hideBadge smallValue />
      </StaggeredGrid>

      {/* ═══ Heatmap Dia × Hora — Featured ═══ */}
      <AnimatedContainer delay={0.03}>
        <Card className="p-5">
          <ChartHeader title="🔥 Mapa de Calor de Sessões (Dia × Hora)" subtitle="Identifique os horários de maior tráfego para agendar publicações e campanhas nos momentos certos" />
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex gap-0.5 mb-1 ml-10">
                {Array.from({ length: 8 }, (_, i) => i * 3).map((h) => (
                  <span key={h} className="text-[9px] text-muted-foreground" style={{ width: `${100 / 8}%` }}>{h}h</span>
                ))}
              </div>
              {heatmapData.map((row) => (
                <div key={row.day} className="flex items-center gap-0.5 mb-0.5">
                  <span className="text-[10px] text-muted-foreground w-10 text-right pr-2">{row.day}</span>
                  {row.hours.map((cell) => {
                    const intensity = Math.max(0.05, cell.value / 40);
                    return (
                      <div key={cell.hour} className="flex-1 h-7 rounded-md flex items-center justify-center transition-transform hover:scale-[1.08] cursor-default"
                        style={{ background: `hsl(var(--info) / ${intensity})`, border: `1px solid hsl(var(--info) / ${intensity * 0.4})` }}
                        title={`${row.day} ${cell.hour}:00 — ${cell.value} sessões`}
                      >
                        <span className="text-[8px] font-semibold" style={{ color: `rgba(0,0,0,${Math.max(0.25, Math.min(intensity * 1.5 + 0.2, 1))})`, fontWeight: intensity > 0.5 ? 800 : 600 }}>{cell.value}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Multi-line com hover emphasis — Qualidade do Acesso ═══ */}
      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Qualidade do Acesso ao Longo do Tempo" subtitle="Monitore a evolução do engajamento vs rejeição para avaliar a eficácia das melhorias no site" />
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
                <Area type="monotone" dataKey="engagementRate" stroke="hsl(var(--success))" fill="url(#engGlow)" strokeWidth={2.5} name="Engajamento %" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--success))" }} />
                <Area type="monotone" dataKey="bounceRate" stroke="hsl(var(--warning))" fill="url(#bounceGlow)" strokeWidth={2.5} name="Rejeição %" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--warning))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Line Chart com gradiente — Sessões e Engajamento ═══ */}
      <AnimatedContainer delay={0.05}>
        <Card className="p-5">
          <ChartHeader title="Sessões e Engajamento" subtitle="Compare o volume total de sessões com as engajadas e bounces para identificar problemas de retenção" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionsByDay}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 2, fill: "hsl(var(--primary))" }} name="Sessões" />
                <Line type="monotone" dataKey="engaged" stroke="hsl(var(--success))" strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} name="Engajadas" />
                <Line type="monotone" dataKey="bounces" stroke="hsl(var(--warning))" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 5 }} name="Bounces" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Step Funnel — Pipeline de Sessão ═══ */}
      <AnimatedContainer delay={0.08}>
        <Card className="p-5">
          <ChartHeader title="Funil de Qualidade de Sessão" subtitle="Visualize a queda entre etapas do engajamento — do total até sessões profundamente engajadas" />
          <div className="space-y-2">
            {sessionFunnel.map((step, i) => (
              <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={sessionFunnel[0].value} color={step.color} index={i} />
            ))}
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Row: Duration funnel + Radar ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="Distribuição de Duração" subtitle="Entenda quanto tempo os visitantes permanecem no site para calibrar o conteúdo" />
            <div className="space-y-1.5">
              {durationDistribution.map((bucket, i) => (
                <FunnelStep key={bucket.label} label={bucket.label} value={bucket.count} maxValue={Math.max(...durationDistribution.map(d => d.count))} color={VIVID_COLORS[i % VIVID_COLORS.length]} index={i} />
              ))}
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <ChartHeader title="Engajamento por Dispositivo" subtitle="Compare métricas de engajamento entre mobile, desktop e tablet para priorizar otimizações" />
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
      </div>

      {/* ═══ Duração × Páginas por Source ═══ */}
      <AnimatedContainer delay={0.18}>
        <Card className="p-5">
          <ChartHeader title="Duração × Páginas por Source" subtitle="Descubra quais fontes de tráfego geram sessões mais longas e com mais páginas visitadas" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scatterBySource} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  {scatterBySource.map((_, i) => (
                    <BarGradient key={i} id={`durGrad-${i}`} color={VIVID_COLORS[i % VIVID_COLORS.length]} />
                  ))}
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis type="number" {...AXIS_STYLE} />
                <YAxis dataKey="source" type="category" width={80} {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Bar dataKey="avgDuration" radius={[0, 8, 8, 0]} name="Duração Média (s)" fill="hsl(var(--primary))" fillOpacity={0.8} />
                <Bar dataKey="avgPages" radius={[0, 8, 8, 0]} name="Páginas/Sessão" fill="hsl(var(--success))" fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Row: Source quality bar + Donut ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.2}>
          <Card className="p-5">
            <ChartHeader title="Qualidade por Source" subtitle="Avalie qual canal de aquisição gera os visitantes mais engajados" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityBySource} layout="vertical" margin={{ left: 10 }}>
                  <defs>
                    {qualityBySource.map((_, i) => (
                      <BarGradient key={i} id={`srcGrad-${i}`} color={VIVID_COLORS[i % VIVID_COLORS.length]} />
                    ))}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} unit="%" />
                  <YAxis dataKey="source" type="category" width={80} {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="engagementRate" radius={[0, 8, 8, 0]} name="Engajamento %">
                    {qualityBySource.map((_, i) => (
                      <Cell key={i} fill={`url(#srcGrad-${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.25}>
          <Card className="p-5">
            <ChartHeader title="Distribuição por Source" subtitle="Veja a proporção de cada canal de tráfego no total de sessões" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourcePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                    {sourcePieData.map((entry, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[entry.name] || VIVID_COLORS[i % VIVID_COLORS.length]} />
                    ))}
                    <DonutCenterLabel viewBox={{ cx: "50%", cy: "50%" }} value={totalSourcePie} label="Total" />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ═══ Cohort Heatmap — Source × Device ═══ */}
      <AnimatedContainer delay={0.28}>
        <Card className="p-5">
          <ChartHeader title="Heatmap: Source × Dispositivo" subtitle="Identifique combinações de canal e dispositivo com maior volume para segmentar campanhas" />
          <CohortHeatmap
            data={cohortData.data}
            xLabels={cohortData.xLabels}
            yLabels={cohortData.yLabels}
            maxValue={Math.max(...cohortData.data.flat())}
            hue={150}
          />
        </Card>
      </AnimatedContainer>

      {/* ═══ Row: Pipeline + Landing Pages ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.3}>
          <Card className="p-5">
            <ChartHeader title="Pipeline Visual de Sessões" subtitle="Acompanhe o funil de retenção desde a primeira visita até o engajamento profundo" />
            <PipelineVisual steps={sessionFunnel} />
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.32}>
          <Card className="p-5">
            <ChartHeader title="Top Landing Pages" subtitle="Descubra quais páginas de entrada atraem mais sessões e onde focar SEO" />
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLandingPages} layout="vertical" margin={{ left: 10 }}>
                  <defs>
                    {topLandingPages.map((_, i) => (
                      <BarGradient key={i} id={`lpGrad-${i}`} color={VIVID_COLORS[i % VIVID_COLORS.length]} />
                    ))}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="url" type="category" width={140} {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} name="Sessões">
                    {topLandingPages.map((_, i) => (
                      <Cell key={i} fill={`url(#lpGrad-${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ═══ City proximity bar with gradient ═══ */}
      <AnimatedContainer delay={0.35}>
        <Card className="p-5">
          <ChartHeader title="Proximidade por Cidade" subtitle="Veja de quais cidades vem seu público para direcionar campanhas locais" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionsByCity}>
                <defs>
                  {sessionsByCity.map((_, i) => (
                    <ChartGradient key={i} id={`cityGradS-${i}`} color={VIVID_COLORS[i % VIVID_COLORS.length]} opacity={0.9} />
                  ))}
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="city" {...AXIS_STYLE} angle={-25} textAnchor="end" height={50} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Sessões">
                  {sessionsByCity.map((_, i) => (
                    <Cell key={i} fill={VIVID_COLORS[i % VIVID_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>
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
                  <Input placeholder="Buscar..." className="pl-8 h-8 text-xs w-[180px]" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="h-3.5 w-3.5" /> Exportar</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportData("csv")} className="text-xs gap-2"><FileSpreadsheet className="h-3.5 w-3.5" /> CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportData("json")} className="text-xs gap-2"><FileJson className="h-3.5 w-3.5" /> JSON</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportData("xlsx")} className="text-xs gap-2"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-8 text-[11px]"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>{SOURCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={mediumFilter} onValueChange={(v) => { setMediumFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Medium" /></SelectTrigger>
                <SelectContent>{MEDIUM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={deviceFilter} onValueChange={(v) => { setDeviceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Device" /></SelectTrigger>
                <SelectContent>{DEVICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={browserFilter} onValueChange={(v) => { setBrowserFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Browser" /></SelectTrigger>
                <SelectContent>{BROWSER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={landingPageFilter} onValueChange={(v) => { setLandingPageFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-8 text-[11px]"><SelectValue placeholder="Landing" /></SelectTrigger>
                <SelectContent>{LANDING_PAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={exitPageFilter} onValueChange={(v) => { setExitPageFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-8 text-[11px]"><SelectValue placeholder="Saída" /></SelectTrigger>
                <SelectContent>{EXIT_PAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-8 text-[11px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>{CITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={referrerFilter} onValueChange={(v) => { setReferrerFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px] h-8 text-[11px]"><SelectValue placeholder="Referrer" /></SelectTrigger>
                <SelectContent>{REFERRER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {SORTABLE_COLUMNS.map((col) => (
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
                {paged.map((s) => {
                  const status = getSessionStatus(s);
                  return (
                    <tr key={s.session_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{format(new Date(s.started_at), "dd/MM HH:mm")}</td>
                      <td className="px-3 py-2 text-[11px] font-medium text-foreground">{formatDuration(s.duration_sec)}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground text-center">{s.pages_viewed}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[150px] truncate">{s.landing_page}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[150px] truncate">{s.exit_page}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[150px] truncate" title={s.referrer}>🔗 {s.referrer.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || s.referrer}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[9px] capitalize">{s.source} / {s.medium}</Badge>
                      </td>
                      <td className="px-3 py-2 text-[11px] capitalize text-foreground">{s.device === "mobile" ? "📱" : s.device === "desktop" ? "🖥️" : "📟"} {s.device}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground">{s.browser === "Chrome" ? "🌐" : s.browser === "Firefox" ? "🦊" : s.browser === "Safari" ? "🧭" : s.browser === "Edge" ? "🔷" : "🌐"} {s.browser}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground">📍 {s.city}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[9px] ${STATUS_BADGE[status] || ""}`}>
                          {statusLabel[status]}
                        </Badge>
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
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-[11px]" onClick={() => setPage(p)}>{p}</Button>;
              })}
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
