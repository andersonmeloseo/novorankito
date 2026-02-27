import React, { useState, useMemo, useCallback } from "react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaggeredGrid, AnimatedContainer } from "@/components/ui/animated-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Search, Phone, Mail, DollarSign, Plus,
  Download, FileJson, FileSpreadsheet, PhoneCall,
  ChevronLeft, ChevronRight,
  ThumbsUp, ThumbsDown, Upload, Shield, Globe, Fingerprint, MousePointer,
  Megaphone, FolderOpen, ArrowLeft, Trash2, BarChart3, Target,
  Star, Clock, Hash, Zap, PenLine, Radio, Link2,
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdsPlatformCredentials } from "./AdsPlatformCredentials";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface OfflineCampaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  description: string | null;
  conversion_action_name: string | null;
  default_value: number;
  default_currency: string;
  total_conversions: number;
  total_value: number;
  created_at: string;
  utm_campaign_match: string[];
}

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
  offline_campaign_id: string | null;
  lead_status: string | null;
  conversion_action_name: string | null;
  capture_method: string;
}

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "Novo", color: "bg-muted text-muted-foreground" },
  { value: "qualified", label: "Qualificado", color: "bg-primary/10 text-primary" },
  { value: "contacted", label: "Contatado", color: "bg-warning/10 text-warning" },
  { value: "proposal", label: "Proposta", color: "bg-chart-3/10 text-chart-3" },
  { value: "won", label: "Venda Fechada", color: "bg-success/10 text-success" },
  { value: "lost", label: "Perdido", color: "bg-destructive/10 text-destructive" },
];

const QUALITY_OPTIONS = [
  { value: "hot", label: "Quente", icon: Star, color: "text-warning" },
  { value: "good", label: "Bom", icon: ThumbsUp, color: "text-success" },
  { value: "bad", label: "Ruim", icon: ThumbsDown, color: "text-destructive" },
];

const TYPE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "sale", label: "Venda" },
  { value: "call", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "form", label: "Formulário" },
  { value: "purchase", label: "Compra" },
];

const PAGE_SIZE = 15;

// ═══════════════════════════════════════════════════
// CREATE CAMPAIGN DIALOG
// ═══════════════════════════════════════════════════

function CreateCampaignDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    platform: "google",
    conversion_action_name: "",
    description: "",
    default_value: "",
    default_currency: "BRL",
    utm_campaign_match: "",
  });
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome da campanha é obrigatório."); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login."); return; }
      const utmMatches = form.utm_campaign_match.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      const { error } = await supabase.from("offline_campaigns").insert({
        project_id: projectId,
        owner_id: user.id,
        name: form.name.trim(),
        platform: form.platform,
        conversion_action_name: form.conversion_action_name.trim() || form.name.trim(),
        description: form.description.trim() || null,
        default_value: form.default_value ? parseFloat(form.default_value) : 0,
        default_currency: form.default_currency,
        utm_campaign_match: utmMatches,
      } as any);
      if (error) throw error;
      toast.success("Campanha criada!");
      qc.invalidateQueries({ queryKey: ["offline-campaigns"] });
      onOpenChange(false);
      setForm({ name: "", platform: "google", conversion_action_name: "", description: "", default_value: "", default_currency: "BRL", utm_campaign_match: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Nova Campanha de Conversão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground">Dica:</strong> O "Nome da Ação" deve corresponder <strong>exatamente</strong> ao nome da conversão configurada no Google Ads (ex: "Lead Qualificado", "Venda Fechada").
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome da Campanha *</Label>
            <Input placeholder="Ex: Leads Google - Campanha Verão" value={form.name} onChange={e => up("name", e.target.value)} className="h-9 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome da Ação de Conversão (Google Ads) *</Label>
            <Input placeholder="Ex: Lead Qualificado" value={form.conversion_action_name} onChange={e => up("conversion_action_name", e.target.value)} className="h-9 text-xs" />
            <p className="text-[9px] text-muted-foreground">Deve ser idêntico ao configurado em Google Ads → Conversões → Ações.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Plataforma</Label>
              <Select value={form.platform} onValueChange={v => up("platform", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google" className="text-xs">Google Ads</SelectItem>
                  <SelectItem value="meta" className="text-xs">Meta Ads</SelectItem>
                  <SelectItem value="both" className="text-xs">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor Padrão</Label>
              <div className="flex gap-1.5">
                <Select value={form.default_currency} onValueChange={v => up("default_currency", v)}>
                  <SelectTrigger className="h-9 text-xs w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" step="0.01" placeholder="0.00" value={form.default_value} onChange={e => up("default_value", e.target.value)} className="h-9 text-xs flex-1" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Captura Automática — UTM Campaigns <Badge variant="outline" className="text-[7px] ml-1 border-chart-3/30 text-chart-3">Auto</Badge></Label>
            <Input placeholder="verao-2025, campanha-leads, black-friday" value={form.utm_campaign_match} onChange={e => up("utm_campaign_match", e.target.value)} className="h-9 text-xs" />
            <p className="text-[9px] text-muted-foreground">Separe com vírgula. Conversões com esses nomes de UTM Campaign serão vinculadas automaticamente a esta campanha.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input placeholder="Anotações sobre a campanha..." value={form.description} onChange={e => up("description", e.target.value)} className="h-9 text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs gap-1.5">
            {saving ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-foreground" /> : <Plus className="h-3.5 w-3.5" />}
            Criar Campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════
// REGISTER CONVERSION DIALOG
// ═══════════════════════════════════════════════════

function NewConversionDialog({ open, onOpenChange, projectId, campaignId, campaigns }: {
  open: boolean; onOpenChange: (v: boolean) => void; projectId: string;
  campaignId: string | null; campaigns: OfflineCampaign[];
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const selectedCampaign = campaigns.find(c => c.id === campaignId);

  const [form, setForm] = useState({
    offline_campaign_id: campaignId || "",
    event_type: "lead",
    lead_name: "", lead_phone: "", lead_email: "",
    value: selectedCampaign?.default_value?.toString() || "",
    currency: selectedCampaign?.default_currency || "BRL",
    gclid: "", source: "", medium: "", campaign: "",
    quality: "", lead_status: "new",
    ip_address: "", transaction_id: "",
    fbclid: "", fbc: "", fbp: "",
    city: "", state: "", zip_code: "", country_code: "",
  });
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.lead_name && !form.lead_phone && !form.lead_email) {
      toast.error("Preencha pelo menos um campo de contato.");
      return;
    }
    if (!form.gclid && !form.lead_email && !form.lead_phone) {
      toast.error("Para match no Google Ads, informe GCLID ou Email/Telefone.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login."); return; }

      const camp = campaigns.find(c => c.id === form.offline_campaign_id);

      const { error } = await supabase.from("conversions").insert({
        project_id: projectId,
        owner_id: user.id,
        event_type: form.event_type,
        lead_name: form.lead_name || null,
        lead_phone: form.lead_phone || null,
        lead_email: form.lead_email || null,
        value: form.value ? parseFloat(form.value) : null,
        currency: form.currency || "BRL",
        source: form.source || null,
        medium: form.medium || null,
        campaign: form.campaign || null,
        gclid: form.gclid || null,
        fbclid: form.fbclid || null,
        fbc: form.fbc || null,
        fbp: form.fbp || null,
        ip_address: form.ip_address || null,
        transaction_id: form.transaction_id || null,
        quality: form.quality || null,
        lead_status: form.lead_status || "new",
        offline_campaign_id: form.offline_campaign_id || null,
        conversion_action_name: camp?.conversion_action_name || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        country_code: form.country_code || null,
        goal_project_id: null,
        capture_method: "manual",
      } as any);
      if (error) throw error;
      toast.success("Conversão registrada!");
      qc.invalidateQueries({ queryKey: ["offline-conversions"] });
      qc.invalidateQueries({ queryKey: ["offline-campaigns"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
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
        <Tabs defaultValue="essentials" className="w-full">
          <TabsList className="grid grid-cols-3 w-full h-8">
            <TabsTrigger value="essentials" className="text-[10px]">Essencial</TabsTrigger>
            <TabsTrigger value="click-ids" className="text-[10px]">Click IDs</TabsTrigger>
            <TabsTrigger value="enrichment" className="text-[10px]">Enriquecimento</TabsTrigger>
          </TabsList>

          <TabsContent value="essentials" className="space-y-3 mt-3">
            {/* Campaign selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Campanha de Conversão</Label>
              <Select value={form.offline_campaign_id} onValueChange={v => {
                up("offline_campaign_id", v);
                const c = campaigns.find(x => x.id === v);
                if (c) { up("currency", c.default_currency); if (c.default_value) up("value", c.default_value.toString()); }
              }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[7px] px-1">{c.platform === "google" ? "G" : c.platform === "meta" ? "M" : "G+M"}</Badge>
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.event_type} onValueChange={v => up("event_type", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status do Lead</Label>
                <Select value={form.lead_status} onValueChange={v => up("lead_status", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor ({form.currency})</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.value} onChange={e => up("value", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Contato *</Label>
              <Input placeholder="João Silva" value={form.lead_name} onChange={e => up("lead_name", e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail * <Badge variant="outline" className="text-[7px] ml-1">Hash SHA-256</Badge></Label>
                <Input type="email" placeholder="email@exemplo.com" value={form.lead_email} onChange={e => up("lead_email", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone * <Badge variant="outline" className="text-[7px] ml-1">Hash SHA-256</Badge></Label>
                <Input placeholder="+5511999990000" value={form.lead_phone} onChange={e => up("lead_phone", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">* Email e Telefone são normalizados e criptografados (SHA-256) no envio para Google/Meta.</p>

            <div className="space-y-1.5">
              <Label className="text-xs">GCLID <Badge variant="outline" className="text-[7px] ml-1 border-primary/30 text-primary">Prioridade #1</Badge></Label>
              <Input placeholder="CjwKCAjw..." value={form.gclid} onChange={e => up("gclid", e.target.value)} className="h-9 text-xs font-mono" />
              <p className="text-[9px] text-muted-foreground">Google Click ID — capturado automaticamente da URL quando o visitante clica no anúncio.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ID da Transação</Label>
              <Input placeholder="order_12345" value={form.transaction_id} onChange={e => up("transaction_id", e.target.value)} className="h-9 text-xs" />
              <p className="text-[9px] text-muted-foreground">Previne contagem duplicada. Use o ID do pedido/contrato.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Qualidade do Lead</Label>
              <div className="flex gap-2">
                {QUALITY_OPTIONS.map(q => (
                  <Button key={q.value} type="button" size="sm" variant={form.quality === q.value ? "default" : "outline"} className="h-8 text-xs gap-1.5" onClick={() => up("quality", form.quality === q.value ? "" : q.value)}>
                    <q.icon className={`h-3.5 w-3.5 ${form.quality === q.value ? "" : q.color}`} /> {q.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="click-ids" className="space-y-3 mt-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] text-muted-foreground">
                <strong className="text-foreground">Como capturar:</strong> Os Click IDs aparecem na URL da landing page quando o visitante clica no anúncio. O Pixel Rankito captura automaticamente. Aqui você preenche manualmente quando necessário.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Origem (UTM Source)</Label>
                <Input placeholder="google" value={form.source} onChange={e => up("source", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mídia (UTM Medium)</Label>
                <Input placeholder="cpc" value={form.medium} onChange={e => up("medium", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Campanha UTM</Label>
                <Input placeholder="verao-2025" value={form.campaign} onChange={e => up("campaign", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-3">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Meta Ads</p>
              <div className="space-y-1.5">
                <Label className="text-xs">FBCLID</Label>
                <Input placeholder="IwAR3..." value={form.fbclid} onChange={e => up("fbclid", e.target.value)} className="h-9 text-xs font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">FBC (Cookie _fbc)</Label>
                  <Input placeholder="fb.1.1234..." value={form.fbc} onChange={e => up("fbc", e.target.value)} className="h-9 text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">FBP (Cookie _fbp)</Label>
                  <Input placeholder="fb.1.1234..." value={form.fbp} onChange={e => up("fbp", e.target.value)} className="h-9 text-xs font-mono" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="enrichment" className="space-y-3 mt-3">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[10px] text-muted-foreground">
                <strong className="text-foreground">Para que servem?</strong> IP e geolocalização melhoram a taxa de match nas plataformas. O Google recomenda enviar nas primeiras 24-48h após o clique.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Endereço IP</Label>
                <Input placeholder="189.40.xx.xx" value={form.ip_address} onChange={e => up("ip_address", e.target.value)} className="h-9 text-xs font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">País (ISO)</Label>
                <Input placeholder="BR" maxLength={2} value={form.country_code} onChange={e => up("country_code", e.target.value.toUpperCase())} className="h-9 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade</Label>
                <Input placeholder="São Paulo" value={form.city} onChange={e => up("city", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Input placeholder="SP" value={form.state} onChange={e => up("state", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CEP</Label>
                <Input placeholder="01310-100" value={form.zip_code} onChange={e => up("zip_code", e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs gap-1.5">
            {saving ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-foreground" /> : <Plus className="h-3.5 w-3.5" />}
            Registrar Conversão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════
// MATCH QUALITY SCORE
// ═══════════════════════════════════════════════════

function MatchScore({ conv }: { conv: OfflineConversion }) {
  let score = 0;
  if (conv.gclid) score += 4;
  if (conv.lead_email) score += 2;
  if (conv.lead_phone) score += 2;
  if (conv.lead_name) score += 1;
  if (conv.ip_address) score += 1;
  score = Math.min(score, 10);
  const color = score >= 8 ? "text-success" : score >= 5 ? "text-warning" : "text-destructive";
  return <span className={`font-bold text-xs ${color}`}>{score}/10</span>;
}

function CaptureMethodBadge({ conv }: { conv: OfflineConversion }) {
  const method = conv.capture_method || (conv.offline_campaign_id ? "manual" : "pixel");
  if (method === "pixel") return <Badge variant="outline" className="text-[7px] border-chart-3/30 text-chart-3 bg-chart-3/5 gap-0.5"><Zap className="h-2 w-2" />Pixel</Badge>;
  if (method === "api") return <Badge variant="outline" className="text-[7px] border-primary/30 text-primary bg-primary/5 gap-0.5"><Link2 className="h-2 w-2" />API</Badge>;
  if (method === "import") return <Badge variant="outline" className="text-[7px] border-warning/30 text-warning bg-warning/5 gap-0.5"><Upload className="h-2 w-2" />Import</Badge>;
  return <Badge variant="outline" className="text-[7px] border-muted-foreground/30 text-muted-foreground bg-muted/20 gap-0.5"><PenLine className="h-2 w-2" />Manual</Badge>;
}

function SignalBadges({ conv }: { conv: OfflineConversion }) {
  const items = [
    conv.gclid && { l: "GCLID", c: "border-primary/30 text-primary bg-primary/5" },
    conv.fbclid && { l: "FBCLID", c: "border-purple-500/30 text-purple-400 bg-purple-500/5" },
    conv.lead_email && { l: "Email", c: "border-success/30 text-success bg-success/5" },
    conv.lead_phone && { l: "Tel", c: "border-success/30 text-success bg-success/5" },
    conv.ip_address && { l: "IP", c: "border-muted-foreground/30 text-muted-foreground bg-muted/30" },
    conv.fbc && { l: "FBC", c: "border-purple-500/30 text-purple-400 bg-purple-500/5" },
  ].filter(Boolean) as { l: string; c: string }[];
  if (!items.length) return <span className="text-[9px] text-muted-foreground/40">—</span>;
  return (
    <div className="flex flex-wrap gap-0.5">
      {items.map(i => <span key={i.l} className={`text-[7px] px-1 py-0 rounded border ${i.c}`}>{i.l}</span>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// CAMPAIGN CARD
// ═══════════════════════════════════════════════════

function CampaignCard({ campaign, onClick }: { campaign: OfflineCampaign; onClick: () => void }) {
  const platformBadge = campaign.platform === "google"
    ? { label: "Google Ads", className: "border-primary/30 text-primary" }
    : campaign.platform === "meta"
    ? { label: "Meta Ads", className: "border-purple-500/30 text-purple-400" }
    : { label: "Google + Meta", className: "border-chart-3/30 text-chart-3" };

  return (
    <Card className="p-4 card-hover cursor-pointer group relative overflow-hidden" onClick={onClick}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground font-display">{campaign.name}</h4>
            {campaign.conversion_action_name && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Target className="h-2.5 w-2.5" /> Ação: {campaign.conversion_action_name}
              </p>
            )}
          </div>
          <Badge variant="outline" className={`text-[8px] ${platformBadge.className}`}>{platformBadge.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground font-display">{campaign.total_conversions}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Conversões</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground font-display">
              {campaign.default_currency} {(campaign.total_value || 0).toFixed(0)}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Receita</p>
          </div>
        </div>

        {campaign.utm_campaign_match?.length > 0 && (
          <p className="text-[10px] text-chart-3 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" /> Auto: {campaign.utm_campaign_match.join(", ")}
          </p>
        )}
        {campaign.description && <p className="text-[10px] text-muted-foreground truncate">{campaign.description}</p>}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// EXPORT UTILS
// ═══════════════════════════════════════════════════

function exportConversions(data: OfflineConversion[], fmt: "csv" | "json", campaignName?: string) {
  const filename = `conversoes-offline${campaignName ? `-${campaignName.replace(/\s+/g, "-").toLowerCase()}` : ""}`;
  if (fmt === "json") {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `${filename}.json` }).click();
  } else {
    const headers = [
      "Conversion Action", "Timestamp", "GCLID", "Email", "Phone", "Name",
      "Value", "Currency", "Transaction ID", "Lead Status", "Quality", "Capture Method",
      "FBCLID", "FBC", "FBP", "IP Address",
      "Source", "Medium", "Campaign",
      "City", "State", "Country", "ZIP",
    ];
    const rows = data.map(c => [
      c.conversion_action_name || "", format(new Date(c.converted_at), "yyyy-MM-dd HH:mm:ss"),
      c.gclid || "", c.lead_email || "", c.lead_phone || "", c.lead_name || "",
      (c.value || 0).toFixed(2), c.currency || "BRL", c.transaction_id || "",
      c.lead_status || "new", c.quality || "", c.capture_method || "manual",
      c.fbclid || "", c.fbc || "", c.fbp || "", c.ip_address || "",
      c.source || "", c.medium || "", c.campaign || "",
      c.city || "", c.state || "", c.country_code || "", c.zip_code || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${filename}.csv` }).click();
  }
  toast.success(`Exportado ${data.length} conversões em ${fmt.toUpperCase()}`);
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════

export function OfflineConversionsTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const qc = useQueryClient();

  // State
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showNewConversion, setShowNewConversion] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["offline-campaigns", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("offline_campaigns")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OfflineCampaign[];
    },
    enabled: !!projectId,
  });

  // Fetch conversions
  const { data: allConversions = [], isLoading: loadingConversions } = useQuery({
    queryKey: ["offline-conversions", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("conversions")
        .select("*")
        .eq("project_id", projectId)
        .order("converted_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as OfflineConversion[];
    },
    enabled: !!projectId,
  });

  // Derived
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  const campaignConversions = useMemo(() => {
    if (!selectedCampaignId) return allConversions;
    const camp = campaigns.find(c => c.id === selectedCampaignId);
    const utmMatches = camp?.utm_campaign_match?.map(s => s.toLowerCase()) || [];
    return allConversions.filter(c => {
      // Directly linked
      if (c.offline_campaign_id === selectedCampaignId) return true;
      // Auto-match by UTM campaign name
      if (utmMatches.length > 0 && c.campaign) {
        return utmMatches.some(utm => c.campaign!.toLowerCase().includes(utm));
      }
      return false;
    });
  }, [allConversions, selectedCampaignId, campaigns]);

  const filtered = useMemo(() => {
    let data = campaignConversions;
    if (statusFilter !== "all") data = data.filter(c => c.lead_status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c =>
        c.lead_name?.toLowerCase().includes(q) ||
        c.lead_phone?.includes(q) ||
        c.lead_email?.toLowerCase().includes(q) ||
        c.gclid?.toLowerCase().includes(q) ||
        c.ip_address?.includes(q)
      );
    }
    return data;
  }, [campaignConversions, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs for current view
  const totalConversions = filtered.length;
  const totalRevenue = filtered.reduce((s, c) => s + (c.value || 0), 0);
  const withGclid = filtered.filter(c => c.gclid).length;
  const autoCount = filtered.filter(c => (c.capture_method || "manual") !== "manual").length;
  const manualCount = filtered.filter(c => (c.capture_method || "manual") === "manual").length;
  const avgMatch = filtered.length ? Math.round(filtered.reduce((s, c) => {
    let sc = 0;
    if (c.gclid) sc += 4; if (c.lead_email) sc += 2; if (c.lead_phone) sc += 2; if (c.lead_name) sc += 1; if (c.ip_address) sc += 1;
    return s + Math.min(sc, 10);
  }, 0) / filtered.length * 10) / 10 : 0;

  // Funnel
  const funnelData = useMemo(() => {
    const byStatus = (s: string) => campaignConversions.filter(c => c.lead_status === s).length;
    return [
      { label: "Novos", value: byStatus("new") },
      { label: "Qualificados", value: byStatus("qualified") },
      { label: "Contatados", value: byStatus("contacted") },
      { label: "Proposta", value: byStatus("proposal") },
      { label: "Venda Fechada", value: byStatus("won") },
    ].filter(f => f.value > 0 || f.label === "Novos" || f.label === "Venda Fechada");
  }, [campaignConversions]);

  const isLoading = loadingCampaigns || loadingConversions;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeatureBanner icon={PhoneCall} title="Conversões Offline" description={<>Sistema de conversões offline para <strong>Google Ads</strong> e <strong>Meta Ads</strong>.</>} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  // ─── CAMPAIGN DETAIL VIEW ───
  if (selectedCampaignId && selectedCampaign) {
    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCampaignId(null); setPage(1); setSearch(""); setStatusFilter("all"); }} className="text-xs gap-1.5 h-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground font-display">{selectedCampaign.name}</h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Target className="h-2.5 w-2.5" /> Ação: {selectedCampaign.conversion_action_name || selectedCampaign.name}
              <span className="mx-1">•</span>
              <Badge variant="outline" className="text-[8px]">{selectedCampaign.platform === "google" ? "Google Ads" : selectedCampaign.platform === "meta" ? "Meta Ads" : "Google + Meta"}</Badge>
            </p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewConversion(true)}>
            <Plus className="h-3.5 w-3.5" /> Registrar Conversão
          </Button>
          {filtered.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5"><Download className="h-3.5 w-3.5" /> Exportar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportConversions(filtered, "csv", selectedCampaign.name)} className="text-xs gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV (Google Ads Format)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportConversions(filtered, "json", selectedCampaign.name)} className="text-xs gap-2">
                  <FileJson className="h-3.5 w-3.5" /> JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* KPIs */}
        <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Conversões", value: totalConversions, icon: Hash },
            { label: "Pixel / Auto", value: autoCount, icon: Zap },
            { label: "Manual", value: manualCount, icon: PenLine },
            { label: "Receita", value: `${selectedCampaign.default_currency} ${totalRevenue.toFixed(0)}`, icon: DollarSign },
            { label: "Match Médio", value: `${avgMatch}/10`, icon: Target },
          ].map((kpi, i) => (
            <Card key={i} className="p-3 card-hover group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex flex-col items-center text-center gap-1">
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl font-bold text-foreground font-display tracking-tight">{kpi.value}</span>
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
            </Card>
          ))}
        </StaggeredGrid>

        {/* Funnel */}
        {campaignConversions.length > 0 && (
          <AnimatedContainer delay={0.02}>
            <Card className="p-5">
              <ChartHeader title="Funil de Status do Lead" subtitle="Jornada do lead dentro desta campanha" />
              <div className="flex flex-col gap-2 mt-3">
                {funnelData.map((step, i) => (
                  <FunnelStep key={step.label} label={step.label} value={step.value}
                    maxValue={Math.max(...funnelData.map(f => f.value), 1)}
                    color={["hsl(var(--primary))", "hsl(var(--chart-3))", "hsl(var(--warning))", "hsl(var(--chart-4))", "hsl(var(--success))"][i] || "hsl(var(--muted))"}
                    index={i} />
                ))}
              </div>
            </Card>
          </AnimatedContainer>
        )}

        {/* Filters */}
        <Card className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px] max-w-[280px] space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Nome, email, GCLID, IP..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-8 h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {LEAD_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Table */}
        {filtered.length > 0 ? (
          <AnimatedContainer delay={0.04}>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left p-3 font-semibold text-muted-foreground">Contato</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Origem</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Qualidade</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Valor</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Match</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Sinais</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Data</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(conv => {
                      const statusOpt = LEAD_STATUS_OPTIONS.find(s => s.value === conv.lead_status);
                      return (
                        <tr key={conv.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <p className="font-semibold text-foreground">{conv.lead_name || "—"}</p>
                            {conv.lead_email && <p className="text-[10px] text-muted-foreground">{conv.lead_email}</p>}
                            {conv.lead_phone && <p className="text-[10px] text-muted-foreground">{conv.lead_phone}</p>}
                          </td>
                          <td className="p-3"><CaptureMethodBadge conv={conv} /></td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-[8px] ${statusOpt?.color || ""}`}>
                              {statusOpt?.label || conv.lead_status || "Novo"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {conv.quality === "hot" && <Badge className="text-[8px] bg-warning/10 text-warning border-warning/30" variant="outline">🔥 Quente</Badge>}
                            {conv.quality === "good" && <Badge className="text-[8px] bg-success/10 text-success border-success/30" variant="outline">👍 Bom</Badge>}
                            {conv.quality === "bad" && <Badge className="text-[8px] bg-destructive/10 text-destructive border-destructive/30" variant="outline">👎 Ruim</Badge>}
                            {!conv.quality && <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                            {conv.value ? `${conv.currency || "BRL"} ${conv.value.toFixed(2)}` : "—"}
                          </td>
                          <td className="p-3"><MatchScore conv={conv} /></td>
                          <td className="p-3 max-w-[150px]"><SignalBadges conv={conv} /></td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{format(new Date(conv.converted_at), "dd/MM HH:mm")}</td>
                          <td className="p-3 text-muted-foreground text-[10px] font-mono">{conv.ip_address || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </AnimatedContainer>
        ) : (
          <Card className="p-8 text-center">
            <PhoneCall className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-foreground mb-1">Nenhuma conversão nesta campanha</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
              Registre a primeira conversão com GCLID ou Email/Telefone para começar a enviar dados ao Google Ads.
            </p>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewConversion(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar Conversão
            </Button>
          </Card>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 text-xs gap-1">
              <ChevronLeft className="h-3 w-3" /> Anterior
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 text-xs gap-1">
              Próxima <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        {projectId && (
          <NewConversionDialog
            open={showNewConversion} onOpenChange={setShowNewConversion}
            projectId={projectId} campaignId={selectedCampaignId} campaigns={campaigns}
          />
        )}
      </div>
    );
  }

  // ─── CAMPAIGNS LIST VIEW ───
  return (
    <div className="space-y-4 sm:space-y-5">
      <FeatureBanner
        icon={PhoneCall}
        title="Conversões Offline"
        description={<>Crie campanhas de conversão, registre leads com <strong>GCLID</strong>, <strong>email</strong> e <strong>telefone</strong>, classifique a qualidade e exporte no formato <strong>Google Ads Enhanced Conversions</strong>.</>}
      />

      {projectId && <CreateCampaignDialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign} projectId={projectId} />}

      {/* Flow explanation */}
      <AnimatedContainer>
        <Card className="p-4">
          <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-primary" /> Fluxo: Clique → Lead → Venda → Google Ads
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { step: "1", title: "Clique no Anúncio", desc: "Google gera GCLID", icon: MousePointer },
              { step: "2", title: "Lead Capturado", desc: "CRM/Form salva GCLID + Email", icon: Mail },
              { step: "3", title: "Venda Offline", desc: "Registre status e valor", icon: DollarSign },
              { step: "4", title: "Upload ao Google", desc: "Exporte CSV com GCLID + dados", icon: Upload },
            ].map((s, i) => (
              <div key={i} className="text-center space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="mx-auto w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{s.step}</div>
                <s.icon className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-[10px] font-semibold text-foreground">{s.title}</p>
                <p className="text-[9px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </AnimatedContainer>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreateCampaign(true)}>
          <Megaphone className="h-3.5 w-3.5" /> Nova Campanha
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setSelectedCampaignId(null); setShowNewConversion(true); }}>
            <Plus className="h-3.5 w-3.5" /> Conversão Avulsa
          </Button>
          {allConversions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5"><Download className="h-3.5 w-3.5" /> Exportar Tudo</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportConversions(allConversions, "csv")} className="text-xs gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV (Google Ads)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportConversions(allConversions, "json")} className="text-xs gap-2">
                  <FileJson className="h-3.5 w-3.5" /> JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Global KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Campanhas", value: campaigns.length, icon: Megaphone },
          { label: "Total Conversões", value: allConversions.length, icon: PhoneCall },
          { label: "Receita Total", value: `R$ ${allConversions.reduce((s, c) => s + (c.value || 0), 0).toFixed(0)}`, icon: DollarSign },
          { label: "Com GCLID", value: allConversions.filter(c => c.gclid).length, icon: MousePointer },
        ].map((kpi, i) => (
          <Card key={i} className="p-3 card-hover group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex flex-col items-center text-center gap-1">
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold text-foreground font-display tracking-tight">{kpi.value}</span>
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
            </div>
          </Card>
        ))}
      </StaggeredGrid>

      {/* Campaign Cards */}
      {campaigns.length > 0 ? (
        <AnimatedContainer delay={0.04}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} onClick={() => { setSelectedCampaignId(c.id); setPage(1); setSearch(""); setStatusFilter("all"); }} />
            ))}
          </div>
        </AnimatedContainer>
      ) : (
        <Card className="p-8 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-foreground mb-1">Nenhuma campanha criada</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            Crie sua primeira campanha de conversão offline. O nome da ação deve ser idêntico ao configurado no Google Ads.
          </p>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreateCampaign(true)}>
            <Megaphone className="h-3.5 w-3.5" /> Criar Primeira Campanha
          </Button>
        </Card>
      )}

      {/* Credentials */}
      <AdsPlatformCredentials />

      {projectId && (
        <NewConversionDialog
          open={showNewConversion} onOpenChange={setShowNewConversion}
          projectId={projectId} campaignId={selectedCampaignId} campaigns={campaigns}
        />
      )}
    </div>
  );
}
