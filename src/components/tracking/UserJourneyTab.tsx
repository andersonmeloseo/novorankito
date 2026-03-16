import { useState, useMemo, useCallback } from "react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { useTrackingEvents } from "@/hooks/use-tracking-events";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Search, Route, Clock, ArrowRight, MapPin, Globe, Smartphone, Monitor, Tablet,
  Target, TrendingUp, Footprints, Eye, MousePointerClick, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Download, FileJson, FileSpreadsheet,
  Trophy, Wifi, Laptop,
} from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE,
  FunnelStep,
} from "@/components/analytics/ChartPrimitives";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";

const DEVICE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
];

const CONVERSION_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "converted", label: "Convertidos" },
  { value: "not_converted", label: "Não convertidos" },
];

const PAGE_SIZE = 8;

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ─── Build journeys from raw tracking events ───
interface JourneyStep {
  page: string;
  action: string;
  duration_sec: number;
  scroll_depth: number;
  timestamp: string;
  cta_clicked?: string;
  cta_selector?: string;
}

interface Journey {
  visitor_id: string;
  session_id: string;
  device: string;
  os: string;
  browser: string;
  city: string;
  country: string;
  source: string;
  medium: string;
  started_at: string;
  total_duration_sec: number;
  steps: JourneyStep[];
  converted: boolean;
  conversion_value: number;
  conversion_page?: string;
  ip_address?: string;
}

function buildJourneys(events: any[]): Journey[] {
  // Group events by session_id
  const sessionMap = new Map<string, any[]>();
  events.forEach(e => {
    const sid = e.session_id || e.visitor_id || "unknown";
    const arr = sessionMap.get(sid) || [];
    arr.push(e);
    sessionMap.set(sid, arr);
  });

  const journeys: Journey[] = [];

  sessionMap.forEach((sessionEvents, sid) => {
    const sorted = sessionEvents.sort((a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    if (sorted.length === 0) return;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalDuration = Math.round(
      (new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / 1000
    );

    // Build steps from page_view and click events
    const steps: JourneyStep[] = [];

    // Group by page, collecting all CTA clicks per page
    let currentPage = "";
    let currentStepIdx = -1;
    sorted.forEach((e: any, idx: number) => {
      const page = e.page_url || "/";
      if (page !== currentPage || idx === 0) {
        currentPage = page;

        const nextPageEvent = sorted.slice(idx + 1).find((ne: any) => (ne.page_url || "/") !== page);
        const endTime = nextPageEvent ? new Date(nextPageEvent.created_at).getTime() : new Date(e.created_at).getTime();
        const duration = Math.round((endTime - new Date(e.created_at).getTime()) / 1000);

        steps.push({
          page: page,
          action: e.event_type,
          duration_sec: Math.max(duration, 0),
          scroll_depth: e.scroll_depth || 0,
          timestamp: e.created_at,
          cta_clicked: e.cta_text || undefined,
          cta_selector: e.cta_selector || undefined,
        });
        currentStepIdx = steps.length - 1;
      } else if (e.cta_text && currentStepIdx >= 0 && !steps[currentStepIdx].cta_clicked) {
        // Capture CTA click from same-page event into the current step
        steps[currentStepIdx].cta_clicked = e.cta_text;
        steps[currentStepIdx].cta_selector = e.cta_selector || undefined;
      }
    });

    // Determine if converted (any conversion-like event)
    const conversionEvents = sorted.filter((e: any) =>
      ["purchase", "conversion", "lead", "signup", "form_submit"].includes(e.event_type)
    );
    const converted = conversionEvents.length > 0;
    const convValue = conversionEvents.reduce((s: number, e: any) => s + (e.product_price || e.cart_value || 0), 0);

    journeys.push({
      visitor_id: first.visitor_id || "anônimo",
      session_id: sid,
      device: first.device || "desktop",
      os: first.os || "—",
      browser: first.browser || "—",
      city: first.city || "—",
      country: first.country || "BR",
      source: first.utm_source || first.referrer || "direct",
      medium: first.utm_medium || "none",
      started_at: first.created_at,
      total_duration_sec: totalDuration,
      steps: steps.length > 0 ? steps : [{
        page: first.page_url || "/",
        action: first.event_type,
        duration_sec: 0,
        scroll_depth: first.scroll_depth || 0,
        timestamp: first.created_at,
      }],
      converted,
      conversion_value: convValue,
      conversion_page: conversionEvents[0]?.page_url,
      ip_address: undefined,
    });
  });

  return journeys.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

// ─── Journey Step Timeline ───
function JourneyTimeline({ steps, isExpanded }: { steps: JourneyStep[]; isExpanded: boolean }) {
  const displaySteps = isExpanded ? steps : steps.slice(0, 3);
  const STEP_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--info))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--chart-5))",
    "hsl(var(--destructive))",
  ];

  return (
    <div className="relative pl-6 space-y-0">
      <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary via-info to-success opacity-30" />
      {displaySteps.map((step, i) => {
        const color = STEP_COLORS[i % STEP_COLORS.length];
        const isEntry = i === 0;
        const isExit = i === steps.length - 1 && isExpanded;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="relative flex items-start gap-3 py-2"
          >
            <div className="absolute left-[-17px] top-3 flex items-center justify-center">
              <div
                className="h-3 w-3 rounded-full border-2 shadow-sm"
                style={{
                  borderColor: color,
                  backgroundColor: isEntry || isExit ? color : "hsl(var(--background))",
                  boxShadow: `0 0 8px color-mix(in srgb, ${color} 40%, transparent)`,
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground truncate max-w-[200px]" title={step.page}>{step.page}</span>
                {isEntry && <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30">Entrada</Badge>}
                {isExit && <Badge className="text-[9px] px-1.5 py-0 bg-destructive/15 text-destructive border-destructive/30">Saída</Badge>}
                {step.cta_clicked && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-1 border-success/40 text-success">
                    <MousePointerClick className="h-2.5 w-2.5" /> {step.cta_clicked}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> {formatDuration(step.duration_sec)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-2.5 w-2.5" /> Scroll {step.scroll_depth}%
                </span>
                <span>{format(new Date(step.timestamp), "HH:mm:ss")}</span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0">{step.action.replace(/_/g, " ")}</Badge>
              </div>
            </div>
            {i < displaySteps.length - 1 && (
              <div className="absolute -bottom-1 left-[-11px] h-4 flex items-center">
                <ArrowRight className="h-2 w-2 text-muted-foreground/40" />
              </div>
            )}
          </motion.div>
        );
      })}
      {!isExpanded && steps.length > 3 && (
        <div className="pl-2 pt-1">
          <span className="text-[10px] text-muted-foreground">+{steps.length - 3} páginas...</span>
        </div>
      )}
    </div>
  );
}

// ─── Sortable Table Header ───
function SortTh({
  label, field, current, onSort, className = "",
}: {
  label: string; field: string; current: string; onSort: (f: string) => void; className?: string;
}) {
  const isActive = current === field || current === `-${field}`;
  const isDesc = current === field;
  return (
    <th
      className={`px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(isActive && isDesc ? `-${field}` : field)}
    >
      {label} {isActive && (isDesc ? "↓" : "↑")}
    </th>
  );
}

// ─── Journey Table Row ───
function JourneyTableRow({ journey }: { journey: Journey }) {
  const [expanded, setExpanded] = useState(false);
  const DeviceIcon = journey.device === "mobile" ? Smartphone : journey.device === "tablet" ? Tablet : Monitor;
  const entryPage = journey.steps[0]?.page || "/";
  const exitPage = journey.steps[journey.steps.length - 1]?.page || "/";

  return (
    <>
      <tr
        className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-2 py-2 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Footprints className="h-3 w-3 text-primary shrink-0" />
            <span className="font-medium text-foreground">{journey.visitor_id}</span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/60">{journey.session_id.slice(0, 8)}</span>
        </td>
        <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
          {format(new Date(journey.started_at), "dd/MM/yy HH:mm", { locale: ptBR })}
        </td>
        <td className="px-2 py-2 whitespace-nowrap text-center">{journey.steps.length}</td>
        <td className="px-2 py-2 whitespace-nowrap text-center">{formatDuration(journey.total_duration_sec)}</td>
        <td className="px-2 py-2">
          <span className="text-[10px] text-foreground break-all" title={entryPage}>{entryPage}</span>
        </td>
        <td className="px-2 py-2">
          <span className="text-[10px] text-foreground break-all" title={exitPage}>{exitPage}</span>
        </td>
        <td className="px-2 py-2 whitespace-nowrap">
          <span className="flex items-center gap-1"><DeviceIcon className="h-3 w-3" /> {journey.device}</span>
        </td>
        <td className="px-2 py-2 whitespace-nowrap hidden lg:table-cell">{journey.browser}</td>
        <td className="px-2 py-2 whitespace-nowrap hidden lg:table-cell">{journey.os}</td>
        <td className="px-2 py-2 whitespace-nowrap">
          <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {journey.city}, {journey.country}</span>
        </td>
        <td className="px-2 py-2 whitespace-nowrap hidden md:table-cell">{journey.source}/{journey.medium}</td>
        <td className="px-2 py-2 whitespace-nowrap text-center">
          {journey.converted ? (
            <Badge className="text-[9px] bg-success/15 text-success border-success/30 gap-1">
              <Trophy className="h-2.5 w-2.5" /> R$ {journey.conversion_value.toFixed(0)}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-2 py-2 text-center">
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground inline" /> : <ChevronDown className="h-3 w-3 text-muted-foreground inline" />}
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={99} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden bg-muted/20 border-b border-border/30"
              >
                <div className="p-4">
                  <JourneyTimeline steps={journey.steps} isExpanded />
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Tab ───
export function UserJourneyTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const { data: allEvents = [], isLoading } = useTrackingEvents(projectId);
  const [search, setSearch] = useState("");
  const [device, setDevice] = useState("all");
  const [convFilter, setConvFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [page, setPage] = useState(1);

  const journeys = useMemo(() => buildJourneys(allEvents || []), [allEvents]);

  const filtered = useMemo(() => {
    let data = journeys;
    if (device !== "all") data = data.filter(j => j.device === device);
    if (convFilter === "converted") data = data.filter(j => j.converted);
    if (convFilter === "not_converted") data = data.filter(j => !j.converted);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(j =>
        j.visitor_id.includes(q) ||
        j.city.toLowerCase().includes(q) ||
        j.steps.some(s => s.page.includes(q) || (s.cta_clicked && s.cta_clicked.toLowerCase().includes(q)))
      );
    }
    return data;
  }, [journeys, device, convFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const desc = !sortBy.startsWith("-");
    const field = sortBy.replace(/^-/, "");
    const cmp = (a: Journey, b: Journey): number => {
      switch (field) {
        case "duration": return b.total_duration_sec - a.total_duration_sec;
        case "pages": return b.steps.length - a.steps.length;
        case "visitor": return a.visitor_id.localeCompare(b.visitor_id);
        case "device": return a.device.localeCompare(b.device);
        case "city": return a.city.localeCompare(b.city);
        case "entry": return (a.steps[0]?.page || "/").localeCompare(b.steps[0]?.page || "/");
        case "exit": return (a.steps[a.steps.length - 1]?.page || "/").localeCompare(b.steps[b.steps.length - 1]?.page || "/");
        case "browser": return a.browser.localeCompare(b.browser);
        case "os": return a.os.localeCompare(b.os);
        case "source": return `${a.source}/${a.medium}`.localeCompare(`${b.source}/${b.medium}`);
        case "conversion": return (b.converted ? b.conversion_value + 1 : 0) - (a.converted ? a.conversion_value + 1 : 0);
        default: return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      }
    };
    arr.sort((a, b) => desc ? cmp(a, b) : -cmp(a, b));
    return arr;
  }, [filtered, sortBy]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalJourneys = filtered.length;
  const avgSteps = totalJourneys > 0 ? (filtered.reduce((s, j) => s + j.steps.length, 0) / totalJourneys).toFixed(1) : "0";
  const avgDuration = totalJourneys > 0 ? Math.round(filtered.reduce((s, j) => s + j.total_duration_sec, 0) / totalJourneys) : 0;
  const convertedCount = filtered.filter(j => j.converted).length;
  const conversionRate = totalJourneys > 0 ? ((convertedCount / totalJourneys) * 100).toFixed(1) : "0";
  const totalRevenue = filtered.reduce((s, j) => s + j.conversion_value, 0);
  const ctaClicks = filtered.reduce((s, j) => s + j.steps.filter(st => st.cta_clicked).length, 0);

  const entryPages = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(j => {
      const p = j.steps[0]?.page || "/";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries()).map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filtered]);

  const exitPages = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(j => {
      const p = j.steps[j.steps.length - 1]?.page || "/";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries()).map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filtered]);

  const depthFunnel = useMemo(() => {
    const total = filtered.length;
    const twoPlus = filtered.filter(j => j.steps.length >= 2).length;
    const threePlus = filtered.filter(j => j.steps.length >= 3).length;
    const fourPlus = filtered.filter(j => j.steps.length >= 4).length;
    const fivePlus = filtered.filter(j => j.steps.length >= 5).length;
    return [
      { label: "Todas as jornadas", value: total, color: "hsl(var(--primary))" },
      { label: "2+ páginas", value: twoPlus, color: "hsl(var(--info))" },
      { label: "3+ páginas", value: threePlus, color: "hsl(var(--success))" },
      { label: "4+ páginas", value: fourPlus, color: "hsl(var(--warning))" },
      { label: "5+ páginas", value: fivePlus, color: "hsl(var(--chart-5))" },
    ];
  }, [filtered]);

  const pageTimeData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filtered.forEach(j => j.steps.forEach(s => {
      const entry = map.get(s.page) || { total: 0, count: 0 };
      entry.total += s.duration_sec;
      entry.count++;
      map.set(s.page, entry);
    }));
    return Array.from(map.entries())
      .map(([page, v]) => ({
        page: page === "/" ? "Home" : page.split("/").pop() || page,
        fullPage: page,
        avgTime: Math.round(v.total / v.count),
        visits: v.count,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8);
  }, [filtered]);

  const ctaData = useMemo(() => {
    const map = new Map<string, number>();
    // Count CTAs from raw events for accuracy (journey steps only keep one per page)
    (allEvents || []).forEach((e: any) => {
      if (e.cta_text) map.set(e.cta_text, (map.get(e.cta_text) || 0) + 1);
    });
    // Also count from click-type events where event_type contains "click"
    if (map.size === 0) {
      (allEvents || []).forEach((e: any) => {
        if (e.event_type && e.event_type.includes("click") && e.page_url) {
          const label = e.cta_text || e.cta_selector || e.event_type.replace(/_/g, " ");
          map.set(label, (map.get(label) || 0) + 1);
        }
      });
    }
    return Array.from(map.entries()).map(([cta, count]) => ({ cta, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [allEvents]);

  const sourceData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(j => map.set(j.source, (map.get(j.source) || 0) + 1));
    return Array.from(map.entries()).map(([source, count]) => ({ name: source, value: count })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const totalSourceEvents = sourceData.reduce((s, d) => s + d.value, 0);

  const exportData = useCallback((fmt: "csv" | "json") => {
    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "jornadas.json"; a.click();
    } else {
      const headers = ["Visitor ID", "Session ID", "Início", "Duração", "Páginas", "Device", "Cidade", "Source", "Converteu", "Valor"];
      const rows = sorted.map(j => [
        j.visitor_id, j.session_id,
        format(new Date(j.started_at), "dd/MM/yyyy HH:mm"),
        formatDuration(j.total_duration_sec),
        j.steps.length, j.device, j.city, j.source,
        j.converted ? "Sim" : "Não",
        j.conversion_value.toFixed(2),
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "jornadas.csv"; a.click();
    }
  }, [sorted]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeatureBanner
          icon={Footprints}
          title="Jornada do Usuário"
          description={<>Visualize o <strong>caminho completo</strong> que cada visitante percorre no seu site.</>}
        />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <FeatureBanner
        icon={Footprints}
        title="Jornada do Usuário"
        description={<>Visualize o <strong>caminho completo</strong> que cada visitante percorre no seu site: páginas acessadas, CTAs clicados, tempo em cada etapa e se converteu ou não. Filtre por dispositivo, status de conversão e busque por CTA ou landing page.</>}
      />

      {journeys.length === 0 ? (
        <EmptyState
          icon={Footprints}
          title="Nenhuma jornada registrada"
          description="Quando o Pixel Rankito começar a capturar eventos de navegação, as jornadas dos visitantes aparecerão aqui automaticamente."
        />
      ) : (
        <>
          {/* Filters */}
          <Card className="p-3 sm:p-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-primary" />
              Filtros
            </h3>
            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
              <div className="flex-1 min-w-[180px] max-w-[280px] space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar visitante, página, CTA..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Dispositivo</label>
                <Select value={device} onValueChange={(v) => { setDevice(v); setPage(1); }}>
                  <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEVICE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversão</label>
                <Select value={convFilter} onValueChange={(v) => { setConvFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONVERSION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportData("csv")} className="text-xs gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData("json")} className="text-xs gap-2">
                    <FileJson className="h-3.5 w-3.5" /> JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Badge variant="outline" className="text-[10px] gap-1 ml-auto">
                <Footprints className="h-3 w-3 text-primary" /> {totalJourneys} jornadas
              </Badge>
            </div>
          </Card>

          {/* KPIs */}
          {(() => {
            const bounceJourneys = filtered.filter(j => j.steps.length === 1).length;
            const bounceRate = totalJourneys > 0 ? ((bounceJourneys / totalJourneys) * 100).toFixed(1) : "0";
            const mobileJ = filtered.filter(j => j.device === "mobile");
            const desktopJ = filtered.filter(j => j.device === "desktop");
            const mobilePct = totalJourneys > 0 ? ((mobileJ.length / totalJourneys) * 100).toFixed(0) : "0";
            const desktopPct = totalJourneys > 0 ? ((desktopJ.length / totalJourneys) * 100).toFixed(0) : "0";
            const mobileConvRate = mobileJ.length > 0 ? ((mobileJ.filter(j => j.converted).length / mobileJ.length) * 100).toFixed(1) : "0";
            const desktopConvRate = desktopJ.length > 0 ? ((desktopJ.filter(j => j.converted).length / desktopJ.length) * 100).toFixed(1) : "0";

            const avgConvValue = convertedCount > 0 ? (totalRevenue / convertedCount).toFixed(0) : "0";
            const ctaPerJourney = totalJourneys > 0 ? (ctaClicks / totalJourneys).toFixed(2) : "0";
            const rpv = totalJourneys > 0 ? (totalRevenue / totalJourneys).toFixed(2) : "0";

            // Median duration
            const durations = [...filtered].map(j => j.total_duration_sec).sort((a, b) => a - b);
            const medianDur = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

            // Avg scroll depth across all steps
            const allSteps = filtered.flatMap(j => j.steps);
            const avgScroll = allSteps.length > 0 ? Math.round(allSteps.reduce((s, st) => s + st.scroll_depth, 0) / allSteps.length) : 0;

            // Top converting source
            const sourceConvMap: Record<string, { total: number; conv: number; rev: number }> = {};
            filtered.forEach(j => {
              const src = j.source;
              if (!sourceConvMap[src]) sourceConvMap[src] = { total: 0, conv: 0, rev: 0 };
              sourceConvMap[src].total++;
              if (j.converted) { sourceConvMap[src].conv++; sourceConvMap[src].rev += j.conversion_value; }
            });
            const topConvSource = Object.entries(sourceConvMap)
              .filter(([, v]) => v.conv > 0)
              .sort(([, a], [, b]) => (b.conv / b.total) - (a.conv / a.total))[0];

            // Longest journey
            const longestJ = filtered.reduce((best, j) => j.steps.length > best.steps.length ? j : best, filtered[0]);
            // Top exit page for non-converted
            const nonConvExits: Record<string, number> = {};
            filtered.filter(j => !j.converted).forEach(j => {
              const p = j.steps[j.steps.length - 1]?.page || "/";
              nonConvExits[p] = (nonConvExits[p] || 0) + 1;
            });
            const topLeakPage = Object.entries(nonConvExits).sort(([, a], [, b]) => b - a)[0];

            const kpiInsights = [
              {
                label: "Total Jornadas", value: totalJourneys, icon: Footprints, color: "hsl(var(--primary))",
                insight: `${bounceJourneys} bounce (${bounceRate}%) · ${mobileJ.length} mobile (${mobilePct}%) · ${desktopJ.length} desktop (${desktopPct}%) · Scroll médio: ${avgScroll}%`,
              },
              {
                label: "Páginas/Jornada", value: avgSteps, icon: Route, color: "hsl(var(--info))",
                insight: `Jornada mais longa: ${longestJ ? longestJ.steps.length : 0} págs (${longestJ ? (longestJ.steps[0]?.page === "/" ? "Home" : longestJ.steps[0]?.page.split("/").pop()) : "—"}). ${Number(avgSteps) < 2 ? "⚠️ Maioria não passa de 1 página — revise links internos." : Number(avgSteps) >= 4 ? "✅ Excelente profundidade de navegação." : "Profundidade média — CTAs intermediários podem ajudar."}`,
              },
              {
                label: "Tempo Médio", value: formatDuration(avgDuration), icon: Clock, color: "hsl(var(--warning))",
                insight: `Mediana: ${formatDuration(medianDur)} · Desktop: ${formatDuration(desktopJ.length > 0 ? Math.round(desktopJ.reduce((s, j) => s + j.total_duration_sec, 0) / desktopJ.length) : 0)} · Mobile: ${formatDuration(mobileJ.length > 0 ? Math.round(mobileJ.reduce((s, j) => s + j.total_duration_sec, 0) / mobileJ.length) : 0)}. ${medianDur < avgDuration * 0.5 ? "⚠️ Mediana muito abaixo da média — poucos outliers inflam o número." : ""}`,
              },
              {
                label: "Taxa Conversão", value: `${conversionRate}%`, icon: Target, color: "hsl(var(--success))",
                insight: `${convertedCount}/${totalJourneys} converteram · Desktop: ${desktopConvRate}% · Mobile: ${mobileConvRate}% · Ticket médio: R$ ${avgConvValue}${topConvSource ? ` · Melhor fonte: "${topConvSource[0]}" (${((topConvSource[1].conv / topConvSource[1].total) * 100).toFixed(0)}%)` : ""}`,
              },
              {
                label: "Cliques CTA", value: ctaClicks, icon: MousePointerClick, color: "hsl(var(--chart-5))",
                insight: `${ctaPerJourney} cliques/jornada · ${ctaData.length > 0 ? `Top CTA: "${ctaData[0].cta}" (${ctaData[0].count}x)` : "Nenhum CTA rastreado"}${ctaData.length >= 2 ? ` · 2º: "${ctaData[1].cta}" (${ctaData[1].count}x)` : ""}. ${Number(ctaPerJourney) < 0.5 ? "⚠️ Baixa interação — destaque CTAs." : ""}`,
              },
              {
                label: "Receita Total", value: `R$ ${totalRevenue.toFixed(0)}`, icon: TrendingUp, color: "hsl(var(--success))",
                insight: `RPV: R$ ${rpv}/visita · ${convertedCount} conversões${topLeakPage ? ` · Maior vazamento: "${topLeakPage[0] === "/" ? "Home" : topLeakPage[0].split("/").pop()}" (${topLeakPage[1]} saídas sem conversão)` : ""}${topConvSource ? ` · Fonte com mais receita: "${topConvSource[0]}" (R$ ${topConvSource[1].rev.toFixed(0)})` : ""}`,
              },
            ];

            return (
              <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpiInsights.map((kpi, i) => (
                  <Card key={i} className="p-4 sm:p-5 card-hover group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center text-center gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                      </div>
                      <span className="text-2xl font-bold text-foreground font-display tracking-tight">{kpi.value}</span>
                      <p className="text-[9px] leading-snug text-muted-foreground/80 mt-1">{kpi.insight}</p>
                    </div>
                  </Card>
                ))}
              </StaggeredGrid>
            );
          })()}

          {/* Charts Row 1 */}
          <div className="grid lg:grid-cols-3 gap-4">
            <AnimatedContainer>
              <Card className="p-5">
                <ChartHeader title="Páginas de Entrada" subtitle="Onde os visitantes iniciam suas jornadas" />
                <div className="h-[220px]">
                  {entryPages.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={entryPages} layout="vertical">
                        <defs><BarGradient id="entryGrad" color="hsl(var(--primary))" /></defs>
                        <CartesianGrid {...GRID_STYLE} horizontal={false} />
                        <XAxis type="number" {...AXIS_STYLE} />
                        <YAxis dataKey="page" type="category" {...AXIS_STYLE} width={100} tick={{ fontSize: 9 }}
                          tickFormatter={(v: string) => v === "/" ? "Home" : v.split("/").pop() || v} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Bar dataKey="count" fill="url(#entryGrad)" radius={[0, 4, 4, 0]} name="Entradas" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={Globe} title="Sem dados" description="Nenhuma página de entrada registrada" />
                  )}
                </div>
                {entryPages.length > 0 && (() => {
                  const topEntryPct = totalJourneys > 0 ? ((entryPages[0].count / totalJourneys) * 100).toFixed(0) : "0";
                  const topEntryName = entryPages[0]?.page === "/" ? "Home" : entryPages[0]?.page.split("/").pop();
                  // Conversion rate for top entry
                  const topEntryJourneys = filtered.filter(j => j.steps[0]?.page === entryPages[0]?.page);
                  const topEntryConv = topEntryJourneys.filter(j => j.converted).length;
                  const topEntryConvRate = topEntryJourneys.length > 0 ? ((topEntryConv / topEntryJourneys.length) * 100).toFixed(1) : "0";
                  const secondName = entryPages[1] ? (entryPages[1].page === "/" ? "Home" : entryPages[1].page.split("/").pop()) : null;
                  return (
                    <p className="text-[9px] text-muted-foreground/80 mt-2 leading-snug border-t border-border/30 pt-2">
                      💡 <strong>{topEntryName}</strong>: {entryPages[0].count} entradas ({topEntryPct}%) · Conv: {topEntryConvRate}%{secondName ? ` · 2ª: "${secondName}" (${entryPages[1].count} entradas)` : ""}. {Number(topEntryConvRate) < 1 ? "⚠️ Taxa de conversão baixa nessa landing — revise headline e CTA above-the-fold." : "✅ Boa taxa de conversão na entrada principal."}
                    </p>
                  );
                })()}
              </Card>
            </AnimatedContainer>

            <AnimatedContainer delay={0.04}>
              <Card className="p-5">
                <ChartHeader title="Páginas de Saída" subtitle="Onde os visitantes encerram a navegação" />
                <div className="h-[220px]">
                  {exitPages.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={exitPages} layout="vertical">
                        <defs><BarGradient id="exitGrad" color="hsl(var(--destructive))" /></defs>
                        <CartesianGrid {...GRID_STYLE} horizontal={false} />
                        <XAxis type="number" {...AXIS_STYLE} />
                        <YAxis dataKey="page" type="category" {...AXIS_STYLE} width={100} tick={{ fontSize: 9 }}
                          tickFormatter={(v: string) => v === "/" ? "Home" : v.split("/").pop() || v} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Bar dataKey="count" fill="url(#exitGrad)" radius={[0, 4, 4, 0]} name="Saídas" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={Globe} title="Sem dados" description="Nenhuma página de saída registrada" />
                  )}
                </div>
                {exitPages.length > 0 && (() => {
                  const topExitName = exitPages[0]?.page === "/" ? "Home" : exitPages[0]?.page.split("/").pop();
                  const topExitPct = totalJourneys > 0 ? ((exitPages[0].count / totalJourneys) * 100).toFixed(0) : "0";
                  const topExitJourneys = filtered.filter(j => j.steps[j.steps.length - 1]?.page === exitPages[0]?.page);
                  const avgDurOnExit = topExitJourneys.length > 0 ? Math.round(topExitJourneys.reduce((s, j) => {
                    const lastStep = j.steps[j.steps.length - 1];
                    return s + (lastStep?.duration_sec || 0);
                  }, 0) / topExitJourneys.length) : 0;
                  const sameAsEntry = exitPages[0]?.page === entryPages[0]?.page;
                  return (
                    <p className="text-[9px] text-muted-foreground/80 mt-2 leading-snug border-t border-border/30 pt-2">
                      ⚠️ <strong>{topExitName}</strong>: {exitPages[0].count} saídas ({topExitPct}%) · Tempo médio na saída: {formatDuration(avgDurOnExit)}{exitPages[1] ? ` · 2ª: "${exitPages[1].page === "/" ? "Home" : exitPages[1].page.split("/").pop()}" (${exitPages[1].count})` : ""}. {sameAsEntry ? `⚠️ Mesma página de entrada — ${bounceRate}% bounce rate. Melhore conteúdo above-the-fold.` : avgDurOnExit < 10 ? "Saída rápida — conteúdo não retém. Revise copy e CTA." : ""}
                    </p>
                  );
                })()}
              </Card>
            </AnimatedContainer>

            <AnimatedContainer delay={0.08}>
              <Card className="p-5">
                <ChartHeader title="Profundidade da Jornada" subtitle="Quantas páginas os visitantes percorrem" />
                <div className="space-y-2">
                  {depthFunnel.map((step, i) => (
                    <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={depthFunnel[0].value} color={step.color} index={i} />
                  ))}
                </div>
                {depthFunnel[0]?.value > 0 && (
                  <p className="text-[9px] text-muted-foreground/80 mt-2 leading-snug border-t border-border/30 pt-2">
                    📊 {depthFunnel[1]?.value > 0 ? `${((depthFunnel[1].value / depthFunnel[0].value) * 100).toFixed(0)}% visitam 2+ páginas` : "Maioria não passa da primeira página"}. {depthFunnel[2]?.value > 0 ? `${((depthFunnel[2].value / depthFunnel[0].value) * 100).toFixed(0)}% chegam a 3+.` : ""} {((depthFunnel[1]?.value || 0) / depthFunnel[0].value) < 0.5 ? "Baixa retenção — melhore navegação interna." : "Boa retenção entre páginas."}
                  </p>
                )}
              </Card>
            </AnimatedContainer>
          </div>

          {/* Charts Row 2 */}
          <div className="grid lg:grid-cols-3 gap-4">
            <AnimatedContainer>
              <Card className="p-5">
                <ChartHeader title="Tempo Médio por Página" subtitle="Descubra quais páginas prendem mais a atenção" />
                <div className="h-[220px]">
                  {pageTimeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pageTimeData}>
                        <defs><BarGradient id="timeGrad" color="hsl(var(--info))" /></defs>
                        <CartesianGrid {...GRID_STYLE} />
                        <XAxis dataKey="page" {...AXIS_STYLE} tick={{ fontSize: 8 }} />
                        <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => `${v}s`} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}s`, "Tempo médio"]} />
                        <Bar dataKey="avgTime" fill="url(#timeGrad)" radius={[4, 4, 0, 0]} name="Tempo médio" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={Clock} title="Sem dados" description="Nenhum dado de tempo por página" />
                  )}
                </div>
                {pageTimeData.length > 0 && (
                  <p className="text-[9px] text-muted-foreground/80 mt-2 leading-snug border-t border-border/30 pt-2">
                    ⏱️ <strong>{pageTimeData[0]?.page}</strong> é a página com mais visitas ({pageTimeData[0]?.visits}). {pageTimeData[0]?.avgTime >= 60 ? "Tempo alto — conteúdo engaja bem." : "Tempo curto — considere enriquecer o conteúdo."} {pageTimeData.length >= 2 ? `"${pageTimeData[1]?.page}" tem ${pageTimeData[1]?.avgTime}s de média.` : ""}
                  </p>
                )}
              </Card>
            </AnimatedContainer>

            <AnimatedContainer delay={0.04}>
              <Card className="p-5">
                <ChartHeader title="CTAs Mais Clicados" subtitle="Quais chamadas para ação geram mais engajamento" />
                {ctaData.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {ctaData.map((item, i) => {
                      const maxVal = ctaData[0].count;
                      const pct = maxVal > 0 ? (item.count / maxVal) * 100 : 0;
                      const colors = [
                        "hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--info))",
                        "hsl(var(--warning))", "hsl(var(--chart-5))",
                      ];
                      const color = colors[i % colors.length];
                      return (
                        <div key={item.cta} className="flex items-center gap-2">
                          <MousePointerClick className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-[10px] w-[100px] truncate text-muted-foreground" title={item.cta}>{item.cta}</span>
                          <div className="flex-1 h-5 rounded bg-muted/30 overflow-hidden">
                            <div
                              className="h-full rounded transition-all duration-700 flex items-center justify-end pr-1.5"
                              style={{
                                width: `${Math.max(pct, 8)}%`,
                                background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`,
                              }}
                            >
                              <span className="text-[9px] font-bold text-white drop-shadow-sm">{item.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState icon={MousePointerClick} title="Sem cliques CTA" description="Nenhum CTA registrado" />
                )}
                {ctaData.length > 0 && (
                  <p className="text-[9px] text-muted-foreground/80 mt-2 leading-snug border-t border-border/30 pt-2">
                    🎯 <strong>"{ctaData[0]?.cta}"</strong> lidera com {ctaData[0]?.count} cliques. {ctaData.length >= 2 ? `"${ctaData[1]?.cta}" vem em segundo com ${ctaData[1]?.count}.` : ""} {ctaData[0]?.count > 10 ? "Bom volume — considere testar variações A/B." : "Volume baixo — revise posicionamento e copy dos CTAs."}
                  </p>
                )}
              </Card>
            </AnimatedContainer>

            <AnimatedContainer delay={0.08}>
              <Card className="p-5">
                <ChartHeader title="Origem das Jornadas" subtitle="De onde vêm os visitantes que navegam no site" />
                <div className="h-[220px]">
                  {sourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                          {sourceData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value: number, name: string) => [
                            `${value} (${totalSourceEvents > 0 ? ((value / totalSourceEvents) * 100).toFixed(1) : 0}%)`, name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={Globe} title="Sem dados" description="Nenhuma origem registrada" />
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {sourceData.slice(0, 5).map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[9px] text-muted-foreground">{s.name}</span>
                    </div>
                  ))}
                </div>
                {sourceData.length > 0 && (
                  <p className="text-[9px] text-muted-foreground/80 mt-2 leading-snug border-t border-border/30 pt-2">
                    🔍 <strong>{sourceData[0]?.name}</strong> domina com {totalSourceEvents > 0 ? ((sourceData[0].value / totalSourceEvents) * 100).toFixed(0) : 0}% do tráfego. {sourceData.length >= 2 ? `"${sourceData[1]?.name}" representa ${totalSourceEvents > 0 ? ((sourceData[1].value / totalSourceEvents) * 100).toFixed(0) : 0}%.` : ""} {sourceData[0]?.name === "direct" ? "Alto tráfego direto — bom branding, mas diversifique canais." : "Diversifique fontes para reduzir dependência."}
                  </p>
                )}
              </Card>
            </AnimatedContainer>
          </div>

          {/* Journey Table */}
          <AnimatedContainer delay={0.1}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Footprints className="h-4 w-4 text-primary" />
                Jornadas Individuais
              </h3>
              <span className="text-[10px] text-muted-foreground">{sorted.length} resultados</span>
            </div>
            {paged.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-muted/40 border-b border-border/50">
                      <tr>
                        <SortTh label="Visitante" field="visitor" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} />
                        <SortTh label="Início" field="recent" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} />
                        <SortTh label="Páginas" field="pages" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} className="text-center" />
                        <SortTh label="Duração" field="duration" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} className="text-center" />
                        <SortTh label="Entrada" field="entry" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} />
                        <SortTh label="Saída" field="exit" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} />
                        <SortTh label="Device" field="device" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} />
                        <SortTh label="Navegador" field="browser" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} className="hidden lg:table-cell" />
                        <SortTh label="OS" field="os" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} className="hidden lg:table-cell" />
                        <SortTh label="Local" field="city" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} />
                        <SortTh label="Origem" field="source" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} className="hidden md:table-cell" />
                        <SortTh label="Conversão" field="conversion" current={sortBy} onSort={(f) => { setSortBy(f as any); setPage(1); }} className="text-center" />
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((journey) => (
                        <JourneyTableRow key={journey.session_id} journey={journey} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <EmptyState icon={Footprints} title="Nenhuma jornada" description="Ajuste os filtros para ver as jornadas dos visitantes." />
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 text-xs gap-1">
                  <ChevronLeft className="h-3 w-3" /> Anterior
                </Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 text-xs gap-1">
                  Próxima <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </AnimatedContainer>
        </>
      )}
    </div>
  );
}
