import { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, DollarSign, TrendingUp, Users, Package,
  ArrowUpDown, Loader2, Trash2, Pencil, ShoppingCart,
  CheckCircle2, Clock, Tag, Calendar, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* ── Sale status config ── */
const SALE_STATUSES = [
  { key: "captured", label: "Capturado", cls: "bg-muted text-muted-foreground" },
  { key: "available", label: "Disponível", cls: "bg-primary/10 text-primary" },
  { key: "sold", label: "Vendido", cls: "bg-success/10 text-success" },
  { key: "invoiced", label: "Faturado", cls: "bg-warning/10 text-warning" },
] as const;

const STATUS_MAP = Object.fromEntries(SALE_STATUSES.map((s) => [s.key, s]));

const PIE_COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))"];

type SortField = "niche" | "page_url" | "quantity" | "unit_price" | "total_price" | "created_at" | "sale_status";

export default function RRLeadsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellingLead, setSellingLead] = useState<any>(null);

  /* ── Projects ── */
  const { data: projects } = useQuery({
    queryKey: ["rr-leads-projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, domain").eq("owner_id", user!.id).order("name");
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = selectedProject || projects?.[0]?.id || "";

  /* ── Clients ── */
  const { data: clients } = useQuery({
    queryKey: ["rr-leads-clients", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_clients").select("id, company_name").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  /* ── Leads ── */
  const { data: leads, isLoading } = useQuery({
    queryKey: ["rr-leads", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rr_leads")
        .select("*, rr_clients(company_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!projectId,
  });

  /* ── Niches list ── */
  const niches = useMemo(() => {
    const set = new Set<string>();
    leads?.forEach((l: any) => { if (l.niche) set.add(l.niche); });
    return Array.from(set).sort();
  }, [leads]);

  /* ── Create / Update Lead batch ── */
  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const qty = Number(fd.quantity || 1);
      const unitPrice = Number(fd.unit_price || 0);
      const payload = {
        name: fd.name || "",
        email: fd.email || null,
        phone: fd.phone || null,
        page_url: fd.page_url || null,
        niche: fd.niche || "",
        source: fd.source || "organic",
        quantity: qty,
        unit_price: unitPrice,
        total_price: qty * unitPrice,
        sale_status: fd.sale_status || "captured",
        notes: fd.notes || null,
        period_start: fd.period_start || null,
        period_end: fd.period_end || null,
      };
      if (editing) {
        const { error } = await supabase.from("rr_leads").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rr_leads").insert({
          owner_id: user!.id,
          project_id: projectId,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rr-leads", projectId] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Lote atualizado!" : "Leads registrados!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  /* ── Sell leads ── */
  const sellMutation = useMutation({
    mutationFn: async ({ id, client_id, unit_price, quantity }: any) => {
      const total = Number(quantity) * Number(unit_price);
      const { error } = await supabase.from("rr_leads").update({
        sold_to_client_id: client_id,
        sale_status: "sold",
        unit_price,
        total_price: total,
        sold_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rr-leads", projectId] });
      setSellDialogOpen(false);
      setSellingLead(null);
      toast.success("Leads vendidos!");
    },
    onError: () => toast.error("Erro ao registrar venda"),
  });

  /* ── Delete ── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rr_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rr-leads", projectId] }); toast.success("Removido!"); },
  });

  /* ── Filter & Sort ── */
  const filtered = useMemo(() => {
    let list = leads || [];
    if (search) list = list.filter((l: any) =>
      (l.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.niche || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.page_url || "").toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") list = list.filter((l: any) => l.sale_status === statusFilter);
    if (nicheFilter !== "all") list = list.filter((l: any) => l.niche === nicheFilter);
    list = [...list].sort((a: any, b: any) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return list;
  }, [leads, search, statusFilter, nicheFilter, sortField, sortAsc]);

  /* ── KPIs ── */
  const all = leads || [];
  const totalLeads = all.reduce((s: number, l: any) => s + (l.quantity || 1), 0);
  const soldLeads = all.filter((l: any) => l.sale_status === "sold" || l.sale_status === "invoiced")
    .reduce((s: number, l: any) => s + (l.quantity || 1), 0);
  const totalRevenue = all.filter((l: any) => l.sale_status === "sold" || l.sale_status === "invoiced")
    .reduce((s: number, l: any) => s + Number(l.total_price || 0), 0);
  const avgLeadPrice = soldLeads > 0 ? totalRevenue / soldLeads : 0;
  const availableLeads = all.filter((l: any) => l.sale_status === "captured" || l.sale_status === "available")
    .reduce((s: number, l: any) => s + (l.quantity || 1), 0);

  /* ── Chart data ── */
  const nicheRevenue = useMemo(() => {
    const map: Record<string, { niche: string; receita: number; leads: number }> = {};
    all.forEach((l: any) => {
      const n = l.niche || "Sem nicho";
      if (!map[n]) map[n] = { niche: n, receita: 0, leads: 0 };
      map[n].leads += l.quantity || 1;
      if (l.sale_status === "sold" || l.sale_status === "invoiced") map[n].receita += Number(l.total_price || 0);
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, 8);
  }, [all]);

  const statusDistribution = useMemo(() => {
    return SALE_STATUSES.map((s) => ({
      name: s.label,
      value: all.filter((l: any) => l.sale_status === s.key).reduce((sum: number, l: any) => sum + (l.quantity || 1), 0),
    }));
  }, [all]);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortAsc(!sortAsc);
    else { setSortField(f); setSortAsc(false); }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMutation.mutate(Object.fromEntries(new FormData(e.currentTarget).entries()));
  };

  const handleSellSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    sellMutation.mutate({
      id: sellingLead.id,
      client_id: fd.get("client_id"),
      unit_price: Number(fd.get("unit_price") || 0),
      quantity: sellingLead.quantity || 1,
    });
  };

  const SortHeader = ({ label, field, align }: { label: string; field: SortField; align?: string }) => (
    <th
      className={`font-medium text-muted-foreground p-2 cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "text-muted-foreground/40"}`} />
      </span>
    </th>
  );

  return (
    <>
      <TopBar title="Gestão de Leads" subtitle="Controle leads capturados, vendidos e faturados por nicho e página" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Projeto</label>
              <Select value={projectId} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-52 h-9 text-xs"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Nicho, página…" className="pl-8 h-9 text-xs w-44" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
                <option value="all">Todos</option>
                {SALE_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            {niches.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nicho</label>
                <select value={nicheFilter} onChange={(e) => setNicheFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
                  <option value="all">Todos</option>
                  {niches.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
          </div>
          <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> Registrar Leads
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard label="Total Capturados" value={totalLeads} change={0} />
          <KpiCard label="Vendidos" value={soldLeads} change={0} />
          <KpiCard label="Disponíveis" value={availableLeads} change={0} />
          <KpiCard label="Receita Total" value={totalRevenue} change={0} />
          <KpiCard label="Preço Médio/Lead" value={parseFloat(avgLeadPrice.toFixed(2))} change={0} />
        </div>

        {/* Charts */}
        {all.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold tracking-tight flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" /> Receita por Nicho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nicheRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="niche" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                      <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Receita (R$)" />
                      <Bar dataKey="leads" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold tracking-tight flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" /> Distribuição por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""} labelLine={false} fontSize={9}>
                        {statusDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  {projectId ? "Nenhum lead registrado. Clique em 'Registrar Leads' para começar." : "Selecione um projeto."}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <SortHeader label="Nicho" field="niche" />
                      <SortHeader label="Página" field="page_url" />
                      <SortHeader label="Qtd" field="quantity" align="right" />
                      <SortHeader label="Preço/Lead" field="unit_price" align="right" />
                      <SortHeader label="Total" field="total_price" align="right" />
                      <th className="font-medium text-muted-foreground p-2 text-left whitespace-nowrap">Vendido p/</th>
                      <SortHeader label="Status" field="sale_status" />
                      <th className="font-medium text-muted-foreground p-2 text-left whitespace-nowrap">Período</th>
                      <SortHeader label="Data" field="created_at" />
                      <th className="font-medium text-muted-foreground p-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead: any, i: number) => {
                      const st = STATUS_MAP[lead.sale_status] || STATUS_MAP.captured;
                      return (
                        <motion.tr
                          key={lead.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.008, 0.3) }}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              <Tag className="h-3 w-3 text-primary shrink-0" />
                              <span className="font-medium text-foreground">{lead.niche || "—"}</span>
                            </div>
                            {lead.name && <p className="text-[10px] text-muted-foreground ml-[18px]">{lead.name}</p>}
                          </td>
                          <td className="p-2 max-w-[160px] truncate text-muted-foreground" title={lead.page_url}>
                            {lead.page_url ? lead.page_url.replace(/^https?:\/\/[^/]+/, "") : "—"}
                          </td>
                          <td className="p-2 text-right tabular-nums font-semibold">{lead.quantity || 1}</td>
                          <td className="p-2 text-right tabular-nums">
                            {Number(lead.unit_price) > 0
                              ? `R$ ${Number(lead.unit_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                          <td className="p-2 text-right tabular-nums font-semibold text-success">
                            {Number(lead.total_price) > 0
                              ? `R$ ${Number(lead.total_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {lead.rr_clients?.company_name || "—"}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
                          </td>
                          <td className="p-2 text-[10px] text-muted-foreground whitespace-nowrap">
                            {lead.period_start && lead.period_end
                              ? `${format(new Date(lead.period_start), "dd/MM")} - ${format(new Date(lead.period_end), "dd/MM")}`
                              : lead.period_start
                                ? format(new Date(lead.period_start), "dd/MM/yy")
                                : "—"}
                          </td>
                          <td className="p-2 text-muted-foreground whitespace-nowrap">
                            {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(lead.sale_status === "captured" || lead.sale_status === "available") && (
                                <Button
                                  variant="default" size="sm" className="h-6 text-[10px] px-2 gap-1"
                                  onClick={() => { setSellingLead(lead); setSellDialogOpen(true); }}
                                >
                                  <ShoppingCart className="h-3 w-3" /> Vender
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditing(lead); setDialogOpen(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteMutation.mutate(lead.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Register / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">{editing ? "Editar Lote de Leads" : "Registrar Leads Capturados"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Nicho *</Label>
                  <Input name="niche" required defaultValue={editing?.niche || ""} className="h-9 text-xs" placeholder="Ex: Desentupidora SP, Advogado Trabalhista…" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Página de Origem</Label>
                  <Input name="page_url" defaultValue={editing?.page_url || ""} className="h-9 text-xs" placeholder="URL que gerou os leads" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Qtd de Leads</Label>
                  <Input name="quantity" type="number" min={1} defaultValue={editing?.quantity || 1} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preço por Lead (R$)</Label>
                  <Input name="unit_price" type="number" step="0.01" defaultValue={editing?.unit_price || 0} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Origem</Label>
                  <select name="source" defaultValue={editing?.source || "organic"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs">
                    <option value="organic">Orgânico</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="meta_ads">Meta Ads</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Telefone</option>
                    <option value="referral">Indicação</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <select name="sale_status" defaultValue={editing?.sale_status || "captured"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs">
                    {SALE_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Período Início</Label>
                  <Input name="period_start" type="date" defaultValue={editing?.period_start || ""} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Período Fim</Label>
                  <Input name="period_end" type="date" defaultValue={editing?.period_end || ""} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Descrição / Referência</Label>
                  <Input name="name" defaultValue={editing?.name || ""} className="h-9 text-xs" placeholder="Ex: Lote Jan/2026 - Desentupidora" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Observações</Label>
                  <Textarea name="notes" defaultValue={editing?.notes || ""} className="text-xs min-h-[50px]" placeholder="Detalhes adicionais…" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditing(null); }}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando…" : editing ? "Salvar" : "Registrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Sell Dialog */}
        <Dialog open={sellDialogOpen} onOpenChange={(o) => { setSellDialogOpen(o); if (!o) setSellingLead(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Vender Leads</DialogTitle>
            </DialogHeader>
            {sellingLead && (
              <div className="mb-3 p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs font-semibold text-foreground">{sellingLead.niche || "Sem nicho"}</p>
                <p className="text-[10px] text-muted-foreground">{sellingLead.quantity} lead(s) • {sellingLead.page_url?.replace(/^https?:\/\/[^/]+/, "") || "Sem página"}</p>
              </div>
            )}
            <form onSubmit={handleSellSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Vender para *</Label>
                <select name="client_id" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs">
                  <option value="">Selecionar cliente…</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço por Lead (R$)</Label>
                <Input name="unit_price" type="number" step="0.01" defaultValue={sellingLead?.unit_price || 0} className="h-9 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setSellDialogOpen(false); setSellingLead(null); }}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={sellMutation.isPending} className="gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  {sellMutation.isPending ? "Vendendo…" : "Confirmar Venda"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
