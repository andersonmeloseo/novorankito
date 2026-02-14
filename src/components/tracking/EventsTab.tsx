import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  mockTrackingEventsDetailed,
  mockConversionsByDay,
  generateConversionsHeatmap,
  type MockTrackingEvent,
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

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];

const EVENT_TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "whatsapp_click", label: "WhatsApp Click" },
  { value: "form_submit", label: "Form Submit" },
  { value: "phone_call", label: "Phone Call" },
  { value: "page_view", label: "Page View" },
  { value: "cta_click", label: "CTA Click" },
  { value: "scroll_depth", label: "Scroll Depth" },
];

const DEVICE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
];

const CONVERSION_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "conversion", label: "Conversões" },
  { value: "micro_conversion", label: "Micro conversões" },
];

const BROWSER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "Chrome", label: "Chrome" },
  { value: "Safari", label: "Safari" },
  { value: "Firefox", label: "Firefox" },
  { value: "Edge", label: "Edge" },
];

// ── Derive unique values for additional filters ──
const PAGE_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockTrackingEventsDetailed.map((e) => e.page_url))).sort().map((p) => ({ value: p, label: p })),
];
const GOAL_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockTrackingEventsDetailed.map((e) => e.goal))).sort().map((g) => ({ value: g, label: g })),
];
const CTA_OPTIONS = [
  { value: "all", label: "Todos" },
  ...Array.from(new Set(mockTrackingEventsDetailed.map((e) => e.cta_text))).sort().map((c) => ({ value: c, label: c })),
];
const CITY_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockTrackingEventsDetailed.map((e) => e.location_city))).sort().map((c) => ({ value: c, label: c })),
];
const STATE_OPTIONS = [
  { value: "all", label: "Todos" },
  ...Array.from(new Set(mockTrackingEventsDetailed.map((e) => e.location_state))).sort().map((s) => ({ value: s, label: s })),
];

// Color map for event types
const EVENT_TYPE_COLORS: Record<string, string> = {
  whatsapp_click: "hsl(var(--success))",
  form_submit: "hsl(var(--primary))",
  phone_call: "hsl(var(--warning))",
  page_view: "hsl(var(--destructive))",
  cta_click: "hsl(var(--info))",
  scroll_depth: "hsl(var(--chart-5))",
};

const EVENT_TYPE_BG: Record<string, string> = {
  whatsapp_click: "bg-success/15 text-success border-success/30",
  form_submit: "bg-primary/15 text-primary border-primary/30",
  phone_call: "bg-warning/15 text-warning border-warning/30",
  page_view: "bg-destructive/15 text-destructive border-destructive/30",
  cta_click: "bg-info/15 text-info border-info/30",
  scroll_depth: "bg-chart-5/15 text-chart-5 border-chart-5/30",
};

const PIE_COLORS = Object.values(EVENT_TYPE_COLORS);

const heatmapData = generateConversionsHeatmap();

const PAGE_SIZE = 20;

type SortKey = keyof MockTrackingEvent;
type SortDir = "asc" | "desc";

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "timestamp", label: "Hora" },
  { key: "event_type", label: "Tipo" },
  { key: "conversion_type", label: "Categoria" },
  { key: "page_url", label: "Página" },
  { key: "cta_text", label: "CTA" },
  { key: "goal", label: "Meta" },
  { key: "value", label: "Valor" },
  { key: "device", label: "Dispositivo" },
  { key: "browser", label: "Browser" },
  { key: "location_city", label: "Cidade/Estado" },
];

export function EventsTab() {
  const [period, setPeriod] = useState("30");
  const [eventType, setEventType] = useState("all");
  const [device, setDevice] = useState("all");
  const [conversionType, setConversionType] = useState("all");
  const [browser, setBrowser] = useState("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [ctaFilter, setCtaFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = mockTrackingEventsDetailed;
    if (eventType !== "all") data = data.filter((e) => e.event_type === eventType);
    if (device !== "all") data = data.filter((e) => e.device === device);
    if (conversionType !== "all") data = data.filter((e) => e.conversion_type === conversionType);
    if (browser !== "all") data = data.filter((e) => e.browser === browser);
    if (pageFilter !== "all") data = data.filter((e) => e.page_url === pageFilter);
    if (goalFilter !== "all") data = data.filter((e) => e.goal === goalFilter);
    if (ctaFilter !== "all") data = data.filter((e) => e.cta_text === ctaFilter);
    if (cityFilter !== "all") data = data.filter((e) => e.location_city === cityFilter);
    if (stateFilter !== "all") data = data.filter((e) => e.location_state === stateFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((e) => e.page_url.includes(q) || e.location_city.toLowerCase().includes(q) || e.cta_text.toLowerCase().includes(q) || e.goal.toLowerCase().includes(q));
    }
    return data;
  }, [eventType, device, conversionType, browser, pageFilter, goalFilter, ctaFilter, cityFilter, stateFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }, [sortKey]);

  // KPIs
  const totalEvents = filtered.length;
  const uniquePages = new Set(filtered.map((e) => e.page_url)).size;
  const mobileEvents = filtered.filter((e) => e.device === "mobile").length;
  const mobilePercent = totalEvents > 0 ? ((mobileEvents / totalEvents) * 100).toFixed(1) : "0";
  const uniqueCities = new Set(filtered.map((e) => e.location_city)).size;
  const avgEventsPerPage = uniquePages > 0 ? Math.round(totalEvents / uniquePages) : 0;

  // Top pages
  const pageMap = new Map<string, number>();
  filtered.forEach((e) => { pageMap.set(e.page_url, (pageMap.get(e.page_url) || 0) + 1); });
  const topPages = Array.from(pageMap.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Distribution by event type
  const typeMap = new Map<string, number>();
  filtered.forEach((e) => { typeMap.set(e.event_type, (typeMap.get(e.event_type) || 0) + 1); });
  const pieData = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));

  // Export helpers
  const exportData = useCallback((fmt: "csv" | "json" | "xlsx") => {
    const headers = ["Hora", "Tipo", "Categoria", "Página", "CTA", "Meta", "Valor", "Dispositivo", "Browser", "Cidade", "Estado"];
    const rows = sorted.map((ev) => [
      format(new Date(ev.timestamp), "dd/MM/yyyy HH:mm"),
      ev.event_type, ev.conversion_type, ev.page_url, ev.cta_text, ev.goal,
      ev.value.toFixed(2), ev.device, ev.browser, ev.location_city, ev.location_state,
    ]);

    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
      downloadBlob(blob, "eventos.json");
    } else {
      const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, fmt === "xlsx" ? "eventos.csv" : "eventos.csv");
    }
  }, [sorted]);

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
          <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Tipo de Evento" /></SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={device} onValueChange={(v) => { setDevice(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Dispositivo" /></SelectTrigger>
            <SelectContent>
              {DEVICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={conversionType} onValueChange={(v) => { setConversionType(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Tipo Conversão" /></SelectTrigger>
            <SelectContent>
              {CONVERSION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={browser} onValueChange={(v) => { setBrowser(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Browser" /></SelectTrigger>
            <SelectContent>
              {BROWSER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pageFilter} onValueChange={(v) => { setPageFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Página" /></SelectTrigger>
            <SelectContent>
              {PAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={goalFilter} onValueChange={(v) => { setGoalFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Meta" /></SelectTrigger>
            <SelectContent>
              {GOAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ctaFilter} onValueChange={(v) => { setCtaFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="CTA" /></SelectTrigger>
            <SelectContent>
              {CTA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              {CITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              {STATE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total de Eventos" value={totalEvents} change={15.8} />
        <KpiCard label="Páginas Ativas" value={uniquePages} change={3.2} />
        <KpiCard label="Eventos/Página" value={avgEventsPerPage} change={7.4} />
        <KpiCard label="Mobile" value={Number(mobilePercent)} change={4.1} suffix="%" />
        <KpiCard label="Cidades Alcançadas" value={uniqueCities} change={11.2} />
      </StaggeredGrid>

      {/* Charts */}
      <AnimatedContainer>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Eventos ao Longo do Tempo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockConversionsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="whatsapp_click" stroke={EVENT_TYPE_COLORS.whatsapp_click} strokeWidth={2} dot={false} name="WhatsApp" />
                <Line type="monotone" dataKey="form_submit" stroke={EVENT_TYPE_COLORS.form_submit} strokeWidth={2} dot={false} name="Formulário" />
                <Line type="monotone" dataKey="phone_call" stroke={EVENT_TYPE_COLORS.phone_call} strokeWidth={2} dot={false} name="Ligação" />
                <Line type="monotone" dataKey="cta_click" stroke={EVENT_TYPE_COLORS.cta_click} strokeWidth={2} dot={false} name="CTA Click" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Distribuição por Tipo</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                    {pieData.map((entry, i) => {
                      const color = EVENT_TYPE_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length];
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
            <h3 className="text-sm font-medium text-foreground mb-4">Top Páginas por Eventos</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPages} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="url" type="category" width={140} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Eventos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Heatmap */}
      <AnimatedContainer delay={0.2}>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" /> Mapa de Calor de Eventos (Dia × Hora)
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
                      style={{ backgroundColor: `hsl(var(--primary) / ${Math.max(0.05, cell.value / 40)})` }}
                      title={`${row.day} ${cell.hour}:00 — ${cell.value} eventos`}
                    >
                      <span className={`text-[8px] font-medium ${cell.value > 20 ? "text-primary-foreground" : "text-muted-foreground"}`}>
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

      {/* Detailed Table */}
      <AnimatedContainer delay={0.25}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">Eventos Detalhados</h3>
              <p className="text-[11px] text-muted-foreground">
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} eventos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar página, cidade, CTA..."
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
                      className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className={`h-3 w-3 ${sortKey === col.key ? "text-primary" : "text-muted-foreground/40"}`} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((ev) => (
                  <tr key={ev.event_id} className="border-b border-border last:border-0 table-row-hover">
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">{format(new Date(ev.timestamp), "dd/MM HH:mm")}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${EVENT_TYPE_BG[ev.event_type] || "bg-secondary text-secondary-foreground border-border"}`}
                      >
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={ev.conversion_type === "conversion" ? "default" : "outline"} className="text-[10px]">
                        {ev.conversion_type === "conversion" ? "Conversão" : "Micro"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-foreground max-w-[180px] truncate">{ev.page_url}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{ev.cta_text}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{ev.goal}</td>
                    <td className="px-3 py-2.5 text-[11px] font-medium text-foreground">{ev.value > 0 ? `R$ ${ev.value.toFixed(2).replace(".", ",")}` : "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground capitalize">{ev.device}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{ev.browser}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">{ev.location_city}/{ev.location_state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0 text-[11px]"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </AnimatedContainer>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
