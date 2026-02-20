import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: CreateClientDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Create a profile entry with a generated user_id
      const userId = crypto.randomUUID();

      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        display_name: name.trim(),
        avatar_url: null,
      });
      if (profileError) throw profileError;

      // Create billing subscription
      const { error: billingError } = await supabase.from("billing_subscriptions").insert({
        user_id: userId,
        plan,
        status: "active",
        mrr: 0,
        events_limit: 1000,
        projects_limit: 1,
      });
      if (billingError) throw billingError;

      toast({ title: "Cliente criado", description: `"${name}" adicionado com sucesso` });
      setName("");
      setEmail("");
      setPlan("free");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro ao criar cliente", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="client-name">Nome *</Label>
            <Input
              id="client-name"
              placeholder="Nome do cliente"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Email (opcional)</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
