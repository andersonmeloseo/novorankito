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
  Search, Plus, UserPlus, Phone, Mail, Globe, DollarSign,
  TrendingUp, Users, CheckCircle2, Clock, XCircle, Star,
  ArrowUpDown, Loader2, MoreHorizontal, Trash2, Pencil,
  Target, Zap, Filter, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ── Status Pipeline ─────────────────────── */
const LEAD_STATUSES = [
  { key: "novo", label: "Novo", icon: Star, color: "bg-primary/10 text-primary border-primary/20" },
  { key: "contato", label: "Em Contato", icon: Phone, color: "bg-warning/10 text-warning border-warning/20" },
  { key: "qualificado", label: "Qualificado", icon: Target, color: "bg-accent/10 text-accent-foreground border-accent/20" },
  { key: "negociacao", label: "Negociação", icon: Zap, color: "bg-secondary/10 text-secondary-foreground border-secondary/20" },
  { key: "convertido", label: "Convertido", icon: CheckCircle2, color: "bg-success/10 text-success border-success/20" },
  { key: "perdido", label: "Perdido", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
] as const;

const STATUS_MAP = Object.fromEntries(LEAD_STATUSES.map((s) => [s.key, s]));

const SOURCES = ["organic", "google_ads", "meta_ads", "referral", "whatsapp", "phone", "email", "other"];
const SOURCE_LABELS: Record<string, string> = {
  organic: "Orgânico", google_ads: "Google Ads", meta_ads: "Meta Ads",
  referral: "Indicação", whatsapp: "WhatsApp", phone: "Telefone", email: "E-mail", other: "Outro",
};

type ViewMode = "pipeline" | "table";

export default function RRLeadsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

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

  /* ── Create / Update Lead ── */
  const saveMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      if (editingLead) {
        const { error } = await supabase.from("rr_leads").update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          page_url: formData.page_url || null,
          client_id: formData.client_id || null,
          source: formData.source,
          status: formData.status,
          value: Number(formData.value || 0),
          notes: formData.notes || null,
          converted_at: formData.status === "convertido" ? new Date().toISOString() : editingLead.converted_at,
        }).eq("id", editingLead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rr_leads").insert({
          owner_id: user!.id,
          project_id: projectId,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          page_url: formData.page_url || null,
          client_id: formData.client_id || null,
          source: formData.source,
          status: formData.status || "novo",
          value: Number(formData.value || 0),
          notes: formData.notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-leads", projectId] });
      setDialogOpen(false);
      setEditingLead(null);
      toast.success(editingLead ? "Lead atualizado!" : "Lead criado!");
    },
    onError: () => toast.error("Erro ao salvar lead"),
  });

  /* ── Delete Lead ── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rr_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-leads", projectId] });
      toast.success("Lead removido!");
    },
  });

  /* ── Quick status update ── */
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status };
      if (status === "convertido") updates.converted_at = new Date().toISOString();
      const { error } = await supabase.from("rr_leads").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-leads", projectId] });
      toast.success("Status atualizado!");
    },
  });

  /* ── Filter & Sort ── */
  const filtered = useMemo(() => {
    let list = leads || [];
    if (search) list = list.filter((l: any) =>
      (l.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || "").includes(search) ||
      (l.page_url || "").toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") list = list.filter((l: any) => l.status === statusFilter);
    if (sourceFilter !== "all") list = list.filter((l: any) => l.source === sourceFilter);
    if (viewMode === "table") {
      list = [...list].sort((a: any, b: any) => {
        const av = a[sortField] ?? "";
        const bv = b[sortField] ?? "";
        if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? av - bv : bv - av;
      });
    }
    return list;
  }, [leads, search, statusFilter, sourceFilter, viewMode, sortField, sortAsc]);

  /* ── KPIs ── */
  const allLeads = leads || [];
  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter((l: any) => l.status === "novo").length;
  const convertedLeads = allLeads.filter((l: any) => l.status === "convertido").length;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const totalValue = allLeads.reduce((s: number, l: any) => s + Number(l.value || 0), 0);
  const avgValue = convertedLeads > 0 ? totalValue / convertedLeads : 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate(Object.fromEntries(fd.entries()));
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const openEdit = (lead: any) => { setEditingLead(lead); setDialogOpen(true); };
  const openCreate = () => { setEditingLead(null); setDialogOpen(true); };

  /* ── Lead Card (Pipeline view) ── */
  const LeadCard = ({ lead }: { lead: any }) => {
    const statusInfo = STATUS_MAP[lead.status] || STATUS_MAP.novo;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="p-3 rounded-lg border border-border bg-card hover:shadow-md transition-all cursor-pointer group"
        onClick={() => openEdit(lead)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{lead.name || "Sem nome"}</p>
            {lead.rr_clients?.company_name && (
              <p className="text-[10px] text-muted-foreground truncate">{lead.rr_clients.company_name}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(lead); }}>
                <Pencil className="h-3 w-3 mr-1.5" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(lead.id); }}>
                <Trash2 className="h-3 w-3 mr-1.5" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          {lead.email && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{lead.phone}</span>
            </div>
          )}
          {lead.page_url && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.page_url.replace(/^https?:\/\/[^/]+/, "")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {SOURCE_LABELS[lead.source] || lead.source}
          </Badge>
          {Number(lead.value) > 0 && (
            <span className="text-[10px] font-semibold text-success">
              R$ {Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          )}
          <span className="text-[9px] text-muted-foreground">
            {format(new Date(lead.created_at), "dd MMM", { locale: ptBR })}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <TopBar title="Gestão de Leads" subtitle="Pipeline completo de leads do Rank & Rent — capture, qualifique e converta" />
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
                <Input placeholder="Nome, email, telefone…" className="pl-8 h-9 text-xs w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
                <option value="all">Todos</option>
                {LEAD_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Origem</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
                <option value="all">Todas</option>
                {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("pipeline")}
                className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${viewMode === "pipeline" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >Pipeline</button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >Tabela</button>
            </div>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={openCreate}>
              <UserPlus className="h-3.5 w-3.5" /> Novo Lead
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard label="Total Leads" value={totalLeads} change={0} />
          <KpiCard label="Novos" value={newLeads} change={0} />
          <KpiCard label="Convertidos" value={convertedLeads} change={0} />
          <KpiCard label="Taxa Conversão" value={parseFloat(conversionRate.toFixed(1))} change={0} />
          <KpiCard label="Valor Total" value={totalValue} change={0} />
        </div>

        {/* Pipeline View */}
        {viewMode === "pipeline" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {LEAD_STATUSES.map((status) => {
              const statusLeads = filtered.filter((l: any) => l.status === status.key);
              const StatusIcon = status.icon;
              return (
                <div key={status.key} className="space-y-2">
                  <div className={`flex items-center gap-2 p-2 rounded-lg border ${status.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">{status.label}</span>
                    <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5">
                      {statusLeads.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    <AnimatePresence>
                      {statusLeads.map((lead: any) => (
                        <LeadCard key={lead.id} lead={lead} />
                      ))}
                    </AnimatePresence>
                    {statusLeads.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-muted-foreground border border-dashed border-border rounded-lg">
                        Nenhum lead
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">Nenhum lead encontrado.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {[
                          { label: "Nome", field: "name" },
                          { label: "Contato", field: "email" },
                          { label: "Origem", field: "source" },
                          { label: "Página", field: "page_url" },
                          { label: "Valor", field: "value", align: "right" },
                          { label: "Status", field: "status" },
                          { label: "Data", field: "created_at" },
                        ].map((col) => (
                          <th
                            key={col.field}
                            className={`font-medium text-muted-foreground p-2 cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"}`}
                            onClick={() => toggleSort(col.field)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                              <ArrowUpDown className={`h-3 w-3 ${sortField === col.field ? "text-primary" : "text-muted-foreground/40"}`} />
                            </span>
                          </th>
                        ))}
                        <th className="text-right font-medium text-muted-foreground p-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((lead: any, i: number) => {
                        const statusInfo = STATUS_MAP[lead.status] || STATUS_MAP.novo;
                        const StatusIcon = statusInfo.icon;
                        return (
                          <motion.tr
                            key={lead.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(i * 0.01, 0.3) }}
                            className="border-b border-border hover:bg-muted/50 transition-colors"
                          >
                            <td className="p-2">
                              <div>
                                <p className="font-semibold text-foreground">{lead.name || "—"}</p>
                                {lead.rr_clients?.company_name && (
                                  <p className="text-[10px] text-muted-foreground">{lead.rr_clients.company_name}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="space-y-0.5">
                                {lead.email && <p className="text-muted-foreground">{lead.email}</p>}
                                {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[10px]">
                                {SOURCE_LABELS[lead.source] || lead.source}
                              </Badge>
                            </td>
                            <td className="p-2 max-w-[150px] truncate text-muted-foreground" title={lead.page_url}>
                              {lead.page_url ? lead.page_url.replace(/^https?:\/\/[^/]+/, "") : "—"}
                            </td>
                            <td className="p-2 text-right tabular-nums font-medium">
                              {Number(lead.value) > 0 ? `R$ ${Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                            </td>
                            <td className="p-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Badge variant="outline" className={`text-[10px] cursor-pointer gap-1 ${statusInfo.color}`}>
                                    <StatusIcon className="h-2.5 w-2.5" />
                                    {statusInfo.label}
                                  </Badge>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="text-xs">
                                  {LEAD_STATUSES.map((s) => {
                                    const Icon = s.icon;
                                    return (
                                      <DropdownMenuItem
                                        key={s.key}
                                        onClick={() => statusMutation.mutate({ id: lead.id, status: s.key })}
                                        className={lead.status === s.key ? "font-bold" : ""}
                                      >
                                        <Icon className="h-3 w-3 mr-1.5" /> {s.label}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                            <td className="p-2 text-muted-foreground whitespace-nowrap">
                              {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => openEdit(lead)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-destructive" onClick={() => deleteMutation.mutate(lead.id)}>
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
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingLead(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">{editingLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Nome *</Label>
                  <Input name="name" required defaultValue={editingLead?.name || ""} className="h-9 text-xs" placeholder="Nome do lead" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail</Label>
                  <Input name="email" type="email" defaultValue={editingLead?.email || ""} className="h-9 text-xs" placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone</Label>
                  <Input name="phone" defaultValue={editingLead?.phone || ""} className="h-9 text-xs" placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Origem</Label>
                  <select name="source" defaultValue={editingLead?.source || "organic"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs">
                    {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <select name="status" defaultValue={editingLead?.status || "novo"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs">
                    {LEAD_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input name="value" type="number" step="0.01" defaultValue={editingLead?.value || 0} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cliente</Label>
                  <select name="client_id" defaultValue={editingLead?.client_id || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs">
                    <option value="">Nenhum</option>
                    {clients?.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Página de origem</Label>
                  <Input name="page_url" defaultValue={editingLead?.page_url || ""} className="h-9 text-xs" placeholder="https://…" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Observações</Label>
                  <Textarea name="notes" defaultValue={editingLead?.notes || ""} className="text-xs min-h-[60px]" placeholder="Notas sobre o lead…" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditingLead(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando…" : editingLead ? "Salvar" : "Criar Lead"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
