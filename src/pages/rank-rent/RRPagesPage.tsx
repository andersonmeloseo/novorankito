import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Globe, Pencil, Trash2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PAGE_STATUS: Record<string, { label: string; color: string }> = {
  disponivel: { label: "Disponível", color: "bg-success/10 text-success" },
  alugada: { label: "Alugada", color: "bg-primary/10 text-primary" },
  reservada: { label: "Reservada", color: "bg-warning/10 text-warning" },
};

export default function RRPagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: pages } = useQuery({
    queryKey: ["rr-pages", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_pages").select("*, rr_clients(company_name), projects(name)").eq("owner_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: projects } = useQuery({
    queryKey: ["rr-projects-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: clients } = useQuery({
    queryKey: ["rr-clients-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_clients").select("id, company_name").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editing) {
        const { error } = await supabase.from("rr_pages").update(formData).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rr_pages").insert({ ...formData, owner_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-pages"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success("Página salva!");
    },
    onError: () => toast.error("Erro ao salvar página"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rr_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-pages"] });
      toast.success("Página removida!");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      project_id: fd.get("project_id") as string,
      url: fd.get("url") as string,
      status: fd.get("status") as string,
      client_id: (fd.get("client_id") as string) || null,
      monthly_value: Number(fd.get("monthly_value") || 0),
      traffic: Number(fd.get("traffic") || 0),
      leads: Number(fd.get("leads") || 0),
      conversions: Number(fd.get("conversions") || 0),
      niche: fd.get("niche") as string,
      location: fd.get("location") as string,
      priority: fd.get("priority") as string,
    });
  };

  const filtered = pages?.filter(p => {
    const matchSearch = p.url.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  return (
    <>
      <TopBar title="Páginas" subtitle="Inventário de páginas para aluguel com tráfego, leads e status" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar URL…" className="pl-8 h-9 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
              <option value="all">Todos</option>
              <option value="disponivel">Disponível</option>
              <option value="alugada">Alugada</option>
              <option value="reservada">Reservada</option>
            </select>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs gap-1.5"><Plus className="h-3.5 w-3.5" /> Nova Página</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Página" : "Nova Página"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Projeto *</Label>
                    <select name="project_id" required defaultValue={editing?.project_id} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm">
                      <option value="">Selecionar…</option>
                      {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <select name="status" defaultValue={editing?.status || "disponivel"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm">
                      <option value="disponivel">Disponível</option>
                      <option value="alugada">Alugada</option>
                      <option value="reservada">Reservada</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">URL *</Label>
                  <Input name="url" required defaultValue={editing?.url} className="h-9 text-xs" placeholder="/paving-miami" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tráfego</Label>
                    <Input name="traffic" type="number" defaultValue={editing?.traffic || 0} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Leads</Label>
                    <Input name="leads" type="number" defaultValue={editing?.leads || 0} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Conversões</Label>
                    <Input name="conversions" type="number" defaultValue={editing?.conversions || 0} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Mensal (R$)</Label>
                    <Input name="monthly_value" type="number" step="0.01" defaultValue={editing?.monthly_value || 0} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cliente</Label>
                    <select name="client_id" defaultValue={editing?.client_id || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm">
                      <option value="">Nenhum</option>
                      {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nicho</Label>
                    <Input name="niche" defaultValue={editing?.niche} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Localização</Label>
                    <Input name="location" defaultValue={editing?.location} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prioridade</Label>
                    <select name="priority" defaultValue={editing?.priority || "medium"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm">
                      <option value="high">Alta</option>
                      <option value="medium">Média</option>
                      <option value="low">Baixa</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditing(null); }}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando…" : "Salvar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pages table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-3">URL</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Status</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Tráfego</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Leads</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Valor</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Cliente</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Nicho</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma página encontrada.</td></tr>
                  )}
                  {filtered.map((p: any, i: number) => {
                    const st = PAGE_STATUS[p.status] || PAGE_STATUS.disponivel;
                    return (
                      <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-medium text-primary truncate max-w-[200px]">{p.url}</td>
                        <td className="p-3"><Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge></td>
                        <td className="p-3 text-right tabular-nums">{p.traffic.toLocaleString()}</td>
                        <td className="p-3 text-right tabular-nums">{p.leads}</td>
                        <td className="p-3 text-right tabular-nums font-medium">R$ {Number(p.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-muted-foreground">{p.rr_clients?.company_name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{p.niche || "—"}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {p.suggested_price && (
                              <Badge variant="outline" className="text-[10px] bg-success/10 text-success mr-1" title="Preço sugerido pela IA">
                                <Lightbulb className="h-2.5 w-2.5 mr-0.5" />R$ {Number(p.suggested_price).toLocaleString("pt-BR")}
                              </Badge>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
