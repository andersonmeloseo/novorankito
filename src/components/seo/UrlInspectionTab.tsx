import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, Smartphone, Monitor, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  projectId: string | undefined;
}

export function UrlInspectionTab({ projectId }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const inspect = async () => {
    if (!projectId || !url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("gsc-inspect-url", {
        body: { project_id: projectId, url: url.trim() },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Erro ao inspecionar URL");
    } finally {
      setLoading(false);
    }
  };

  const inspection = result?.inspectionResult;
  const indexing = inspection?.indexStatusResult;
  const mobile = inspection?.mobileUsabilityResult;
  const richResults = inspection?.richResultsResult;

  const statusIcon = (verdict: string) => {
    if (verdict === "PASS" || verdict === "VERDICT_PASS") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (verdict === "FAIL" || verdict === "VERDICT_FAIL") return <XCircle className="h-4 w-4 text-destructive" />;
    if (verdict === "NEUTRAL" || verdict === "VERDICT_NEUTRAL") return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const statusBadge = (verdict: string) => {
    const map: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
      PASS: { label: "Aprovado", variant: "default" },
      VERDICT_PASS: { label: "Aprovado", variant: "default" },
      FAIL: { label: "Reprovado", variant: "destructive" },
      VERDICT_FAIL: { label: "Reprovado", variant: "destructive" },
      NEUTRAL: { label: "Neutro", variant: "secondary" },
      VERDICT_NEUTRAL: { label: "Neutro", variant: "secondary" },
      VERDICT_UNSPECIFIED: { label: "Não verificado", variant: "outline" },
    };
    const s = map[verdict] || { label: verdict || "—", variant: "outline" as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cole a URL para inspecionar (ex: https://seusite.com/pagina)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inspect()}
                className="pl-10"
              />
            </div>
            <Button onClick={inspect} disabled={loading || !url.trim()} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Inspecionar
            </Button>
          </div>
        </Card>
      </AnimatedContainer>

      {error && (
        <AnimatedContainer>
          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {inspection && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Indexing Status */}
          <AnimatedContainer delay={0.05}>
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Status de Indexação</h4>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Veredicto</span>
                  {statusBadge(indexing?.verdict)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Cobertura</span>
                  <span className="text-xs font-medium">{indexing?.coverageState || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Robôs</span>
                  <span className="text-xs font-medium">{indexing?.robotsTxtState || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Indexação</span>
                  <span className="text-xs font-medium">{indexing?.indexingState || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Último Crawl</span>
                  <span className="text-xs font-medium">{indexing?.lastCrawlTime ? new Date(indexing.lastCrawlTime).toLocaleDateString("pt-BR") : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Sitemap</span>
                  <span className="text-xs font-medium truncate max-w-[200px]">{indexing?.sitemap || "Nenhum"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Referenciado por</span>
                  <span className="text-xs font-medium">{indexing?.referringUrls?.join(", ") || "—"}</span>
                </div>
                {indexing?.pageFetchState && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Fetch Status</span>
                    <span className="text-xs font-medium">{indexing.pageFetchState}</span>
                  </div>
                )}
                {indexing?.crawledAs && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Crawled como</span>
                    <span className="text-xs font-medium">{indexing.crawledAs}</span>
                  </div>
                )}
              </div>
            </Card>
          </AnimatedContainer>

          {/* Mobile Usability + Rich Results */}
          <div className="space-y-4">
            <AnimatedContainer delay={0.1}>
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Usabilidade Mobile</h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Veredicto</span>
                  {statusBadge(mobile?.verdict || "VERDICT_UNSPECIFIED")}
                </div>
                {mobile?.issues?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Problemas:</span>
                    {mobile.issues.map((issue: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                        <XCircle className="h-3 w-3" />
                        {issue.issueType || issue.message}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </AnimatedContainer>

            <AnimatedContainer delay={0.15}>
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Rich Results</h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Veredicto</span>
                  {statusBadge(richResults?.verdict || "VERDICT_UNSPECIFIED")}
                </div>
                {richResults?.detectedItems?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Itens detectados:</span>
                    {richResults.detectedItems.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        {statusIcon(item.verdict || "")}
                        <span className="text-xs">{item.richResultType || "Tipo desconhecido"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </AnimatedContainer>
          </div>
        </div>
      )}

      {!inspection && !loading && !error && (
        <EmptyState
          icon={Search}
          title="Inspeção de URL"
          description="Insira uma URL acima para ver o status de indexação, usabilidade mobile e rich results."
        />
      )}
    </div>
  );
}
