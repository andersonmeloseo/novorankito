import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Clock } from "lucide-react";
import type { HeatmapSnapshot } from "./types";

export function SnapshotCard({ snap, onDelete, onExport }: { snap: HeatmapSnapshot; onDelete: () => void; onExport: () => void }) {
  const date = new Date(snap.capturedAt);
  return (
    <Card className="overflow-hidden card-hover group">
      <div className="relative h-32 bg-muted/30">
        <img src={snap.thumbnail} alt="Heatmap snapshot" className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 pb-2">
          <Button size="sm" variant="secondary" className="h-7 text-[10px] gap-1" onClick={onExport}><Download className="h-3 w-3" /> Exportar</Button>
          <Button size="sm" variant="destructive" className="h-7 text-[10px] gap-1" onClick={onDelete}><Trash2 className="h-3 w-3" /> Excluir</Button>
        </div>
        <Badge variant="secondary" className="absolute top-2 right-2 text-[8px] bg-background/80 backdrop-blur-sm">{snap.mode === "click" ? "Cliques" : snap.mode === "scroll" ? "Scroll" : "Movimento"}</Badge>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-[10px] text-muted-foreground truncate" title={snap.url}>{(() => { try { return new URL(snap.url).pathname; } catch { return snap.url; } })()}</p>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[8px]">{snap.device}</Badge>
          <Badge variant="outline" className="text-[8px]">{snap.totalClicks} cliques</Badge>
          <Badge variant="outline" className="text-[8px]">{snap.avgScroll}% scroll</Badge>
        </div>
      </div>
    </Card>
  );
}
