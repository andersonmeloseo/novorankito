import React, { useState, useMemo, useCallback } from "react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
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

// ── Constants ──

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "confirmado", label: "Confirmados" },
  { value: "pendente", label: "Pendentes" },
  { value: "cancelado", label: "Cancelados" },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "Todas Plataformas" },
  { value: "Google Ads", label: "Google Ads" },
  { value: "Meta Ads", label: "Meta Ads" },
  { value: "none", label: "Sem Plataforma" },
];

const QUALITY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "good", label: "Boas ✅" },
  { value: "bad", label: "Ruins ❌" },
  { value: "unmarked", label: "Não marcadas" },
];

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle2; class: string }> = {
  confirmado: { icon: CheckCircle2, class: "bg-success/15 text-success border-success/30" },
  pendente: { icon: Clock, class: "bg-warning/15 text-warning border-warning/30" },
  cancelado: { icon: XCircle, class: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PAGE_SIZE = 12;

// ── Match Quality Indicator ──

function MatchQualityBadge({ score }: { score: number }) {
  const level = score >= 8 ? "high" : score >= 5 ? "medium" : "low";
  const colors = {
    high: "bg-success/15 text-success border-success/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    low: "bg-destructive/15 text-destructive border-destructive/30",
  };
  const labels = { high: "Alto", medium: "Médio", low: "Baixo" };

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12">
        <Progress value={score * 10} className="h-1.5" />
      </div>
      <Badge className={`text-[8px] px-1 py-0 ${colors[level]}`}>
        {score.toFixed(0)}/10
      </Badge>
    </div>
  );
}

// ── Expanded Row Detail ──

function ConversionDetail({ conv }: { conv: MockOfflineConversion }) {
  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <td colSpan={99} className="!p-0 !bg-primary/[0.06]" style={{ background: 'hsl(var(--accent) / 0.5)' }}>
        <div className="border-t-2 border-b-2 border-primary/25 p-5 sm:p-6" style={{ background: 'hsl(var(--accent) / 0.5)', width: '100%' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
            {/* PII / Identity */}
            <div>
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                <Fingerprint className="h-3 w-3" /> Dados de Identidade (PII)
              </h4>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className={`font-mono ${conv.contact_email ? "text-success" : "text-destructive"}`}>
                    {conv.contact_email || "❌ ausente"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefone:</span>
                  <span className={`font-mono ${conv.contact_phone ? "text-success" : "text-destructive"}`}>
                    {conv.contact_phone || "❌ ausente"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sobrenome:</span>
                  <span className={`${conv.contact_lastname ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {conv.contact_lastname || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cidade/UF:</span>
                  <span className="text-foreground">{conv.city}{conv.state ? ` / ${conv.state}` : ""}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CEP:</span>
                  <span className={`${conv.zip_code ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {conv.zip_code || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Click IDs */}
            <div>
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Parâmetros de Clique
              </h4>
              <div className="space-y-1 text-[10px]">
                {conv.ad_platform === "Google Ads" ? (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">gclid:</span>
                      <span className={`font-mono truncate max-w-[120px] ${conv.gclid ? "text-chart-3" : "text-destructive"}`} title={conv.gclid || ""}>
                        {conv.gclid ? `${conv.gclid.slice(0, 12)}...` : "❌ ausente"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">wbraid:</span>
                      <span className={`font-mono truncate max-w-[120px] ${conv.wbraid ? "text-chart-3" : "text-muted-foreground/50"}`}>
                        {conv.wbraid ? `${conv.wbraid.slice(0, 12)}...` : "—"}
                      </span>
                    </div>
                  </>
                ) : conv.ad_platform === "Meta Ads" ? (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">fbclid:</span>
                      <span className={`font-mono truncate max-w-[120px] ${conv.fbclid ? "text-chart-4" : "text-destructive"}`} title={conv.fbclid || ""}>
                        {conv.fbclid ? `${conv.fbclid.slice(0, 12)}...` : "❌ ausente"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">fbc:</span>
                      <span className={`font-mono truncate max-w-[120px] ${conv.fbc ? "text-chart-4" : "text-muted-foreground/50"}`}>
                        {conv.fbc ? `${conv.fbc.slice(0, 16)}...` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">fbp:</span>
                      <span className={`font-mono truncate max-w-[120px] ${conv.fbp ? "text-chart-4" : "text-muted-foreground/50"}`}>
                        {conv.fbp ? `${conv.fbp.slice(0, 16)}...` : "—"}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground/50">Sem plataforma de ads</span>
                )}
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">event_id:</span>
                  <span className="font-mono text-foreground truncate max-w-[120px]" title={conv.event_id}>
                    {conv.event_id.slice(0, 14)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Context Signals */}
            <div>
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Sinais de Contexto
              </h4>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">IP:</span>
                  <span className={`font-mono ${conv.ip_address ? "text-foreground" : "text-destructive"}`}>
                    {conv.ip_address || "❌ ausente"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">User Agent:</span>
                  <span className={`truncate max-w-[140px] ${conv.user_agent ? "text-foreground" : "text-destructive"}`} title={conv.user_agent || ""}>
                    {conv.user_agent ? conv.user_agent.slice(0, 30) + "..." : "❌ ausente"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Pixel Match:</span>
                  {conv.pixel_matched ? (
                    <span className="text-success font-semibold">✅ Vinculado</span>
                  ) : (
                    <span className="text-warning">⚠️ Não vinculado</span>
                  )}
                </div>
                {conv.pixel_session_id && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Session:</span>
                    <span className="font-mono text-info">{conv.pixel_session_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Data */}
            <div>
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> Dados da Campanha
              </h4>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campanha:</span>
                  <span className="text-foreground font-semibold truncate max-w-[130px]" title={conv.campaign_name || ""}>
                    {conv.campaign_name || "—"}
                  </span>
                </div>
                {conv.adset_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conjunto:</span>
                    <span className="text-foreground truncate max-w-[130px]">{conv.adset_name}</span>
                  </div>
                )}
                {conv.ad_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Anúncio:</span>
                    <span className="text-foreground truncate max-w-[130px]">{conv.ad_name}</span>
                  </div>
                )}
                {conv.utm_source && (
                  <div className="flex justify-between mt-1 pt-1 border-t border-border/30">
                    <span className="text-muted-foreground">UTMs:</span>
                    <span className="font-mono text-info text-[8px]">
                      {conv.utm_source}/{conv.utm_medium}/{conv.utm_campaign}
                    </span>
                  </div>
                )}
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="text-foreground font-bold">R$ {conv.value.toFixed(2)} {conv.currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Match Quality Explanation */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2 text-[10px]">
              <Gauge className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold text-foreground">Event Match Quality:</span>
              <MatchQualityBadge score={conv.match_quality_score} />
              <span className="text-muted-foreground ml-2">
                {conv.match_quality_score >= 8 ? "Excelente — todos os sinais presentes" :
                 conv.match_quality_score >= 5 ? "Bom — adicione mais PII para melhorar" :
                 "Fraco — e-mail ou telefone ausente, match quality baixo"}
              </span>
            </div>
          </div>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Main Component ──

export function OfflineConversionsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "value" | "match">("recent");
  const [page, setPage] = useState(1);
  const [qualityMap, setQualityMap] = useState<Record<string, "good" | "bad" | null>>(() => {
    const initial: Record<string, "good" | "bad" | null> = {};
    mockOfflineConversions.forEach(c => { initial[c.id] = c.quality; });
    return initial;
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleQuality = useCallback((id: string, quality: "good" | "bad") => {
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
    if (platformFilter === "none") data = data.filter(c => !c.ad_platform);
    else if (platformFilter !== "all") data = data.filter(c => c.ad_platform === platformFilter);
    if (qualityFilter === "good") data = data.filter(c => qualityMap[c.id] === "good");
    else if (qualityFilter === "bad") data = data.filter(c => qualityMap[c.id] === "bad");
    else if (qualityFilter === "unmarked") data = data.filter(c => !qualityMap[c.id]);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c =>
        c.contact_name.toLowerCase().includes(q) ||
        c.contact_phone?.includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.campaign_name?.toLowerCase().includes(q) ||
        c.gclid?.includes(q) ||
        c.fbclid?.includes(q)
      );
    }
    return data;
  }, [statusFilter, platformFilter, qualityFilter, search, qualityMap]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "value") arr.sort((a, b) => b.value - a.value);
    else if (sortBy === "match") arr.sort((a, b) => b.match_quality_score - a.match_quality_score);
    else arr.sort((a, b) => new Date(b.converted_at).getTime() - new Date(a.converted_at).getTime());
    return arr;
  }, [filtered, sortBy]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalConversions = filtered.length;
  const totalRevenue = filtered.filter(c => c.status === "confirmado").reduce((s, c) => s + c.value, 0);
  const withClickId = filtered.filter(c => c.gclid || c.fbclid || c.fbc || c.wbraid).length;
  const pixelMatched = filtered.filter(c => c.pixel_matched).length;
  const avgMatchScore = filtered.length > 0
    ? (filtered.reduce((s, c) => s + c.match_quality_score, 0) / filtered.length).toFixed(1)
    : "0";
  const markedGood = filtered.filter(c => qualityMap[c.id] === "good").length;
  const markedBad = filtered.filter(c => qualityMap[c.id] === "bad").length;
  const sentToAds = filtered.filter(c => c.sent_to_ads).length;

  // By ad platform
  const byAdPlatform = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number; sent: number; good: number; bad: number; unmarked: number; avgMatch: number; withClickId: number }>();
    filtered.forEach(c => {
      if (!c.ad_platform) return;
      const entry = map.get(c.ad_platform) || { count: 0, revenue: 0, sent: 0, good: 0, bad: 0, unmarked: 0, avgMatch: 0, withClickId: 0 };
      entry.count++;
      if (c.status === "confirmado") entry.revenue += c.value;
      if (c.sent_to_ads) entry.sent++;
      if (c.gclid || c.fbclid || c.fbc || c.wbraid) entry.withClickId++;
      entry.avgMatch += c.match_quality_score;
      const q = qualityMap[c.id];
      if (q === "good") entry.good++;
      else if (q === "bad") entry.bad++;
      else entry.unmarked++;
      map.set(c.ad_platform, entry);
    });
    return Array.from(map.entries()).map(([platform, v]) => ({
      platform,
      ...v,
      avgMatch: v.count > 0 ? v.avgMatch / v.count : 0,
    }));
  }, [filtered, qualityMap]);

  // By campaign
  const byCampaign = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number; platform: string; good: number; bad: number }>();
    filtered.forEach(c => {
      if (!c.campaign_name || !c.ad_platform) return;
      const key = `${c.ad_platform}|${c.campaign_name}`;
      const entry = map.get(key) || { count: 0, revenue: 0, platform: c.ad_platform, good: 0, bad: 0 };
      entry.count++;
      if (c.status === "confirmado") entry.revenue += c.value;
      if (qualityMap[c.id] === "good") entry.good++;
      if (qualityMap[c.id] === "bad") entry.bad++;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([key, v]) => ({ campaign: key.split("|")[1], ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered, qualityMap]);

  const exportData = useCallback((fmt: "csv" | "json", platformOnly?: string) => {
    let dataToExport = sorted;
    if (platformOnly) dataToExport = sorted.filter(c => c.ad_platform === platformOnly);

    if (fmt === "json") {
      const enriched = dataToExport.map(c => ({ ...c, quality: qualityMap[c.id] || "unmarked" }));
      const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `conversoes-offline${platformOnly ? `-${platformOnly.replace(" ", "-").toLowerCase()}` : ""}.json`; a.click();
    } else {
      const headers = [
        "ID", "Event ID", "Contato", "Sobrenome", "Telefone", "Email", "Cidade", "UF", "CEP",
        "Tipo", "Valor", "Moeda", "Data", "Canal", "Status", "Plataforma",
        "GCLID", "WBRAID", "FBCLID", "FBC", "FBP",
        "IP", "User Agent", "Pixel Match", "Session ID",
        "Campanha", "Conjunto", "Anúncio", "UTM Source", "UTM Medium", "UTM Campaign",
        "Qualidade", "Match Score", "Enviada", "Visitor ID",
      ];
      const rows = dataToExport.map(c => [
        c.id, c.event_id, c.contact_name, c.contact_lastname || "", c.contact_phone || "", c.contact_email || "",
        c.city, c.state || "", c.zip_code || "",
        c.conversion_type, c.value.toFixed(2), c.currency,
        format(new Date(c.converted_at), "dd/MM/yyyy HH:mm"),
        c.source_channel, c.status, c.ad_platform || "",
        c.gclid || "", c.wbraid || "", c.fbclid || "", c.fbc || "", c.fbp || "",
        c.ip_address || "", c.user_agent || "", c.pixel_matched ? "Sim" : "Não", c.pixel_session_id || "",
        c.campaign_name || "", c.adset_name || "", c.ad_name || "",
        c.utm_source || "", c.utm_medium || "", c.utm_campaign || "",
        qualityMap[c.id] || "não marcado", c.match_quality_score.toFixed(1),
        c.sent_to_ads ? "Sim" : "Não", c.visitor_id || "",
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `conversoes-offline${platformOnly ? `-${platformOnly.replace(" ", "-").toLowerCase()}` : ""}.csv`; a.click();
    }
    toast.success(`Exportado ${dataToExport.length} conversões`);
  }, [sorted, qualityMap]);

  const syncToAds = useCallback(async (platform: string) => {
    const toSync = sorted.filter(c =>
      c.ad_platform === platform && !c.sent_to_ads && qualityMap[c.id] === "good"
    );
    if (toSync.length === 0) {
      toast.warning(`Nenhuma conversão "boa" pendente de envio para ${platform}`);
      return;
    }
    setSyncing(platform);
    try {
      const fnName = platform === "Google Ads" ? "sync-google-ads" : "sync-meta-ads";
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          conversions: toSync.map(c => ({
            id: c.id, event_id: c.event_id,
            gclid: c.gclid, wbraid: c.wbraid, gbraid: c.gbraid,
            fbclid: c.fbclid, fbc: c.fbc, fbp: c.fbp,
            value: c.value, currency: c.currency,
            converted_at: c.converted_at,
            contact_name: c.contact_name, contact_lastname: c.contact_lastname,
            contact_email: c.contact_email, contact_phone: c.contact_phone,
            city: c.city, state: c.state, zip_code: c.zip_code,
            ip_address: c.ip_address, user_agent: c.user_agent,
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

  const markSelectedAs = useCallback((quality: "good" | "bad") => {
    setQualityMap(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => { next[id] = quality; });
      return next;
    });
    toast.success(`${selectedIds.size} conversões marcadas como "${quality === "good" ? "boa" : "ruim"}"`);
  }, [selectedIds]);

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-4 sm:space-y-5">
      <FeatureBanner
        icon={PhoneCall}
        title="Conversões Offline"
        description={<>Gerencie <strong>conversões offline</strong> (ligações, WhatsApp, e-mails) e envie de volta para Google Ads e Meta Ads. Avalie a qualidade de cada lead, vincule com sessões do Pixel e sincronize com plataformas de anúncios para otimizar campanhas.</>}
      />
      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <div className="flex-1 min-w-[180px] max-w-[280px] space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar contato, campanha, gclid, fbclid..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Plataforma</label>
            <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[145px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Qualidade</label>
            <Select value={qualityFilter} onValueChange={(v) => { setQualityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
                <SelectItem value="match">Match Quality</SelectItem>
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
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV Completo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("csv", "Google Ads")} className="text-xs gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV Google Ads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("csv", "Meta Ads")} className="text-xs gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV Meta Ads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("json")} className="text-xs gap-2">
                <FileJson className="h-3.5 w-3.5" /> JSON Completo
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
              <ThumbsUp className="h-3 w-3" /> Boa
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => markSelectedAs("bad")}>
              <ThumbsDown className="h-3 w-3" /> Ruim
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setSelectedIds(new Set())}>
              Limpar
            </Button>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total", value: totalConversions, icon: PhoneCall },
          { label: "Receita", value: `R$${totalRevenue.toFixed(0)}`, icon: DollarSign },
          { label: "Com Click ID", value: withClickId, icon: Tag },
          { label: "Pixel Match", value: pixelMatched, icon: Fingerprint },
          { label: "Match Score Médio", value: avgMatchScore, icon: Gauge },
          { label: "Boas ✅", value: markedGood, icon: ThumbsUp },
          { label: "Ruins ❌", value: markedBad, icon: ThumbsDown },
          { label: "Enviadas", value: sentToAds, icon: Send },
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

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* By Campaign */}
        <AnimatedContainer className="lg:col-span-2">
          <Card className="p-5">
            <ChartHeader title="Conversões por Campanha" subtitle="Quais campanhas estão gerando conversões offline" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCampaign} layout="vertical">
                  <defs><BarGradient id="campGrad" color="hsl(var(--primary))" /></defs>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="campaign" type="category" {...AXIS_STYLE} width={140} tick={{ fontSize: 8 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [v, name === "count" ? "Conversões" : name]} />
                  <Bar dataKey="count" fill="url(#campGrad)" radius={[0, 4, 4, 0]} name="Conversões" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        {/* Signal Quality Funnel */}
        <AnimatedContainer delay={0.04}>
          <Card className="p-5">
            <ChartHeader title="Qualidade dos Sinais" subtitle="Quais dados estão presentes para match" />
            <div className="space-y-2">
              {[
                { label: "Com Telefone", value: filtered.filter(c => c.contact_phone).length, color: "hsl(var(--success))" },
                { label: "Com Email", value: filtered.filter(c => c.contact_email).length, color: "hsl(var(--info))" },
                { label: "Com Click ID", value: withClickId, color: "hsl(var(--chart-3))" },
                { label: "Com IP", value: filtered.filter(c => c.ip_address).length, color: "hsl(var(--chart-4))" },
                { label: "Com User Agent", value: filtered.filter(c => c.user_agent).length, color: "hsl(var(--chart-5))" },
                { label: "Pixel Match", value: pixelMatched, color: "hsl(var(--primary))" },
              ].map((step, i) => (
                <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={totalConversions} color={step.color} index={i} />
              ))}
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Credentials Config */}
      <AdsPlatformCredentials />

      {/* Platform Sync Cards */}
      {byAdPlatform.length > 0 && (
        <AnimatedContainer delay={0.08}>
          <Card className="p-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <Upload className="h-4 w-4 text-primary" />
              Sincronizar com Plataformas de Ads
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {byAdPlatform.map(p => (
                <Card key={p.platform} className="p-4 bg-muted/20 border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={`text-xs font-semibold ${p.platform === "Google Ads" ? "border-chart-3/40 text-chart-3" : "border-chart-4/40 text-chart-4"}`}>
                      <Megaphone className="h-3 w-3 mr-1" /> {p.platform}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{p.count} conversões</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 mb-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-foreground">{p.good}</p>
                      <p className="text-[8px] text-success">Boas</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{p.bad}</p>
                      <p className="text-[8px] text-destructive">Ruins</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{p.withClickId}</p>
                      <p className="text-[8px] text-muted-foreground">Click ID</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{p.avgMatch.toFixed(1)}</p>
                      <p className="text-[8px] text-muted-foreground">Match</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] mb-3">
                    <span className="text-muted-foreground">Receita: <strong className="text-foreground">R$ {p.revenue.toFixed(0)}</strong></span>
                    <span className="text-muted-foreground"><Send className="h-3 w-3 inline mr-0.5" /> {p.sent} já enviadas</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm" className="flex-1 h-8 text-xs gap-1.5"
                      disabled={syncing !== null || p.good === 0}
                      onClick={() => syncToAds(p.platform)}
                    >
                      {syncing === p.platform ? (
                        <><RefreshCw className="h-3 w-3 animate-spin" /> Enviando...</>
                      ) : (
                        <><Upload className="h-3 w-3" /> Enviar {p.good} boas</>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => exportData("csv", p.platform)}>
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
      <AnimatedContainer delay={0.1}>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              Conversões Offline — Clique para expandir detalhes
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
                  {["", "Qualidade", "Contato", "Campanha", "Valor", "Plataforma", "Click ID", "Match", "Enviada", "Data"].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {paged.map((conv, i) => {
                    const statusInfo = STATUS_STYLE[conv.status] || STATUS_STYLE.pendente;
                    const StatusIcon = statusInfo.icon;
                    const quality = qualityMap[conv.id];
                    const isSelected = selectedIds.has(conv.id);
                    const isExpanded = expandedId === conv.id;
                    return (
                      <React.Fragment key={conv.id}>
                        <tr
                          className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : i % 2 === 0 ? "bg-muted/10" : ""}`}
                          onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                        >
                          <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(conv.id)} className="rounded border-muted-foreground/30" />
                          </td>
                          <td className="px-2 py-2">
                            {isExpanded ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                          </td>
                          <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleQuality(conv.id, "good")}
                                className={`p-1 rounded transition-colors ${quality === "good" ? "bg-success/20 text-success" : "text-muted-foreground/40 hover:text-success hover:bg-success/10"}`}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => toggleQuality(conv.id, "bad")}
                                className={`p-1 rounded transition-colors ${quality === "bad" ? "bg-destructive/20 text-destructive" : "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"}`}
                              >
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Badge className={`text-[8px] px-1 py-0 ${statusInfo.class}`}>
                                  <StatusIcon className="h-2 w-2" />
                                </Badge>
                                <p className="font-semibold text-foreground text-xs">{conv.contact_name}</p>
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                                {conv.contact_email && <span className="flex items-center gap-0.5"><Mail className="h-2 w-2" /> {conv.contact_email}</span>}
                                {conv.contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-2 w-2" /> {conv.contact_phone}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div>
                              <p className="text-foreground font-medium text-[10px] truncate max-w-[120px]" title={conv.campaign_name || ""}>
                                {conv.campaign_name || "—"}
                              </p>
                              {conv.adset_name && (
                                <p className="text-[9px] text-muted-foreground truncate max-w-[100px]">{conv.adset_name}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 font-semibold tabular-nums text-foreground">
                            {conv.value > 0 ? `R$ ${conv.value.toFixed(0)}` : "—"}
                          </td>
                          <td className="px-2 py-2">
                            {conv.ad_platform ? (
                              <Badge variant="outline" className={`text-[8px] gap-0.5 ${conv.ad_platform === "Google Ads" ? "border-chart-3/40 text-chart-3" : "border-chart-4/40 text-chart-4"}`}>
                                {conv.ad_platform === "Google Ads" ? "G" : "M"}
                              </Badge>
                            ) : <span className="text-[10px] text-muted-foreground/50">—</span>}
                          </td>
                          <td className="px-2 py-2">
                            {(conv.gclid || conv.fbclid || conv.fbc || conv.wbraid) ? (
                              <Badge variant="outline" className="text-[8px] gap-0.5 font-mono border-muted-foreground/30">
                                <Tag className="h-2 w-2" /> {conv.gclid ? "gclid" : conv.wbraid ? "wbraid" : conv.fbc ? "fbc" : "fbclid"}
                              </Badge>
                            ) : <span className="text-[10px] text-muted-foreground/50">—</span>}
                          </td>
                          <td className="px-2 py-2">
                            <MatchQualityBadge score={conv.match_quality_score} />
                          </td>
                          <td className="px-2 py-2">
                            {conv.sent_to_ads ? (
                              <Badge className="text-[8px] gap-0.5 bg-success/15 text-success border-success/30">
                                <Send className="h-2 w-2" /> Sim
                              </Badge>
                            ) : conv.ad_platform ? (
                              <Badge variant="outline" className="text-[8px] border-warning/40 text-warning">Pend.</Badge>
                            ) : <span className="text-[9px] text-muted-foreground/50">N/A</span>}
                          </td>
                          <td className="px-2 py-2 text-muted-foreground whitespace-nowrap text-[10px]">
                            {format(new Date(conv.converted_at), "dd/MM · HH:mm")}
                          </td>
                        </tr>
                        {isExpanded && <ConversionDetail conv={conv} />}
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
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
