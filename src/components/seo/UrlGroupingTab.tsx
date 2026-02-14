import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSeoMetrics } from "@/hooks/use-data-modules";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";
import { exportCSV, exportXML } from "@/lib/export-utils";
import { FolderTree, ArrowUpDown, ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

function getUrlGroup(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "/";
    return "/" + parts[0] + "/";
  } catch {
    return "/";
  }
}

export function UrlGroupingTab({ projectId }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "totalClicks", dir: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { data: pageMetrics = [] } = useSeoMetrics(projectId, "page");
  const { data: combinedMetrics = [] } = useSeoMetrics(projectId, "combined");
  const metrics = pageMetrics.length > 0 ? pageMetrics : combinedMetrics;

  const groups = useMemo(() => {
    const groupMap = new Map<string, { pages: any[]; totalClicks: number; totalImpressions: number; avgPosition: number; avgCtr: number }>();

    for (const m of metrics) {
      const url = m.url || m.query || "";
      if (!url.startsWith("http")) continue;
      const group = getUrlGroup(url);
      if (!groupMap.has(group)) {
        groupMap.set(group, { pages: [], totalClicks: 0, totalImpressions: 0, avgPosition: 0, avgCtr: 0 });
      }
      const g = groupMap.get(group)!;
      g.pages.push({
        url,
        clicks: m.clicks || 0,
        impressions: m.impressions || 0,
        ctr: m.ctr || 0,
        position: m.position || 0,
      });
      g.totalClicks += m.clicks || 0;
      g.totalImpressions += m.impressions || 0;
    }

    const result: any[] = [];
    for (const [group, data] of groupMap) {
      const weightedPos = data.pages.reduce((s, p) => s + p.position * p.impressions, 0);
      data.avgPosition = data.totalImpressions > 0 ? parseFloat((weightedPos / data.totalImpressions).toFixed(1)) : 0;
      data.avgCtr = data.totalImpressions > 0 ? parseFloat(((data.totalClicks / data.totalImpressions) * 100).toFixed(2)) : 0;
      data.pages.sort((a: any, b: any) => b.clicks - a.clicks);
      result.push({ group, pageCount: data.pages.length, ...data });
    }

    let filtered = result;
    if (searchTerm) filtered = filtered.filter(r => r.group.toLowerCase().includes(searchTerm.toLowerCase()));
    return sortData(filtered, sort.key, sort.dir);
  }, [metrics, searchTerm, sort]);

  const flatRows = useMemo(() => {
    const flat: any[] = [];
    for (const g of groups) {
      for (const p of g.pages) {
        flat.push({ grupo: g.group, url: p.url, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position });
      }
    }
    return flat;
  }, [groups]);

  const doExportCSV = () => exportCSV(flatRows, "agrupamento-urls");
  const doExportXML = () => exportXML(flatRows, "agrupamento-urls", "urlGroups", "url");

  const columns = [
    { key: "group", label: "Diretório" },
    { key: "pageCount", label: "Páginas" },
    { key: "totalClicks", label: "Cliques" },
    { key: "totalImpressions", label: "Impressões" },
    { key: "avgCtr", label: "CTR Médio" },
    { key: "avgPosition", label: "Pos. Média" },
  ];

  const totalPages = Math.ceil(groups.length / PAGE_SIZE);
  const paginated = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (metrics.length === 0) {
    return <EmptyState icon={FolderTree} title="Sem dados de páginas" description="Sincronize dados do GSC para ver o agrupamento por diretório." />;
  }

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-xs">
            <FolderTree className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium">Agrupamento por Diretório:</span>
            <span className="text-muted-foreground">URLs agrupadas pelo primeiro nível do path para análise por seção do site.</span>
          </div>
        </Card>
      </AnimatedContainer>

      <AnimatedContainer>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar diretórios..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 h-9 text-xs" />
        </div>
      </AnimatedContainer>

      <AnimatedContainer delay={0.05}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground">{groups.length} diretórios</span>
            <ExportMenu onExportCSV={doExportCSV} onExportXML={doExportXML} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 w-8"></th>
                  {columns.map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => { setSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === "desc" ? "asc" : "desc" })); setPage(1); }}>
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
                  <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
                ) : paginated.map((row: any, i: number) => (
                  <>
                    <tr key={`g-${i}`} className="border-b border-border last:border-0 table-row-hover cursor-pointer" onClick={() => setExpandedGroup(expandedGroup === row.group ? null : row.group)}>
                      <td className="px-4 py-3">
                        {expandedGroup === row.group ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-foreground font-semibold">{row.group}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{row.pageCount} páginas</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-semibold">{Number(row.totalClicks).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{Number(row.totalImpressions).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.avgCtr}%</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.avgPosition}</td>
                    </tr>
                    {expandedGroup === row.group && row.pages.slice(0, 10).map((p: any, j: number) => (
                      <tr key={`p-${i}-${j}`} className="bg-muted/20 border-b border-border">
                        <td className="px-4 py-2"></td>
                        <td colSpan={2} className="px-4 py-2 text-xs font-mono text-muted-foreground max-w-[400px] truncate pl-6" title={p.url}>
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{p.url}</a>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{p.clicks}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{p.impressions}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{p.ctr}%</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{p.position}</td>
                      </tr>
                    ))}
                    {expandedGroup === row.group && row.pages.length > 10 && (
                      <tr key={`more-${i}`} className="bg-muted/20 border-b border-border">
                        <td></td>
                        <td colSpan={6} className="px-4 py-2 text-xs text-muted-foreground italic pl-6">
                          + {row.pages.length - 10} páginas adicionais
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>{p}</Button>;
                })}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </Card>
      </AnimatedContainer>
    </div>
  );
}
