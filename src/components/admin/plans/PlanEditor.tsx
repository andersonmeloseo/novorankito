import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedContainer } from "@/components/ui/animated-container";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings2, ToggleLeft, Save, Check, AlertTriangle, Users,
  FolderOpen, Bot, Activity, Send, Shield, Trash2, Crown, Zap, Infinity,
  Plus, X, Copy, Sparkles, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAdminPlanFeatures, useUpdatePlan, useTogglePlanFeature,
  useCreatePlanFeature, useDeletePlanFeature, useDeletePlan,
  type Plan, type PlanFeature,
} from "@/hooks/use-plans";

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap, start: Zap, growth: Crown, unlimited: Infinity,
};

const LIMIT_FIELDS = [
  { key: "projects_limit", label: "Projetos", icon: FolderOpen, description: "Máx. projetos por conta", unit: "projetos" },
  { key: "events_limit", label: "Eventos / mês", icon: Activity, description: "Eventos de tracking mensais", unit: "eventos" },
  { key: "ai_requests_limit", label: "IA / mês", icon: Bot, description: "Chamadas ao Rankito IA", unit: "requisições" },
  { key: "members_limit", label: "Membros", icon: Users, description: "Membros por conta", unit: "membros" },
  { key: "indexing_daily_limit", label: "Indexação / dia", icon: Send, description: "Notificações de indexação diárias", unit: "urls" },
] as const;

interface PlanEditorProps {
  plan: Plan;
  subscriberCount: number;
  onDeleted: () => void;
}

export function PlanEditor({ plan, subscriberCount, onDeleted }: PlanEditorProps) {
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const { data: features = [], isLoading: featuresLoading } = useAdminPlanFeatures(plan.id);
  const toggleFeature = useTogglePlanFeature();
  const createFeature = useCreatePlanFeature();
  const deleteFeature = useDeletePlanFeature();

  const [editValues, setEditValues] = useState<Partial<Plan>>({});
  const [dirty, setDirty] = useState(false);
  const [newFeatureKey, setNewFeatureKey] = useState("");
  const [newFeatureName, setNewFeatureName] = useState("");
  const [showAddFeature, setShowAddFeature] = useState(false);

  const [lastPlanId, setLastPlanId] = useState(plan.id);
  if (plan.id !== lastPlanId) {
    setLastPlanId(plan.id);
    setEditValues({});
    setDirty(false);
  }

  const getValue = <K extends keyof Plan>(key: K): Plan[K] =>
    key in editValues ? (editValues[key] as Plan[K]) : plan[key];

  const setValue = (key: keyof Plan, value: any) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
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

  const handleDelete = () => {
    deletePlan.mutate(plan.id, {
      onSuccess: () => {
        toast.success(`Plano "${plan.name}" excluído`);
        onDeleted();
      },
      onError: (err) => toast.error("Erro: " + err.message),
    });
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
          setShowAddFeature(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDeleteFeature = (feature: PlanFeature) => {
    deleteFeature.mutate(feature.id, {
      onSuccess: () => toast.success(`"${feature.feature_name}" removida`),
      onError: (err) => toast.error(err.message),
    });
  };

  const Icon = PLAN_ICONS[plan.slug] || Zap;
  const enabledCount = features.filter(f => f.enabled).length;

  return (
    <AnimatedContainer delay={0.08}>
      <Card className="overflow-hidden border-border/60">
        {/* Header with gradient */}
        <div className="relative px-5 py-4 border-b border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-4/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <Badge variant="outline" className="text-[9px] font-mono">{plan.slug}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  R$ {Number(plan.price).toLocaleString("pt-BR")}/mês · {subscriberCount} assinante{subscriberCount !== 1 ? "s" : ""}
                  {plan.is_default && " · Plano padrão"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dirty && (
                <Badge className="text-[9px] gap-1 bg-warning/10 text-warning border-warning/30 animate-pulse">
                  <AlertTriangle className="h-2.5 w-2.5" /> Não salvo
                </Badge>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={subscriberCount > 0 || plan.is_default}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir plano "{plan.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todas as {features.length} features associadas serão removidas permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground text-xs gap-1.5">
                      <Trash2 className="h-3 w-3" /> Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!dirty || updatePlan.isPending}
                className="gap-1.5 text-xs shadow-sm"
              >
                {updatePlan.isPending ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <div className="px-5 border-b border-border bg-muted/20">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              <TabsTrigger
                value="general"
                className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Geral
              </TabsTrigger>
              <TabsTrigger
                value="limits"
                className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5" /> Limites
              </TabsTrigger>
              <TabsTrigger
                value="features"
                className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <ToggleLeft className="h-3.5 w-3.5 mr-1.5" /> Features
                <Badge variant="secondary" className="text-[8px] ml-1.5 font-mono">
                  {enabledCount}/{features.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-5">
            {/* ──── GENERAL ──── */}
            <TabsContent value="general" className="mt-0 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nome do Plano</Label>
                  <Input value={getValue("name")} onChange={e => setValue("name", e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Slug (identificador)</Label>
                  <Input value={getValue("slug")} onChange={e => setValue("slug", e.target.value)} className="h-9 text-sm font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Preço Mensal (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      value={getValue("price")}
                      onChange={e => setValue("price", parseFloat(e.target.value) || 0)}
                      className="h-9 text-sm pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ordem de Exibição</Label>
                  <Input type="number" value={getValue("sort_order")} onChange={e => setValue("sort_order", parseInt(e.target.value) || 0)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Descrição</Label>
                  <Textarea
                    value={getValue("description") || ""}
                    onChange={e => setValue("description", e.target.value)}
                    className="text-sm min-h-[60px] resize-none"
                    placeholder="Descrição curta visível para o cliente..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3 pr-5">
                  <Switch checked={getValue("is_active")} onCheckedChange={v => setValue("is_active", v)} />
                  <div>
                    <Label className="text-xs font-medium block">Plano Ativo</Label>
                    <span className="text-[10px] text-muted-foreground">Visível para novos clientes</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3 pr-5">
                  <Switch checked={getValue("is_default")} onCheckedChange={v => setValue("is_default", v)} />
                  <div>
                    <Label className="text-xs font-medium block">Plano Padrão</Label>
                    <span className="text-[10px] text-muted-foreground">Atribuído a novos usuários</span>
                  </div>
                </div>
              </div>

              {/* Plan ID */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>ID: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{plan.id}</code></span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(plan.id); toast.success("ID copiado"); }}
                    className="hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <span className="ml-4">Criado: {new Date(plan.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            </TabsContent>

            {/* ──── LIMITS ──── */}
            <TabsContent value="limits" className="mt-0 space-y-4">
              <p className="text-xs text-muted-foreground">
                Defina os limites rígidos para este plano. Use <code className="font-mono bg-muted px-1 rounded">-1</code> para ilimitado.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {LIMIT_FIELDS.map(field => {
                  const FieldIcon = field.icon;
                  const val = getValue(field.key as keyof Plan) as number;
                  const isUnlimited = val === -1;
                  return (
                    <div
                      key={field.key}
                      className={cn(
                        "rounded-xl border p-4 space-y-3 transition-colors",
                        isUnlimited ? "border-primary/20 bg-primary/3" : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-1.5 rounded-lg",
                            isUnlimited ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <FieldIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">{field.label}</span>
                        </div>
                        {isUnlimited && (
                          <Badge className="text-[8px] bg-primary/10 text-primary border-primary/20">∞</Badge>
                        )}
                      </div>
                      <Input
                        type="number"
                        value={val}
                        onChange={e => setValue(field.key as keyof Plan, parseInt(e.target.value) || 0)}
                        className="h-8 text-sm font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">{field.description}</p>
                      <button
                        onClick={() => setValue(field.key as keyof Plan, isUnlimited ? 0 : -1)}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        {isUnlimited ? <EyeOff className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
                        {isUnlimited ? "Definir limite" : "Tornar ilimitado"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ──── FEATURES ──── */}
            <TabsContent value="features" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {enabledCount} de {features.length} features ativas neste plano.
                </p>
                <Button
                  variant={showAddFeature ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowAddFeature(!showAddFeature)}
                  className="text-xs gap-1.5"
                >
                  {showAddFeature ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {showAddFeature ? "Cancelar" : "Nova Feature"}
                </Button>
              </div>

              {/* Add feature inline */}
              {showAddFeature && (
                <div className="flex items-end gap-2 p-3.5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Feature Key</Label>
                    <Input value={newFeatureKey} onChange={e => setNewFeatureKey(e.target.value)} placeholder="ex: ab_testing" className="h-8 text-xs font-mono" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Nome de exibição</Label>
                    <Input value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)} placeholder="ex: Testes A/B" className="h-8 text-xs" />
                  </div>
                  <Button size="sm" onClick={handleAddFeature} disabled={createFeature.isPending} className="h-8 text-xs gap-1 shrink-0">
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
              )}

              {featuresLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : features.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ToggleLeft className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma feature configurada</p>
                  <p className="text-xs">Adicione features usando o botão acima</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {features.map(feature => (
                    <div
                      key={feature.id}
                      className={cn(
                        "group flex items-center justify-between rounded-xl border p-3 transition-all duration-200",
                        feature.enabled
                          ? "border-primary/25 bg-primary/4 hover:bg-primary/6"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      <button
                        onClick={() => handleToggleFeature(feature)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                        disabled={toggleFeature.isPending}
                      >
                        <div className={cn(
                          "h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-all",
                          feature.enabled
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {feature.enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-foreground block truncate">{feature.feature_name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono block truncate">{feature.feature_key}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <Switch
                          checked={feature.enabled}
                          onCheckedChange={() => handleToggleFeature(feature)}
                          className="scale-75"
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover feature?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A feature "{feature.feature_name}" será removida deste plano.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteFeature(feature)}
                                className="bg-destructive text-destructive-foreground text-xs"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
  );
}
