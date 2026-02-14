import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Database, Zap, HardDrive } from "lucide-react";

export default function AdminUsagePage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Uso & Limites" description="Consumo da plataforma — API calls, storage, bandwidth e processamento" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "API Calls", value: "1.2M", limit: "5M", pct: 24, icon: Zap },
          { label: "Storage", value: "45 GB", limit: "200 GB", pct: 22, icon: HardDrive },
          { label: "Bandwidth", value: "120 GB", limit: "500 GB", pct: 24, icon: Database },
          { label: "Jobs Executados", value: "8.4K", limit: "50K", pct: 17, icon: BarChart3 },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">{item.label}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-[11px] text-muted-foreground mb-2">de {item.limit}</div>
              <Progress value={item.pct} className="h-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
