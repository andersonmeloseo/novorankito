import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Globe, Lightbulb, ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompact } from "./types";

interface TopPage { url: string; clicks: number; impressions: number; position: number; ctr: number; }
interface TopQuery { query: string; clicks: number; impressions: number; position: number; }

interface OverviewTopTablesProps {
  isLoading: boolean;
  topPages: TopPage[];
  topQueries: TopQuery[];
}

export function OverviewTopTables({ isLoading, topPages, topQueries }: OverviewTopTablesProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {isLoading ? <TableSkeleton /> : topPages.length === 0 ? (
        <EmptyState icon={Globe} title="Sem dados de páginas" description="Conecte o Search Console para ver suas melhores páginas." />
      ) : (
        <AnimatedContainer delay={0.25}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-tight font-display">Top Páginas</CardTitle>
                <Badge variant="outline" className="text-[10px]">{topPages.length} páginas</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold">URL</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Cliques</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">CTR</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Pos.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map(page => (
                    <TableRow key={page.url} className="cursor-pointer table-row-hover group/row">
                      <TableCell className="text-xs font-medium text-primary truncate max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                          <span className="truncate">{page.url.replace(/https?:\/\/[^/]+/, "")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold">{page.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{page.ctr.toFixed(1)}%</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        <span className={cn("font-semibold", page.position <= 3 ? "text-success" : page.position <= 10 ? "text-foreground" : "text-muted-foreground")}>{page.position.toFixed(1)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedContainer>
      )}

      {isLoading ? <TableSkeleton /> : topQueries.length === 0 ? (
        <AnimatedContainer delay={0.28}>
          <EmptyState icon={Lightbulb} title="Sem consultas" description="Sincronize o GSC para ver suas principais keywords." />
        </AnimatedContainer>
      ) : (
        <AnimatedContainer delay={0.28}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-tight font-display">Top Consultas (Keywords)</CardTitle>
                <Badge variant="outline" className="text-[10px]"><Search className="h-3 w-3 mr-1" /> {topQueries.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Consulta</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Cliques</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Impr.</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Pos.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topQueries.map(q => (
                    <TableRow key={q.query} className="table-row-hover">
                      <TableCell className="text-xs font-medium text-foreground truncate max-w-[200px]">{q.query}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold">{q.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCompact(q.impressions)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        <span className={cn("font-semibold", q.position <= 3 ? "text-success" : q.position <= 10 ? "text-foreground" : "text-muted-foreground")}>{q.position.toFixed(1)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}
