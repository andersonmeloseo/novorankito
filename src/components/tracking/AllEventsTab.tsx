import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useTrackingEvents, TrackingEvent, EVENT_LABELS, PLUGIN_EVENT_TYPES, EVENT_CATEGORIES,
  buildHeatmap, eventsByDay as buildEventsByDay, eventTypeTotals as buildEventTypeTotals,
  distributionBy,
} from "@/hooks/use-tracking-events";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
  Treemap,
} from "recharts";
import { Activity, Zap, Globe, Smartphone, Monitor, Clock, Layers, Eye, MapPin, Flame, Loader2 } from "lucide-react";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, ChartGradient, LineGlowGradient, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, TreemapContent, PipelineVisual, CohortHeatmap, DonutCenterLabel,
} from "@/components/analytics/ChartPrimitives";
import { AnalyticsDataTable } from "@/components/analytics/AnalyticsDataTable";
import { EmptyState } from "@/components/ui/empty-state";

function SparkKpi({ label, value, change, suffix, color, icon: Icon, hideBadge, smallValue }: {
  label: string; value: string | number; change?: number; suffix?: string;
  color: string; icon?: React.ElementType;
  hideBadge?: boolean; smallValue?: boolean;
}) {
  return (
    <Card className="p-3.5 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
          {!hideBadge && change !== undefined && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${change >= 0 ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
              {change >= 0 ? "+" : ""}{change}%
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className={`font-bold text-foreground font-display tracking-tight ${smallValue ? "text-xs" : "text-xl"}`}>{value}{suffix}</span>
        </div>
      </div>
    </Card>
  );
}

export function AllEventsTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const { data: events = [], isLoading } = useTrackingEvents(projectId);

  const DEVICE_EMOJI: Record<string, string> = { mobile: "📱", desktop: "🖥️", tablet: "📟" };
  const BROWSER_EMOJI: Record<string, string> = { Chrome: "🌐", Firefox: "🦊", Safari: "🧭", Edge: "🔷", Opera: "🔴", Samsung: "📱" };
  const EVENT_EMOJI: Record<string, string> = {
    page_view: "👁️", page_exit: "🚪", whatsapp_click: "💬", phone_click: "📞",
    email_click: "✉️", button_click: "🖱️", form_submit: "📝", product_view: "🛍️",
    add_to_cart: "🛒", remove_from_cart: "❌", begin_checkout: "💳", purchase: "💰", search: "🔍", click: "🖱️",
  };

  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [browserFilter, setBrowserFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [referrerFilter, setReferrerFilter] = useState("all");

  const filteredEvents = useMemo(() => {
    let data = events;
    if (eventTypeFilter !== "all") data = data.filter(e => e.event_type === eventTypeFilter);
    if (deviceFilter !== "all") data = data.filter(e => e.device === deviceFilter);
    if (browserFilter !== "all") data = data.filter(e => e.browser === browserFilter);
    if (cityFilter !== "all") data = data.filter(e => (e.city || "") === cityFilter);
    if (platformFilter !== "all") data = data.filter(e => (e.platform || "") === platformFilter);
    if (referrerFilter !== "all") data = data.filter(e => (e.referrer || "") === referrerFilter);
    return data.slice(0, 200);
  }, [events, eventTypeFilter, deviceFilter, browserFilter, cityFilter, platformFilter, referrerFilter]);

  const heatmapData = useMemo(() => buildHeatmap(events), [events]);
  const allEventsByDay = useMemo(() => buildEventsByDay(events), [events]);
  const typeTotals = useMemo(() => buildEventTypeTotals(events), [events]);
  const platformDistribution = useMemo(() => distributionBy(events, "platform"), [events]);
  const eventsByDevice = useMemo(() => distributionBy(events, "device"), [events]);
  const eventsByBrowser = useMemo(() => {
    const d = distributionBy(events, "browser");
    return d.map(({ name, value }) => ({ browser: name, count: value }));
  }, [events]);

  const totalEvents = events.length;
  const uniquePages = new Set(events.map(e => e.page_url)).size;
  const lastEvent = events.length > 0 ? events[0] : null; // already sorted desc
  const lastReferrer = lastEvent ? (lastEvent.referrer || "").replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || "direto" : "—";
  const lastCta = lastEvent ? (lastEvent.cta_text || lastEvent.event_type.replace(/_/g, " ")) : "—";
  const peakInfo = (() => {
    let maxVal = 0, peakDay = "", peakHour = 0;
    heatmapData.forEach(row => {
      row.hours.forEach(cell => {
        if (cell.value > maxVal) { maxVal = cell.value; peakDay = row.day; peakHour = cell.hour; }
      });
    });
    return { label: `${peakDay} ${peakHour}h`, count: maxVal };
  })();
  const lastEventLabel = lastEvent ? (EVENT_LABELS[lastEvent.event_type] || lastEvent.event_type) : "—";
  const lastLocation = lastEvent ? `${lastEvent.city || "?"}, ${lastEvent.state || "?"}` : "—";

  const allEventFunnel = typeTotals
    .filter(t => t.count > 0)
    .map((t, i) => ({ label: t.label, value: t.count, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const topPagesTreemap = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach(e => { const url = e.page_url || "/"; map.set(url, (map.get(url) || 0) + 1); });
    return Array.from(map.entries())
      .map(([name, size], i) => ({ name: name.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "") || "home", size, fill: CHART_COLORS[i % CHART_COLORS.length] }))
      .sort((a, b) => b.size - a.size).slice(0, 10);
  }, [events]);

  const cohortData = useMemo(() => {
    const types = Array.from(new Set(events.map(e => e.event_type))).slice(0, 8);
    const devices = ["mobile", "desktop", "tablet"];
    const data = types.map(t => devices.map(d => events.filter(e => e.event_type === t && e.device === d).length));
    return { data, xLabels: devices.map(d => d.charAt(0).toUpperCase() + d.slice(1)), yLabels: types.map(t => EVENT_LABELS[t] || t) };
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return <EmptyState title="Nenhum evento capturado" description="Instale o script de tracking na aba 'Instalar' para começar a capturar eventos." />;
  }

  const eventTypes = Array.from(new Set(events.map(e => e.event_type))).sort();
  const devices = Array.from(new Set(events.map(e => e.device).filter(Boolean))).sort();
  const browsers = Array.from(new Set(events.map(e => e.browser).filter(Boolean))).sort();
  const cities = Array.from(new Set(events.map(e => e.city).filter(Boolean))).sort();
  const platforms = Array.from(new Set(events.map(e => e.platform).filter(Boolean))).sort();
  const referrers = Array.from(new Set(events.map(e => e.referrer).filter(Boolean))).sort();

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SparkKpi label="Total Eventos" value={totalEvents} color="hsl(var(--primary))" icon={Activity} hideBadge />
        <SparkKpi label="Referrer" value={lastReferrer} color="hsl(var(--info))" icon={Globe} hideBadge smallValue />
        <SparkKpi label="CTA/Elemento" value={lastCta} color="hsl(var(--chart-5))" icon={Layers} hideBadge smallValue />
        <SparkKpi label="Pico de Atividade" value={`${peakInfo.label} (${peakInfo.count})`} color="hsl(var(--warning))" icon={Flame} hideBadge smallValue />
        <SparkKpi label="Último Evento" value={lastEventLabel} color="hsl(var(--warning))" icon={Zap} hideBadge smallValue />
        <SparkKpi label="Última Localização" value={lastLocation} color="hsl(var(--chart-8))" icon={MapPin} hideBadge smallValue />
      </StaggeredGrid>

      {/* Heatmap */}
      <AnimatedContainer delay={0.03}>
        <Card className="p-5">
          <ChartHeader title="🔥 Mapa de Calor de Eventos (Dia × Hora)" subtitle="Identifique os horários de pico de atividade dos visitantes" />
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
                    const maxVal = Math.max(...heatmapData.flatMap(r => r.hours.map(h => h.value)), 1);
                    const intensity = Math.max(0.05, cell.value / maxVal);
                    return (
                      <div key={cell.hour} className="flex-1 h-7 rounded-md flex items-center justify-center transition-transform hover:scale-[1.08] cursor-default"
                        style={{ background: `hsl(var(--info) / ${intensity})`, border: `1px solid hsl(var(--info) / ${intensity * 0.4})` }}
                        title={`${row.day} ${cell.hour}:00 — ${cell.value} eventos`}
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

      {/* Volume over time */}
      {allEventsByDay.length > 0 && (
        <AnimatedContainer>
          <Card className="p-5">
            <ChartHeader title="Volume de Eventos ao Longo do Tempo" subtitle="Acompanhe a evolução diária de tracking, conversões e e-commerce" />
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={allEventsByDay}>
                  <defs>
                    <LineGlowGradient id="trackingGlow" color="hsl(var(--info))" />
                    <LineGlowGradient id="conversionsGlow" color="hsl(var(--success))" />
                    <LineGlowGradient id="ecomGlow" color="hsl(var(--warning))" />
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="date" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                  <Area type="monotone" dataKey="tracking" stackId="1" stroke="hsl(var(--info))" fill="url(#trackingGlow)" strokeWidth={1.5} name="Tracking" />
                  <Area type="monotone" dataKey="conversions" stackId="1" stroke="hsl(var(--success))" fill="url(#conversionsGlow)" strokeWidth={1.5} name="Conversões" />
                  <Area type="monotone" dataKey="ecommerce" stackId="1" stroke="hsl(var(--warning))" fill="url(#ecomGlow)" strokeWidth={1.5} name="E-commerce" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* Event type ranking */}
      {allEventFunnel.length > 0 && (
        <AnimatedContainer delay={0.05}>
          <Card className="p-5">
            <ChartHeader title="Ranking de Eventos por Tipo" subtitle="Descubra quais ações dos usuários são mais frequentes" />
            <div className="space-y-2">
              {allEventFunnel.map((step, i) => (
                <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={allEventFunnel[0].value} color={step.color} index={i} />
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* Platform + Device + Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="Detecção de Plataforma" subtitle="Qual tecnologia gera mais eventos" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} strokeWidth={2} stroke="hsl(var(--card))">
                    {platformDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <DonutCenterLabel viewBox={{ cx: "50%", cy: "50%" }} value={platformDistribution.length} label="Plataformas" />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <ChartHeader title="Eventos por Dispositivo" subtitle="Distribuição mobile vs desktop vs tablet" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eventsByDevice} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} strokeWidth={2} stroke="hsl(var(--card))">
                    {eventsByDevice.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.2}>
          <Card className="p-5">
            <ChartHeader title="Eventos por Browser" subtitle="Compatibilidade entre navegadores" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventsByBrowser}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="browser" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Eventos">
                    {eventsByBrowser.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Treemap + Cohort */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <AnimatedContainer delay={0.25} className="lg:col-span-3">
          <Card className="p-5 h-full">
            <ChartHeader title="Treemap de Páginas" subtitle="Quais páginas concentram mais atividade" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={topPagesTreemap} dataKey="size" nameKey="name" stroke="hsl(var(--background))">
                  {topPagesTreemap.map((entry, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: any) => [v, "Eventos"]} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        {cohortData.data.length > 0 && (
          <AnimatedContainer delay={0.3} className="lg:col-span-2">
            <Card className="p-4 h-full flex flex-col">
              <ChartHeader title="Evento × Dispositivo" subtitle="Cruze tipos de evento com dispositivos" />
              <div className="flex-1 flex items-center">
                <CohortHeatmap
                  data={cohortData.data}
                  xLabels={cohortData.xLabels}
                  yLabels={cohortData.yLabels}
                  maxValue={Math.max(...cohortData.data.flat(), 1)}
                  hue={210}
                />
              </div>
            </Card>
          </AnimatedContainer>
        )}
      </div>

      {/* Detailed Events Table */}
      <AnimatedContainer delay={0.4}>
        <Card className="p-5">
          <ChartHeader title="Eventos Detalhados" subtitle="Filtre por tipo de evento, dispositivo, navegador, cidade e plataforma" />
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[140px] h-8 text-[11px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {eventTypes.map(t => (
                  <SelectItem key={t} value={t}>{EVENT_EMOJI[t] || "⚡"} {EVENT_LABELS[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[120px] h-8 text-[11px]"><SelectValue placeholder="Dispositivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {devices.map(d => (
                  <SelectItem key={d} value={d!}>{DEVICE_EMOJI[d!] || "💻"} {d!.charAt(0).toUpperCase() + d!.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={browserFilter} onValueChange={setBrowserFilter}>
              <SelectTrigger className="w-[120px] h-8 text-[11px]"><SelectValue placeholder="Browser" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {browsers.map(b => (
                  <SelectItem key={b} value={b!}>{BROWSER_EMOJI[b!] || "🌐"} {b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[130px] h-8 text-[11px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {cities.map(c => (
                  <SelectItem key={c} value={c!}>📍 {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[130px] h-8 text-[11px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {platforms.map(p => (
                  <SelectItem key={p} value={p!}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={referrerFilter} onValueChange={setReferrerFilter}>
              <SelectTrigger className="w-[160px] h-8 text-[11px]"><SelectValue placeholder="Referrer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Referrers</SelectItem>
                {referrers.map(r => (
                  <SelectItem key={r} value={r!}>🔗 {r!.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AnalyticsDataTable
            columns={["Data/Hora", "Tipo de Evento", "Página", "Referrer", "CTA / Elemento", "Dispositivo", "Navegador", "Localização"]}
            rows={filteredEvents.map(e => [
              new Date(e.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              `${EVENT_EMOJI[e.event_type] || "⚡"} ${EVENT_LABELS[e.event_type] || e.event_type}`,
              (e.page_url || "/").replace(/^https?:\/\/[^/]+/, "") || "/",
              `🔗 ${(e.referrer || "direto").replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}`,
              e.cta_text || e.event_type.replace(/_/g, " "),
              `${DEVICE_EMOJI[e.device || ""] || "💻"} ${(e.device || "?").charAt(0).toUpperCase() + (e.device || "?").slice(1)}`,
              `${BROWSER_EMOJI[e.browser || ""] || "🌐"} ${e.browser || "?"}`,
              `📍 ${e.city || "?"}, ${e.state || "?"}`,
            ])}
            pageSize={15}
          />
        </Card>
      </AnimatedContainer>
    </div>
  );
}
