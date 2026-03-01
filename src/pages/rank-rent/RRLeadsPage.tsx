import { useState, useMemo, useRef } from "react";
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
  Search, Plus, Users, Upload, Download,
  ArrowUpDown, Loader2, Trash2, Pencil, ShoppingCart,
  Phone, Mail, Tag, CheckCircle2, Clock, XCircle, FileSpreadsheet,
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

/* ── Status config ── */
const LEAD_STATUSES = [
  { key: "captured", label: "Capturado", icon: Clock, cls: "bg-muted text-muted-foreground" },
  { key: "available", label: "Disponível", icon: CheckCircle2, cls: "bg-primary/10 text-primary" },
  { key: "sold", label: "Vendido", icon: ShoppingCart, cls: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { key: "invoiced", label: "Faturado", icon: CheckCircle2, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { key: "lost", label: "Perdido", icon: XCircle, cls: "bg-destructive/10 text-destructive" },
] as const;

const STATUS_MAP = Object.fromEntries(LEAD_STATUSES.map((s) => [s.key, s]));

type SortField = "name" | "email" | "phone" | "niche" | "value" | "sale_status" | "created_at" | "source";

/* ── CSV parser ── */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

function mapCSVRow(row: Record<string, string>) {
  return {
    name: row.nome || row.name || row.lead || "",
    email: row.email || row["e-mail"] || row.mail || null,
    phone: row.telefone || row.phone || row.whatsapp || row.cel || row.celular || null,
    niche: row.nicho || row.niche || row.segmento || "",
    source: row.origem || row.source || row.canal || "leadster",
    page_url: row.pagina || row.page || row.url || row.page_url || null,
    value: parseFloat(row.valor || row.value || row.preco || "0") || 0,
    notes: row.observacao || row.notes || row.obs || null,
    sale_status: "captured" as const,
  };
}

export default function RRLeadsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellingLead, setSellingLead] = useState<any>(null);
  const [page, setPage] = useState(0);
  const perPage = 20;

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
        .select("*, rr_clients!rr_leads_sold_to_client_id_fkey(company_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
    enabled: !!projectId,
  });

  /* ── Save lead ── */
  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload = {
        name: fd.name || "",
        email: fd.email || null,
        phone: fd.phone || null,
        page_url: fd.page_url || null,
        niche: fd.niche || "",
        source: fd.source || "organic",
        value: Number(fd.value || 0),
        sale_status: fd.sale_status || "captured",
        notes: fd.notes || null,
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
      toast.success(editing ? "Lead atualizado!" : "Lead registrado!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  /* ── Sell lead ── */
  const sellMutation = useMutation({
    mutationFn: async ({ id, client_id, value }: { id: string; client_id: string; value: number }) => {
      const { error } = await supabase.from("rr_leads").update({
        sold_to_client_id: client_id,
        sale_status: "sold",
        value,
        sold_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rr-leads", projectId] });
      setSellDialogOpen(false);
      setSellingLead(null);
      toast.success("Lead vendido!");
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

  /* ── Import CSV ── */
  const importMutation = useMutation({
    mutationFn: async (rows: Record<string, string>[]) => {
      const mapped = rows.map(r => ({
        owner_id: user!.id,
        project_id: projectId,
        ...mapCSVRow(r),
      }));
      // batch insert in chunks of 100
      for (let i = 0; i < mapped.length; i += 100) {
        const chunk = mapped.slice(i, i + 100);
        const { error } = await supabase.from("rr_leads").insert(chunk);
        if (error) throw error;
      }
      return mapped.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["rr-leads", projectId] });
      toast.success(`${count} leads importados com sucesso!`);
    },
    onError: (e: any) => toast.error(`Erro na importação: ${e.message}`),
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!projectId) { toast.error("Selecione um projeto primeiro."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) { toast.error("Arquivo vazio ou formato inválido."); return; }
      importMutation.mutate(rows);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ── Export CSV ── */
  const exportCSV = () => {
    const data = filtered;
    if (data.length === 0) { toast.error("Nada para exportar."); return; }
    const headers = ["Nome", "Email", "Telefone", "Nicho", "Origem", "Valor", "Status", "Comprado por", "Página", "Data"];
    const csvRows = [headers.join(",")];
    data.forEach((l: any) => {
      csvRows.push([
        `"${l.name || ""}"`,
        `"${l.email || ""}"`,
        `"${l.phone || ""}"`,
        `"${l.niche || ""}"`,
        `"${l.source || ""}"`,
        l.value || 0,
        `"${STATUS_MAP[l.sale_status]?.label || l.sale_status}"`,
        `"${l.rr_clients?.company_name || ""}"`,
        `"${l.page_url || ""}"`,
        `"${format(new Date(l.created_at), "dd/MM/yyyy")}"`,
      ].join(","));
    });
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Filter & Sort ── */
  const filtered = useMemo(() => {
    let list = leads || [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((l: any) =>
        (l.name || "").toLowerCase().includes(s) ||
        (l.email || "").toLowerCase().includes(s) ||
        (l.phone || "").toLowerCase().includes(s) ||
        (l.niche || "").toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") list = list.filter((l: any) => l.sale_status === statusFilter);
    list = [...list].sort((a: any, b: any) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return list;
  }, [leads, search, statusFilter, sortField, sortAsc]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  /* ── KPIs ── */
  const all = leads || [];
  const totalLeads = all.length;
  const availableLeads = all.filter((l: any) => l.sale_status === "captured" || l.sale_status === "available").length;
  const soldLeads = all.filter((l: any) => l.sale_status === "sold" || l.sale_status === "invoiced").length;
  const totalRevenue = all.filter((l: any) => l.sale_status === "sold" || l.sale_status === "invoiced")
    .reduce((s: number, l: any) => s + Number(l.value || 0), 0);

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
      client_id: fd.get("client_id") as string,
      value: Number(fd.get("value") || 0),
    });
  };

  const SortHeader = ({ label, field, align }: { label: string; field: SortField; align?: string }) => (
    <th
      className={`font-medium text-muted-foreground p-2.5 cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
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
      <TopBar title="Gestão de Leads" subtitle="Lista completa de leads capturados — importe do Leadster, venda e acompanhe" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Projeto</label>
              <Select value={projectId} onValueChange={(v) => { setSelectedProject(v); setPage(0); }}>
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
                <Input placeholder="Nome, email, telefone…" className="pl-8 h-9 text-xs w-52" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
                <option value="all">Todos</option>
                {LEAD_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileImport} />
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending || !projectId}>
              <Upload className="h-3.5 w-3.5" />
              {importMutation.isPending ? "Importando…" : "Importar CSV"}
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5" /> Exportar
            </Button>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Novo Lead
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total de Leads" value={totalLeads} change={0} />
          <KpiCard label="Disponíveis" value={availableLeads} change={0} />
          <KpiCard label="Vendidos" value={soldLeads} change={0} />
          <KpiCard label="Receita de Leads" value={totalRevenue} change={0} />
        </div>

        {/* Import hint */}
        {all.length === 0 && !isLoading && projectId && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground">Nenhum lead registrado</p>
                <p className="text-xs text-muted-foreground mt-1">Importe seus leads do Leadster via CSV ou cadastre manualmente.</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  O CSV deve ter colunas como: <span className="font-mono">nome, email, telefone, nicho, valor, origem</span>
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Importar CSV
                </Button>
                <Button size="sm" className="text-xs gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                  <Plus className="h-3.5 w-3.5" /> Cadastrar Lead
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        {(all.length > 0 || isLoading) && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    Nenhum lead encontrado com esses filtros.
                  </div>
                ) : (
                  <>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <SortHeader label="Nome" field="name" />
                          <SortHeader label="Email" field="email" />
                          <SortHeader label="Telefone" field="phone" />
                          <SortHeader label="Nicho" field="niche" />
                          <SortHeader label="Origem" field="source" />
                          <SortHeader label="Valor (R$)" field="value" align="right" />
                          <SortHeader label="Status" field="sale_status" />
                          <th className="font-medium text-muted-foreground p-2.5 text-left whitespace-nowrap">Comprado por</th>
                          <SortHeader label="Data" field="created_at" />
                          <th className="font-medium text-muted-foreground p-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((lead: any, i: number) => {
                          const st = STATUS_MAP[lead.sale_status] || STATUS_MAP.captured;
                          return (
                            <motion.tr
                              key={lead.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: Math.min(i * 0.01, 0.2) }}
                              className="border-b border-border hover:bg-muted/50 transition-colors"
                            >
                              <td className="p-2.5 font-medium text-foreground max-w-[160px] truncate">{lead.name || "—"}</td>
                              <td className="p-2.5 text-muted-foreground max-w-[180px] truncate">
                                {lead.email ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="h-3 w-3 shrink-0" />{lead.email}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                                {lead.phone ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3 shrink-0" />{lead.phone}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="p-2.5">
                                {lead.niche ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    <Tag className="h-2.5 w-2.5 mr-1" />{lead.niche}
                                  </Badge>
                                ) : "—"}
                              </td>
                              <td className="p-2.5 text-muted-foreground capitalize">{lead.source || "—"}</td>
                              <td className="p-2.5 text-right tabular-nums font-semibold">
                                {Number(lead.value) > 0
                                  ? `R$ ${Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                  : "—"}
                              </td>
                              <td className="p-2.5">
                                <Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
                              </td>
                              <td className="p-2.5 text-muted-foreground">
                                {lead.rr_clients?.company_name || "—"}
                              </td>
                              <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                                {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
                              </td>
                              <td className="p-2.5 text-right">
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
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <span className="text-[10px] text-muted-foreground">
                          {filtered.length} leads • Página {page + 1} de {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">{editing ? "Editar Lead" : "Novo Lead"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Nome *</Label>
                  <Input name="name" required defaultValue={editing?.name || ""} className="h-9 text-xs" placeholder="Nome do lead" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input name="email" type="email" defaultValue={editing?.email || ""} className="h-9 text-xs" placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone</Label>
                  <Input name="phone" defaultValue={editing?.phone || ""} className="h-9 text-xs" placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nicho</Label>
                  <Input name="niche" defaultValue={editing?.niche || ""} className="h-9 text-xs" placeholder="Ex: Desentupidora" />
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
                    <option value="leadster">Leadster</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input name="value" type="number" step="0.01" defaultValue={editing?.value || 0} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <select name="sale_status" defaultValue={editing?.sale_status || "captured"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs">
                    {LEAD_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Página de Origem</Label>
                  <Input name="page_url" defaultValue={editing?.page_url || ""} className="h-9 text-xs" placeholder="URL que gerou o lead" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Observações</Label>
                  <Textarea name="notes" defaultValue={editing?.notes || ""} className="text-xs min-h-[50px]" />
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
              <DialogTitle className="text-sm">Vender Lead</DialogTitle>
            </DialogHeader>
            {sellingLead && (
              <div className="mb-3 p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs font-semibold text-foreground">{sellingLead.name || "Sem nome"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {sellingLead.email || sellingLead.phone || "Sem contato"} • {sellingLead.niche || "Sem nicho"}
                </p>
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
                <Label className="text-xs">Valor do Lead (R$)</Label>
                <Input name="value" type="number" step="0.01" defaultValue={sellingLead?.value || 0} className="h-9 text-xs" />
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
