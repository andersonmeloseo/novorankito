import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeletePlan, type Plan } from "@/hooks/use-plans";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeletePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
  subscriberCount: number;
  onDeleted: () => void;
}

export function DeletePlanDialog({ open, onOpenChange, plan, subscriberCount, onDeleted }: DeletePlanDialogProps) {
  const deletePlan = useDeletePlan();

  const handleDelete = () => {
    deletePlan.mutate(plan.id, {
      onSuccess: () => {
        toast.success(`Plano "${plan.name}" excluído`);
        onDeleted();
        onOpenChange(false);
      },
      onError: (err) => toast.error("Erro: " + err.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Excluir Plano
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Tem certeza que deseja excluir o plano "{plan.name}"?
                </p>
                <p className="text-xs text-muted-foreground">
                  Todas as features associadas serão removidas.
                </p>
                {subscriberCount > 0 && (
                  <p className="text-xs text-destructive font-medium mt-2">
                    ⚠️ Existem {subscriberCount} assinantes neste plano. Mova-os antes de excluir.
                  </p>
                )}
                {plan.is_default && (
                  <p className="text-xs text-destructive font-medium mt-2">
                    ⚠️ Este é o plano padrão. Defina outro como padrão antes de excluir.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deletePlan.isPending || subscriberCount > 0 || plan.is_default}
            className="text-xs gap-1.5"
          >
            {deletePlan.isPending ? <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent" /> : <Trash2 className="h-3 w-3" />}
            Excluir Permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
