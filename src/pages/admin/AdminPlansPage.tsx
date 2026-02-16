import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AnimatedContainer } from "@/components/ui/animated-container";
import {
  CreditCard, Crown, Zap, Infinity, Settings2, ToggleLeft,
  Save, Check, AlertTriangle, Users, FolderOpen, Bot, Activity,
  Send, ChevronRight, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAdminPlans, useAdminPlanFeatures, useUpdatePlan, useTogglePlanFeature,
  type Plan, type PlanFeature,
} from "@/hooks/use-plans";

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap,
  growth: Crown,
  unlimited: Infinity,
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground border-border",
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

export default function AdminPlansPage() {
  const { data: plans = [], isLoading } = useAdminPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Gestão de Planos" description="Configure planos, limites rígidos e features disponíveis para cada tier" />

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Plan cards */}
          <div className="space-y-3">
            {plans.map((plan, i) => {
              const Icon = PLAN_ICONS[plan.slug] || Zap;
              const isSelected = selectedPlan?.id === plan.id;
              return (
                <AnimatedContainer key={plan.id} delay={i * 0.05}>
                  <button
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-4 transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-2 rounded-lg border", PLAN_COLORS[plan.slug])}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-foreground block">{plan.name}</span>
                          <span className="text-[10px] text-muted-foreground">{plan.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.is_default && <Badge variant="secondary" className="text-[9px]">Padrão</Badge>}
                        <Badge variant={plan.is_active ? "default" : "destructive"} className="text-[9px]">
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        R$ {Number(plan.price).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {plan.projects_limit === -1 ? "∞" : plan.projects_limit}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {plan.events_limit === -1 ? "∞" : (plan.events_limit / 1000).toFixed(0) + "k"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          {plan.ai_requests_limit === -1 ? "∞" : plan.ai_requests_limit}
                        </span>
                      </div>
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-colors", isSelected ? "text-primary" : "text-muted-foreground/40")} />
                    </div>
                  </button>
                </AnimatedContainer>
              );
            })}
          </div>

          {/* Editor */}
          {selectedPlan && <PlanEditor plan={selectedPlan} />}
        </div>
      )}
    </div>
  );
}

function PlanEditor({ plan }: { plan: Plan }) {
  const updatePlan = useUpdatePlan();
  const { data: features = [], isLoading: featuresLoading } = useAdminPlanFeatures(plan.id);
  const toggleFeature = useTogglePlanFeature();

  const [editValues, setEditValues] = useState<Partial<Plan>>({});
  const [dirty, setDirty] = useState(false);

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

  const Icon = PLAN_ICONS[plan.slug] || Zap;

  return (
    <AnimatedContainer delay={0.1}>
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl border", PLAN_COLORS[plan.slug])}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">Editando plano "{plan.slug}"</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <Badge variant="outline" className="text-[9px] gap-1 border-warning/30 text-warning">
                  <AlertTriangle className="h-2.5 w-2.5" /> Alterações não salvas
                </Badge>
              )}
              <Button size="sm" onClick={handleSave} disabled={!dirty || updatePlan.isPending} className="gap-1.5 text-xs">
                {updatePlan.isPending ? <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent" /> : <Save className="h-3 w-3" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Basic Info */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Informações Gerais</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Plano</Label>
                <Input
                  value={getValue("name")}
                  onChange={(e) => setValue("name", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço (R$)</Label>
                <Input
                  type="number"
                  value={getValue("price")}
                  onChange={(e) => setValue("price", parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={getValue("description") || ""}
                  onChange={(e) => setValue("description", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={getValue("is_active")}
                  onCheckedChange={(v) => setValue("is_active", v)}
                />
                <Label className="text-xs">Plano ativo</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={getValue("is_default")}
                  onCheckedChange={(v) => setValue("is_default", v)}
                />
                <Label className="text-xs">Plano padrão (novos usuários)</Label>
              </div>
            </div>
          </section>

          <Separator />

          {/* Limits */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Limites Rígidos</h4>
            </div>
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
                      onChange={(e) => setValue(field.key as keyof Plan, parseInt(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">{field.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Features */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <ToggleLeft className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Features Incluídas</h4>
              <Badge variant="secondary" className="text-[9px] ml-auto">
                {features.filter((f) => f.enabled).length}/{features.length} ativas
              </Badge>
            </div>

            {featuresLoading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => handleToggleFeature(feature)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 transition-all duration-200 text-left",
                      feature.enabled
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card hover:border-muted-foreground/20"
                    )}
                    disabled={toggleFeature.isPending}
                  >
                    <div className="flex items-center gap-2.5">
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
                    </div>
                    <Switch checked={feature.enabled} tabIndex={-1} className="pointer-events-none" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </Card>
    </AnimatedContainer>
  );
}
