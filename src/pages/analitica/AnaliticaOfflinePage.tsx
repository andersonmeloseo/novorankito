import { TopBar } from "@/components/layout/TopBar";
import { OfflineConversionsTab } from "@/components/tracking/OfflineConversionsTab";

export default function AnaliticaOfflinePage() {
  return (
    <>
      <TopBar title="Conversão Offline" subtitle="Ligações, formulários e conversões offline" />
      <div className="p-4 sm:p-6">
        <OfflineConversionsTab />
      </div>
    </>
  );
}
