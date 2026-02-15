import React, { useState, useMemo, useCallback } from "react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Search, Phone, Mail, DollarSign, TrendingUp,
  Download, FileJson, FileSpreadsheet, PhoneCall,
  ChevronLeft, ChevronRight, Link2,
  CheckCircle2, XCircle, Clock, Megaphone, Send, Tag,
  ThumbsUp, ThumbsDown, Upload, RefreshCw, CheckSquare,
  Globe, Shield, Fingerprint, Eye, ChevronDown, ChevronUp,
  Gauge, Wifi, Monitor,
} from "lucide-react";
import { format } from "date-fns";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { AdsPlatformCredentials } from "./AdsPlatformCredentials";
import { useQuery } from "@tanstack/react-query";

// ── Types ──
interface OfflineConversion {
  id: string;
  event_type: string;
  value: number | null;
  converted_at: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  device: string | null;
  location: string | null;
  page: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
}

// ── Constants ──

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "lead", label: "Leads" },
  { value: "sale", label: "Vendas" },
  { value: "call", label: "Ligações" },
];

const PAGE_SIZE = 12;

// ── Main Component ──

export function OfflineConversionsTab() {
  const projectId = localStorage.getItem("rankito_current_project");

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ["offline-conversions", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("conversions")
        .select("*")
        .eq("project_id", projectId)
        .order("converted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as OfflineConversion[];
    },
    enabled: !!projectId,
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "value">("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = conversions;
    if (typeFilter !== "all") data = data.filter(c => c.event_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c =>
        c.lead_name?.toLowerCase().includes(q) ||
        c.lead_phone?.includes(q) ||
        c.lead_email?.toLowerCase().includes(q) ||
        c.campaign?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [conversions, typeFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "value") arr.sort((a, b) => (b.value || 0) - (a.value || 0));
    else arr.sort((a, b) => new Date(b.converted_at).getTime() - new Date(a.converted_at).getTime());
    return arr;
  }, [filtered, sortBy]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalConversions = filtered.length;
  const totalRevenue = filtered.reduce((s, c) => s + (c.value || 0), 0);
  const withPhone = filtered.filter(c => c.lead_phone).length;
  const withEmail = filtered.filter(c => c.lead_email).length;

  // By campaign
  const byCampaign = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    filtered.forEach(c => {
      if (!c.campaign) return;
      const entry = map.get(c.campaign) || { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += c.value || 0;
      map.set(c.campaign, entry);
    });
    return Array.from(map.entries())
      .map(([campaign, v]) => ({ campaign, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  const exportData = useCallback((fmt: "csv" | "json") => {
    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "conversoes-offline.json"; a.click();
    } else {
      const headers = ["ID", "Tipo", "Contato", "Telefone", "Email", "Valor", "Data", "Campanha", "Origem", "Localização"];
      const rows = sorted.map(c => [
        c.id, c.event_type, c.lead_name || "", c.lead_phone || "", c.lead_email || "",
        (c.value || 0).toFixed(2),
        format(new Date(c.converted_at), "dd/MM/yyyy HH:mm"),
        c.campaign || "", c.source || "", c.location || "",
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "conversoes-offline.csv"; a.click();
    }
    toast.success(`Exportado ${sorted.length} conversões`);
  }, [sorted]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeatureBanner
          icon={PhoneCall}
          title="Conversões Offline"
          description={<>Gerencie <strong>conversões offline</strong> (ligações, WhatsApp, e-mails).</>}
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
        icon={PhoneCall}
        title="Conversões Offline"
        description={<>Gerencie <strong>conversões offline</strong> (ligações, WhatsApp, e-mails) e envie de volta para Google Ads e Meta Ads. Avalie a qualidade de cada lead e sincronize com plataformas de anúncios para otimizar campanhas.</>}
      />

      {conversions.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="Nenhuma conversão offline registrada"
          description="Quando conversões offline forem registradas via API ou manualmente, elas aparecerão aqui com todos os detalhes de atribuição."
        />
      ) : (
        <>
          {/* Filters */}
          <Card className="p-3 sm:p-4">
            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
              <div className="flex-1 min-w-[180px] max-w-[280px] space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contato, campanha..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ordenar</label>
                <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1); }}>
                  <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="value">Maior valor</SelectItem>
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
            </div>
          </Card>

          {/* KPIs */}
          <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: totalConversions, icon: PhoneCall },
              { label: "Receita", value: `R$${totalRevenue.toFixed(0)}`, icon: DollarSign },
              { label: "Com Telefone", value: withPhone, icon: Phone },
              { label: "Com Email", value: withEmail, icon: Mail },
            ].map((kpi, i) => (
              <Card key={i} className="p-3 sm:p-4 card-hover group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex flex-col items-center text-center gap-1">
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xl font-bold text-foreground font-display tracking-tight">{kpi.value}</span>
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                </div>
              </Card>
            ))}
          </StaggeredGrid>

          {/* Chart */}
          {byCampaign.length > 0 && (
            <AnimatedContainer>
              <Card className="p-5">
                <ChartHeader title="Conversões por Campanha" subtitle="Quais campanhas estão gerando conversões offline" />
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCampaign} layout="vertical">
                      <defs><BarGradient id="campGrad" color="hsl(var(--primary))" /></defs>
                      <CartesianGrid {...GRID_STYLE} horizontal={false} />
                      <XAxis type="number" {...AXIS_STYLE} />
                      <YAxis dataKey="campaign" type="category" {...AXIS_STYLE} width={140} tick={{ fontSize: 8 }} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [v, "Conversões"]} />
                      <Bar dataKey="count" fill="url(#campGrad)" radius={[0, 4, 4, 0]} name="Conversões" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </AnimatedContainer>
          )}

          {/* Credentials Config */}
          <AdsPlatformCredentials />

          {/* Table */}
          <AnimatedContainer delay={0.08}>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left p-3 font-semibold text-muted-foreground">Contato</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Tipo</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Valor</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Data</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Campanha</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((conv) => (
                      <tr key={conv.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div>
                            <p className="font-semibold text-foreground">{conv.lead_name || "—"}</p>
                            {conv.lead_phone && <p className="text-[10px] text-muted-foreground">{conv.lead_phone}</p>}
                            {conv.lead_email && <p className="text-[10px] text-muted-foreground">{conv.lead_email}</p>}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[9px]">{conv.event_type}</Badge>
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          {conv.value ? `R$ ${conv.value.toFixed(2)}` : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {format(new Date(conv.converted_at), "dd/MM HH:mm")}
                        </td>
                        <td className="p-3 text-muted-foreground truncate max-w-[120px]">{conv.campaign || "—"}</td>
                        <td className="p-3 text-muted-foreground">{conv.source || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </AnimatedContainer>

          {/* Pagination */}
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
        </>
      )}
    </div>
  );
}
