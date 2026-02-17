import { TopBar } from "@/components/layout/TopBar";
import { AdsUtmTrackingTab } from "@/components/tracking/AdsUtmTrackingTab";

export default function AnaliticaAdsUtmPage() {
  return (
    <>
      <TopBar title="Ads & UTM" subtitle="Atribuição de campanhas e parâmetros UTM" />
      <div className="p-4 sm:p-6">
        <AdsUtmTrackingTab />
      </div>
    </>
  );
}
