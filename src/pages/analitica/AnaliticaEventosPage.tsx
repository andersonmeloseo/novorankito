import { TopBar } from "@/components/layout/TopBar";
import { AllEventsTab } from "@/components/tracking/AllEventsTab";

export default function AnaliticaEventosPage() {
  return (
    <>
      <TopBar title="Eventos" subtitle="Todos os eventos capturados pelo Pixel Rankito" />
      <div className="p-4 sm:p-6">
        <AllEventsTab />
      </div>
    </>
  );
}
