import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Flag, Settings } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  useFeatureFlags, useCreateFeatureFlag, useToggleFeatureFlag, useDeleteFeatureFlag,
} from "@/hooks/use-super-admin";

const PLAN_OPTIONS = ["starter", "pro", "business", "enterprise"];

export function AdminFeatureFlagsTab() {
  const { data: flags = [], isLoading } = useFeatureFlags();
  const createFlag = useCreateFeatureFlag();
  const toggleFlag = useToggleFeatureFlag();
  const deleteFlag = useDeleteFeatureFlag();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "", enabled: false, allowed_plans: [] as string[] });

  const togglePlan = (plan: string) => {
    setForm(prev => ({
      ...prev,
      allowed_plans: prev.allowed_plans.includes(plan)
        ? prev.allowed_plans.filter(p => p !== plan)
        : [...prev.allowed_plans, plan],
    }));
  };

  const handleCreate = async () => {
    if (!form.key || !form.name) {
      toast({ title: "Erro", description: "Preencha a chave e o nome", variant: "destructive" });
      return;
    }
    try {
      await createFlag.mutateAsync(form);
      toast({ title: "Feature flag criada" });
      setForm({ key: "", name: "", description: "", enabled: false, allowed_plans: [] });
      setShowForm(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Feature Flags ({flags.length})</h3>
        <Button size="sm" className="text-xs h-8 gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" /> Nova Flag
        </Button>
      </div>

      {showForm && (
        <AnimatedContainer>
          <Card className="p-4 space-y-3 border-primary/30">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Chave (ex: ai_agent_v2)" value={form.key} onChange={e => setForm(prev => ({ ...prev, key: e.target.value }))} className="text-sm" />
              <Input placeholder="Nome amigável" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="text-sm" />
            </div>
            <Input placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="text-sm" />
            <div>
              <span className="text-xs text-muted-foreground mb-1.5 block">Planos permitidos:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {PLAN_OPTIONS.map(plan => (
                  <Button key={plan} variant={form.allowed_plans.includes(plan) ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => togglePlan(plan)}>
                    {plan}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={form.enabled} onCheckedChange={checked => setForm(prev => ({ ...prev, enabled: checked }))} />
                <span className="text-xs text-muted-foreground">Ativa por padrão</span>
              </div>
              <Button size="sm" className="text-xs h-8" onClick={handleCreate} disabled={createFlag.isPending}>
                {createFlag.isPending ? "Criando..." : "Criar Flag"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : flags.length === 0 ? (
        <Card className="p-8 text-center">
          <Flag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Nenhuma feature flag criada</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {flags.map(flag => (
            <AnimatedContainer key={flag.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Settings className={`h-4 w-4 shrink-0 ${flag.enabled ? "text-success" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground">{flag.name}</span>
                        <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{flag.key}</code>
                      </div>
                      {flag.description && <p className="text-[11px] text-muted-foreground">{flag.description}</p>}
                      <div className="flex items-center gap-1 mt-1">
                        {(flag.allowed_plans as string[]).length > 0 ? (
                          (flag.allowed_plans as string[]).map(plan => (
                            <Badge key={plan} variant="outline" className="text-[9px]">{plan}</Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Todos os planos</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={checked => toggleFlag.mutate({ id: flag.id, enabled: checked })}
                    />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteFlag.mutate(flag.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            </AnimatedContainer>
          ))}
        </div>
      )}
    </div>
  );
}
