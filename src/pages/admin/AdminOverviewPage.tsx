import { PageHeader } from "@/components/layout/PageHeader";
import { AdminDashboardTab } from "@/components/admin/AdminDashboardTab";
import { useAdminProfiles, useAdminProjects, useAdminBilling, useAdminAuditLogs } from "@/hooks/use-admin";
import { useAdminStats } from "@/hooks/use-super-admin";

export default function AdminOverviewPage() {
  const { data: profiles = [] } = useAdminProfiles();
  const { data: projects = [] } = useAdminProjects();
  const { data: billing = [] } = useAdminBilling();
  const { data: logs = [] } = useAdminAuditLogs();
  const { data: stats } = useAdminStats();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Overview" description="Visão geral da plataforma — KPIs, crescimento e alertas" />
      <AdminDashboardTab stats={stats} profiles={profiles} projects={projects} billing={billing} logs={logs} />
    </div>
  );
}
