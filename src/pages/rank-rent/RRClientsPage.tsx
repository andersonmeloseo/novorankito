import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Mail, Phone, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function RRClientsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["rr-clients", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_clients").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editingClient) {
        const { error } = await supabase.from("rr_clients").update(formData).eq("id", editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rr_clients").insert({ ...formData, owner_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-clients"] });
      setDialogOpen(false);
      setEditingClient(null);
      toast.success(editingClient ? "Cliente atualizado!" : "Cliente criado!");
    },
    onError: () => toast.error("Erro ao salvar cliente"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rr_clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-clients"] });
      toast.success("Cliente removido!");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      company_name: fd.get("company_name") as string,
      contact_name: fd.get("contact_name") as string,
      email: fd.get("email") as string,
      phone: fd.get("phone") as string,
      whatsapp: fd.get("whatsapp") as string,
      niche: fd.get("niche") as string,
      address: fd.get("address") as string,
      billing_model: fd.get("billing_model") as string,
      notes: fd.get("notes") as string,
    });
  };

  const filtered = clients?.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <>
      <TopBar title="Clientes" subtitle="Gerencie seus clientes de Rank & Rent" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar clientes…" className="pl-8 h-9 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingClient(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs gap-1.5"><Plus className="h-3.5 w-3.5" /> Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Empresa *</Label>
                    <Input name="company_name" required defaultValue={editingClient?.company_name} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Responsável *</Label>
                    <Input name="contact_name" required defaultValue={editingClient?.contact_name} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input name="email" type="email" defaultValue={editingClient?.email} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telefone</Label>
                    <Input name="phone" defaultValue={editingClient?.phone} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">WhatsApp</Label>
                    <Input name="whatsapp" defaultValue={editingClient?.whatsapp} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nicho</Label>
                    <Input name="niche" defaultValue={editingClient?.niche} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Endereço</Label>
                  <Input name="address" defaultValue={editingClient?.address} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Modelo de Cobrança</Label>
                  <select name="billing_model" defaultValue={editingClient?.billing_model || "flat"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="flat">Flat (valor fixo)</option>
                    <option value="per_lead">Por Lead</option>
                    <option value="hybrid">Híbrido</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea name="notes" defaultValue={editingClient?.notes} className="text-xs min-h-[60px]" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditingClient(null); }}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Client cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client, i) => (
            <motion.div key={client.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{client.company_name}</p>
                      <p className="text-xs text-muted-foreground">{client.contact_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingClient(client); setDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(client.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{client.email}</div>}
                  {client.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{client.phone}</div>}
                  {client.niche && <Badge variant="outline" className="text-[10px] mt-1">{client.niche}</Badge>}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    {client.billing_model === "flat" ? "Flat" : client.billing_model === "per_lead" ? "Por Lead" : "Híbrido"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(client.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              Nenhum cliente encontrado. Clique em "Novo Cliente" para começar.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
