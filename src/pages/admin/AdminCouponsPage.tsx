import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Ticket, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon,
  useAdminPlans, type Coupon,
} from "@/hooks/use-plans";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminCouponsPage() {
  const { data: coupons = [], isLoading } = useAdminCoupons();
  const { data: plans = [] } = useAdminPlans();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [selectedPlanSlugs, setSelectedPlanSlugs] = useState<string[]>([]);

  const handleCreate = () => {
    if (!code.trim()) { toast.error("Código é obrigatório"); return; }
    if (!discountPercent && !discountAmount) { toast.error("Informe desconto % ou valor"); return; }
    createCoupon.mutate({
      code: code.toUpperCase().trim(),
      description: description || null,
      discount_percent: discountPercent ? parseFloat(discountPercent) : null,
      discount_amount: discountAmount ? parseFloat(discountAmount) : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      plan_slugs: selectedPlanSlugs,
    } as any, {
      onSuccess: () => {
        toast.success("Cupom criado!");
        setOpen(false);
        setCode(""); setDescription(""); setDiscountPercent(""); setDiscountAmount("");
        setValidUntil(""); setMaxUses(""); setSelectedPlanSlugs([]);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const toggleActive = (coupon: Coupon) => {
    updateCoupon.mutate({ id: coupon.id, is_active: !coupon.is_active } as any, {
      onSuccess: () => toast.success(coupon.is_active ? "Cupom desativado" : "Cupom ativado"),
    });
  };

  return (
    <div className="flex-1 bg-background">
      <header className="border-b p-4 sm:p-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Cupons de Desconto
          </h1>
          <p className="text-xs text-muted-foreground">Crie e gerencie cupons para desconto nos planos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Novo Cupom</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Criar Cupom</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Código</Label>
                <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="LANCAMENTO50" className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Cupom de lançamento" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Desconto (%)</Label>
                  <Input type="number" value={discountPercent} onChange={e => { setDiscountPercent(e.target.value); setDiscountAmount(""); }} placeholder="50" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Desconto (R$)</Label>
                  <Input type="number" value={discountAmount} onChange={e => { setDiscountAmount(e.target.value); setDiscountPercent(""); }} placeholder="100" className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Válido até</Label>
                  <Input type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Máx. usos</Label>
                  <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Ilimitado" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Planos aplicáveis (vazio = todos)</Label>
                <div className="flex flex-wrap gap-2">
                  {plans.map(p => (
                    <label key={p.slug} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={selectedPlanSlugs.includes(p.slug)}
                        onCheckedChange={(checked) => {
                          setSelectedPlanSlugs(prev =>
                            checked ? [...prev, p.slug] : prev.filter(s => s !== p.slug)
                          );
                        }}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={createCoupon.isPending} className="gap-1.5 text-xs">
                {createCoupon.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Criar Cupom
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Ticket className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum cupom criado</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon, i) => {
              const expired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
              const exhausted = coupon.max_uses && coupon.uses_count >= coupon.max_uses;
              return (
                <AnimatedContainer key={coupon.id} delay={i * 0.05}>
                  <Card className={`p-4 space-y-3 ${!coupon.is_active || expired || exhausted ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">{coupon.code}</code>
                        <button onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success("Copiado!"); }}>
                          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={coupon.is_active} onCheckedChange={() => toggleActive(coupon)} className="scale-75" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cupom "{coupon.code}"?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCoupon.mutate(coupon.id)} className="bg-destructive text-destructive-foreground text-xs">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {coupon.description && <p className="text-xs text-muted-foreground">{coupon.description}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {coupon.discount_percent && <Badge variant="secondary" className="text-[10px]">{coupon.discount_percent}% off</Badge>}
                      {coupon.discount_amount && <Badge variant="secondary" className="text-[10px]">R${coupon.discount_amount} off</Badge>}
                      {expired && <Badge variant="destructive" className="text-[10px]">Expirado</Badge>}
                      {exhausted && <Badge variant="destructive" className="text-[10px]">Esgotado</Badge>}
                      {coupon.max_uses && <Badge variant="outline" className="text-[10px]">{coupon.uses_count}/{coupon.max_uses} usos</Badge>}
                      {coupon.plan_slugs.length > 0 && coupon.plan_slugs.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {coupon.valid_until && <>Até: {new Date(coupon.valid_until).toLocaleDateString("pt-BR")} · </>}
                      Criado: {new Date(coupon.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </Card>
                </AnimatedContainer>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
