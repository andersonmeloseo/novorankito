import { TopBar } from "@/components/layout/TopBar";
import { EventBuilderTab } from "@/components/tracking/EventBuilderTab";

export default function AnaliticaEventBuilderPage() {
  return (
    <>
      <TopBar title="Eventos Personalizados" subtitle="Crie triggers customizados de eventos" />
      <div className="p-4 sm:p-6">
        <EventBuilderTab />
      </div>
    </>
  );
}
