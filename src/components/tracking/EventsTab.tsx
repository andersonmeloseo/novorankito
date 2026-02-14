import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Download, Search, Eye, Flame } from "lucide-react";
import { format } from "date-fns";

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

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-5))",
  "hsl(var(--info))",
];

const heatmapData = generateConversionsHeatmap();

export function EventsTab() {
  const [period, setPeriod] = useState("30");
  const [eventType, setEventType] = useState("all");
  const [device, setDevice] = useState("all");
  const [conversionType, setConversionType] = useState("all");
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState("conversions");

  const filtered = useMemo(() => {
    let data = mockTrackingEventsDetailed;
    if (eventType !== "all") data = data.filter((e) => e.event_type === eventType);
    if (device !== "all") data = data.filter((e) => e.device === device);
    if (conversionType !== "all") data = data.filter((e) => e.conversion_type === conversionType);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((e) => e.page_url.includes(q) || e.location_city.toLowerCase().includes(q) || e.cta_text.toLowerCase().includes(q));
    }
    return data;
  }, [eventType, device, conversionType, search]);

  // KPIs
  const uniqueVisitors = new Set(filtered.map((e) => `${e.device}-${e.location_city}-${e.browser}`)).size;
  const uniquePages = new Set(filtered.map((e) => e.page_url)).size;
  const totalPageViews = filtered.filter((e) => e.event_type === "page_view").length;
  const totalConversions = filtered.filter((e) => e.conversion_type === "conversion").length;
  const conversionRate = filtered.length > 0 ? ((totalConversions / filtered.length) * 100).toFixed(1) : "0";

  // Top pages
  const pageMap = new Map<string, number>();
  filtered.filter((e) => e.conversion_type === "conversion").forEach((e) => {
    pageMap.set(e.page_url, (pageMap.get(e.page_url) || 0) + 1);
  });
  const topPages = Array.from(pageMap.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Distribution by event type
  const typeMap = new Map<string, number>();
  filtered.forEach((e) => {
    typeMap.set(e.event_type, (typeMap.get(e.event_type) || 0) + 1);
  });
  const pieData = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));

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
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Tipo de Evento" /></SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={device} onValueChange={setDevice}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Dispositivo" /></SelectTrigger>
            <SelectContent>
              {DEVICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={conversionType} onValueChange={setConversionType}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Tipo Conversão" /></SelectTrigger>
            <SelectContent>
              {CONVERSION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Visitantes Únicos" value={uniqueVisitors} change={12.4} />
        <KpiCard label="Páginas Únicas" value={uniquePages} change={3.2} />
        <KpiCard label="Visualizações" value={totalPageViews} change={8.7} />
        <KpiCard label="Conversões" value={totalConversions} change={22.3} />
        <KpiCard label="Taxa Conversão" value={Number(conversionRate)} change={5.1} suffix="%" />
      </StaggeredGrid>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="conversions" className="text-xs">Conversões</TabsTrigger>
          <TabsTrigger value="pageviews" className="text-xs">Page Views</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribution Pie */}
            <AnimatedContainer>
              <Card className="p-5">
                <h3 className="text-sm font-medium text-foreground mb-4">Distribuição por Tipo</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </AnimatedContainer>

            {/* Top Pages Bar */}
            <AnimatedContainer delay={0.1}>
              <Card className="p-5">
                <h3 className="text-sm font-medium text-foreground mb-4">Top Páginas com Conversões</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topPages} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="url" type="category" width={140} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Conversões" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </AnimatedContainer>
          </div>
        </TabsContent>

        <TabsContent value="conversions" className="mt-4 space-y-4">
          {/* Line Chart */}
          <AnimatedContainer>
            <Card className="p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Conversões ao Longo do Tempo</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockConversionsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="whatsapp_click" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="WhatsApp" />
                    <Line type="monotone" dataKey="form_submit" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Formulário" />
                    <Line type="monotone" dataKey="phone_call" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} name="Ligação" />
                    <Line type="monotone" dataKey="cta_click" stroke="hsl(var(--info))" strokeWidth={2} dot={false} name="CTA Click" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </AnimatedContainer>

          {/* Heatmap */}
          <AnimatedContainer delay={0.1}>
            <Card className="p-5">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Flame className="h-4 w-4 text-warning" /> Mapa de Calor de Conversões (Dia × Hora)
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
                          className="flex-1 h-5 rounded-sm"
                          style={{ backgroundColor: `hsl(var(--primary) / ${Math.max(0.05, cell.value / 40)})` }}
                          title={`${row.day} ${cell.hour}:00 — ${cell.value} conversões`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </AnimatedContainer>
        </TabsContent>

        <TabsContent value="pageviews" className="mt-4">
          <AnimatedContainer>
            <Card className="p-6 text-center">
              <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Os dados de Page Views serão preenchidos quando o script de tracking for instalado.</p>
            </Card>
          </AnimatedContainer>
        </TabsContent>
      </Tabs>

      {/* Detailed Table */}
      <AnimatedContainer delay={0.15}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">Conversões Detalhadas</h3>
              <p className="text-[11px] text-muted-foreground">Mostrando {filtered.length} de {mockTrackingEventsDetailed.length} eventos</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar página, cidade ou CTA..."
                  className="pl-8 h-8 text-xs w-[220px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Hora", "Tipo", "Categoria", "Página", "CTA", "Meta", "Valor", "Dispositivo", "Browser", "Cidade/Estado"].map((col) => (
                    <th key={col} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((ev) => (
                  <tr key={ev.event_id} className="border-b border-border last:border-0 table-row-hover">
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">{format(new Date(ev.timestamp), "dd/MM HH:mm")}</td>
                    <td className="px-3 py-2.5"><Badge variant="secondary" className="text-[10px]">{ev.event_type}</Badge></td>
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
        </Card>
      </AnimatedContainer>
    </div>
  );
}
