import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import { Map, Loader2, Plus, Trash2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface Props {
  projectId: string | undefined;
}

export function SitemapsTab({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [newSitemapUrl, setNewSitemapUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

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

  const sitemaps = data?.sitemap || [];

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
    if (!status) return <Badge variant="outline" className="text-[10px]">—</Badge>;
    const s = status.toLowerCase();
    if (s === "success") return <Badge variant="default" className="text-[10px] bg-success">Sucesso</Badge>;
    if (s.includes("error")) return <Badge variant="destructive" className="text-[10px]">Erro</Badge>;
    if (s === "pending") return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>;
    return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Submit new sitemap */}
      <AnimatedContainer>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Map className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
      ) : sitemaps.length === 0 ? (
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">URLs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Último Download</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sitemaps.map((sm: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                      <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[300px] truncate">{sm.path}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{sm.type || "—"}</td>
                      <td className="px-4 py-3">{statusBadge(sm.lastSubmitted ? "success" : "pending")}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {sm.contents?.map((c: any) => c.submitted || "—").join(", ") || "—"}
                      </td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}
