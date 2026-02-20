import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Pencil, Trash2, Pause, Play, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-success/10 text-success" },
  paused: { label: "Pausado", color: "bg-warning/10 text-warning" },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive" },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

export default function RRContractsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);

  const { data: contracts } = useQuery({
    queryKey: ["rr-contracts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_contracts").select("*, rr_clients(company_name), projects(name, domain)").eq("owner_id", user!.id).order("created_at", { ascending: false });
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

  const { data: projects } = useQuery({
    queryKey: ["rr-projects-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, domain").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editingContract) {
        const { error } = await supabase.from("rr_contracts").update(formData).eq("id", editingContract.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rr_contracts").insert({ ...formData, owner_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-contracts"] });
      setDialogOpen(false);
      setEditingContract(null);
      toast.success(editingContract ? "Contrato atualizado!" : "Contrato criado!");
    },
    onError: () => toast.error("Erro ao salvar contrato"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("rr_contracts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-contracts"] });
      toast.success("Status atualizado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rr_contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-contracts"] });
      toast.success("Contrato removido!");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      project_id: fd.get("project_id") as string,
      client_id: (fd.get("client_id") as string) || null,
      contract_type: fd.get("contract_type") as string,
      monthly_value: Number(fd.get("monthly_value")),
      start_date: (fd.get("start_date") as string) || null,
      end_date: (fd.get("end_date") as string) || null,
      notes: fd.get("notes") as string,
    });
  };

  return (
    <>
      <TopBar title="Contratos" subtitle="Gerencie contratos de aluguel dos seus projetos e páginas" />
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{contracts?.length || 0} contratos</p>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingContract(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs gap-1.5"><Plus className="h-3.5 w-3.5" /> Novo Contrato</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingContract ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Projeto *</Label>
                    <select name="project_id" required defaultValue={editingContract?.project_id} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm">
                      <option value="">Selecionar…</option>
                      {projects?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.domain})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cliente</Label>
                    <select name="client_id" defaultValue={editingContract?.client_id || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm">
                      <option value="">Nenhum</option>
                      {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <select name="contract_type" defaultValue={editingContract?.contract_type || "project"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm">
                      <option value="project">Projeto inteiro</option>
                      <option value="page">Por página</option>
                      <option value="hybrid">Híbrido</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Mensal (R$) *</Label>
                    <Input name="monthly_value" type="number" step="0.01" required defaultValue={editingContract?.monthly_value} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data Início</Label>
                    <Input name="start_date" type="date" defaultValue={editingContract?.start_date} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data Término</Label>
                    <Input name="end_date" type="date" defaultValue={editingContract?.end_date} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea name="notes" defaultValue={editingContract?.notes} className="text-xs min-h-[60px]" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditingContract(null); }}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando…" : "Salvar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Contracts list */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-3">Projeto</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Cliente</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Tipo</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Valor Mensal</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-3">Próx. Cobrança</th>
                    <th className="text-right font-medium text-muted-foreground p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts?.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum contrato. Crie seu primeiro contrato.</td></tr>
                  )}
                  {contracts?.map((c: any, i: number) => {
                    const st = STATUS_MAP[c.status] || STATUS_MAP.active;
                    return (
                      <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-medium text-foreground">{c.projects?.name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{c.rr_clients?.company_name || "—"}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">{c.contract_type === "project" ? "Projeto" : c.contract_type === "page" ? "Página" : "Híbrido"}</Badge>
                        </td>
                        <td className="p-3 text-right tabular-nums font-medium">R$ {Number(c.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3"><Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge></td>
                        <td className="p-3 text-muted-foreground">{c.next_billing ? new Date(c.next_billing).toLocaleDateString("pt-BR") : "—"}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === "active" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: c.id, status: "paused" })} title="Pausar">
                                <Pause className="h-3 w-3" />
                              </Button>
                            )}
                            {c.status === "paused" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: c.id, status: "active" })} title="Reativar">
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingContract(c); setDialogOpen(true); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
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
