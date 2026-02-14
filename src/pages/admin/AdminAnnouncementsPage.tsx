import { PageHeader } from "@/components/layout/PageHeader";
import { AdminAnnouncementsTab } from "@/components/admin/AdminAnnouncementsTab";

export default function AdminAnnouncementsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Anúncios" description="Envio global de notificações, broadcast e alertas internos" />
      <AdminAnnouncementsTab />
    </div>
  );
}
