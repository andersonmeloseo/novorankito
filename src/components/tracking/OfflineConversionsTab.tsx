import React, { useState, useMemo, useCallback } from "react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Search, Phone, Mail, DollarSign, Plus,
  Download, FileJson, FileSpreadsheet, PhoneCall,
  ChevronLeft, ChevronRight,
  ThumbsUp, ThumbsDown, Upload, Shield, Globe, Fingerprint, MousePointer,
} from "lucide-react";
import { format } from "date-fns";
import {
  CHART_TOOLTIP_STYLE, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE,
  FunnelStep,
} from "@/components/analytics/ChartPrimitives";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdsPlatformCredentials } from "./AdsPlatformCredentials";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  gclid: string | null;
  fbclid: string | null;
  wbraid: string | null;
  gbraid: string | null;
  fbc: string | null;
  fbp: string | null;
  visitor_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  transaction_id: string | null;
  currency: string | null;
  quality: string | null;
  country_code: string | null;
  state: string | null;
  city: string | null;
  zip_code: string | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "lead", label: "Leads" },
  { value: "sale", label: "Vendas" },
  { value: "call", label: "Ligações" },
];

const TYPE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "sale", label: "Venda" },
  { value: "call", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "form", label: "Formulário" },
  { value: "purchase", label: "Compra" },
];

const QUALITY_OPTIONS = [
  { value: "good", label: "Lead Bom", icon: ThumbsUp, color: "text-success" },
  { value: "bad", label: "Lead Ruim", icon: ThumbsDown, color: "text-destructive" },
];

const PAGE_SIZE = 12;

// ── Registration Form ──
function NewConversionDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    event_type: "lead",
    lead_name: "",
    lead_phone: "",
    lead_email: "",
    value: "",
    source: "",
    medium: "",
    campaign: "",
    location: "",
    quality: "",
    gclid: "",
    fbclid: "",
    wbraid: "",
    gbraid: "",
    fbc: "",
    fbp: "",
    visitor_id: "",
    ip_address: "",
    user_agent: "",
    transaction_id: "",
    currency: "BRL",
    country_code: "",
    state: "",
    city: "",
    zip_code: "",
  });

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.lead_name && !form.lead_phone && !form.lead_email) {
      toast.error("Preencha pelo menos um campo de contato (nome, telefone ou e-mail).");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login para cadastrar conversões."); setSaving(false); return; }

      const { error } = await supabase.from("conversions").insert({
        project_id: projectId,
        owner_id: user.id,
        event_type: form.event_type,
        lead_name: form.lead_name || null,
        lead_phone: form.lead_phone || null,
        lead_email: form.lead_email || null,
        value: form.value ? parseFloat(form.value) : null,
        source: form.source || null,
        medium: form.medium || null,
        campaign: form.campaign || null,
        location: form.location || null,
        gclid: form.gclid || null,
        fbclid: form.fbclid || null,
        wbraid: form.wbraid || null,
        gbraid: form.gbraid || null,
        fbc: form.fbc || null,
        fbp: form.fbp || null,
        visitor_id: form.visitor_id || null,
        ip_address: form.ip_address || null,
        user_agent: form.user_agent || null,
        transaction_id: form.transaction_id || null,
        currency: form.currency || "BRL",
        quality: form.quality || null,
        country_code: form.country_code || null,
        state: form.state || null,
        city: form.city || null,
        zip_code: form.zip_code || null,
        goal_project_id: null,
      } as any);
      if (error) throw error;
      toast.success("Conversão registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["offline-conversions", projectId] });
      onOpenChange(false);
      setForm({
        event_type: "lead", lead_name: "", lead_phone: "", lead_email: "", value: "",
        source: "", medium: "", campaign: "", location: "", quality: "",
        gclid: "", fbclid: "", wbraid: "", gbraid: "", fbc: "", fbp: "",
        visitor_id: "", ip_address: "", user_agent: "", transaction_id: "",
        currency: "BRL", country_code: "", state: "", city: "", zip_code: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar conversão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar Conversão Offline</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="grid grid-cols-4 w-full h-8">
            <TabsTrigger value="contact" className="text-[10px]">Contato</TabsTrigger>
            <TabsTrigger value="attribution" className="text-[10px]">Atribuição</TabsTrigger>
            <TabsTrigger value="click-ids" className="text-[10px]">Click IDs</TabsTrigger>
            <TabsTrigger value="enrichment" className="text-[10px]">Enriquecimento</TabsTrigger>
          </TabsList>

          {/* Tab 1: Contact Info */}
          <TabsContent value="contact" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo *</Label>
                <Select value={form.event_type} onValueChange={v => update("event_type", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor</Label>
                <div className="flex gap-2">
                  <Select value={form.currency} onValueChange={v => update("currency", v)}>
                    <SelectTrigger className="h-9 text-xs w-[80px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL" className="text-xs">BRL</SelectItem>
                      <SelectItem value="USD" className="text-xs">USD</SelectItem>
                      <SelectItem value="EUR" className="text-xs">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.value} onChange={e => update("value", e.target.value)} className="h-9 text-xs flex-1" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Contato</Label>
              <Input placeholder="João Silva" value={form.lead_name} onChange={e => update("lead_name", e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input placeholder="+55 11 99999-0000" value={form.lead_phone} onChange={e => update("lead_phone", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" value={form.lead_email} onChange={e => update("lead_email", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ID da Transação</Label>
              <Input placeholder="order_12345 (deduplicação)" value={form.transaction_id} onChange={e => update("transaction_id", e.target.value)} className="h-9 text-xs" />
              <p className="text-[9px] text-muted-foreground">Usado para evitar contagem duplicada no Google/Meta.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Qualidade do Lead</Label>
              <div className="flex gap-2">
                {QUALITY_OPTIONS.map(q => (
                  <Button key={q.value} type="button" size="sm" variant={form.quality === q.value ? "default" : "outline"} className="h-8 text-xs gap-1.5" onClick={() => update("quality", form.quality === q.value ? "" : q.value)}>
                    <q.icon className={`h-3.5 w-3.5 ${form.quality === q.value ? "" : q.color}`} /> {q.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Attribution */}
          <TabsContent value="attribution" className="space-y-3 mt-3">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> UTM e Origem</p>
              <p className="text-[10px] text-muted-foreground">Dados de atribuição de campanha. Preenchidos automaticamente pelo Pixel quando possível.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Origem (source)</Label>
                <Input placeholder="google, facebook..." value={form.source} onChange={e => update("source", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mídia (medium)</Label>
                <Input placeholder="cpc, cpm, organic..." value={form.medium} onChange={e => update("medium", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Campanha</Label>
                <Input placeholder="campanha-verao" value={form.campaign} onChange={e => update("campaign", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Visitor ID (Pixel Rankito)</Label>
              <Input placeholder="rkto_abc123..." value={form.visitor_id} onChange={e => update("visitor_id", e.target.value)} className="h-9 text-xs" />
              <p className="text-[9px] text-muted-foreground">Vincula a sessão do visitante no Pixel com esta conversão.</p>
            </div>
          </TabsContent>

          {/* Tab 3: Click IDs */}
          <TabsContent value="click-ids" className="space-y-3 mt-3">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><MousePointer className="h-3.5 w-3.5" /> Identificadores de Clique</p>
              <p className="text-[10px] text-muted-foreground">Esses IDs são essenciais para que Google Ads e Meta atribuam corretamente as conversões aos cliques nos anúncios.</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Google Ads</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">GCLID <Badge variant="outline" className="text-[8px] ml-1">Crítico</Badge></Label>
                    <Input placeholder="CjwKCAjw..." value={form.gclid} onChange={e => update("gclid", e.target.value)} className="h-9 text-xs" />
                    <p className="text-[9px] text-muted-foreground">Google Click ID — principal sinal de atribuição para Enhanced Conversions.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">WBRAID</Label>
                      <Input placeholder="wbraid value" value={form.wbraid} onChange={e => update("wbraid", e.target.value)} className="h-9 text-xs" />
                      <p className="text-[9px] text-muted-foreground">iOS web-to-app attribution.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">GBRAID</Label>
                      <Input placeholder="gbraid value" value={form.gbraid} onChange={e => update("gbraid", e.target.value)} className="h-9 text-xs" />
                      <p className="text-[9px] text-muted-foreground">iOS app-to-web attribution.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Meta Ads (Facebook/Instagram)</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">FBCLID <Badge variant="outline" className="text-[8px] ml-1">Crítico</Badge></Label>
                    <Input placeholder="IwAR3..." value={form.fbclid} onChange={e => update("fbclid", e.target.value)} className="h-9 text-xs" />
                    <p className="text-[9px] text-muted-foreground">Facebook Click ID — sinal primário de atribuição da CAPI.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">FBC (Cookie _fbc)</Label>
                      <Input placeholder="fb.1.1234..." value={form.fbc} onChange={e => update("fbc", e.target.value)} className="h-9 text-xs" />
                      <p className="text-[9px] text-muted-foreground">Cookie first-party do Facebook Browser.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">FBP (Cookie _fbp)</Label>
                      <Input placeholder="fb.1.1234..." value={form.fbp} onChange={e => update("fbp", e.target.value)} className="h-9 text-xs" />
                      <p className="text-[9px] text-muted-foreground">Facebook Browser ID (identificação cross-session).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Enrichment */}
          <TabsContent value="enrichment" className="space-y-3 mt-3">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Dados de Enriquecimento</p>
              <p className="text-[10px] text-muted-foreground">IP e User Agent melhoram a taxa de match no Meta CAPI e Google Ads. Localização detalhada melhora a segmentação.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Endereço IP</Label>
                <Input placeholder="189.40.xx.xx" value={form.ip_address} onChange={e => update("ip_address", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">User Agent</Label>
                <Input placeholder="Mozilla/5.0..." value={form.user_agent} onChange={e => update("user_agent", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">País (ISO)</Label>
                <Input placeholder="BR" value={form.country_code} onChange={e => update("country_code", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Input placeholder="SP" value={form.state} onChange={e => update("state", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade</Label>
                <Input placeholder="São Paulo" value={form.city} onChange={e => update("city", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CEP</Label>
                <Input placeholder="01310-100" value={form.zip_code} onChange={e => update("zip_code", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Localização (legado)</Label>
              <Input placeholder="São Paulo, SP" value={form.location} onChange={e => update("location", e.target.value)} className="h-9 text-xs" />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs gap-1.5">
            {saving ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <Plus className="h-3.5 w-3.5" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Match Quality Score (Enhanced) ──
function MatchQualityScore({ conversion }: { conversion: OfflineConversion }) {
  const signals: { key: string; label: string; weight: number; present: boolean; platform: string }[] = [
    { key: "lead_email", label: "Email", weight: 2, present: !!conversion.lead_email, platform: "both" },
    { key: "lead_phone", label: "Telefone", weight: 2, present: !!conversion.lead_phone, platform: "both" },
    { key: "lead_name", label: "Nome", weight: 1, present: !!conversion.lead_name, platform: "both" },
    { key: "gclid", label: "GCLID", weight: 3, present: !!conversion.gclid, platform: "google" },
    { key: "fbclid", label: "FBCLID", weight: 3, present: !!conversion.fbclid, platform: "meta" },
    { key: "ip_address", label: "IP", weight: 1, present: !!conversion.ip_address, platform: "meta" },
    { key: "user_agent", label: "UA", weight: 1, present: !!conversion.user_agent, platform: "meta" },
    { key: "fbc", label: "FBC", weight: 1, present: !!conversion.fbc, platform: "meta" },
    { key: "fbp", label: "FBP", weight: 1, present: !!conversion.fbp, platform: "meta" },
    { key: "visitor_id", label: "Visitor", weight: 1, present: !!conversion.visitor_id, platform: "both" },
  ];

  const googleSignals = signals.filter(s => s.platform === "both" || s.platform === "google");
  const metaSignals = signals.filter(s => s.platform === "both" || s.platform === "meta");

  const googleScore = Math.min(10, Math.round((googleSignals.filter(s => s.present).reduce((a, s) => a + s.weight, 0) / googleSignals.reduce((a, s) => a + s.weight, 0)) * 10));
  const metaScore = Math.min(10, Math.round((metaSignals.filter(s => s.present).reduce((a, s) => a + s.weight, 0) / metaSignals.reduce((a, s) => a + s.weight, 0)) * 10));
  const avgScore = Math.round((googleScore + metaScore) / 2);

  const color = avgScore >= 7 ? "text-success" : avgScore >= 4 ? "text-warning" : "text-destructive";

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-bold text-xs ${color}`}>{avgScore}/10</span>
      <div className="flex gap-1">
        <Badge variant="outline" className={`text-[7px] px-1 py-0 ${googleScore >= 7 ? "border-success/40 text-success" : googleScore >= 4 ? "border-warning/40 text-warning" : "border-destructive/40 text-destructive"}`}>G:{googleScore}</Badge>
        <Badge variant="outline" className={`text-[7px] px-1 py-0 ${metaScore >= 7 ? "border-success/40 text-success" : metaScore >= 4 ? "border-warning/40 text-warning" : "border-destructive/40 text-destructive"}`}>M:{metaScore}</Badge>
      </div>
    </div>
  );
}

// ── Signals Detail Row ──
function SignalBadges({ conversion }: { conversion: OfflineConversion }) {
  const signals = [
    { key: "gclid", label: "GCLID", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { key: "fbclid", label: "FBCLID", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { key: "wbraid", label: "WBRAID", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { key: "fbc", label: "FBC", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { key: "fbp", label: "FBP", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { key: "ip_address", label: "IP", color: "bg-green-500/10 text-green-400 border-green-500/20" },
    { key: "user_agent", label: "UA", color: "bg-green-500/10 text-green-400 border-green-500/20" },
    { key: "visitor_id", label: "VID", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  ];
  const present = signals.filter(s => (conversion as any)[s.key]);
  if (present.length === 0) return <span className="text-[9px] text-muted-foreground/50">nenhum sinal</span>;
  return (
    <div className="flex flex-wrap gap-0.5">
      {present.map(s => (
        <span key={s.key} className={`text-[7px] px-1 py-0 rounded border ${s.color}`}>{s.label}</span>
      ))}
    </div>
  );
}

// ── Main Component ──
export function OfflineConversionsTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const [showNewDialog, setShowNewDialog] = useState(false);

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
  const [sortBy, setSortBy] = useState<"recent" | "value" | "quality">("recent");
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
        c.campaign?.toLowerCase().includes(q) ||
        c.gclid?.toLowerCase().includes(q) ||
        c.fbclid?.toLowerCase().includes(q) ||
        c.ip_address?.includes(q)
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
  const withGclid = filtered.filter(c => c.gclid).length;
  const withFbclid = filtered.filter(c => c.fbclid).length;
  const withIp = filtered.filter(c => c.ip_address).length;
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

  // Funnel
  const funnelData = useMemo(() => {
    const leads = conversions.filter(c => c.event_type === "lead").length;
    const calls = conversions.filter(c => ["call", "whatsapp"].includes(c.event_type)).length;
    const sales = conversions.filter(c => ["sale", "purchase"].includes(c.event_type)).length;
    return [
      { label: "Leads Capturados", value: leads || 0 },
      { label: "Contatos Realizados", value: calls || 0 },
      { label: "Vendas Fechadas", value: sales || 0 },
    ];
  }, [conversions]);

  const exportData = useCallback((fmt: "csv" | "json") => {
    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "conversoes-offline.json"; a.click();
    } else {
      const headers = [
        "ID", "Tipo", "Contato", "Telefone", "Email", "Valor", "Moeda", "Data",
        "Campanha", "Origem", "Mídia", "Localização",
        "GCLID", "FBCLID", "WBRAID", "GBRAID", "FBC", "FBP",
        "Visitor_ID", "IP", "User_Agent", "Transaction_ID",
        "País", "Estado", "Cidade", "CEP", "Qualidade",
      ];
      const rows = sorted.map(c => [
        c.id, c.event_type, c.lead_name || "", c.lead_phone || "", c.lead_email || "",
        (c.value || 0).toFixed(2), c.currency || "BRL",
        format(new Date(c.converted_at), "dd/MM/yyyy HH:mm"),
        c.campaign || "", c.source || "", c.medium || "", c.location || "",
        c.gclid || "", c.fbclid || "", c.wbraid || "", c.gbraid || "", c.fbc || "", c.fbp || "",
        c.visitor_id || "", c.ip_address || "", c.user_agent || "", c.transaction_id || "",
        c.country_code || "", c.state || "", c.city || "", c.zip_code || "", c.quality || "",
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
        <FeatureBanner icon={PhoneCall} title="Conversões Offline" description={<>Gerencie <strong>conversões offline</strong> (ligações, WhatsApp, e-mails).</>} />
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
        description={<>Gerencie <strong>conversões offline</strong> com todos os sinais de atribuição para <strong>Google Ads Enhanced Conversions</strong> e <strong>Meta CAPI</strong>. Capture GCLID, FBCLID, IP, User Agent, cookies e mais para maximizar a taxa de match.</>}
      />

      {projectId && <NewConversionDialog open={showNewDialog} onOpenChange={setShowNewDialog} projectId={projectId} />}

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewDialog(true)}>
          <Plus className="h-3.5 w-3.5" /> Registrar Conversão
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" /> Importar CSV
          </Button>
          {conversions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportData("csv")} className="text-xs gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV (Google Ads/Meta)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData("json")} className="text-xs gap-2">
                  <FileJson className="h-3.5 w-3.5" /> JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: totalConversions, icon: PhoneCall },
          { label: "Receita", value: `R$${totalRevenue.toFixed(0)}`, icon: DollarSign },
          { label: "Com GCLID", value: withGclid, icon: MousePointer },
          { label: "Com FBCLID", value: withFbclid, icon: Fingerprint },
          { label: "Com IP", value: withIp, icon: Globe },
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

      {/* Conversion Funnel */}
      <AnimatedContainer delay={0.02}>
        <Card className="p-5">
          <ChartHeader title="Funil de Conversão Offline" subtitle="Jornada do lead até a venda" />
          <div className="flex flex-col gap-2 mt-3">
            {funnelData.map((step, i) => (
              <FunnelStep
                key={step.label}
                label={step.label}
                value={step.value}
                maxValue={Math.max(...funnelData.map(f => f.value), 1)}
                color={i === 0 ? "hsl(var(--primary))" : i === 1 ? "hsl(var(--warning))" : "hsl(var(--success))"}
                index={i}
              />
            ))}
          </div>
        </Card>
      </AnimatedContainer>

      {/* Chart */}
      {byCampaign.length > 0 && (
        <AnimatedContainer delay={0.04}>
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

      {/* Filters */}
      {conversions.length > 0 && (
        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            <div className="flex-1 min-w-[180px] max-w-[280px] space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nome, GCLID, FBCLID, IP..."
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
          </div>
        </Card>
      )}

      {/* Table */}
      {conversions.length > 0 ? (
        <AnimatedContainer delay={0.08}>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left p-3 font-semibold text-muted-foreground">Contato</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Tipo</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Valor</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Match Score</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Sinais</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Data</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Campanha</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">IP</th>
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
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="text-[9px] w-fit">{conv.event_type}</Badge>
                          {conv.quality && (
                            <Badge variant={conv.quality === "good" ? "default" : "destructive"} className="text-[8px] w-fit">
                              {conv.quality === "good" ? "Bom" : "Ruim"}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {conv.value ? `${conv.currency || "R$"} ${conv.value.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-3"><MatchQualityScore conversion={conv} /></td>
                      <td className="p-3 max-w-[180px]"><SignalBadges conversion={conv} /></td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(conv.converted_at), "dd/MM HH:mm")}
                      </td>
                      <td className="p-3 text-muted-foreground truncate max-w-[120px]" title={conv.campaign || ""}>{conv.campaign || "—"}</td>
                      <td className="p-3 text-muted-foreground text-[10px] font-mono">{conv.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </AnimatedContainer>
      ) : (
        <AnimatedContainer delay={0.08}>
          <Card className="p-8 text-center">
            <PhoneCall className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-foreground mb-1">Nenhuma conversão registrada ainda</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
              Clique em "Registrar Conversão" para adicionar manualmente ou importe um CSV com seus leads e vendas. Inclua GCLID/FBCLID para maximizar a atribuição.
            </p>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar Primeira Conversão
            </Button>
          </Card>
        </AnimatedContainer>
      )}

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
    </div>
  );
}
