import { PageHeader } from "@/components/layout/PageHeader";
import { AdminFeatureFlagsTab } from "@/components/admin/AdminFeatureFlagsTab";

export default function AdminFlagsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Feature Flags" description="Controle de funcionalidades por plano, usuário e região" />
      <AdminFeatureFlagsTab />
    </div>
  );
}
