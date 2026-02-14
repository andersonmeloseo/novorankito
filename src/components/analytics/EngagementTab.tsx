import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";

interface EngagementTabProps {
  data: any;
}

export function EngagementTab({ data }: EngagementTabProps) {
  const pages = data?.pages || [];
  const events = data?.events || [];
  const landingPages = data?.landingPages || [];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages" className="text-xs">Páginas</TabsTrigger>
          <TabsTrigger value="landing" className="text-xs">Páginas de Entrada</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Eventos</TabsTrigger>
        </TabsList>
        <TabsContent value="pages" className="mt-4">
          <AnalyticsDataTable
            columns={["Título", "Caminho", "Views", "Usuários", "Duração Média", "Tx. Engajamento", "Tx. Rejeição"]}
            rows={pages.map((p: any) => [
              (p.pageTitle || "—").substring(0, 60),
              p.pagePath || "—",
              (p.screenPageViews || 0).toLocaleString(),
              (p.totalUsers || 0).toLocaleString(),
              formatDuration(p.averageSessionDuration || 0),
              ((p.engagementRate || 0) * 100).toFixed(1) + "%",
              ((p.bounceRate || 0) * 100).toFixed(1) + "%",
            ])}
          />
        </TabsContent>
        <TabsContent value="landing" className="mt-4">
          <AnalyticsDataTable
            columns={["Página de Entrada", "Sessões", "Usuários", "Tx. Engajamento", "Tx. Rejeição", "Duração Média", "Conversões"]}
            rows={landingPages.map((l: any) => [
              l.landingPage || "—",
              (l.sessions || 0).toLocaleString(),
              (l.totalUsers || 0).toLocaleString(),
              ((l.engagementRate || 0) * 100).toFixed(1) + "%",
              ((l.bounceRate || 0) * 100).toFixed(1) + "%",
              formatDuration(l.averageSessionDuration || 0),
              (l.conversions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <AnalyticsDataTable
            columns={["Evento", "Total", "Usuários", "Eventos/Usuário", "Valor"]}
            rows={events.map((e: any) => [
              e.eventName || "—",
              (e.eventCount || 0).toLocaleString(),
              (e.totalUsers || 0).toLocaleString(),
              (e.eventCountPerUser || 0).toFixed(1),
              "R$ " + (e.eventValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
