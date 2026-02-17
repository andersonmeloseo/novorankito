import { TopBar } from "@/components/layout/TopBar";
import { UserJourneyTab } from "@/components/tracking/UserJourneyTab";

export default function AnaliticaJornadaPage() {
  return (
    <>
      <TopBar title="Jornada do Usuário" subtitle="Caminhos de navegação dos visitantes" />
      <div className="p-4 sm:p-6">
        <UserJourneyTab />
      </div>
    </>
  );
}
