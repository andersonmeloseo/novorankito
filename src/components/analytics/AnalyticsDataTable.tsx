import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsDataTableProps {
  columns: string[];
  rows: string[][];
  tooltips?: (string | null)[][];
  pageSize?: number;
}

function parseNumeric(val: string): number {
  // Strip R$, %, commas, dots (pt-BR), spaces
  const cleaned = val.replace(/[R$%\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? -Infinity : n;
}

export function AnalyticsDataTable({ columns, rows, tooltips, pageSize = 10 }: AnalyticsDataTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter(row => row.some(cell => cell.toLowerCase().includes(q)));
  }, [rows, filter]);

  const sorted = useMemo(() => {
    if (sortCol === null) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortCol] || "";
      const bVal = b[sortCol] || "";
      const aNum = parseNumeric(aVal);
      const bNum = parseNumeric(bVal);
      // Both numeric
      if (aNum !== -Infinity && bNum !== -Infinity) {
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      // String comparison
      const cmp = aVal.localeCompare(bVal, "pt-BR", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(colIdx);
      setSortDir("desc");
    }
    setPage(0);
  };

  const handleFilterChange = (val: string) => {
    setFilter(val);
    setPage(0);
  };

  return (
    <Card className="overflow-hidden">
      {/* Filter */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Input
          placeholder="Filtrar..."
          value={filter}
          onChange={e => handleFilterChange(e.target.value)}
          className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
        />
        {filtered.length !== rows.length && (
          <span className="text-[10px] text-muted-foreground shrink-0">{filtered.length} de {rows.length}</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col, idx) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors group"
                  onClick={() => handleSort(idx)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortCol === idx ? (
                      sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem dados</td></tr>
            ) : (
              paginated.map((row, i) => {
                const originalIdx = sorted.indexOf(row);
                const rowTooltips = tooltips?.[rows.indexOf(row)];
                return (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={cn("px-4 py-3 text-xs max-w-[200px] truncate", j === 0 ? "font-medium text-foreground" : "text-muted-foreground")}
                        title={rowTooltips?.[j] || cell}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > pageSize && (
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6"
              disabled={safePage === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground px-1">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
