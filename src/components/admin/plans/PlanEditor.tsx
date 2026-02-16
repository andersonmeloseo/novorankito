import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedContainer } from "@/components/ui/animated-container";
import {
  Settings2, ToggleLeft, Save, Check, AlertTriangle, Users,
  FolderOpen, Bot, Activity, Send, Shield, Trash2, Crown, Zap, Infinity, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAdminPlanFeatures, useUpdatePlan, useTogglePlanFeature,
  useCreatePlanFeature, useDeletePlanFeature,
  type Plan, type PlanFeature,
} from "@/hooks/use-plans";
import { DeletePlanDialog } from "./DeletePlanDialog";

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap, start: Zap, growth: Crown, unlimited: Infinity,
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground border-border",
  start: "bg-muted text-muted-foreground border-border",
  growth: "bg-primary/10 text-primary border-primary/20",
  unlimited: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const LIMIT_FIELDS = [
  { key: "projects_limit", label: "Projetos", icon: FolderOpen, description: "Máx. projetos por conta (-1 = ilimitado)" },
  { key: "events_limit", label: "Eventos / mês", icon: Activity, description: "Eventos de tracking por mês (-1 = ilimitado)" },
  { key: "ai_requests_limit", label: "Requisições IA / mês", icon: Bot, description: "Chamadas ao Rankito IA por mês (-1 = ilimitado)" },
  { key: "members_limit", label: "Membros", icon: Users, description: "Membros por conta (-1 = ilimitado)" },
  { key: "indexing_daily_limit", label: "Indexação / dia", icon: Send, description: "Notificações de indexação por dia" },
] as const;

interface PlanEditorProps {
  plan: Plan;
  subscriberCount: number;
  onDeleted: () => void;
}

export function PlanEditor({ plan, subscriberCount, onDeleted }: PlanEditorProps) {
  const updatePlan = useUpdatePlan();
  const { data: features = [], isLoading: featuresLoading } = useAdminPlanFeatures(plan.id);
  const toggleFeature = useTogglePlanFeature();
  const createFeature = useCreatePlanFeature();
  const deleteFeature = useDeletePlanFeature();

  const [editValues, setEditValues] = useState<Partial<Plan>>({});
  const [dirty, setDirty] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newFeatureKey, setNewFeatureKey] = useState("");
  const [newFeatureName, setNewFeatureName] = useState("");

  // Reset when plan changes
  const [lastPlanId, setLastPlanId] = useState(plan.id);
  if (plan.id !== lastPlanId) {
    setLastPlanId(plan.id);
    setEditValues({});
    setDirty(false);
  }

  const getValue = <K extends keyof Plan>(key: K): Plan[K] =>
    key in editValues ? (editValues[key] as Plan[K]) : plan[key];

  const setValue = (key: keyof Plan, value: any) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updatePlan.mutate(
      { id: plan.id, ...editValues },
      {
        onSuccess: () => {
          toast.success("Plano atualizado com sucesso");
          setEditValues({});
          setDirty(false);
        },
        onError: (err) => toast.error("Erro ao salvar: " + err.message),
      }
    );
  };

  const handleToggleFeature = (feature: PlanFeature) => {
    toggleFeature.mutate(
      { featureId: feature.id, enabled: !feature.enabled },
      {
        onSuccess: () => toast.success(`${feature.feature_name}: ${!feature.enabled ? "ativado" : "desativado"}`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleAddFeature = () => {
    if (!newFeatureKey.trim() || !newFeatureName.trim()) {
      toast.error("Preencha key e nome da feature");
      return;
    }
    createFeature.mutate(
      { plan_id: plan.id, feature_key: newFeatureKey.trim(), feature_name: newFeatureName.trim(), enabled: true },
      {
        onSuccess: () => {
          toast.success("Feature adicionada");
          setNewFeatureKey("");
          setNewFeatureName("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDeleteFeature = (feature: PlanFeature) => {
    deleteFeature.mutate(feature.id, {
      onSuccess: () => toast.success(`Feature "${feature.feature_name}" removida`),
      onError: (err) => toast.error(err.message),
    });
  };

  const Icon = PLAN_ICONS[plan.slug] || Zap;

  return (
    <>
      <AnimatedContainer delay={0.1}>
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl border", PLAN_COLORS[plan.slug] || PLAN_COLORS.free)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Editando plano "{plan.slug}" · {subscriberCount} assinante{subscriberCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dirty && (
                  <Badge variant="outline" className="text-[9px] gap-1 border-warning/30 text-warning">
                    <AlertTriangle className="h-2.5 w-2.5" /> Não salvo
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!dirty || updatePlan.isPending} className="gap-1.5 text-xs">
                  {updatePlan.isPending ? <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent" /> : <Save className="h-3 w-3" />}
                  Salvar
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <div className="px-5 pt-3 border-b border-border">
              <TabsList className="bg-transparent h-auto p-0 gap-1">
                <TabsTrigger value="general" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-3 py-1.5">
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Geral
                </TabsTrigger>
                <TabsTrigger value="limits" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-3 py-1.5">
                  <Shield className="h-3.5 w-3.5 mr-1.5" /> Limites
                </TabsTrigger>
                <TabsTrigger value="features" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-3 py-1.5">
                  <ToggleLeft className="h-3.5 w-3.5 mr-1.5" /> Features
                  <Badge variant="secondary" className="text-[8px] ml-1.5">
                    {features.filter(f => f.enabled).length}/{features.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-5">
              {/* General Tab */}
              <TabsContent value="general" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do Plano</Label>
                    <Input value={getValue("name")} onChange={e => setValue("name", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Slug</Label>
                    <Input value={getValue("slug")} onChange={e => setValue("slug", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço (R$)</Label>
                    <Input type="number" value={getValue("price")} onChange={e => setValue("price", parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ordem de Exibição</Label>
                    <Input type="number" value={getValue("sort_order")} onChange={e => setValue("sort_order", parseInt(e.target.value) || 0)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Descrição</Label>
                    <Input value={getValue("description") || ""} onChange={e => setValue("description", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={getValue("is_active")} onCheckedChange={v => setValue("is_active", v)} />
                    <Label className="text-xs">Plano ativo</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={getValue("is_default")} onCheckedChange={v => setValue("is_default", v)} />
                    <Label className="text-xs">Plano padrão (novos usuários)</Label>
                  </div>
                </div>
              </TabsContent>

              {/* Limits Tab */}
              <TabsContent value="limits" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LIMIT_FIELDS.map((field) => {
                    const FieldIcon = field.icon;
                    const val = getValue(field.key as keyof Plan) as number;
                    return (
                      <div key={field.key} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <FieldIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">{field.label}</span>
                          {val === -1 && (
                            <Badge variant="secondary" className="text-[8px] ml-auto">Ilimitado</Badge>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={val}
                          onChange={e => setValue(field.key as keyof Plan, parseInt(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">{field.description}</p>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="mt-0 space-y-4">
                {/* Add feature */}
                <div className="flex items-end gap-2 p-3 rounded-lg border border-dashed border-border bg-muted/20">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Feature Key</Label>
                    <Input value={newFeatureKey} onChange={e => setNewFeatureKey(e.target.value)} placeholder="ex: ab_testing" className="h-8 text-xs" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Nome</Label>
                    <Input value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)} placeholder="ex: Testes A/B" className="h-8 text-xs" />
                  </div>
                  <Button size="sm" onClick={handleAddFeature} disabled={createFeature.isPending} className="h-8 text-xs gap-1">
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>

                {featuresLoading ? (
                  <div className="h-20 flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {features.map((feature) => (
                      <div
                        key={feature.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 transition-all duration-200",
                          feature.enabled
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-card"
                        )}
                      >
                        <button
                          onClick={() => handleToggleFeature(feature)}
                          className="flex items-center gap-2.5 text-left flex-1"
                          disabled={toggleFeature.isPending}
                        >
                          <div
                            className={cn(
                              "h-5 w-5 rounded-md flex items-center justify-center transition-colors",
                              feature.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {feature.enabled ? <Check className="h-3 w-3" /> : <span className="text-[10px]">—</span>}
                          </div>
                          <div>
                            <span className="text-xs font-medium text-foreground">{feature.feature_name}</span>
                            <span className="text-[10px] text-muted-foreground block">{feature.feature_key}</span>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <Switch checked={feature.enabled} tabIndex={-1} className="pointer-events-none" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteFeature(feature)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </AnimatedContainer>

      <DeletePlanDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        plan={plan}
        subscriberCount={subscriberCount}
        onDeleted={onDeleted}
      />
    </>
  );
}
