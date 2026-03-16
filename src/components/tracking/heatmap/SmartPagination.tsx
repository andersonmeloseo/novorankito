import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SmartPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function SmartPagination({ currentPage, totalPages, totalItems, onPageChange, itemLabel = "itens" }: SmartPaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers with ellipsis
  const getPages = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);

    const pages: (number | "...")[] = [0];

    if (currentPage > 2) pages.push("...");

    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages - 2, currentPage + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 3) pages.push("...");

    pages.push(totalPages - 1);

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-center gap-1">
        {getPages().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="w-8 text-center text-xs text-muted-foreground">…</span>
          ) : (
            <Button
              key={page}
              size="sm"
              variant={page === currentPage ? "default" : "ghost"}
              className="h-8 w-8 text-xs p-0"
              onClick={() => onPageChange(page)}
            >
              {page + 1}
            </Button>
          )
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>

      <span className="text-[10px] text-muted-foreground ml-2">{totalItems} {itemLabel}</span>
    </div>
  );
}
