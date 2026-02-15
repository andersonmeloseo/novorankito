import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  mockTrackingEventsDetailed,
  mockConversionsByDay,
  generateConversionsHeatmap,
  type MockTrackingEvent,
} from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap, ScatterChart, Scatter, ZAxis, CartesianGrid,
} from "recharts";
import { Download, Search, Flame, ArrowUpDown, ChevronLeft, ChevronRight, FileJson, FileSpreadsheet, TrendingUp, Activity, Zap, Globe, Smartphone, Monitor, BarChart3 } from "lucide-react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, ChartGradient, LineGlowGradient, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, TreemapContent, PipelineVisual, CohortHeatmap, DonutCenterLabel,
} from "@/components/analytics/ChartPrimitives";

const PERIOD_OPTIONS = [
  { value: "1", label: "Hoje" },
  { value: "7", label: "7 dias" },
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
  { value: "60", label: "60 dias" },
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

const BROWSER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "Chrome", label: "Chrome" },
  { value: "Safari", label: "Safari" },
  { value: "Firefox", label: "Firefox" },
  { value: "Edge", label: "Edge" },
];

const PAGE_OPTIONS = [
  { value: "all", label: "Todas" },
  ...Array.from(new Set(mockTrackingEventsDetailed.map((e) => e.page_url))).sort().map((p) => ({ value: p, label: p })),
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

const VIVID_COLORS = CHART_COLORS;

const EVENT_TYPE_COLORS: Record<string, string> = {
  whatsapp_click: "hsl(var(--success))",
  form_submit: "hsl(var(--primary))",
  phone_call: "hsl(var(--warning))",
  page_view: "hsl(var(--info))",
  cta_click: "hsl(var(--chart-5))",
  scroll_depth: "hsl(180 60% 50%)",
};

const EVENT_TYPE_BG: Record<string, string> = {
  whatsapp_click: "bg-success/15 text-success border-success/30",
  form_submit: "bg-primary/15 text-primary border-primary/30",
  phone_call: "bg-warning/15 text-warning border-warning/30",
  page_view: "bg-info/15 text-info border-info/30",
  cta_click: "bg-accent text-accent-foreground border-accent-foreground/20",
  scroll_depth: "bg-primary/10 text-primary border-primary/20",
};

const heatmapData = generateConversionsHeatmap();

function generateSparkline(length = 12, base = 50, variance = 20): number[] {
  return Array.from({ length }, () => Math.max(0, base + Math.floor((Math.random() - 0.3) * variance)));
}

// ── Derived chart data ──
const eventsByDay = (() => {
  const map = new Map<string, { total: number; interactions: number; passive: number }>();
  mockTrackingEventsDetailed.forEach((e) => {
    const day = format(new Date(e.timestamp), "dd/MMM");
    const entry = map.get(day) || { total: 0, interactions: 0, passive: 0 };
    entry.total++;
    if (["whatsapp_click", "form_submit", "phone_call", "cta_click"].includes(e.event_type)) {
      entry.interactions++;
    } else {
      entry.passive++;
    }
    map.set(day, entry);
  });
  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    ...v,
    interactionRate: v.total > 0 ? Math.round((v.interactions / v.total) * 100) : 0,
  }));
})();

const eventsByDeviceRadar = (() => {
  const map = new Map<string, { total: number; interactions: number; avgValue: number }>();
  mockTrackingEventsDetailed.forEach((e) => {
    const entry = map.get(e.device) || { total: 0, interactions: 0, avgValue: 0 };
    entry.total++;
    if (["whatsapp_click", "form_submit", "phone_call", "cta_click"].includes(e.event_type)) entry.interactions++;
    entry.avgValue += e.value;
    map.set(e.device, entry);
  });
  return Array.from(map.entries()).map(([device, v]) => ({
    device: device.charAt(0).toUpperCase() + device.slice(1),
    total: v.total,
    interactions: v.interactions,
    interactionRate: Math.round((v.interactions / v.total) * 100),
  }));
})();

const eventsByBrowser = (() => {
  const map = new Map<string, number>();
  mockTrackingEventsDetailed.forEach((e) => map.set(e.browser, (map.get(e.browser) || 0) + 1));
  return Array.from(map.entries()).map(([browser, count]) => ({ browser, count }));
})();

const topPagesTreemap = (() => {
  const map = new Map<string, number>();
  mockTrackingEventsDetailed.forEach((e) => map.set(e.page_url, (map.get(e.page_url) || 0) + 1));
  return Array.from(map.entries())
    .map(([name, size], i) => ({ name: name.replace(/^\//, ""), size, fill: VIVID_COLORS[i % VIVID_COLORS.length] }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 8);
})();

const pieData = (() => {
  const map = new Map<string, number>();
  mockTrackingEventsDetailed.forEach((e) => map.set(e.event_type, (map.get(e.event_type) || 0) + 1));
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
})();

const eventsByCity = (() => {
  const map = new Map<string, number>();
  mockTrackingEventsDetailed.forEach((e) => map.set(e.location_city, (map.get(e.location_city) || 0) + 1));
  return Array.from(map.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
})();

// Scatter data: events value vs count per page
const scatterByPage = (() => {
  const map = new Map<string, { count: number; totalValue: number }>();
  mockTrackingEventsDetailed.forEach((e) => {
    const entry = map.get(e.page_url) || { count: 0, totalValue: 0 };
    entry.count++;
    entry.totalValue += e.value;
    map.set(e.page_url, entry);
  });
  return Array.from(map.entries()).map(([page, v]) => ({
    page: page.replace(/^\//, ""),
    count: v.count,
    avgValue: Number((v.totalValue / v.count).toFixed(2)),
    totalValue: Number(v.totalValue.toFixed(2)),
  }));
})();

// Funnel: event pipeline
const eventFunnel = (() => {
  const types = ["page_view", "scroll_depth", "cta_click", "whatsapp_click", "form_submit", "phone_call"];
  const labels: Record<string, string> = {
    page_view: "Visualizações", scroll_depth: "Scroll Profundo", cta_click: "Cliques CTA",
    whatsapp_click: "WhatsApp", form_submit: "Formulários", phone_call: "Ligações",
  };
  return types.map((t) => ({
    label: labels[t] || t,
    value: mockTrackingEventsDetailed.filter((e) => e.event_type === t).length,
    color: EVENT_TYPE_COLORS[t] || VIVID_COLORS[0],
  }));
})();

// Cohort heatmap: event type × device
const cohortData = (() => {
  const types = ["page_view", "cta_click", "whatsapp_click", "form_submit", "phone_call"];
  const devices = ["mobile", "desktop", "tablet"];
  const data = types.map((t) => devices.map((d) =>
    mockTrackingEventsDetailed.filter((e) => e.event_type === t && e.device === d).length
  ));
  return { data, xLabels: devices.map(d => d.charAt(0).toUpperCase() + d.slice(1)), yLabels: types.map(t => t.replace("_", " ")) };
})();

const PAGE_SIZE = 20;
type SortKey = keyof MockTrackingEvent;
type SortDir = "asc" | "desc";

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "timestamp", label: "Hora" },
  { key: "event_type", label: "Tipo" },
  { key: "page_url", label: "Página" },
  { key: "cta_text", label: "CTA" },
  { key: "value", label: "Valor" },
  { key: "device", label: "Dispositivo" },
  { key: "browser", label: "Browser" },
  { key: "location_city", label: "Cidade" },
];

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

function SparkKpi({ label, value, change, suffix, prefix, sparkData, color, icon: Icon }: {
  label: string; value: string | number; change: number; suffix?: string; prefix?: string;
  sparkData: number[]; color: string; icon?: React.ElementType;
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
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isPositive ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
            {isPositive ? "+" : ""}{change}%
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-xl font-bold text-foreground font-display tracking-tight">
            {prefix}{value}{suffix}
          </span>
          <Sparkline data={sparkData} color={color} />
        </div>
      </div>
    </Card>
  );
}

export function EventsTab() {
  const [period, setPeriod] = useState("30");
  const [eventType, setEventType] = useState("all");
  const [device, setDevice] = useState("all");
  const [browser, setBrowser] = useState("all");
  const [pageFilter, setPageFilter] = useState("all");
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
    if (browser !== "all") data = data.filter((e) => e.browser === browser);
    if (pageFilter !== "all") data = data.filter((e) => e.page_url === pageFilter);
    if (ctaFilter !== "all") data = data.filter((e) => e.cta_text === ctaFilter);
    if (cityFilter !== "all") data = data.filter((e) => e.location_city === cityFilter);
    if (stateFilter !== "all") data = data.filter((e) => e.location_state === stateFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((e) => e.page_url.includes(q) || e.location_city.toLowerCase().includes(q) || e.cta_text.toLowerCase().includes(q));
    }
    return data;
  }, [eventType, device, browser, pageFilter, ctaFilter, cityFilter, stateFilter, search]);

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
  const totalEvents = filtered.length;
  const interactions = filtered.filter((e) => ["whatsapp_click", "form_submit", "phone_call", "cta_click"].includes(e.event_type)).length;
  const interactionRate = totalEvents > 0 ? Number(((interactions / totalEvents) * 100).toFixed(1)) : 0;
  const uniquePages = new Set(filtered.map((e) => e.page_url)).size;
  const avgEventsPerPage = uniquePages > 0 ? Math.round(totalEvents / uniquePages) : 0;
  const mobileEvents = filtered.filter((e) => e.device === "mobile").length;
  const mobilePercent = totalEvents > 0 ? Number(((mobileEvents / totalEvents) * 100).toFixed(1)) : 0;
  const whatsappEvents = filtered.filter((e) => e.event_type === "whatsapp_click").length;
  const formEvents = filtered.filter((e) => e.event_type === "form_submit").length;

  const exportData = useCallback((fmt: "csv" | "json" | "xlsx") => {
    const headers = ["Hora", "Tipo", "Página", "CTA", "Valor", "Dispositivo", "Browser", "Cidade", "Estado"];
    const rows = sorted.map((ev) => [
      format(new Date(ev.timestamp), "dd/MM/yyyy HH:mm"),
      ev.event_type, ev.page_url, ev.cta_text, ev.value.toFixed(2), ev.device, ev.browser, ev.location_city, ev.location_state,
    ]);
    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
      downloadBlob(blob, "eventos.json");
    } else {
      const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), "eventos.csv");
    }
  }, [sorted]);

  const totalPieEvents = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <FeatureBanner icon={Activity} title="Eventos em Tempo Real" description={<>Acompanhe <strong>todos os eventos</strong> capturados pelo Pixel Rankito com filtros avançados, heatmaps de horário e análise por tipo de evento.</>} />
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
        <SparkKpi label="Total Eventos" value={totalEvents} change={15.8} sparkData={generateSparkline(12, 100, 30)} color="hsl(var(--primary))" icon={Activity} />
        <SparkKpi label="Interações" value={interactions} change={8.4} sparkData={generateSparkline(12, 40, 15)} color="hsl(var(--success))" icon={Zap} />
        <SparkKpi label="Taxa Interação" value={interactionRate} change={5.2} suffix="%" sparkData={generateSparkline(12, 55, 12)} color="hsl(var(--info))" />
        <SparkKpi label="Eventos/Página" value={avgEventsPerPage} change={7.4} sparkData={generateSparkline(12, 12, 5)} color="hsl(var(--warning))" />
        <SparkKpi label="Páginas Ativas" value={uniquePages} change={3.2} sparkData={generateSparkline(12, 8, 3)} color="hsl(var(--chart-5))" icon={Globe} />
        <SparkKpi label="Mobile" value={mobilePercent} change={4.1} suffix="%" sparkData={generateSparkline(12, 60, 10)} color="hsl(var(--success))" icon={Smartphone} />
        <SparkKpi label="WhatsApp" value={whatsappEvents} change={12.3} sparkData={generateSparkline(12, 20, 8)} color="hsl(var(--success))" />
        <SparkKpi label="Formulários" value={formEvents} change={6.7} sparkData={generateSparkline(12, 15, 6)} color="hsl(var(--primary))" />
      </StaggeredGrid>

      {/* ═══ Line Chart com gradiente e glow — Volume de Eventos ═══ */}
      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Volume de Eventos ao Longo do Tempo" subtitle="Linha com gradiente glow + taxa de interação" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eventsByDay}>
                <defs>
                  <LineGlowGradient id="evTotalGlow" color="hsl(var(--primary))" />
                  <LineGlowGradient id="evInterGlow" color="hsl(var(--success))" />
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#evTotalGlow)" strokeWidth={2.5} name="Total" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--primary))" }} />
                <Area type="monotone" dataKey="interactions" stroke="hsl(var(--success))" fill="url(#evInterGlow)" strokeWidth={2.5} name="Interações" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--success))" }} />
                <Line type="monotone" dataKey="interactionRate" stroke="hsl(var(--warning))" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Taxa Interação %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Stacked Area — Eventos por Tipo ═══ */}
      <AnimatedContainer delay={0.05}>
        <Card className="p-5">
          <ChartHeader title="Composição de Eventos por Tipo" subtitle="Stacked Area com transparência" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockConversionsByDay} stackOffset="expand">
                <defs>
                  {Object.entries(EVENT_TYPE_COLORS).map(([key, color]) => (
                    <ChartGradient key={key} id={`stack-${key}`} color={color} opacity={0.4} />
                  ))}
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Area type="monotone" dataKey="whatsapp_click" stackId="1" stroke={EVENT_TYPE_COLORS.whatsapp_click} fill={`url(#stack-whatsapp_click)`} strokeWidth={1.5} name="WhatsApp" />
                <Area type="monotone" dataKey="form_submit" stackId="1" stroke={EVENT_TYPE_COLORS.form_submit} fill={`url(#stack-form_submit)`} strokeWidth={1.5} name="Formulário" />
                <Area type="monotone" dataKey="phone_call" stackId="1" stroke={EVENT_TYPE_COLORS.phone_call} fill={`url(#stack-phone_call)`} strokeWidth={1.5} name="Ligação" />
                <Area type="monotone" dataKey="cta_click" stackId="1" stroke={EVENT_TYPE_COLORS.cta_click} fill={`url(#stack-cta_click)`} strokeWidth={1.5} name="CTA Click" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Step Funnel — Pipeline de Conversão ═══ */}
      <AnimatedContainer delay={0.08}>
        <Card className="p-5">
          <ChartHeader title="Funil de Eventos" subtitle="Step funnel — queda entre etapas do pipeline" />
          <div className="space-y-2">
            {eventFunnel.map((step, i) => (
              <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={eventFunnel[0].value} color={step.color} index={i} />
            ))}
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Row: Radar Device + Donut Distribution ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="Engajamento por Dispositivo" subtitle="Radar chart multi-dimensional" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={eventsByDeviceRadar}>
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="device" {...AXIS_STYLE} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar name="Total" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Interações" dataKey="interactions" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.15} strokeWidth={2} />
                  <Legend {...LEGEND_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <ChartHeader title="Distribuição por Tipo" subtitle="Donut chart com label central" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} strokeWidth={2} stroke="hsl(var(--card))">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={EVENT_TYPE_COLORS[entry.name] || VIVID_COLORS[i % VIVID_COLORS.length]} />
                    ))}
                    <DonutCenterLabel viewBox={{ cx: "50%", cy: "50%" }} value={totalPieEvents} label="Total" />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ═══ Scatter/Bubble — Valor × Volume por Página ═══ */}
      <AnimatedContainer delay={0.18}>
        <Card className="p-5">
          <ChartHeader title="Valor × Volume por Página" subtitle="Scatter/Bubble — tamanho = valor total" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 10, bottom: 10 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="count" name="Eventos" {...AXIS_STYLE} label={{ value: "Eventos", position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
                <YAxis dataKey="avgValue" name="Valor Médio" {...AXIS_STYLE} label={{ value: "Valor Médio (R$)", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
                <ZAxis dataKey="totalValue" range={[40, 400]} name="Valor Total" />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: any, name: string) => [typeof value === 'number' ? value.toLocaleString("pt-BR") : value, name]} />
                <Scatter data={scatterByPage} fill="hsl(var(--primary))" fillOpacity={0.6} stroke="hsl(var(--primary))" strokeWidth={1}>
                  {scatterByPage.map((_, i) => (
                    <Cell key={i} fill={VIVID_COLORS[i % VIVID_COLORS.length]} fillOpacity={0.65} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Treemap — Top Páginas ═══ */}
      <AnimatedContainer delay={0.2}>
        <Card className="p-5">
          <ChartHeader title="Treemap de Páginas" subtitle="Área proporcional ao volume de eventos" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={topPagesTreemap}
                dataKey="size"
                nameKey="name"
                stroke="hsl(var(--background))"
                content={<TreemapContent />}
              />
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Row: Pipeline Visual + City Bar ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.22}>
          <Card className="p-5">
            <ChartHeader title="Pipeline Visual" subtitle="Barras verticais proporcionais por etapa" />
            <PipelineVisual steps={eventFunnel} />
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.25}>
          <Card className="p-5">
            <ChartHeader title="Proximidade por Cidade" subtitle="Barras com gradiente horizontal" />
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventsByCity} layout="vertical" margin={{ left: 5 }}>
                  <defs>
                    {eventsByCity.map((_, i) => (
                      <BarGradient key={i} id={`cityBar-${i}`} color={VIVID_COLORS[i % VIVID_COLORS.length]} />
                    ))}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="city" type="category" width={90} {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} name="Eventos">
                    {eventsByCity.map((_, i) => (
                      <Cell key={i} fill={`url(#cityBar-${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* ═══ Cohort Heatmap — Tipo × Dispositivo ═══ */}
      <AnimatedContainer delay={0.28}>
        <Card className="p-5">
          <ChartHeader title="Heatmap: Tipo de Evento × Dispositivo" subtitle="Cohort heatmap com intensidade de cor" />
          <CohortHeatmap
            data={cohortData.data}
            xLabels={cohortData.xLabels}
            yLabels={cohortData.yLabels}
            maxValue={Math.max(...cohortData.data.flat())}
            hue={210}
          />
        </Card>
      </AnimatedContainer>

      {/* ═══ Browser bar with gradient ═══ */}
      <AnimatedContainer delay={0.3}>
        <Card className="p-5">
          <ChartHeader title="Eventos por Browser" subtitle="Barras verticais com gradiente" />
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventsByBrowser}>
                <defs>
                  {eventsByBrowser.map((_, i) => (
                    <ChartGradient key={i} id={`browserGrad-${i}`} color={VIVID_COLORS[i % VIVID_COLORS.length]} opacity={0.9} />
                  ))}
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="browser" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Eventos">
                  {eventsByBrowser.map((_, i) => (
                    <Cell key={i} fill={VIVID_COLORS[i % VIVID_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* ═══ Heatmap Dia × Hora ═══ */}
      <AnimatedContainer delay={0.35}>
        <Card className="p-5">
          <ChartHeader title="Mapa de Calor de Eventos (Dia × Hora)" subtitle="Heatmap calendário com intensidade dinâmica" />
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
                      <div
                        key={cell.hour}
                        className="flex-1 h-7 rounded-md flex items-center justify-center transition-transform hover:scale-[1.08] cursor-default"
                        style={{
                          background: `hsl(var(--info) / ${intensity})`,
                          border: `1px solid hsl(var(--info) / ${intensity * 0.4})`,
                        }}
                        title={`${row.day} ${cell.hour}:00 — ${cell.value} eventos`}
                      >
                        <span className={`text-[8px] font-medium ${cell.value > 20 ? "text-primary-foreground" : "text-muted-foreground"}`}>
                          {cell.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Detailed Table */}
      <AnimatedContainer delay={0.4}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Eventos Detalhados</h3>
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
              <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-8 text-[11px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>{EVENT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={device} onValueChange={(v) => { setDevice(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Device" /></SelectTrigger>
                <SelectContent>{DEVICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={browser} onValueChange={(v) => { setBrowser(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue placeholder="Browser" /></SelectTrigger>
                <SelectContent>{BROWSER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={pageFilter} onValueChange={(v) => { setPageFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px] h-8 text-[11px]"><SelectValue placeholder="Página" /></SelectTrigger>
                <SelectContent>{PAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={ctaFilter} onValueChange={(v) => { setCtaFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-8 text-[11px]"><SelectValue placeholder="CTA" /></SelectTrigger>
                <SelectContent>{CTA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-8 text-[11px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>{CITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[90px] h-8 text-[11px]"><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{STATE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {SORTABLE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort(col.key)}>
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
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${EVENT_TYPE_BG[ev.event_type] || "bg-secondary text-secondary-foreground border-border"}`}>
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-foreground max-w-[180px] truncate">{ev.page_url}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{ev.cta_text}</td>
                    <td className="px-3 py-2.5 text-[11px] font-medium text-foreground">{ev.value > 0 ? `R$ ${ev.value.toFixed(2).replace(".", ",")}` : "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground capitalize">{ev.device}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{ev.browser}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">{ev.location_city}/{ev.location_state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-[11px]" onClick={() => setPage(p)}>{p}</Button>;
                })}
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-3.5 w-3.5" /></Button>
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
