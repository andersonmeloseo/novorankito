import { Card } from "@/components/ui/card";
import { MousePointerClick, Eye, FileText, Hash } from "lucide-react";

interface Props {
  topPages: any[];
  internalLinks: any[];
}

export function LinksKpiCards({ topPages, internalLinks }: Props) {
  const totalClicks = topPages.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalImpressions = topPages.reduce((s, r) => s + (r.impressions || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100) : 0;
  const totalQueries = internalLinks.reduce((s, r) => s + (r.queryCount || 0), 0);

  const kpis = [
    { label: "Total Cliques", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Impressões", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-info", bg: "bg-info/10" },
    { label: "CTR Médio", value: `${avgCtr.toFixed(2)}%`, icon: FileText, color: "text-success", bg: "bg-success/10" },
    { label: "Total Queries", value: totalQueries.toLocaleString(), icon: Hash, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <Card key={k.label} className="p-4 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${k.bg} ${k.color} group-hover:scale-110 transition-transform`}>
              <k.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
              <p className="text-lg font-bold text-foreground leading-tight">{k.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
