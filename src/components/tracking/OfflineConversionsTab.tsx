import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { mockOfflineConversions, type MockOfflineConversion } from "@/lib/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Search, Phone, Mail, MapPin, Calendar, DollarSign, TrendingUp,
  Download, FileJson, FileSpreadsheet, PhoneCall, Users, UserCheck,
  ArrowUpDown, ChevronLeft, ChevronRight, Link2, Trophy, AlertCircle,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE,
  FunnelStep,
} from "@/components/analytics/ChartPrimitives";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "confirmado", label: "Confirmados" },
  { value: "pendente", label: "Pendentes" },
  { value: "cancelado", label: "Cancelados" },
];

const CHANNEL_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "Telefone", label: "Telefone" },
  { value: "Presencial", label: "Presencial" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Indicação", label: "Indicação" },
  { value: "Evento", label: "Evento" },
  { value: "Panfleto", label: "Panfleto" },
];

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle2; class: string }> = {
  confirmado: { icon: CheckCircle2, class: "bg-success/15 text-success border-success/30" },
  pendente: { icon: Clock, class: "bg-warning/15 text-warning border-warning/30" },
  cancelado: { icon: XCircle, class: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PAGE_SIZE = 10;

export function OfflineConversionsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "value">("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = mockOfflineConversions;
    if (statusFilter !== "all") data = data.filter(c => c.status === statusFilter);
    if (channelFilter !== "all") data = data.filter(c => c.source_channel === channelFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c =>
        c.contact_name.toLowerCase().includes(q) ||
        c.contact_phone?.includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.conversion_type.toLowerCase().includes(q)
      );
    }
    return data;
  }, [statusFilter, channelFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "value") arr.sort((a, b) => b.value - a.value);
    else arr.sort((a, b) => new Date(b.converted_at).getTime() - new Date(a.converted_at).getTime());
    return arr;
  }, [filtered, sortBy]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalConversions = filtered.length;
  const confirmed = filtered.filter(c => c.status === "confirmado").length;
  const pending = filtered.filter(c => c.status === "pendente").length;
  const totalRevenue = filtered.filter(c => c.status === "confirmado").reduce((s, c) => s + c.value, 0);
  const avgValue = confirmed > 0 ? totalRevenue / confirmed : 0;
  const attributed = filtered.filter(c => c.visitor_id).length;
  const attributionRate = totalConversions > 0 ? ((attributed / totalConversions) * 100).toFixed(1) : "0";

  // By channel
  const byChannel = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    filtered.forEach(c => {
      const entry = map.get(c.source_channel) || { count: 0, revenue: 0 };
      entry.count++;
      if (c.status === "confirmado") entry.revenue += c.value;
      map.set(c.source_channel, entry);
    });
    return Array.from(map.entries()).map(([channel, v]) => ({ channel, ...v })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // By type pie
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(c => map.set(c.conversion_type, (map.get(c.conversion_type) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);
  const totalTypeEvents = byType.reduce((s, d) => s + d.value, 0);

  // Status funnel
  const statusFunnel = useMemo(() => [
    { label: "Total Offline", value: totalConversions, color: "hsl(var(--primary))" },
    { label: "Confirmados", value: confirmed, color: "hsl(var(--success))" },
    { label: "Pendentes", value: pending, color: "hsl(var(--warning))" },
    { label: "Atribuídos (Online)", value: attributed, color: "hsl(var(--info))" },
  ], [totalConversions, confirmed, pending, attributed]);

  const exportData = useCallback((fmt: "csv" | "json") => {
    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "conversoes-offline.json"; a.click();
    } else {
      const headers = ["ID", "Contato", "Telefone", "Email", "Tipo", "Valor", "Data", "Canal", "Status", "Campanha", "Visitor ID"];
      const rows = sorted.map(c => [
        c.id, c.contact_name, c.contact_phone || "", c.contact_email || "",
        c.conversion_type, c.value.toFixed(2),
        format(new Date(c.converted_at), "dd/MM/yyyy HH:mm"),
        c.source_channel, c.status, c.attributed_campaign || "", c.visitor_id || "",
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "conversoes-offline.csv"; a.click();
    }
  }, [sorted]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar contato, telefone, tipo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="value">Maior valor</SelectItem>
            </SelectContent>
          </Select>
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
        </div>
      </Card>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Offline", value: totalConversions, icon: PhoneCall, color: "hsl(var(--primary))" },
          { label: "Confirmados", value: confirmed, icon: CheckCircle2, color: "hsl(var(--success))" },
          { label: "Pendentes", value: pending, icon: Clock, color: "hsl(var(--warning))" },
          { label: "Receita Offline", value: `R$ ${totalRevenue.toFixed(0)}`, icon: DollarSign, color: "hsl(var(--success))" },
          { label: "Ticket Médio", value: `R$ ${avgValue.toFixed(0)}`, icon: TrendingUp, color: "hsl(var(--info))" },
          { label: "Taxa Atribuição", value: `${attributionRate}%`, icon: Link2, color: "hsl(var(--chart-5))" },
        ].map((kpi, i) => (
          <Card key={i} className="p-4 sm:p-5 card-hover group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex flex-col items-center text-center gap-1.5">
              <div className="flex items-center gap-1.5">
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
              <span className="text-2xl font-bold text-foreground font-display tracking-tight">{kpi.value}</span>
            </div>
          </Card>
        ))}
      </StaggeredGrid>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <AnimatedContainer>
          <Card className="p-5">
            <ChartHeader title="Receita por Canal" subtitle="Qual canal offline gera mais receita" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byChannel} layout="vertical">
                  <defs><BarGradient id="offRevGrad" color="hsl(var(--success))" /></defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v: number) => `R$${v}`} />
                  <YAxis dataKey="channel" type="category" {...AXIS_STYLE} width={80} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`R$ ${v.toFixed(0)}`, "Receita"]} />
                  <Bar dataKey="revenue" fill="url(#offRevGrad)" radius={[0, 4, 4, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.04}>
          <Card className="p-5">
            <ChartHeader title="Tipo de Conversão" subtitle="Distribuição por tipo de conversão offline" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                    {byType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [
                      `${value} (${totalTypeEvents > 0 ? ((value / totalTypeEvents) * 100).toFixed(1) : 0}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {byType.slice(0, 5).map((s, i) => (
                <div key={s.name} className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-[9px] text-muted-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.08}>
          <Card className="p-5">
            <ChartHeader title="Funil de Status" subtitle="Do total às conversões atribuídas ao online" />
            <div className="space-y-2">
              {statusFunnel.map((step, i) => (
                <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={statusFunnel[0].value} color={step.color} index={i} />
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Table */}
      <AnimatedContainer delay={0.1}>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              Conversões Offline
            </h3>
            <span className="text-[10px] text-muted-foreground">{sorted.length} resultados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Status", "Contato", "Tipo", "Valor", "Canal", "Data", "Campanha", "Vínculo Online"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((conv, i) => {
                  const statusInfo = STATUS_STYLE[conv.status] || STATUS_STYLE.pendente;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <motion.tr
                      key={conv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "bg-muted/10" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <Badge className={`text-[9px] gap-1 ${statusInfo.class}`}>
                          <StatusIcon className="h-2.5 w-2.5" /> {conv.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div>
                          <p className="font-semibold text-foreground">{conv.contact_name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {conv.contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> {conv.contact_phone}</span>}
                            {conv.contact_email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" /> {conv.contact_email}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{conv.conversion_type}</td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-foreground">
                        {conv.value > 0 ? `R$ ${conv.value.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{conv.source_channel}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {format(new Date(conv.converted_at), "dd/MM · HH:mm")}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate" title={conv.attributed_campaign || ""}>
                        {conv.attributed_campaign || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {conv.visitor_id ? (
                          <Badge variant="outline" className="text-[9px] gap-1 border-info/40 text-info">
                            <Link2 className="h-2.5 w-2.5" /> {conv.visitor_id}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">Não vinculado</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {paged.length === 0 && (
            <EmptyState icon={PhoneCall} title="Nenhuma conversão offline" description="Ajuste os filtros para ver conversões." />
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
        </Card>
      </AnimatedContainer>
    </div>
  );
}
