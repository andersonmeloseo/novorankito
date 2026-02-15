import { useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { useSiteUrls, useAddSiteUrl, useDeleteSiteUrl } from "@/hooks/use-data-modules";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Search, Download, Tag, ExternalLink, Plus, Trash2, Filter,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X, Eye, Loader2, Globe,
} from "lucide-react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  noindex: "bg-warning/10 text-warning border-warning/20",
  redirect: "bg-info/10 text-info border-info/20",
  "404": "bg-destructive/10 text-destructive border-destructive/20",
};
const STATUS_LABELS: Record<string, string> = { active: "Ativo", noindex: "Noindex", redirect: "Redirecionado", "404": "404" };
const PRIORITY_COLORS: Record<string, string> = { high: "bg-destructive/10 text-destructive", medium: "bg-warning/10 text-warning", low: "bg-muted text-muted-foreground" };
const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

type SortKey = "url" | "url_type" | "url_group" | "status" | "discovered_at" | "meta_title" | "meta_description";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

export default function UrlsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("discovered_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [addDialog, setAddDialog] = useState(false);
  const [tagDialog, setTagDialog] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("page");
  const [newGroup, setNewGroup] = useState("");
  const [drawerUrl, setDrawerUrl] = useState<any>(null);
  const [fetchingMeta, setFetchingMeta] = useState(false);

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

  // Extract unique groups and types for filters
  const allGroups = useMemo(() => Array.from(new Set(urls.map((u: any) => u.url_group).filter(Boolean))), [urls]);
  const allTypes = useMemo(() => Array.from(new Set(urls.map((u: any) => u.url_type).filter(Boolean))), [urls]);

  // Filter
  const filtered = useMemo(() => {
    return urls.filter((u: any) => {
      const matchSearch = u.url.toLowerCase().includes(search.toLowerCase()) ||
        (u.meta_title || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.meta_description || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      const matchType = typeFilter === "all" || u.url_type === typeFilter;
      const matchGroup = groupFilter === "all" || u.url_group === groupFilter;
      const matchPriority = priorityFilter === "all" || u.priority === priorityFilter;
      return matchSearch && matchStatus && matchType && matchGroup && matchPriority;
    });
  }, [urls, search, statusFilter, typeFilter, groupFilter, priorityFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedUrls((prev) => prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]);
  };

  const allSelected = paginated.length > 0 && paginated.every((u: any) => selectedUrls.includes(u.id));

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

  const handleBulkTag = async () => {
    if (!newTag.trim() || selectedUrls.length === 0) return;
    try {
      for (const id of selectedUrls) {
        const url = urls.find((u: any) => u.id === id) as any;
        const currentTags: string[] = url?.tags || [];
        if (!currentTags.includes(newTag.trim())) {
          await supabase.from("site_urls").update({ tags: [...currentTags, newTag.trim()] }).eq("id", id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["site-urls"] });
      toast({ title: `Tag "${newTag}" aplicada a ${selectedUrls.length} URLs` });
      setTagDialog(false);
      setNewTag("");
      setSelectedUrls([]);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    const headers = ["URL", "Meta Title", "Meta Description", "Tipo", "Grupo", "Status", "Prioridade", "Tags", "Descoberta"];
    const rows = filtered.map((u: any) => [
      u.url, u.meta_title || "", u.meta_description || "", u.url_type, u.url_group || "", u.status, u.priority, (u.tags || []).join(";"), u.discovered_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "urls-export.csv";
    a.click();
  };

  const handleFetchMeta = async () => {
    if (selectedUrls.length === 0) return;
    setFetchingMeta(true);
    try {
      const urlsToFetch = selectedUrls.map((id) => {
        const u = urls.find((u: any) => u.id === id) as any;
        return { id, url: u?.url };
      }).filter((u) => u.url);

      // Process in batches of 10 to avoid timeouts
      let totalUpdated = 0;
      for (let i = 0; i < urlsToFetch.length; i += 10) {
        const batch = urlsToFetch.slice(i, i + 10);
        const { data, error } = await supabase.functions.invoke("fetch-meta-tags", {
          body: { urls: batch },
        });

        if (error) {
          console.error("Fetch meta error:", error);
          continue;
        }
        totalUpdated += data?.updated || 0;
      }

      queryClient.invalidateQueries({ queryKey: ["site-urls"] });
      toast({ title: `Meta tags atualizadas para ${totalUpdated} URLs` });
      setSelectedUrls([]);
    } catch (e: any) {
      console.error("Meta fetch error:", e);
      toast({ title: "Erro ao buscar meta tags", description: e.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setFetchingMeta(false);
    }
  };

  const activeFilters = [statusFilter !== "all", typeFilter !== "all", groupFilter !== "all", priorityFilter !== "all"].filter(Boolean).length;

  return (
    <>
      <TopBar title="URLs" subtitle="Inventário completo de páginas, meta tags e prioridades de otimização" />
      <div className="p-4 sm:p-6 space-y-4">
        <FeatureBanner icon={Globe} title="Inventário de URLs" description={<>Gerencie o inventário completo de <strong>páginas</strong>, <strong>meta tags</strong>, <strong>prioridades</strong> e <strong>grupos de URL</strong> do seu projeto.</>} />
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar por URL, título ou descrição..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleExportCSV}>
              <Download className="h-3 w-3" /> Exportar
            </Button>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => setAddDialog(true)}>
              <Plus className="h-3 w-3" /> Adicionar URL
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="noindex">Noindex</SelectItem>
              <SelectItem value="redirect">Redirecionado</SelectItem>
              <SelectItem value="404">404</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {allTypes.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Grupos</SelectItem>
              {allGroups.map((g: string) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setGroupFilter("all"); setPriorityFilter("all"); setPage(1); }}>
              <X className="h-3 w-3" /> Limpar filtros ({activeFilters})
            </Button>
          )}
        </div>

        {/* Selection toolbar */}
        {selectedUrls.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            <span className="font-medium text-foreground">{selectedUrls.length} selecionada(s)</span>
            <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={handleFetchMeta} disabled={fetchingMeta}>
              {fetchingMeta ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
              {fetchingMeta ? "Buscando..." : "Revelar Meta Tags"}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setTagDialog(true)}>
              <Tag className="h-3 w-3" /> Aplicar Tag
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => {
              selectedUrls.forEach((id) => deleteUrl.mutate(id));
              setSelectedUrls([]);
            }}>
              <Trash2 className="h-3 w-3" /> Excluir
            </Button>
          </div>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-3 text-left w-10">
                    <Checkbox checked={allSelected} onCheckedChange={(checked) => setSelectedUrls(checked ? paginated.map((u: any) => u.id) : [])} />
                  </th>
                  {([
                    { key: "url", label: "URL" },
                    { key: "meta_title", label: "Meta Title" },
                    { key: "meta_description", label: "Meta Description" },
                    { key: "url_type", label: "Tipo" },
                    { key: "url_group", label: "Grupo" },
                    { key: "status", label: "Status" },
                    { key: "discovered_at", label: "Descoberta" },
                  ] as { key: SortKey; label: string }[]).map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                      onClick={() => toggleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-xs text-muted-foreground">Carregando...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma URL encontrada. Adicione sua primeira URL.</td></tr>
                ) : (
                  paginated.map((item: any) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setDrawerUrl(item)}>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedUrls.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </td>
                      <td className="px-3 py-2.5 max-w-[250px]">
                        <div className="font-mono text-xs text-foreground truncate">{item.url}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{item.meta_title || <span className="text-muted-foreground/50 italic">N/A</span>}</td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground max-w-[220px] truncate">{item.meta_description || <span className="text-muted-foreground/50 italic">N/A</span>}</td>
                      <td className="px-3 py-2.5"><Badge variant="secondary" className="text-[10px] font-normal">{item.url_type}</Badge></td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.url_group || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[item.status] || ""}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.discovered_at), "dd/MM/yyyy")}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {(item.tags || []).slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                          ))}
                          {(item.tags || []).length > 3 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">+{item.tags.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} URLs no total · Página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
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

      {/* Tag Dialog */}
      <Dialog open={tagDialog} onOpenChange={setTagDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aplicar Tag</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Nome da tag para {selectedUrls.length} URL(s)</Label>
            <Input placeholder="Ex: blog, prioritário, revisar..." value={newTag} onChange={(e) => setNewTag(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialog(false)}>Cancelar</Button>
            <Button onClick={handleBulkTag} disabled={!newTag.trim()}>Aplicar</Button>
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
              <div className="mt-4 space-y-4">
                {/* Meta info */}
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Title</Label>
                    <p className="text-sm text-foreground mt-0.5">{drawerUrl.meta_title || <span className="text-muted-foreground italic">Não definido</span>}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Description</Label>
                    <p className="text-xs text-foreground mt-0.5">{drawerUrl.meta_description || <span className="text-muted-foreground italic">Não definido</span>}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="secondary" className="text-[10px] ml-1">{drawerUrl.url_type}</Badge></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[drawerUrl.status]}`}>{STATUS_LABELS[drawerUrl.status]}</span></div>
                  <div><span className="text-muted-foreground">Prioridade:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[drawerUrl.priority]}`}>{PRIORITY_LABELS[drawerUrl.priority]}</span></div>
                  <div><span className="text-muted-foreground">Grupo:</span> <span className="ml-1 text-foreground">{drawerUrl.url_group || "—"}</span></div>
                </div>
                {(drawerUrl.tags || []).length > 0 && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {drawerUrl.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
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
