import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Database, Zap, HardDrive, Loader2 } from "lucide-react";
import { useAdminBilling } from "@/hooks/use-admin";
import { useSeoMetrics, useSiteUrls } from "@/hooks/use-data-modules";

export default function AdminUsagePage() {
  const { data: billing = [], isLoading } = useAdminBilling();

  const totalEvents = billing.reduce((s, b: any) => s + (b.events_used || 0), 0);
  const totalEventsLimit = billing.reduce((s, b: any) => s + (b.events_limit || 0), 0);
  const eventsPct = totalEventsLimit > 0 ? Math.round((totalEvents / totalEventsLimit) * 100) : 0;

  const totalProjects = billing.reduce((s, b: any) => s + (b.projects_limit || 0), 0);

  const items = [
    { label: "Eventos Usados", value: totalEvents.toLocaleString("pt-BR"), limit: totalEventsLimit.toLocaleString("pt-BR"), pct: eventsPct, icon: Zap },
    { label: "Limite Projetos", value: totalProjects.toString(), limit: "—", pct: 0, icon: Database },
    { label: "Assinaturas", value: billing.length.toString(), limit: "—", pct: 0, icon: BarChart3 },
  ];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Uso & Limites" description="Consumo real da plataforma baseado nas assinaturas" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">{item.label}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              {item.limit !== "—" && (
                <>
                  <div className="text-[11px] text-muted-foreground mb-2">de {item.limit}</div>
                  <Progress value={item.pct} className="h-1.5" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
