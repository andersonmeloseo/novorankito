import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Link2, Loader2, ExternalLink, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  projectId: string | undefined;
}

export function LinksTab({ projectId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["gsc-links", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-links", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId,
  });

  const topPages = data?.topPages || [];
  const internalLinks = data?.internalLinks || [];

  const exportCSV = (rows: any[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => `"${r[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive/30 bg-destructive/5">
        <div className="text-destructive text-sm">{(error as Error).message}</div>
      </Card>
    );
  }

  if (topPages.length === 0 && internalLinks.length === 0) {
    return (
      <EmptyState
        icon={Link2}
        title="Sem dados de links"
        description="Os dados de links serão exibidos quando houver dados disponíveis no GSC."
      />
    );
  }

  return (
    <Tabs defaultValue="top-pages">
      <TabsList className="mb-4">
        <TabsTrigger value="top-pages" className="text-xs">Top Páginas (Performance)</TabsTrigger>
        <TabsTrigger value="coverage" className="text-xs">Cobertura de Queries</TabsTrigger>
      </TabsList>

      <TabsContent value="top-pages">
        <AnimatedContainer>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground">{topPages.length} páginas</span>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => exportCSV(topPages, "top-pages")}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Página</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cliques</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Impressões</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.slice(0, 50).map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                      <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[400px] truncate">
                        <a href={row.page} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                          {row.page}
                          <ExternalLink className="h-3 w-3 opacity-40" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.clicks).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.impressions).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </AnimatedContainer>
      </TabsContent>

      <TabsContent value="coverage">
        <AnimatedContainer>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground">{internalLinks.length} páginas com cobertura de queries</span>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => exportCSV(internalLinks, "query-coverage")}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Página</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Queries</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cliques</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Impressões</th>
                  </tr>
                </thead>
                <tbody>
                  {internalLinks.slice(0, 50).map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                      <td className="px-4 py-3 text-xs font-mono text-foreground max-w-[350px] truncate">{row.page}</td>
                      <td className="px-4 py-3 text-xs text-primary font-semibold">{row.queryCount}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.clicks).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.impressions).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </AnimatedContainer>
      </TabsContent>
    </Tabs>
  );
}
