import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTrackingEvents } from "@/lib/mock-data";
import { MonitorSmartphone } from "lucide-react";
import { EventsTab } from "@/components/tracking/EventsTab";

export default function TrackingPage() {
  return (
    <>
      <TopBar title="Tracking" subtitle="Eventos comportamentais em tempo real" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Live events indicator */}
        <Card className="p-4 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
          </span>
          <span className="text-sm font-medium text-foreground">Eventos ao Vivo</span>
          <Badge variant="secondary" className="text-[10px]">{mockTrackingEvents.length} recentes</Badge>
        </Card>

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events" className="text-xs">Eventos</TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs">Sessões</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <EventsTab />
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            <Card className="p-6 text-center">
              <MonitorSmartphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">O replay de sessões estará disponível quando o script de tracking for instalado.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
