import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllEventsTab } from "@/components/tracking/AllEventsTab";
import { EcommerceTrackingTab } from "@/components/tracking/EcommerceTrackingTab";
import { AdsUtmTrackingTab } from "@/components/tracking/AdsUtmTrackingTab";
import { SessionsTab } from "@/components/tracking/SessionsTab";
import { InstallScriptTab } from "@/components/tracking/InstallScriptTab";
import { UserJourneyTab } from "@/components/tracking/UserJourneyTab";
import { OfflineConversionsTab } from "@/components/tracking/OfflineConversionsTab";
import { EventBuilderTab } from "@/components/tracking/EventBuilderTab";
import { GoalsTab } from "@/components/tracking/GoalsTab";
import { HeatmapTab } from "@/components/tracking/HeatmapTab";
import { Activity, ShoppingCart, Target, Users, Code, Footprints, PhoneCall, MousePointerClick, Flag, Flame } from "lucide-react";

export default function TrackingPage() {
  return (
    <>
      <TopBar title="Analítica Rankito" subtitle="Plugin v3.3.0 — Tracking Universal com E-commerce Automático" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Card className="p-4 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
          </span>
          <span className="text-sm font-medium text-foreground">Pixel Ativado — Capturando Eventos em Tempo Real</span>
          <Badge variant="secondary" className="text-[10px]">v3.3.0</Badge>
        </Card>

        <Tabs defaultValue="all-events">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all-events" className="text-xs gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Eventos
            </TabsTrigger>
            <TabsTrigger value="ecommerce" className="text-xs gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> E-commerce
            </TabsTrigger>
            <TabsTrigger value="ads-utm" className="text-xs gap-1.5">
              <Target className="h-3.5 w-3.5" /> Ads & UTM
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" /> Sessões
            </TabsTrigger>
            <TabsTrigger value="journey" className="text-xs gap-1.5">
              <Footprints className="h-3.5 w-3.5" /> Jornada
            </TabsTrigger>
            <TabsTrigger value="offline" className="text-xs gap-1.5">
              <PhoneCall className="h-3.5 w-3.5" /> Conversão Offline
            </TabsTrigger>
            <TabsTrigger value="event-builder" className="text-xs gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" /> Eventos Personalizados
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs gap-1.5">
              <Flag className="h-3.5 w-3.5" /> Metas Personalizadas
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs gap-1.5">
              <Flame className="h-3.5 w-3.5" /> Heatmaps
            </TabsTrigger>
            <TabsTrigger value="install" className="text-xs gap-1.5">
              <Code className="h-3.5 w-3.5" /> Pixel Rankito
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-events" className="mt-4">
            <AllEventsTab />
          </TabsContent>

          <TabsContent value="ecommerce" className="mt-4">
            <EcommerceTrackingTab />
          </TabsContent>

          <TabsContent value="ads-utm" className="mt-4">
            <AdsUtmTrackingTab />
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            <SessionsTab />
          </TabsContent>

          <TabsContent value="journey" className="mt-4">
            <UserJourneyTab />
          </TabsContent>

          <TabsContent value="offline" className="mt-4">
            <OfflineConversionsTab />
          </TabsContent>

          <TabsContent value="event-builder" className="mt-4">
            <EventBuilderTab />
          </TabsContent>

          <TabsContent value="goals" className="mt-4">
            <GoalsTab />
          </TabsContent>

          <TabsContent value="heatmap" className="mt-4">
            <HeatmapTab />
          </TabsContent>

          <TabsContent value="install" className="mt-4">
            <InstallScriptTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
