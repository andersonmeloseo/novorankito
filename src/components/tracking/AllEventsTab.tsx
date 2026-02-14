import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import {
  pluginEvents, allEventsByDay, eventTypeTotals, platformDistribution,
  pageExitAnalysis, EVENT_LABELS, PLUGIN_EVENT_TYPES, EVENT_CATEGORIES,
} from "@/lib/plugin-mock-data";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
  Treemap,
} from "recharts";
import { Activity, Zap, Globe, Smartphone, Monitor, Clock, Layers, Eye } from "lucide-react";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, ChartGradient, LineGlowGradient, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, TreemapContent, PipelineVisual, CohortHeatmap, DonutCenterLabel,
} from "@/components/analytics/ChartPrimitives";
import { generateConversionsHeatmap } from "@/lib/mock-data";
import { AnalyticsDataTable } from "@/components/analytics/AnalyticsDataTable";

function generateSparkline(length = 12, base = 50, variance = 20): number[] {
  return Array.from({ length }, () => Math.max(0, base + Math.floor((Math.random() - 0.3) * variance)));
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80; const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return <svg width={w} height={h} className="ml-auto"><polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SparkKpi({ label, value, change, suffix, sparkData, color, icon: Icon }: {
  label: string; value: string | number; change: number; suffix?: string;
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
          <span className="text-xl font-bold text-foreground font-display tracking-tight">{value}{suffix}</span>
          <Sparkline data={sparkData} color={color} />
        </div>
      </div>
    </Card>
  );
}

const heatmapData = generateConversionsHeatmap();

export function AllEventsTab() {
  const DEVICE_EMOJI: Record<string, string> = { mobile: "📱", desktop: "🖥️", tablet: "📟" };
  const BROWSER_EMOJI: Record<string, string> = { Chrome: "🌐", Firefox: "🦊", Safari: "🧭", Edge: "🔷", Opera: "🔴", Samsung: "📱" };
  const EVENT_EMOJI: Record<string, string> = {
    page_view: "👁️", page_exit: "🚪", whatsapp_click: "💬", phone_click: "📞",
    email_click: "✉️", button_click: "🖱️", form_submit: "📝", product_view: "🛍️",
    add_to_cart: "🛒", remove_from_cart: "❌", begin_checkout: "💳", purchase: "💰", search: "🔍",
  };

  const totalEvents = pluginEvents.length;
  const trackingEvents = pluginEvents.filter(e => EVENT_CATEGORIES.tracking.includes(e.event_type)).length;
  const conversionEvents = pluginEvents.filter(e => EVENT_CATEGORIES.conversions.includes(e.event_type)).length;
  const ecommerceEvents = pluginEvents.filter(e => EVENT_CATEGORIES.ecommerce.includes(e.event_type)).length;
  const uniquePages = new Set(pluginEvents.map(e => e.page_url)).size;
  const mobileEvents = pluginEvents.filter(e => e.device === "mobile").length;
  const mobilePct = totalEvents > 0 ? ((mobileEvents / totalEvents) * 100).toFixed(1) : "0";
  const avgTimeOnPage = Math.round(pluginEvents.filter(e => e.event_type === "page_exit").reduce((s, e) => s + e.time_on_page_sec, 0) / Math.max(pluginEvents.filter(e => e.event_type === "page_exit").length, 1));

  // All event types for funnel
  const allEventFunnel = eventTypeTotals
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((t, i) => ({ label: t.label, value: t.count, color: CHART_COLORS[i % CHART_COLORS.length] }));

  // Treemap by page
  const topPagesTreemap = (() => {
    const map = new Map<string, number>();
    pluginEvents.forEach(e => map.set(e.page_url, (map.get(e.page_url) || 0) + 1));
    return Array.from(map.entries())
      .map(([name, size], i) => ({ name: name.replace(/^\//, "") || "home", size, fill: CHART_COLORS[i % CHART_COLORS.length] }))
      .sort((a, b) => b.size - a.size).slice(0, 10);
  })();

  // By device
  const eventsByDevice = (() => {
    const map = new Map<string, number>();
    pluginEvents.forEach(e => map.set(e.device, (map.get(e.device) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  })();

  // By browser
  const eventsByBrowser = (() => {
    const map = new Map<string, number>();
    pluginEvents.forEach(e => map.set(e.browser, (map.get(e.browser) || 0) + 1));
    return Array.from(map.entries()).map(([browser, count]) => ({ browser, count }));
  })();

  // Cohort: event type × device
  const cohortData = (() => {
    const types = PLUGIN_EVENT_TYPES.filter(t => pluginEvents.some(e => e.event_type === t)).slice(0, 8);
    const devices = ["mobile", "desktop", "tablet"];
    const data = types.map(t => devices.map(d => pluginEvents.filter(e => e.event_type === t && e.device === d).length));
    return { data, xLabels: devices.map(d => d.charAt(0).toUpperCase() + d.slice(1)), yLabels: types.map(t => EVENT_LABELS[t]) };
  })();

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Plugin info banner */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <Activity className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Plugin Rankito v3.1.0 — Tracking Universal</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Captura automática de <strong>13 tipos de eventos</strong>: page_view, page_exit, whatsapp_click, phone_click, 
              email_click, button_click, form_submit, product_view, add_to_cart, remove_from_cart, begin_checkout, purchase, search. 
              Session tracking com sequence_number e detecção automática de plataforma.
            </p>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <SparkKpi label="Total Eventos" value={totalEvents} change={15.8} sparkData={generateSparkline(12, 100, 30)} color="hsl(var(--primary))" icon={Activity} />
        <SparkKpi label="Tracking" value={trackingEvents} change={8.4} sparkData={generateSparkline(12, 50, 15)} color="hsl(var(--info))" icon={Eye} />
        <SparkKpi label="Conversões" value={conversionEvents} change={22.3} sparkData={generateSparkline(12, 30, 10)} color="hsl(var(--success))" icon={Zap} />
        <SparkKpi label="E-commerce" value={ecommerceEvents} change={12.1} sparkData={generateSparkline(12, 40, 15)} color="hsl(var(--warning))" />
        <SparkKpi label="Páginas Ativas" value={uniquePages} change={3.2} sparkData={generateSparkline(12, 8, 3)} color="hsl(var(--chart-5))" icon={Globe} />
        <SparkKpi label="Mobile" value={mobilePct} suffix="%" change={4.1} sparkData={generateSparkline(12, 60, 10)} color="hsl(var(--success))" icon={Smartphone} />
        <SparkKpi label="Tempo Médio" value={`${avgTimeOnPage}s`} change={5.7} sparkData={generateSparkline(12, 45, 15)} color="hsl(var(--info))" icon={Clock} />
        <SparkKpi label="Plataformas" value={platformDistribution.length} change={0} sparkData={generateSparkline(12, 3, 1)} color="hsl(var(--primary))" icon={Layers} />
      </StaggeredGrid>

      {/* Volume over time */}
      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Volume de Eventos ao Longo do Tempo" subtitle="Tracking, Conversões e E-commerce — Stacked Area" />
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

      {/* Event type ranking */}
      <AnimatedContainer delay={0.05}>
        <Card className="p-5">
          <ChartHeader title="Ranking de Eventos por Tipo" subtitle="Todos os 13 tipos de eventos do plugin v3.1.0" />
          <div className="space-y-2">
            {allEventFunnel.map((step, i) => (
              <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={allEventFunnel[0].value} color={step.color} index={i} />
            ))}
          </div>
        </Card>
      </AnimatedContainer>

      {/* Platform + Device + Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="Detecção de Plataforma" subtitle="WooCommerce, GTM ou Genérico" />
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
            <ChartHeader title="Eventos por Dispositivo" subtitle="Mobile, Desktop, Tablet" />
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
            <ChartHeader title="Eventos por Browser" subtitle="Barras verticais com gradiente" />
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

      {/* Treemap + Cohort Heatmap side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <AnimatedContainer delay={0.25} className="lg:col-span-3">
          <Card className="p-5 h-full">
            <ChartHeader title="Treemap de Páginas" subtitle="Área proporcional ao volume de eventos" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={topPagesTreemap} dataKey="size" nameKey="name" stroke="hsl(var(--background))">
                  {topPagesTreemap.map((entry, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: any, name: any) => [v, "Eventos"]} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.3} className="lg:col-span-2">
          <Card className="p-4 h-full flex flex-col">
            <ChartHeader title="Evento × Dispositivo" subtitle="Heatmap de intensidade" />
            <div className="flex-1 flex items-center">
              <CohortHeatmap
                data={cohortData.data}
                xLabels={cohortData.xLabels}
                yLabels={cohortData.yLabels}
                maxValue={Math.max(...cohortData.data.flat())}
                hue={210}
              />
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Detailed Events Table */}
      <AnimatedContainer delay={0.4}>
        <Card className="p-5">
          <ChartHeader title="Eventos Detalhados" subtitle="Últimos eventos capturados com URLs, dispositivo e tipo" />
           <AnalyticsDataTable
            columns={["Data/Hora", "Tipo de Evento", "Página", "CTA / Elemento", "Dispositivo", "Navegador", "Localização"]}
            rows={pluginEvents.slice(0, 100).map(e => [
              new Date(e.timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              `${EVENT_EMOJI[e.event_type] || "⚡"} ${EVENT_LABELS[e.event_type]}`,
              e.page_url.replace(/^https?:\/\/[^/]+/, "") || "/",
              e.cta_text || e.event_type.replace(/_/g, " "),
              `${DEVICE_EMOJI[e.device] || "💻"} ${e.device.charAt(0).toUpperCase() + e.device.slice(1)}`,
              `${BROWSER_EMOJI[e.browser] || "🌐"} ${e.browser}`,
              `📍 ${e.city}, ${e.state}`,
            ])}
            pageSize={15}
          />
        </Card>
      </AnimatedContainer>

      {/* Heatmap Day × Hour */}
      <AnimatedContainer delay={0.45}>
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
                      <div key={cell.hour} className="flex-1 h-7 rounded-md flex items-center justify-center transition-transform hover:scale-[1.08] cursor-default"
                        style={{ background: `hsl(var(--info) / ${intensity})`, border: `1px solid hsl(var(--info) / ${intensity * 0.4})` }}
                        title={`${row.day} ${cell.hour}:00 — ${cell.value} eventos`}
                      >
                        <span className={`text-[8px] font-medium ${cell.value > 20 ? "text-white" : "text-muted-foreground"}`}>{cell.value}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
