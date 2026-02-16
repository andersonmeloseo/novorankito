import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreatePlan } from "@/hooks/use-plans";
import { toast } from "sonner";
import { Plus, Crown } from "lucide-react";

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextSortOrder: number;
}

export function CreatePlanDialog({ open, onOpenChange, nextSortOrder }: CreatePlanDialogProps) {
  const createPlan = useCreatePlan();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate slug from name
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-")) {
      setSlug(val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  };

  const handleCreate = () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    createPlan.mutate(
      {
        name: name.trim(),
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        price,
        description: description || undefined,
        sort_order: nextSortOrder,
      },
      {
        onSuccess: () => {
          toast.success(`Plano "${name}" criado com sucesso!`);
          setName(""); setSlug(""); setPrice(0); setDescription("");
          onOpenChange(false);
        },
        onError: (err) => toast.error("Erro: " + err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Crown className="h-4 w-4" />
            </div>
            Criar Novo Plano
          </DialogTitle>
          <DialogDescription>
            Configure as informações básicas. Limites e features podem ser ajustados depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome do Plano</Label>
              <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Ex: Professional" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Slug</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-gerado" className="h-9 text-sm font-mono" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Preço Mensal (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} className="h-9 text-sm pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Descrição</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição curta do plano para clientes..."
              className="text-sm min-h-[60px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createPlan.isPending || !name.trim()} className="text-xs gap-1.5">
            {createPlan.isPending ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Criar Plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
