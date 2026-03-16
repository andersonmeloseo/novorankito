import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function DataAvailabilityBadge({ available, count, label, icon: Icon }: { available: boolean; count: number; label: string; icon: React.ElementType }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[10px] transition-colors ${available ? "bg-success/5 border-success/20 text-success" : "bg-muted/50 border-border text-muted-foreground"}`}>
      {available ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      <Icon className="h-3 w-3" />
      <span className="font-medium">{label}</span>
      {available && <Badge variant="outline" className="text-[8px] h-4 px-1.5 ml-1">{count}</Badge>}
    </div>
  );
}
