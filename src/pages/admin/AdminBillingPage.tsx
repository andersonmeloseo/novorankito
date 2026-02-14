import { PageHeader } from "@/components/layout/PageHeader";
import { AdminBillingTab } from "@/components/admin/AdminBillingTab";
import { useAdminProfiles, useAdminBilling } from "@/hooks/use-admin";

export default function AdminBillingPage() {
  const { data: billing = [] } = useAdminBilling();
  const { data: profiles = [] } = useAdminProfiles();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Planos & Billing" description="Assinaturas, MRR, faturas e uso por cliente" />
      <AdminBillingTab billing={billing} profiles={profiles} />
    </div>
  );
}
