import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Plus, Trash2, RefreshCw, XCircle, FileText, ArrowUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface Props {
  projectId: string | undefined;
}

type SortDir = "asc" | "desc";

function sortData(data: any[], key: string, dir: SortDir) {
  return [...data].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return dir === "desc" ? bv - av : av - bv;
    return dir === "desc" ? String(bv || "").localeCompare(String(av || "")) : String(av || "").localeCompare(String(bv || ""));
  });
}

export function SitemapsTab({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [newSitemapUrl, setNewSitemapUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "path", dir: "asc" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["gsc-sitemaps", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-sitemaps", {
        body: { project_id: projectId, action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId,
  });

  const rawSitemaps = data?.sitemap || [];

  const sitemaps = useMemo(() => {
    let rows = rawSitemaps.map((sm: any) => ({
      path: sm.path || "",
      type: sm.type || "—",
      status: sm.lastSubmitted ? "success" : "pending",
      urls: sm.contents?.map((c: any) => c.submitted || "—").join(", ") || "—",
      lastDownloaded: sm.lastDownloaded || "",
    }));
    if (searchTerm) rows = rows.filter((r: any) => r.path.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(rows, sort.key, sort.dir);
  }, [rawSitemaps, searchTerm, sort]);

  const submitSitemap = async () => {
    if (!projectId || !newSitemapUrl.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("gsc-sitemaps", {
        body: { project_id: projectId, action: "submit", sitemap_url: newSitemapUrl.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Sitemap enviado!", description: `${newSitemapUrl.trim()} foi submetido ao Google.` });
      setNewSitemapUrl("");
      queryClient.invalidateQueries({ queryKey: ["gsc-sitemaps"] });
    } catch (e: any) {
      toast({ title: "Erro ao enviar sitemap", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSitemap = async (sitemapUrl: string) => {
    if (!projectId) return;
    setDeletingUrl(sitemapUrl);
    try {
      const { data, error } = await supabase.functions.invoke("gsc-sitemaps", {
        body: { project_id: projectId, action: "delete", sitemap_url: sitemapUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Sitemap removido", description: `${sitemapUrl} foi removido.` });
      queryClient.invalidateQueries({ queryKey: ["gsc-sitemaps"] });
    } catch (e: any) {
      toast({ title: "Erro ao remover sitemap", description: e.message, variant: "destructive" });
    } finally {
      setDeletingUrl(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "success") return <Badge variant="default" className="text-[10px] bg-success">Sucesso</Badge>;
    if (status === "pending") return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>;
    return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  };

  const columns = [
    { key: "path", label: "URL" },
    { key: "type", label: "Tipo" },
    { key: "status", label: "Status" },
    { key: "urls", label: "URLs" },
    { key: "lastDownloaded", label: "Último Download" },
  ];

  return (
    <div className="space-y-4">
      {/* Submit new sitemap */}
      <AnimatedContainer>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="URL do sitemap (ex: https://seusite.com/sitemap.xml)"
                value={newSitemapUrl}
                onChange={(e) => setNewSitemapUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSitemap()}
                className="pl-10"
              />
            </div>
            <Button onClick={submitSitemap} disabled={submitting || !newSitemapUrl.trim()} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Enviar Sitemap
            </Button>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Search filter */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar sitemaps..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-8 h-9 text-xs"
        />
      </div>

      {/* Sitemaps list */}
      {isLoading ? (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : error ? (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <XCircle className="h-4 w-4" />
            {(error as Error).message}
          </div>
        </Card>
      ) : sitemaps.length === 0 && !searchTerm ? (
        <EmptyState
          icon={FileText}
          title="Nenhum sitemap encontrado"
          description="Envie um sitemap acima para que o Google indexe suas páginas."
        />
      ) : (
        <AnimatedContainer delay={0.05}>
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{sitemaps.length} sitemaps</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1.5"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["gsc-sitemaps"] })}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => setSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === "desc" ? "asc" : "desc" }))}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          <ArrowUpDown className={`h-3 w-3 ${sort.key === col.key ? "text-primary" : "opacity-40"}`} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sitemaps.length === 0 ? (
                    <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
                  ) : (
                    sitemaps.map((sm: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                        <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[300px] truncate" title={sm.path}>{sm.path}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{sm.type}</td>
                        <td className="px-4 py-3">{statusBadge(sm.status)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{sm.urls}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {sm.lastDownloaded ? format(parseISO(sm.lastDownloaded), "dd/MM/yyyy HH:mm") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteSitemap(sm.path)}
                            disabled={deletingUrl === sm.path}
                          >
                            {deletingUrl === sm.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}
