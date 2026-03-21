import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Globe } from "lucide-react";

interface Props {
  topPages: any[];
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

export function LinksDomainSummary({ topPages }: Props) {
  const domains = useMemo(() => {
    const map = new Map<string, { clicks: number; impressions: number; pages: number }>();
    for (const row of topPages) {
      const domain = extractDomain(row.page);
      const entry = map.get(domain) || { clicks: 0, impressions: 0, pages: 0 };
      entry.clicks += row.clicks || 0;
      entry.impressions += row.impressions || 0;
      entry.pages += 1;
      map.set(domain, entry);
    }
    return Array.from(map.entries())
      .map(([domain, data]) => ({ domain, ...data }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);
  }, [topPages]);

  const maxClicks = Math.max(...domains.map((d) => d.clicks), 1);

  if (domains.length <= 1) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-semibold text-foreground">Distribuição por Domínio</h4>
        <Badge variant="secondary" className="text-[10px] ml-auto">{domains.length} domínios</Badge>
      </div>
      <div className="space-y-2.5">
        {domains.map((d) => (
          <div key={d.domain} className="flex items-center gap-3">
            <span className="text-[11px] text-foreground font-medium w-40 truncate" title={d.domain}>{d.domain}</span>
            <Progress value={(d.clicks / maxClicks) * 100} className="h-2 flex-1" />
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] text-foreground font-semibold min-w-[48px] text-right">{d.clicks.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground min-w-[32px] text-right">{d.pages} pg</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
