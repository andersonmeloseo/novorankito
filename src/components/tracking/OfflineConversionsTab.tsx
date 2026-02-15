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
  Search, Phone, Mail, DollarSign, TrendingUp,
  Download, FileJson, FileSpreadsheet, PhoneCall,
  ChevronLeft, ChevronRight, Link2,
  CheckCircle2, XCircle, Clock, Megaphone, Send, Tag,
  ThumbsUp, ThumbsDown, Upload, RefreshCw, CheckSquare,
} from "lucide-react";
import { format } from "date-fns";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const PLATFORM_OPTIONS = [
  { value: "all", label: "Todas Plataformas" },
  { value: "Google Ads", label: "Google Ads" },
  { value: "Meta Ads", label: "Meta Ads" },
  { value: "none", label: "Sem Plataforma" },
];

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle2; class: string }> = {
  confirmado: { icon: CheckCircle2, class: "bg-success/15 text-success border-success/30" },
  pendente: { icon: Clock, class: "bg-warning/15 text-warning border-warning/30" },
  cancelado: { icon: XCircle, class: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PAGE_SIZE = 10;

type ConversionQuality = "good" | "bad" | null;

export function OfflineConversionsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "value">("recent");
  const [page, setPage] = useState(1);
  const [qualityMap, setQualityMap] = useState<Record<string, ConversionQuality>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState<string | null>(null);

  const toggleQuality = useCallback((id: string, quality: ConversionQuality) => {
    setQualityMap(prev => ({ ...prev, [id]: prev[id] === quality ? null : quality }));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback((items: MockOfflineConversion[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = items.every(c => next.has(c.id));
      items.forEach(c => allSelected ? next.delete(c.id) : next.add(c.id));
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let data = mockOfflineConversions;
    if (statusFilter !== "all") data = data.filter(c => c.status === statusFilter);
    if (channelFilter !== "all") data = data.filter(c => c.source_channel === channelFilter);
    if (platformFilter === "none") data = data.filter(c => !c.ad_platform);
    else if (platformFilter !== "all") data = data.filter(c => c.ad_platform === platformFilter);
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
  }, [statusFilter, channelFilter, platformFilter, search]);

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
  const withAds = filtered.filter(c => c.ad_platform).length;
  const sentToAds = filtered.filter(c => c.sent_to_ads).length;
  const markedGood = filtered.filter(c => qualityMap[c.id] === "good").length;
  const markedBad = filtered.filter(c => qualityMap[c.id] === "bad").length;

  // By ad platform
  const byAdPlatform = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number; sent: number; good: number; bad: number; pending: number }>();
    filtered.forEach(c => {
      if (!c.ad_platform) return;
      const entry = map.get(c.ad_platform) || { count: 0, revenue: 0, sent: 0, good: 0, bad: 0, pending: 0 };
      entry.count++;
      if (c.status === "confirmado") entry.revenue += c.value;
      if (c.sent_to_ads) entry.sent++;
      const q = qualityMap[c.id];
      if (q === "good") entry.good++;
      else if (q === "bad") entry.bad++;
      else entry.pending++;
      map.set(c.ad_platform, entry);
    });
    return Array.from(map.entries()).map(([platform, v]) => ({ platform, ...v }));
  }, [filtered, qualityMap]);

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

  const exportData = useCallback((fmt: "csv" | "json", platformOnly?: string) => {
    let dataToExport = sorted;
    if (platformOnly) {
      dataToExport = sorted.filter(c => c.ad_platform === platformOnly);
    }

    if (fmt === "json") {
      const enriched = dataToExport.map(c => ({ ...c, quality: qualityMap[c.id] || "unmarked" }));
      const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `conversoes-offline${platformOnly ? `-${platformOnly.replace(" ", "-").toLowerCase()}` : ""}.json`; a.click();
    } else {
      const headers = ["ID", "Contato", "Telefone", "Email", "Tipo", "Valor", "Data", "Canal", "Status", "Plataforma Ads", "GCLID", "FBCLID", "Qualidade", "Enviada p/ Ads", "Visitor ID"];
      const rows = dataToExport.map(c => [
        c.id, c.contact_name, c.contact_phone || "", c.contact_email || "",
        c.conversion_type, c.value.toFixed(2),
        format(new Date(c.converted_at), "dd/MM/yyyy HH:mm"),
        c.source_channel, c.status, c.ad_platform || "", c.gclid || "", c.fbclid || "",
        qualityMap[c.id] || "não marcado", c.sent_to_ads ? "Sim" : "Não", c.visitor_id || "",
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `conversoes-offline${platformOnly ? `-${platformOnly.replace(" ", "-").toLowerCase()}` : ""}.csv`; a.click();
    }
    toast.success(`Exportado ${dataToExport.length} conversões${platformOnly ? ` (${platformOnly})` : ""}`);
  }, [sorted, qualityMap]);

  const syncToAds = useCallback(async (platform: string) => {
    const toSync = sorted.filter(c =>
      c.ad_platform === platform &&
      !c.sent_to_ads &&
      qualityMap[c.id] === "good"
    );

    if (toSync.length === 0) {
      toast.warning(`Nenhuma conversão marcada como "boa" e pendente de envio para ${platform}`);
      return;
    }

    setSyncing(platform);
    try {
      const fnName = platform === "Google Ads" ? "sync-google-ads" : "sync-meta-ads";
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          conversions: toSync.map(c => ({
            id: c.id,
            gclid: c.gclid,
            fbclid: c.fbclid,
            value: c.value,
            converted_at: c.converted_at,
            contact_name: c.contact_name,
            contact_email: c.contact_email,
            contact_phone: c.contact_phone,
            conversion_type: c.conversion_type,
          })),
        },
      });

      if (error) throw error;
      toast.success(`${toSync.length} conversões enviadas para ${platform}!`);
    } catch (err: any) {
      toast.error(`Erro ao sincronizar com ${platform}: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  }, [sorted, qualityMap]);

  const selectedCount = selectedIds.size;
  const selectedGood = [...selectedIds].filter(id => qualityMap[id] === "good").length;

  const markSelectedAs = useCallback((quality: ConversionQuality) => {
    setQualityMap(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => { next[id] = quality; });
      return next;
    });
    toast.success(`${selectedIds.size} conversões marcadas como "${quality === "good" ? "boa" : "ruim"}"`);
  }, [selectedIds]);

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
          <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV (Todos)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("csv", "Google Ads")} className="text-xs gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV (Google Ads)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("csv", "Meta Ads")} className="text-xs gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV (Meta Ads)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("json")} className="text-xs gap-2">
                <FileJson className="h-3.5 w-3.5" /> JSON (Todos)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <Card className="p-3 border-primary/30 bg-primary/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{selectedCount} selecionadas</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-success/40 text-success hover:bg-success/10" onClick={() => markSelectedAs("good")}>
              <ThumbsUp className="h-3 w-3" /> Marcar Boa
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => markSelectedAs("bad")}>
              <ThumbsDown className="h-3 w-3" /> Marcar Ruim
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setSelectedIds(new Set())}>
              Limpar seleção
            </Button>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Offline", value: totalConversions, icon: PhoneCall },
          { label: "Receita Confirmada", value: `R$ ${totalRevenue.toFixed(0)}`, icon: DollarSign },
          { label: "Com Ads ID", value: withAds, icon: Tag },
          { label: "Boas ✅", value: markedGood, icon: ThumbsUp },
          { label: "Ruins ❌", value: markedBad, icon: ThumbsDown },
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

      {/* Ads Attribution + Sync Panel */}
      {byAdPlatform.length > 0 && (
        <AnimatedContainer delay={0.1}>
          <Card className="p-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <Megaphone className="h-4 w-4 text-primary" />
              Atribuição por Plataforma — Sincronizar com Ads
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {byAdPlatform.map(p => (
                <Card key={p.platform} className="p-4 bg-muted/30 border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className={`text-xs font-semibold ${p.platform === "Google Ads" ? "border-chart-3/40 text-chart-3" : "border-chart-4/40 text-chart-4"}`}>
                      <Megaphone className="h-3 w-3 mr-1" /> {p.platform}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{p.count} conversões</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-foreground">{p.good}</p>
                      <p className="text-[9px] text-success">Boas ✅</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{p.bad}</p>
                      <p className="text-[9px] text-destructive">Ruins ❌</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{p.pending}</p>
                      <p className="text-[9px] text-muted-foreground">Não marcadas</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-muted-foreground">Receita: <strong className="text-foreground">R$ {p.revenue.toFixed(0)}</strong></span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Send className="h-3 w-3" /> {p.sent}/{p.count} enviadas
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5"
                      disabled={syncing !== null || p.good === 0}
                      onClick={() => syncToAds(p.platform)}
                    >
                      {syncing === p.platform ? (
                        <><RefreshCw className="h-3 w-3 animate-spin" /> Enviando...</>
                      ) : (
                        <><Upload className="h-3 w-3" /> Enviar {p.good} boas para {p.platform}</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => exportData("csv", p.platform)}
                    >
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {/* Table */}
      <AnimatedContainer delay={0.12}>
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
                  <th className="px-2 py-2 text-center w-8">
                    <button onClick={() => selectAllOnPage(paged)} className="text-muted-foreground hover:text-foreground">
                      <CheckSquare className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  {["Qualidade", "Status", "Contato", "Tipo", "Valor", "Canal", "Plataforma", "Click ID", "Enviada", "Data", "Vínculo"].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((conv, i) => {
                  const statusInfo = STATUS_STYLE[conv.status] || STATUS_STYLE.pendente;
                  const StatusIcon = statusInfo.icon;
                  const quality = qualityMap[conv.id];
                  const isSelected = selectedIds.has(conv.id);
                  return (
                    <motion.tr
                      key={conv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : i % 2 === 0 ? "bg-muted/10" : ""}`}
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(conv.id)}
                          className="rounded border-muted-foreground/30"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleQuality(conv.id, "good")}
                            className={`p-1 rounded transition-colors ${quality === "good" ? "bg-success/20 text-success" : "text-muted-foreground/40 hover:text-success hover:bg-success/10"}`}
                            title="Conversão boa"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => toggleQuality(conv.id, "bad")}
                            className={`p-1 rounded transition-colors ${quality === "bad" ? "bg-destructive/20 text-destructive" : "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"}`}
                            title="Conversão ruim"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Badge className={`text-[9px] gap-1 ${statusInfo.class}`}>
                          <StatusIcon className="h-2.5 w-2.5" /> {conv.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        <div>
                          <p className="font-semibold text-foreground">{conv.contact_name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {conv.contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> {conv.contact_phone}</span>}
                            {conv.contact_email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" /> {conv.contact_email}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{conv.conversion_type}</td>
                      <td className="px-2 py-2 font-semibold tabular-nums text-foreground">
                        {conv.value > 0 ? `R$ ${conv.value.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{conv.source_channel}</td>
                      <td className="px-2 py-2">
                        {conv.ad_platform ? (
                          <Badge variant="outline" className={`text-[9px] gap-1 ${conv.ad_platform === "Google Ads" ? "border-chart-3/40 text-chart-3" : "border-chart-4/40 text-chart-4"}`}>
                            <Megaphone className="h-2.5 w-2.5" /> {conv.ad_platform}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {(conv.gclid || conv.fbclid) ? (
                          <Badge variant="outline" className="text-[9px] gap-1 font-mono border-muted-foreground/30">
                            <Tag className="h-2.5 w-2.5" /> {conv.gclid ? "gclid" : "fbclid"}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {conv.sent_to_ads ? (
                          <Badge className="text-[9px] gap-1 bg-success/15 text-success border-success/30">
                            <Send className="h-2.5 w-2.5" /> Sim
                          </Badge>
                        ) : conv.ad_platform ? (
                          <Badge variant="outline" className="text-[9px] gap-1 border-warning/40 text-warning">
                            <Clock className="h-2.5 w-2.5" /> Pendente
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">N/A</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                        {format(new Date(conv.converted_at), "dd/MM · HH:mm")}
                      </td>
                      <td className="px-2 py-2">
                        {conv.visitor_id ? (
                          <Badge variant="outline" className="text-[9px] gap-1 border-info/40 text-info">
                            <Link2 className="h-2.5 w-2.5" /> {conv.visitor_id}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
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
