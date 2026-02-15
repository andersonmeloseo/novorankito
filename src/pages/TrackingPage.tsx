import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllEventsTab } from "@/components/tracking/AllEventsTab";
import { EcommerceTrackingTab } from "@/components/tracking/EcommerceTrackingTab";
import { AdsUtmTrackingTab } from "@/components/tracking/AdsUtmTrackingTab";
import { SessionsTab } from "@/components/tracking/SessionsTab";
import { InstallScriptTab } from "@/components/tracking/InstallScriptTab";
import { Activity, ShoppingCart, Zap, Target, Users, Code } from "lucide-react";

export default function TrackingPage() {
  return (
    <>
      <TopBar title="Analítica Rankito" subtitle="Plugin v3.1.0 — Tracking Universal de Cliques, E-commerce, Conversões e Ads" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Card className="p-4 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
          </span>
          <span className="text-sm font-medium text-foreground">Plugin Ativo — Capturando Eventos em Tempo Real</span>
          <Badge variant="secondary" className="text-[10px]">v3.1.0</Badge>
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
            <TabsTrigger value="install" className="text-xs gap-1.5">
              <Code className="h-3.5 w-3.5" /> Instalar
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

          <TabsContent value="install" className="mt-4">
            <InstallScriptTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
