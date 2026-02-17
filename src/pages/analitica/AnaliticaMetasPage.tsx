import { TopBar } from "@/components/layout/TopBar";
import { GoalsTab } from "@/components/tracking/GoalsTab";

export default function AnaliticaMetasPage() {
  return (
    <>
      <TopBar title="Metas" subtitle="Defina e acompanhe metas de conversão" />
      <div className="p-4 sm:p-6">
        <GoalsTab />
      </div>
    </>
  );
}
