import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-7 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-4 w-48 mb-4" />
      <Skeleton className="h-[280px] w-full rounded-lg" />
    </Card>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={`h-4 ${j === 0 ? "flex-1" : "w-16"}`} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
