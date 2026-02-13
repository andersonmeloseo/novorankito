import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteUrls, useAddSiteUrl, useDeleteSiteUrl } from "@/hooks/use-data-modules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Search, Download, Tag, Send, ExternalLink, Plus, Trash2, Filter,
  Eye, MousePointerClick, TrendingUp, ArrowUpDown,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  noindex: "bg-warning/10 text-warning border-warning/20",
  redirect: "bg-info/10 text-info border-info/20",
  "404": "bg-destructive/10 text-destructive border-destructive/20",
};
const STATUS_LABELS: Record<string, string> = { active: "Ativo", noindex: "Noindex", redirect: "Redirecionado", "404": "404" };
const PRIORITY_COLORS: Record<string, string> = { high: "bg-destructive/10 text-destructive", medium: "bg-warning/10 text-warning", low: "bg-muted text-muted-foreground" };
const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

export default function UrlsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("page");
  const [newGroup, setNewGroup] = useState("");
  const [drawerUrl, setDrawerUrl] = useState<any>(null);

  // Get first project
  const { data: projects = [] } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").limit(1);
      return data || [];
    },
    enabled: !!user,
  });
  const projectId = projects[0]?.id;

  const { data: urls = [], isLoading } = useSiteUrls(projectId);
  const addUrl = useAddSiteUrl();
  const deleteUrl = useDeleteSiteUrl();

  const filtered = urls.filter((u: any) => {
    const matchSearch = u.url.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id: string) => {
    setSelectedUrls((prev) => prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]);
  };

  const allSelected = filtered.length > 0 && selectedUrls.length === filtered.length;

  const handleAdd = async () => {
    if (!projectId || !newUrl.trim()) return;
    try {
      await addUrl.mutateAsync({ project_id: projectId, url: newUrl.trim(), url_type: newType, url_group: newGroup || undefined });
      toast({ title: "URL adicionada" });
      setAddDialog(false);
      setNewUrl("");
      setNewGroup("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <TopBar title="URLs" subtitle="Inventário completo de páginas, status e prioridades de otimização" />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar URLs..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="noindex">Noindex</SelectItem>
                <SelectItem value="redirect">Redirecionado</SelectItem>
                <SelectItem value="404">404</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" disabled={selectedUrls.length === 0}>
              <Tag className="h-3 w-3" /> Tag
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" disabled={selectedUrls.length === 0}>
              <Send className="h-3 w-3" /> Indexar
            </Button>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => setAddDialog(true)}>
              <Plus className="h-3 w-3" /> Adicionar URL
            </Button>
          </div>
        </div>

        {selectedUrls.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{selectedUrls.length} selecionada(s)</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => {
              selectedUrls.forEach((id) => deleteUrl.mutate(id));
              setSelectedUrls([]);
            }}>
              <Trash2 className="h-3 w-3 mr-1" /> Excluir
            </Button>
          </div>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left w-10">
                    <Checkbox checked={allSelected} onCheckedChange={(checked) => setSelectedUrls(checked ? filtered.map((u: any) => u.id) : [])} />
                  </th>
                  {["URL", "Tipo", "Grupo", "Status", "Prioridade", "Descoberta", ""].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma URL encontrada. Adicione sua primeira URL.</td></tr>
                ) : (
                  filtered.map((item: any) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setDrawerUrl(item)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedUrls.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground max-w-[300px] truncate">{item.url}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px] font-normal">{item.url_type}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.url_group || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[item.status] || ""}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[item.priority] || ""}`}>
                          {PRIORITY_LABELS[item.priority] || item.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(item.discovered_at), "dd/MM/yyyy")}
                      </td>
                      <td className="px-4 py-3"><ExternalLink className="h-3 w-3 text-muted-foreground" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} URLs</span>
        </div>
      </div>

      {/* Add URL Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar URL</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="https://exemplo.com/pagina" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            <div className="flex gap-2">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Página</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="landing">Landing Page</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Grupo (opcional)" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} className="flex-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={addUrl.isPending || !newUrl.trim()}>
              {addUrl.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Drawer */}
      <Sheet open={!!drawerUrl} onOpenChange={() => setDrawerUrl(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {drawerUrl && (
            <>
              <SheetHeader>
                <SheetTitle className="text-sm font-mono break-all">{drawerUrl.url}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="secondary" className="text-[10px] ml-1">{drawerUrl.url_type}</Badge></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[drawerUrl.status]}`}>{STATUS_LABELS[drawerUrl.status]}</span></div>
                  <div><span className="text-muted-foreground">Prioridade:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[drawerUrl.priority]}`}>{PRIORITY_LABELS[drawerUrl.priority]}</span></div>
                  <div><span className="text-muted-foreground">Grupo:</span> <span className="ml-1 text-foreground">{drawerUrl.url_group || "—"}</span></div>
                </div>
                <Card className="p-4 text-center text-xs text-muted-foreground">
                  Dados de SEO e Analytics serão exibidos aqui quando disponíveis.
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
