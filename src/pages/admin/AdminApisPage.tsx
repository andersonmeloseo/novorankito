import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Key, CheckCircle2, XCircle, Eye, EyeOff,
  Brain, MessageSquare, Globe, Zap, Plug,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useApiConfigurations,
  useUpdateApiConfig,
} from "@/hooks/use-api-configurations";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  ai: Brain,
  messaging: MessageSquare,
  analytics: Zap,
  seo: Globe,
  payment: Key,
  integration: Plug,
};

export default function AdminApisPage() {
  const { data: apis = [], isLoading } = useApiConfigurations();
  const updateApi = useUpdateApiConfig();

  // Track which card has the key input open and the typed value
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveKey = async (api: typeof apis[0]) => {
    if (!keyValue.trim()) {
      toast({ title: "Erro", description: "Cole a chave da API", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateApi.mutateAsync({
        id: api.id,
        secret_value: keyValue.trim(),
        status: "active",
        is_configured: true,
      });
      toast({ title: `${api.name} configurada com sucesso!` });
      setEditingId(null);
      setKeyValue("");
      setShowKey(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (api: typeof apis[0]) => {
    const newStatus = api.status === "active" ? "inactive" : "active";
    try {
      await updateApi.mutateAsync({ id: api.id, status: newStatus });
      toast({ title: `${api.name} ${newStatus === "active" ? "ativada" : "desativada"}` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const activeCount = apis.filter(a => a.status === "active").length;
  const configuredCount = apis.filter(a => a.is_configured).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="APIs & Chaves"
        description="Selecione a API, cole sua chave e ative. Simples assim."
      />

      {/* KPIs compactos */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs">
          <Key className="h-3 w-3" /> {apis.length} APIs
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs text-success border-success/30">
          <CheckCircle2 className="h-3 w-3" /> {activeCount} Ativas
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs">
          <Zap className="h-3 w-3" /> {configuredCount} Configuradas
        </Badge>
        {apis.length - configuredCount > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs text-warning border-warning/30">
            <XCircle className="h-3 w-3" /> {apis.length - configuredCount} Pendentes
          </Badge>
        )}
      </div>

      {/* Cards de APIs */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Carregando APIs...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apis.map(api => {
            const Icon = CATEGORY_ICONS[api.category] || Plug;
            const isEditing = editingId === api.id;
            const isActive = api.status === "active";

            return (
              <Card key={api.id} className={`p-4 space-y-3 transition-all ${isActive ? "border-success/30" : ""}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isActive ? "bg-success/10" : "bg-muted"}`}>
                      <Icon className={`h-4 w-4 ${isActive ? "text-success" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{api.name}</div>
                      <div className="text-[11px] text-muted-foreground">{api.service_name}</div>
                    </div>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleStatus(api)}
                    disabled={!api.is_configured && !isActive}
                  />
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {api.is_configured ? (
                    <Badge variant="outline" className="text-[10px] text-success border-success/30 gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Chave configurada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-warning border-warning/30 gap-1">
                      <XCircle className="h-2.5 w-2.5" /> Sem chave
                    </Badge>
                  )}
                </div>

                {/* Ação: configurar chave */}
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        placeholder="Cole sua API key aqui..."
                        value={keyValue}
                        onChange={e => setKeyValue(e.target.value)}
                        className="text-xs font-mono pr-9"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="text-xs h-7 flex-1"
                        onClick={() => handleSaveKey(api)}
                        disabled={saving}
                      >
                        {saving ? "Salvando..." : "Salvar e Ativar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => { setEditingId(null); setKeyValue(""); setShowKey(false); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">🔒 A chave será encriptada automaticamente</p>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={api.is_configured ? "outline" : "default"}
                    className="text-xs h-8 w-full"
                    onClick={() => { setEditingId(api.id); setKeyValue(""); setShowKey(false); }}
                  >
                    <Key className="h-3 w-3 mr-1.5" />
                    {api.is_configured ? "Alterar Chave" : "Configurar Chave"}
                  </Button>
                )}

                {/* Descrição */}
                {api.description && (
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{api.description}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
