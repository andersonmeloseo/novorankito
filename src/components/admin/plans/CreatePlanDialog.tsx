import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePlan } from "@/hooks/use-plans";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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

  const handleCreate = () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    createPlan.mutate(
      { name, slug: slug.toLowerCase().replace(/\s+/g, "-"), price, description: description || undefined, sort_order: nextSortOrder },
      {
        onSuccess: () => {
          toast.success("Plano criado com sucesso!");
          setName(""); setSlug(""); setPrice(0); setDescription("");
          onOpenChange(false);
        },
        onError: (err) => toast.error("Erro: " + err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Criar Novo Plano
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pro" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Ex: pro" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Preço (R$)</Label>
            <Input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição curta do plano" className="h-9 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">Cancelar</Button>
          <Button onClick={handleCreate} disabled={createPlan.isPending} className="text-xs gap-1.5">
            {createPlan.isPending ? <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent" /> : <Plus className="h-3 w-3" />}
            Criar Plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
