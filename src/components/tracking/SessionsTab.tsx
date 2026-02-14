import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  generateConversionsHeatmap,
  mockSessionsDetailed,
  type MockSession,
} from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Download, Search, Flame, ArrowUpDown, ChevronLeft, ChevronRight, FileJson, FileSpreadsheet, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Filter options ──
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
  { value: "converted", label: "Conversão" },
];

const LANDING_PAGE_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockSessionsDetailed.map((s) => s.landing_page))).sort().map((p) => ({ value: p, label: p })),
];
const EXIT_PAGE_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockSessionsDetailed.map((s) => s.exit_page))).sort().map((p) => ({ value: p, label: p })),
];
const CITY_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockSessionsDetailed.map((s) => s.city))).sort().map((c) => ({ value: c, label: c })),
];

// ── Color maps ──
const SOURCE_COLORS: Record<string, string> = {
  google: "hsl(var(--primary))",
  direct: "hsl(var(--success))",
  facebook: "hsl(var(--info))",
  instagram: "hsl(var(--warning))",
  bing: "hsl(var(--chart-5))",
  referral: "hsl(var(--destructive))",
  twitter: "hsl(var(--muted-foreground))",
};
const PIE_COLORS = Object.values(SOURCE_COLORS);

const STATUS_BADGE: Record<string, string> = {
  bounce: "bg-destructive/15 text-destructive border-destructive/30",
  engaged: "bg-primary/15 text-primary border-primary/30",
  converted: "bg-success/15 text-success border-success/30",
};

const heatmapData = generateConversionsHeatmap();

// ── Derived chart data ──
const sessionsByDay = (() => {
  const map = new Map<string, { sessions: number; bounces: number; conversions: number; engaged: number; totalDuration: number }>();
  mockSessionsDetailed.forEach((s) => {
    const day = format(new Date(s.started_at), "dd/MMM");
    const entry = map.get(day) || { sessions: 0, bounces: 0, conversions: 0, engaged: 0, totalDuration: 0 };
    entry.sessions++;
    entry.totalDuration += s.duration_sec;
    if (s.is_bounce) entry.bounces++;
    else entry.engaged++;
    if (s.converted) entry.conversions++;
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

// Duration distribution buckets
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

// Quality by device
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
    avgDuration: Math.round(v.totalDuration / v.total),
    pagesPerSession: Number((v.totalPages / v.total).toFixed(1)),
  }));
})();

// Quality by source (engagement rate + avg duration)
const qualityBySource = (() => {
  const map = new Map<string, { total: number; engaged: number; totalDuration: number; converted: number }>();
  mockSessionsDetailed.forEach((s) => {
    const entry = map.get(s.source) || { total: 0, engaged: 0, totalDuration: 0, converted: 0 };
    entry.total++;
    if (!s.is_bounce) entry.engaged++;
    if (s.converted) entry.converted++;
    entry.totalDuration += s.duration_sec;
    map.set(s.source, entry);
  });
  return Array.from(map.entries())
    .map(([source, v]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1),
      engagementRate: Math.round((v.engaged / v.total) * 100),
      conversionRate: Math.round((v.converted / v.total) * 100),
      avgDuration: Math.round(v.totalDuration / v.total),
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

// ── Table config ──
const PAGE_SIZE = 20;
type SortKey = keyof MockSession;
type SortDir = "asc" | "desc";

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "started_at", label: "Início" },
  { key: "duration_sec", label: "Duração" },
  { key: "pages_viewed", label: "Páginas" },
  { key: "landing_page", label: "Landing Page" },
  { key: "exit_page", label: "Saída" },
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
  if (s.converted) return "converted";
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

const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };

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
    if (statusFilter !== "all") {
      data = data.filter((s) => getSessionStatus(s) === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((s) =>
        s.landing_page.toLowerCase().includes(q) ||
        s.exit_page.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        s.session_id.toLowerCase().includes(q)
      );
    }
    return data;
  }, [deviceFilter, sourceFilter, mediumFilter, browserFilter, landingPageFilter, exitPageFilter, cityFilter, statusFilter, search]);

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

  // ── Quality-focused KPIs with period comparison ──
  const totalSessions = filtered.length;
  const avgDuration = totalSessions > 0 ? Math.round(filtered.reduce((s, r) => s + r.duration_sec, 0) / totalSessions) : 0;
  const bounceCount = filtered.filter((s) => s.is_bounce).length;
  const bounceRate = totalSessions > 0 ? Number(((bounceCount / totalSessions) * 100).toFixed(1)) : 0;
  const engagedCount = filtered.filter((s) => !s.is_bounce).length;
  const engagementRate = totalSessions > 0 ? Number(((engagedCount / totalSessions) * 100).toFixed(1)) : 0;
  const avgPages = totalSessions > 0 ? Number((filtered.reduce((s, r) => s + r.pages_viewed, 0) / totalSessions).toFixed(1)) : 0;
  const conversionRate = totalSessions > 0 ? Number(((filtered.filter((s) => s.converted).length / totalSessions) * 100).toFixed(1)) : 0;
  const newUsersPercent = 62.4; // Simulated
  const uniqueCities = new Set(filtered.map((s) => s.city)).size;

  // Export helpers
  const exportData = useCallback((fmt: "csv" | "json" | "xlsx") => {
    const headers = ["Início", "Duração", "Páginas", "Landing Page", "Saída", "Source", "Medium", "Dispositivo", "Browser", "Cidade", "Status"];
    const rows = sorted.map((s) => [
      format(new Date(s.started_at), "dd/MM/yyyy HH:mm"),
      formatDuration(s.duration_sec), String(s.pages_viewed), s.landing_page, s.exit_page,
      s.source, s.medium, s.device, s.browser, s.city, getSessionStatus(s),
    ]);
    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
      downloadBlob(blob, "sessoes.json");
    } else {
      const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, "sessoes.csv");
    }
  }, [sorted]);

  const statusLabel: Record<string, string> = { bounce: "Bounce", engaged: "Engajada", converted: "Conversão" };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Filter Bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mediumFilter} onValueChange={(v) => { setMediumFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Medium" /></SelectTrigger>
            <SelectContent>
              {MEDIUM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deviceFilter} onValueChange={(v) => { setDeviceFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Dispositivo" /></SelectTrigger>
            <SelectContent>
              {DEVICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={browserFilter} onValueChange={(v) => { setBrowserFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Browser" /></SelectTrigger>
            <SelectContent>
              {BROWSER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={landingPageFilter} onValueChange={(v) => { setLandingPageFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Landing Page" /></SelectTrigger>
            <SelectContent>
              {LANDING_PAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={exitPageFilter} onValueChange={(v) => { setExitPageFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Página Saída" /></SelectTrigger>
            <SelectContent>
              {EXIT_PAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              {CITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Period comparison badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] gap-1">
          <TrendingUp className="h-3 w-3 text-success" /> Comparando com período anterior ({period}d)
        </Badge>
      </div>

      {/* Quality-focused KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard label="Total Sessões" value={totalSessions} change={9.7} />
        <KpiCard label="Taxa Engajamento" value={engagementRate} change={4.2} suffix="%" />
        <KpiCard label="Duração Média" value={avgDuration} change={5.3} suffix="s" />
        <KpiCard label="Páginas/Sessão" value={avgPages} change={3.8} />
        <KpiCard label="Taxa Rejeição" value={bounceRate} change={-2.1} suffix="%" />
        <KpiCard label="Taxa Conversão" value={conversionRate} change={8.4} suffix="%" />
        <KpiCard label="Novos Usuários" value={newUsersPercent} change={-1.3} suffix="%" />
        <KpiCard label="Cidades" value={uniqueCities} change={11.2} />
      </StaggeredGrid>

      {/* Quality Trend Chart - Engagement & Bounce over time */}
      <AnimatedContainer>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Qualidade do Acesso ao Longo do Tempo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sessionsByDay}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bounceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="engagementRate" stroke="hsl(var(--success))" fill="url(#engGrad)" strokeWidth={2} name="Engajamento %" />
                <Area type="monotone" dataKey="bounceRate" stroke="hsl(var(--destructive))" fill="url(#bounceGrad)" strokeWidth={2} name="Rejeição %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Sessions + Conversions Line */}
      <AnimatedContainer delay={0.05}>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Sessões, Bounces e Conversões</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Sessões" />
                <Line type="monotone" dataKey="bounces" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Bounces" />
                <Line type="monotone" dataKey="conversions" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Conversões" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Row: Duration Distribution + Quality by Device */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Distribuição de Duração</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sessões" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Qualidade por Dispositivo</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityByDevice}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="device" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="bounceRate" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Rejeição %" />
                  <Bar dataKey="pagesPerSession" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} name="Págs/Sessão" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Row: Quality by Source + Source Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.2}>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Qualidade por Source</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityBySource} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                  <YAxis dataKey="source" type="category" width={80} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="engagementRate" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="Engajamento %" />
                  <Bar dataKey="conversionRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Conversão %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.25}>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Distribuição por Source</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourcePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                    {sourcePieData.map((entry, i) => {
                      const color = SOURCE_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length];
                      return <Cell key={i} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Top Landing Pages with quality metrics */}
      <AnimatedContainer delay={0.3}>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Top Landing Pages (Sessões × Bounce Rate)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topLandingPages} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="url" type="category" width={180} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Sessões" />
                <Bar dataKey="bounceRate" fill="hsl(var(--destructive) / 0.7)" radius={[0, 4, 4, 0]} name="Bounce %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Heatmap */}
      <AnimatedContainer delay={0.35}>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" /> Mapa de Calor de Sessões (Dia × Hora)
          </h3>
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
                  {row.hours.map((cell) => (
                    <div
                      key={cell.hour}
                      className="flex-1 h-7 rounded-sm flex items-center justify-center"
                      style={{ backgroundColor: `hsl(var(--info) / ${Math.max(0.05, cell.value / 40)})` }}
                      title={`${row.day} ${cell.hour}:00 — ${cell.value} sessões`}
                    >
                      <span className={`text-[8px] font-medium ${cell.value > 20 ? "text-info-foreground" : "text-muted-foreground"}`}>
                        {cell.value}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Detailed Sessions Table */}
      <AnimatedContainer delay={0.4}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">Sessões Detalhadas</h3>
              <p className="text-[11px] text-muted-foreground">
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} sessões
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar página, cidade, source..."
                  className="pl-8 h-8 text-xs w-[220px]"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportData("csv")} className="text-xs gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData("json")} className="text-xs gap-2">
                    <FileJson className="h-3.5 w-3.5" /> JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData("xlsx")} className="text-xs gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {SORTABLE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className={`h-3 w-3 ${sortKey === col.key ? "opacity-100" : "opacity-30"}`} />
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
                      <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(s.started_at), "dd/MM HH:mm")}
                      </td>
                      <td className="px-3 py-2 text-[11px] font-medium text-foreground">{formatDuration(s.duration_sec)}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground text-center">{s.pages_viewed}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[150px] truncate">{s.landing_page}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[150px] truncate">{s.exit_page}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[9px] capitalize">{s.source} / {s.medium}</Badge>
                      </td>
                      <td className="px-3 py-2 text-[11px] capitalize text-foreground">{s.device}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground">{s.browser}</td>
                      <td className="px-3 py-2 text-[11px] text-foreground">{s.city}</td>
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
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[11px] text-muted-foreground">{sorted.length} sessões</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <Button key={p} variant={p === page ? "default" : "ghost"} size="icon" className="h-7 w-7 text-[11px]" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                );
              })}
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
