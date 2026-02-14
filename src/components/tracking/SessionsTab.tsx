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
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { Download, Search, Flame, ArrowUpDown, ChevronLeft, ChevronRight, FileJson, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Filter options ──
const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
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
const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "bounce", label: "Bounce" },
  { value: "engaged", label: "Engajada" },
  { value: "converted", label: "Conversão" },
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
  const map = new Map<string, { sessions: number; bounces: number; conversions: number; revenue: number }>();
  mockSessionsDetailed.forEach((s) => {
    const day = format(new Date(s.started_at), "dd/MMM");
    const entry = map.get(day) || { sessions: 0, bounces: 0, conversions: 0, revenue: 0 };
    entry.sessions++;
    if (s.is_bounce) entry.bounces++;
    if (s.converted) entry.conversions++;
    entry.revenue += s.revenue;
    map.set(day, entry);
  });
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
})();

const topLandingPages = (() => {
  const map = new Map<string, number>();
  mockSessionsDetailed.forEach((s) => map.set(s.landing_page, (map.get(s.landing_page) || 0) + 1));
  return Array.from(map.entries())
    .map(([url, count]) => ({ url, count }))
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
  { key: "revenue", label: "Receita" },
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

export function SessionsTab() {
  const [period, setPeriod] = useState("30");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [mediumFilter, setMediumFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("started_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = mockSessionsDetailed;
    if (deviceFilter !== "all") data = data.filter((s) => s.device === deviceFilter);
    if (sourceFilter !== "all") data = data.filter((s) => s.source === sourceFilter);
    if (mediumFilter !== "all") data = data.filter((s) => s.medium === mediumFilter);
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
  }, [deviceFilter, sourceFilter, mediumFilter, statusFilter, search]);

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
  const bounceRate = totalSessions > 0 ? ((bounceCount / totalSessions) * 100).toFixed(1) : "0";
  const avgPages = totalSessions > 0 ? (filtered.reduce((s, r) => s + r.pages_viewed, 0) / totalSessions).toFixed(1) : "0";
  const totalRevenue = filtered.reduce((s, r) => s + r.revenue, 0);

  // Export helpers
  const exportData = useCallback((fmt: "csv" | "json" | "xlsx") => {
    const headers = ["Início", "Duração", "Páginas", "Landing Page", "Saída", "Source", "Medium", "Dispositivo", "Browser", "Cidade", "Status", "Receita"];
    const rows = sorted.map((s) => [
      format(new Date(s.started_at), "dd/MM/yyyy HH:mm"),
      formatDuration(s.duration_sec), String(s.pages_viewed), s.landing_page, s.exit_page,
      s.source, s.medium, s.device, s.browser, s.city, getSessionStatus(s),
      s.revenue.toFixed(2),
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
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Sessões" value={totalSessions} change={9.7} />
        <KpiCard label="Duração Média" value={avgDuration} change={5.3} suffix="s" />
        <KpiCard label="Taxa de Rejeição" value={Number(bounceRate)} change={-2.1} suffix="%" />
        <KpiCard label="Páginas/Sessão" value={Number(avgPages)} change={3.8} />
        <KpiCard label="Receita Total" value={Math.round(totalRevenue)} change={18.6} prefix="R$" />
      </StaggeredGrid>

      {/* Charts */}
      <AnimatedContainer>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Sessões ao Longo do Tempo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Sessões" />
                <Line type="monotone" dataKey="bounces" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Bounces" />
                <Line type="monotone" dataKey="conversions" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Conversões" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.1}>
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
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Top Landing Pages</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLandingPages} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="url" type="category" width={140} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Sessões" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Heatmap - renamed and moved above the table */}
      <AnimatedContainer delay={0.2}>
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
      <AnimatedContainer delay={0.25}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">Sessões Detalhadas</h3>
              <p className="text-[11px] text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} sessões
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
                      <td className="px-3 py-2 text-[11px] font-medium text-foreground">
                        {s.revenue > 0 ? `R$ ${s.revenue.toFixed(2)}` : "—"}
                      </td>
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
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
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
