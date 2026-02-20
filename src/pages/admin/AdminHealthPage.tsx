import { PageHeader } from "@/components/layout/PageHeader";
import { AdminSystemHealthTab } from "@/components/admin/AdminSystemHealthTab";
import { useAdminStats } from "@/hooks/use-super-admin";

export default function AdminHealthPage() {
  const { data: stats } = useAdminStats();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Saúde do Sistema" description="Status dos serviços, uso de recursos e alertas de infraestrutura" />
      <AdminSystemHealthTab stats={stats} />
    </div>
  );
}
