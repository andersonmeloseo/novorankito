import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Link2, Loader2, ExternalLink, Download, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  projectId: string | undefined;
}

type SortDir = "asc" | "desc";
const PAGE_SIZE = 20;

function sortData(data: any[], key: string, dir: SortDir) {
  return [...data].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return dir === "desc" ? bv - av : av - bv;
    return dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
}

export function LinksTab({ projectId }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [topPagesSort, setTopPagesSort] = useState<{ key: string; dir: SortDir }>({ key: "clicks", dir: "desc" });
  const [coverageSort, setCoverageSort] = useState<{ key: string; dir: SortDir }>({ key: "queryCount", dir: "desc" });
  const [topPagesPage, setTopPagesPage] = useState(1);
  const [coveragePage, setCoveragePage] = useState(1);

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

  const topPages = useMemo(() => {
    let rows = (data?.topPages || []).map((r: any) => ({
      page: r.page,
      clicks: Number(r.clicks) || 0,
      impressions: Number(r.impressions) || 0,
    }));
    if (searchTerm) rows = rows.filter((r: any) => r.page.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(rows, topPagesSort.key, topPagesSort.dir);
  }, [data, searchTerm, topPagesSort]);

  const internalLinks = useMemo(() => {
    let rows = (data?.internalLinks || []).map((r: any) => ({
      page: r.page,
      queryCount: Number(r.queryCount) || 0,
      clicks: Number(r.clicks) || 0,
      impressions: Number(r.impressions) || 0,
    }));
    if (searchTerm) rows = rows.filter((r: any) => r.page.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(rows, coverageSort.key, coverageSort.dir);
  }, [data, searchTerm, coverageSort]);

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

  if (topPages.length === 0 && internalLinks.length === 0 && !searchTerm) {
    return (
      <EmptyState
        icon={Link2}
        title="Sem dados de links"
        description="Os dados de links serão exibidos quando houver dados disponíveis no GSC."
      />
    );
  }

  const topPagesColumns = [
    { key: "page", label: "Página" },
    { key: "clicks", label: "Cliques" },
    { key: "impressions", label: "Impressões" },
  ];

  const coverageColumns = [
    { key: "page", label: "Página" },
    { key: "queryCount", label: "Queries" },
    { key: "clicks", label: "Cliques" },
    { key: "impressions", label: "Impressões" },
  ];

  return (
    <div className="space-y-4">
      {/* Search filter */}
      <AnimatedContainer>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar páginas..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setTopPagesPage(1); setCoveragePage(1); }}
            className="pl-8 h-9 text-xs"
          />
        </div>
      </AnimatedContainer>

      <Tabs defaultValue="top-pages">
        <TabsList className="mb-4">
          <TabsTrigger value="top-pages" className="text-xs">Top Páginas (Performance)</TabsTrigger>
          <TabsTrigger value="coverage" className="text-xs">Cobertura de Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="top-pages">
          <AnimatedContainer>
            <SortableLinksTable
              columns={topPagesColumns}
              rows={topPages}
              sort={topPagesSort}
              onSort={(key) => { setTopPagesSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" })); setTopPagesPage(1); }}
              page={topPagesPage}
              onPageChange={setTopPagesPage}
              onExport={() => exportCSV(topPages, "top-pages")}
              linkKey="page"
            />
          </AnimatedContainer>
        </TabsContent>

        <TabsContent value="coverage">
          <AnimatedContainer>
            <SortableLinksTable
              columns={coverageColumns}
              rows={internalLinks}
              sort={coverageSort}
              onSort={(key) => { setCoverageSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" })); setCoveragePage(1); }}
              page={coveragePage}
              onPageChange={setCoveragePage}
              onExport={() => exportCSV(internalLinks, "query-coverage")}
            />
          </AnimatedContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SortableLinksTable({
  columns, rows, sort, onSort, page, onPageChange, onExport, linkKey,
}: {
  columns: { key: string; label: string }[];
  rows: any[];
  sort: { key: string; dir: SortDir };
  onSort: (key: string) => void;
  page: number;
  onPageChange: (p: number) => void;
  onExport: () => void;
  linkKey?: string;
}) {
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs text-muted-foreground">{rows.length} resultados</span>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
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
                  onClick={() => onSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className={`h-3 w-3 ${sort.key === col.key ? "text-primary" : "opacity-40"}`} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                  {columns.map(col => (
                    <td key={col.key} title={col.key === "page" || col.key === linkKey ? row[col.key] : undefined} className={`px-4 py-3 text-xs ${col.key === "page" ? "font-mono text-foreground max-w-[400px] truncate" : col.key === "queryCount" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {col.key === linkKey ? (
                        <a href={row[col.key]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                          {row[col.key]}
                          <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                        </a>
                      ) : (
                        typeof row[col.key] === "number" ? Number(row[col.key]).toLocaleString() : row[col.key]
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => onPageChange(p)}>
                  {p}
                </Button>
              );
            })}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
