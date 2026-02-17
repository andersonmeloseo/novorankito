import { TopBar } from "@/components/layout/TopBar";
import { SessionsTab } from "@/components/tracking/SessionsTab";

export default function AnaliticaSessoesPage() {
  return (
    <>
      <TopBar title="Sessões" subtitle="Sessões individuais dos visitantes" />
      <div className="p-4 sm:p-6">
        <SessionsTab />
      </div>
    </>
  );
}
