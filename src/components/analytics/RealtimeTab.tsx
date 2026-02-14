import { Card } from "@/components/ui/card";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { Badge } from "@/components/ui/badge";

interface RealtimeTabProps {
  data: any;
  isLoading: boolean;
}

export function RealtimeTab({ data, isLoading }: RealtimeTabProps) {
  const activeUsers = data?.activeUsers || 0;
  const byPage = data?.byPage || [];
  const bySource = data?.bySource || [];
  const byCountry = data?.byCountry || [];
  const byDevice = data?.byDevice || [];

  if (isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground">Carregando dados em tempo real...</Card>;

  return (
    <div className="space-y-4">
      <Card className="p-6 text-center">
        <div className="text-5xl font-bold text-foreground">{activeUsers}</div>
        <div className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
          </span>
          Usuários ativos agora
        </div>
        {byDevice.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {byDevice.map((d: any) => (
              <Badge key={d.deviceCategory} variant="secondary" className="text-[10px]">
                {d.deviceCategory}: {d.activeUsers}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Páginas ativas</h3>
          <AnalyticsDataTable
            columns={["Página", "Usuários Ativos", "Views"]}
            rows={byPage.map((p: any) => [
              p.unifiedPagePathScreen || "—",
              (p.activeUsers || 0).toLocaleString(),
              (p.screenPageViews || 0).toLocaleString(),
            ])}
          />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Origens</h3>
            <AnalyticsDataTable
              columns={["Origem", "Usuários Ativos"]}
              rows={bySource.map((s: any) => [s.source || "—", (s.activeUsers || 0).toLocaleString()])}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Países</h3>
            <AnalyticsDataTable
              columns={["País", "Usuários Ativos"]}
              rows={byCountry.map((c: any) => [c.country || "—", (c.activeUsers || 0).toLocaleString()])}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
