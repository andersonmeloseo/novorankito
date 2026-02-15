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

function PositionBadge({ position }: { position: number }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums",
      position <= 3 ? "bg-success/10 text-success" :
      position <= 10 ? "bg-primary/10 text-primary" :
      position <= 20 ? "bg-warning/10 text-warning" :
      "bg-muted text-muted-foreground"
    )}>
      {position.toFixed(1)}
    </span>
  );
}

export function OverviewTopTables({ isLoading, topPages, topQueries }: OverviewTopTablesProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {isLoading ? <TableSkeleton /> : topPages.length === 0 ? (
        <EmptyState icon={Globe} title="Sem dados de páginas" description="Conecte o Search Console para ver suas melhores páginas." />
      ) : (
        <AnimatedContainer delay={0.25}>
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-tight font-display">Top Páginas</CardTitle>
                <Badge variant="secondary" className="text-[10px] font-normal rounded-full">{topPages.length} páginas</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">URL</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 text-right">Cliques</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 text-right">CTR</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 text-right">Pos.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map((page, i) => (
                    <TableRow key={page.url} className={cn(
                      "cursor-pointer table-row-hover group/row",
                      i % 2 === 1 && "bg-muted/[0.03]"
                    )}>
                      <TableCell className="text-xs font-medium text-primary truncate max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/row:opacity-60 transition-opacity" />
                          <span className="truncate">{page.url.replace(/https?:\/\/[^/]+/, "")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold">{page.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{page.ctr.toFixed(1)}%</TableCell>
                      <TableCell className="text-xs text-right">
                        <PositionBadge position={page.position} />
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
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-tight font-display">Top Keywords</CardTitle>
                <Badge variant="secondary" className="text-[10px] font-normal rounded-full">
                  <Search className="h-3 w-3 mr-1 opacity-60" /> {topQueries.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Consulta</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 text-right">Cliques</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 text-right">Impr.</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 text-right">Pos.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topQueries.map((q, i) => (
                    <TableRow key={q.query} className={cn(
                      "table-row-hover",
                      i % 2 === 1 && "bg-muted/[0.03]"
                    )}>
                      <TableCell className="text-xs font-medium text-foreground truncate max-w-[200px]">{q.query}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold">{q.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCompact(q.impressions)}</TableCell>
                      <TableCell className="text-xs text-right">
                        <PositionBadge position={q.position} />
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
