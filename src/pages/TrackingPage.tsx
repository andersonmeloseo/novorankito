import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTrackingEvents } from "@/lib/mock-data";
import { MonitorSmartphone, Flame } from "lucide-react";

const HEATMAP_HOURS = Array.from({ length: 24 }, (_, h) => h);
const HEATMAP_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function generateHeatmapData() {
  return HEATMAP_DAYS.map((day) => ({
    day,
    hours: HEATMAP_HOURS.map((h) => ({
      hour: h,
      value: Math.floor(Math.random() * 100),
    })),
  }));
}

const heatmapData = generateHeatmapData();

export default function TrackingPage() {
  return (
    <>
      <TopBar title="Tracking" subtitle="Eventos comportamentais em tempo real e mapa de calor" />
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
            <TabsTrigger value="heatmap" className="text-xs">Mapa de Calor</TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs">Sessões</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Evento", "Elemento", "Página", "Dispositivo", "País", "Horário"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockTrackingEvents.map((ev) => (
                      <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px]">{ev.event}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">{"element" in ev ? ev.element : `${(ev as any).depth}`}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{ev.page}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{ev.device === "mobile" ? "Celular" : ev.device === "desktop" ? "Desktop" : "Tablet"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{ev.country}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{ev.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap" className="mt-4 space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Flame className="h-4 w-4 text-warning" /> Mapa de Calor de Volume (Dia × Hora)
              </h3>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex gap-0.5 mb-1 ml-10">
                    {HEATMAP_HOURS.filter((_, i) => i % 3 === 0).map((h) => (
                      <span key={h} className="text-[9px] text-muted-foreground" style={{ width: `${100 / 8}%` }}>{h}h</span>
                    ))}
                  </div>
                  {heatmapData.map((row) => (
                    <div key={row.day} className="flex items-center gap-0.5 mb-0.5">
                      <span className="text-[10px] text-muted-foreground w-10 text-right pr-2">{row.day}</span>
                      {row.hours.map((cell) => (
                        <div
                          key={cell.hour}
                          className="flex-1 h-5 rounded-sm"
                          style={{
                            backgroundColor: `hsl(var(--primary) / ${Math.max(0.05, cell.value / 100)})`,
                          }}
                          title={`${row.day} ${cell.hour}:00 — ${cell.value} eventos`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
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
