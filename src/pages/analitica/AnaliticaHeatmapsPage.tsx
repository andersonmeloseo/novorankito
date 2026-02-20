import { TopBar } from "@/components/layout/TopBar";
import { HeatmapTab } from "@/components/tracking/HeatmapTab";

export default function AnaliticaHeatmapsPage() {
  return (
    <>
      <TopBar title="Heatmaps" subtitle="Mapas de calor, scroll e movimento do mouse" />
      <div className="p-4 sm:p-6">
        <HeatmapTab />
      </div>
    </>
  );
}
