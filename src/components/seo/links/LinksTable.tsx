import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, ExternalLink, Globe } from "lucide-react";

type SortDir = "asc" | "desc";
const PAGE_SIZE = 15;

interface Column {
  key: string;
  label: string;
  tooltip?: string;
  width?: string;
}

interface Props {
  columns: Column[];
  rows: any[];
  onExport: () => void;
  linkKey?: string;
  showDomainBadge?: boolean;
  showProgressBar?: string;
  onRowClick?: (row: any) => void;
  rowClickTooltip?: string;
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function LinksTable({ columns, rows, onExport, linkKey, showDomainBadge, showProgressBar, onRowClick, rowClickTooltip }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: columns[1]?.key || "clicks", dir: "desc" });
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "desc" ? bv - av : av - bv;
      return sort.dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [rows, sort]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const maxVal = showProgressBar ? Math.max(...rows.map((r) => Number(r[showProgressBar]) || 0), 1) : 1;

  const handleSort = (key: string) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" }));
    setPage(1);
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{rows.length}</span>
          <span className="text-xs text-muted-foreground">resultados encontrados</span>
        </div>
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={onExport}>
          <Download className="h-3 w-3" /> Exportar CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <TooltipProvider delayDuration={200}>
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
                          <ArrowUpDown className={`h-3 w-3 transition-colors ${sort.key === col.key ? "text-primary" : "opacity-30"}`} />
                        </span>
                      </TooltipTrigger>
                      {col.tooltip && (
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {col.tooltip}
                        </TooltipContent>
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
                <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.key === linkKey ? (
                        <div className="flex flex-col gap-1 max-w-[420px]">
                          <a
                            href={row[col.key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate flex items-center gap-1.5 group/link"
                            title={row[col.key]}
                          >
                            <span className="truncate">{row[col.key]}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-60 shrink-0 transition-opacity" />
                          </a>
                          {showDomainBadge && (
                            <Badge variant="secondary" className="w-fit text-[10px] px-1.5 py-0 font-normal gap-1">
                              <Globe className="h-2.5 w-2.5" />
                              {extractDomain(row[col.key])}
                            </Badge>
                          )}
                        </div>
                      ) : col.key === "queryCount" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary min-w-[32px]">{Number(row[col.key]).toLocaleString()}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal text-muted-foreground">
                            {Number(row[col.key]) > 20 ? "Alta" : Number(row[col.key]) > 5 ? "Média" : "Baixa"} cobertura
                          </Badge>
                        </div>
                      ) : showProgressBar && col.key === showProgressBar ? (
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <span className="text-xs text-foreground font-medium min-w-[40px] text-right">{Number(row[col.key]).toLocaleString()}</span>
                          <Progress value={(Number(row[col.key]) / maxVal) * 100} className="h-1.5 flex-1 max-w-[80px]" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{typeof row[col.key] === "number" ? Number(row[col.key]).toLocaleString() : row[col.key]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
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
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>
                  {p}
                </Button>
              );
            })}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
