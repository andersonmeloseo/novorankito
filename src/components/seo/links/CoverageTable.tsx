import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown, ChevronDown, ChevronRight, ChevronLeft, Download, ExternalLink, Globe, Search } from "lucide-react";

type SortDir = "asc" | "desc";
const PAGE_SIZE = 15;

interface CoverageRow {
  page: string;
  queryCount: number;
  clicks: number;
  impressions: number;
  queries?: { query: string; clicks: number; impressions: number; position: number }[];
}

interface Props {
  rows: CoverageRow[];
  onExport: () => void;
}

export function CoverageTable({ rows, onExport }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "queryCount", dir: "desc" });
  const [page, setPage] = useState(1);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [querySort, setQuerySort] = useState<{ key: string; dir: SortDir }>({ key: "clicks", dir: "desc" });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = (a as any)[sort.key], bv = (b as any)[sort.key];
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "desc" ? bv - av : av - bv;
      return sort.dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [rows, sort]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const maxClicks = Math.max(...rows.map((r) => r.clicks || 0), 1);

  const handleSort = (key: string) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" }));
    setPage(1);
    setExpandedIdx(null);
  };

  const toggleExpand = (i: number) => {
    setExpandedIdx(expandedIdx === i ? null : i);
    setQuerySort({ key: "clicks", dir: "desc" });
  };

  const columns = [
    { key: "page", label: "Página", tooltip: "URL da página analisada", width: "40%" },
    { key: "queryCount", label: "Queries", tooltip: "Quantidade de termos de busca diferentes" },
    { key: "clicks", label: "Cliques", tooltip: "Total de cliques vindos de todos os termos" },
    { key: "impressions", label: "Impressões", tooltip: "Total de impressões para todos os termos" },
  ];

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{rows.length}</span>
          <span className="text-xs text-muted-foreground">páginas encontradas</span>
        </div>
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={onExport}>
          <Download className="h-3 w-3" /> Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <TooltipProvider delayDuration={200}>
                <th className="w-8 px-2" />
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                    style={{ width: col.width }}
                    onClick={() => handleSort(col.key)}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1.5">
                          {col.label}
                          <ArrowUpDown className={`h-3 w-3 ${sort.key === col.key ? "text-primary" : "opacity-30"}`} />
                        </span>
                      </TooltipTrigger>
                      {col.tooltip && (
                        <TooltipContent side="top" className="max-w-xs text-xs">{col.tooltip}</TooltipContent>
                      )}
                    </Tooltip>
                  </th>
                ))}
              </TooltipProvider>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">Nenhum dado encontrado</td>
              </tr>
            ) : (
              paginated.map((row, i) => {
                const isExpanded = expandedIdx === i;
                const sortedQueries = [...(row.queries || [])].sort((a, b) => {
                  const av = (a as any)[querySort.key], bv = (b as any)[querySort.key];
                  if (typeof av === "number" && typeof bv === "number") return querySort.dir === "desc" ? bv - av : av - bv;
                  return querySort.dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
                });

                return (
                  <>
                    <tr
                      key={`row-${i}`}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group ${isExpanded ? "bg-muted/20" : ""}`}
                      onClick={() => toggleExpand(i)}
                    >
                      <td className="px-2 py-3 text-center">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-primary mx-auto" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary mx-auto transition-colors" />
                        }
                      </td>
                      <td className="px-4 py-3 max-w-[400px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-foreground truncate" title={row.page}>{row.page}</span>
                          <Badge variant="secondary" className="w-fit text-[10px] px-1.5 py-0 font-normal gap-1">
                            <Globe className="h-2.5 w-2.5" />
                            {(() => { try { return new URL(row.page).hostname.replace("www.", ""); } catch { return ""; } })()}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary min-w-[32px]">{row.queryCount.toLocaleString()}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal text-muted-foreground">
                            {row.queryCount > 20 ? "Alta" : row.queryCount > 5 ? "Média" : "Baixa"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <span className="text-xs text-foreground font-medium min-w-[40px] text-right">{row.clicks.toLocaleString()}</span>
                          <Progress value={(row.clicks / maxClicks) * 100} className="h-1.5 flex-1 max-w-[80px]" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{row.impressions.toLocaleString()}</span>
                      </td>
                    </tr>

                    {/* Expanded queries */}
                    {isExpanded && (
                      <tr key={`exp-${i}`}>
                        <td colSpan={5} className="p-0">
                          <div className="bg-muted/10 border-b border-border">
                            <div className="px-6 py-2.5 flex items-center gap-2 border-b border-border/50">
                              <Search className="h-3 w-3 text-primary" />
                              <span className="text-[11px] font-semibold text-foreground">
                                {sortedQueries.length} queries encontradas
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-auto">Clique no cabeçalho para ordenar</span>
                            </div>
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border/30">
                                  <th className="w-8" />
                                  <th
                                    className="px-6 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                                    onClick={(e) => { e.stopPropagation(); setQuerySort(prev => ({ key: "query", dir: prev.key === "query" && prev.dir === "asc" ? "desc" : "asc" })); }}
                                  >
                                    <span className="flex items-center gap-1">Query <ArrowUpDown className={`h-2.5 w-2.5 ${querySort.key === "query" ? "text-primary" : "opacity-30"}`} /></span>
                                  </th>
                                  <th
                                    className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                                    onClick={(e) => { e.stopPropagation(); setQuerySort(prev => ({ key: "clicks", dir: prev.key === "clicks" && prev.dir === "desc" ? "asc" : "desc" })); }}
                                  >
                                    <span className="flex items-center gap-1">Cliques <ArrowUpDown className={`h-2.5 w-2.5 ${querySort.key === "clicks" ? "text-primary" : "opacity-30"}`} /></span>
                                  </th>
                                  <th
                                    className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                                    onClick={(e) => { e.stopPropagation(); setQuerySort(prev => ({ key: "impressions", dir: prev.key === "impressions" && prev.dir === "desc" ? "asc" : "desc" })); }}
                                  >
                                    <span className="flex items-center gap-1">Impressões <ArrowUpDown className={`h-2.5 w-2.5 ${querySort.key === "impressions" ? "text-primary" : "opacity-30"}`} /></span>
                                  </th>
                                  <th
                                    className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                                    onClick={(e) => { e.stopPropagation(); setQuerySort(prev => ({ key: "position", dir: prev.key === "position" && prev.dir === "asc" ? "desc" : "asc" })); }}
                                  >
                                    <span className="flex items-center gap-1">Posição <ArrowUpDown className={`h-2.5 w-2.5 ${querySort.key === "position" ? "text-primary" : "opacity-30"}`} /></span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedQueries.slice(0, 30).map((q, qi) => (
                                  <tr key={qi} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="w-8" />
                                    <td className="px-6 py-2">
                                      <span className="text-xs text-foreground font-medium">{q.query}</span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="text-xs font-semibold text-primary">{q.clicks.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="text-xs text-muted-foreground">{q.impressions.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge
                                        variant={q.position <= 3 ? "default" : q.position <= 10 ? "secondary" : "outline"}
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {q.position}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                                {sortedQueries.length > 30 && (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-2 text-center text-[10px] text-muted-foreground">
                                      +{sortedQueries.length - 30} queries adicionais
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
          <span className="text-[11px] text-muted-foreground">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => { setPage(page - 1); setExpandedIdx(null); }}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => { setPage(p); setExpandedIdx(null); }}>
                  {p}
                </Button>
              );
            })}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => { setPage(page + 1); setExpandedIdx(null); }}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
