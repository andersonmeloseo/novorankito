import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Key, Plus, Trash2, Pencil, CheckCircle2, XCircle,
  ExternalLink, Search, Zap, MessageSquare, Globe, Brain, Plug,
} from "lucide-react";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";
import {
  useApiConfigurations,
  useCreateApiConfig,
  useUpdateApiConfig,
  useDeleteApiConfig,
} from "@/hooks/use-api-configurations";

const CATEGORIES = [
  { value: "ai", label: "Inteligência Artificial", icon: Brain },
  { value: "messaging", label: "Mensageria", icon: MessageSquare },
  { value: "analytics", label: "Analytics", icon: Zap },
  { value: "seo", label: "SEO", icon: Globe },
  { value: "payment", label: "Pagamentos", icon: Key },
  { value: "integration", label: "Integração", icon: Plug },
];

const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat;
const getCategoryIcon = (cat: string) => CATEGORIES.find(c => c.value === cat)?.icon || Plug;

const emptyForm = {
  name: "",
  service_name: "",
  description: "",
  secret_key_name: "",
  category: "integration",
  base_url: "",
  docs_url: "",
  status: "inactive",
  is_configured: false,
};

export default function AdminApisPage() {
  const { data: apis = [], isLoading } = useApiConfigurations();
  const createApi = useCreateApiConfig();
  const updateApi = useUpdateApiConfig();
  const deleteApi = useDeleteApiConfig();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  const filtered = apis.filter(api => {
    const matchSearch = !search ||
      api.name.toLowerCase().includes(search.toLowerCase()) ||
      api.service_name.toLowerCase().includes(search.toLowerCase()) ||
      api.secret_key_name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || api.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const activeCount = apis.filter(a => a.status === "active").length;
  const configuredCount = apis.filter(a => a.is_configured).length;
  const categoryCounts = apis.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (api: typeof apis[0]) => {
    setEditId(api.id);
    setForm({
      name: api.name,
      service_name: api.service_name,
      description: api.description || "",
      secret_key_name: api.secret_key_name,
      category: api.category,
      base_url: api.base_url || "",
      docs_url: api.docs_url || "",
      status: api.status,
      is_configured: api.is_configured,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.service_name || !form.secret_key_name) {
      toast({ title: "Erro", description: "Preencha nome, serviço e nome da secret", variant: "destructive" });
      return;
    }
    try {
      if (editId) {
        await updateApi.mutateAsync({
          id: editId,
          name: form.name,
          service_name: form.service_name,
          description: form.description || null,
          secret_key_name: form.secret_key_name,
          category: form.category,
          base_url: form.base_url || null,
          docs_url: form.docs_url || null,
          status: form.status,
          is_configured: form.is_configured,
        });
        toast({ title: "API atualizada" });
      } else {
        await createApi.mutateAsync({
          name: form.name,
          service_name: form.service_name,
          description: form.description || undefined,
          secret_key_name: form.secret_key_name,
          category: form.category,
          base_url: form.base_url || undefined,
          docs_url: form.docs_url || undefined,
          status: form.status,
          is_configured: form.is_configured,
        });
        toast({ title: "API adicionada" });
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteApi.mutateAsync(deleteDialog.id);
      toast({ title: "API removida" });
      setDeleteDialog({ open: false, id: "", name: "" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const toggleStatus = async (api: typeof apis[0]) => {
    const newStatus = api.status === "active" ? "inactive" : "active";
    await updateApi.mutateAsync({ id: api.id, status: newStatus });
    toast({ title: `API ${newStatus === "active" ? "ativada" : "desativada"}` });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="APIs & Chaves" description="Gestão centralizada de todas as APIs, chaves e integrações do sistema" />

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{apis.length}</div>
            <div className="text-xs text-muted-foreground">Total de APIs</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{activeCount}</div>
            <div className="text-xs text-muted-foreground">Ativas</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-chart-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{configuredCount}</div>
            <div className="text-xs text-muted-foreground">Configuradas</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <XCircle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{apis.length - configuredCount}</div>
            <div className="text-xs text-muted-foreground">Não Configuradas</div>
          </div>
        </Card>
      </StaggeredGrid>

      {/* Toolbar */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">APIs do Sistema</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs w-48"
                placeholder="Buscar API..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="text-xs h-8 gap-1" onClick={openCreate}>
              <Plus className="h-3 w-3" /> Nova API
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Serviço", "Nome da Secret", "Categoria", "Status", "Configurada", "Atualizada", ""].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma API encontrada</td></tr>
              ) : filtered.map(api => {
                const CatIcon = getCategoryIcon(api.category);
                return (
                  <tr key={api.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <div className="text-xs font-medium text-foreground">{api.name}</div>
                          <div className="text-[10px] text-muted-foreground">{api.service_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        {api.secret_key_name}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{getCategoryLabel(api.category)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(api.status)} className="text-[10px]">
                        {translateStatus(api.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {api.is_configured ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(api.updated_at), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={api.status === "active"}
                          onCheckedChange={() => toggleStatus(api)}
                          className="scale-75"
                        />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(api)} title="Editar">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {api.docs_url && (
                          <a href={api.docs_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Documentação">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteDialog({ open: true, id: api.id, name: api.name })}
                          title="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar API" : "Adicionar Nova API"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nome</label>
                <Input
                  placeholder="Ex: OpenAI API Key"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Serviço</label>
                <Input
                  placeholder="Ex: OpenAI"
                  value={form.service_name}
                  onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome da Secret (env var)</label>
              <Input
                placeholder="Ex: OPENAI_API_KEY"
                value={form.secret_key_name}
                onChange={e => setForm(p => ({ ...p, secret_key_name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                className="text-sm font-mono"
                disabled={!!editId}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Textarea
                placeholder="Descrição da API e seu uso no sistema"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Categoria</label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">URL Base (opcional)</label>
                <Input
                  placeholder="https://api.service.com"
                  value={form.base_url}
                  onChange={e => setForm(p => ({ ...p, base_url: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">URL Documentação (opcional)</label>
                <Input
                  placeholder="https://docs.service.com"
                  value={form.docs_url}
                  onChange={e => setForm(p => ({ ...p, docs_url: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_configured}
                onCheckedChange={checked => setForm(p => ({ ...p, is_configured: checked }))}
              />
              <span className="text-xs text-muted-foreground">Secret já configurada no sistema</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createApi.isPending || updateApi.isPending}>
              {createApi.isPending || updateApi.isPending ? "Salvando..." : editId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onOpenChange={open => !open && setDeleteDialog({ open: false, id: "", name: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover API</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteDialog.name}</strong>? Esta ação não remove a secret do sistema, apenas o registro.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: "", name: "" })}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteApi.isPending}>
              {deleteApi.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
