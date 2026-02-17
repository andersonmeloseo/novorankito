import { TopBar } from "@/components/layout/TopBar";
import { InstallScriptTab } from "@/components/tracking/InstallScriptTab";

export default function AnaliticaPixelPage() {
  return (
    <>
      <TopBar title="Pixel Rankito" subtitle="Instale e configure o script de tracking" />
      <div className="p-4 sm:p-6">
        <InstallScriptTab />
      </div>
    </>
  );
}
