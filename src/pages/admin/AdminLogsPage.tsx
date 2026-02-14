import { PageHeader } from "@/components/layout/PageHeader";
import { AdminLogsTab } from "@/components/admin/AdminLogsTab";
import { useAdminProfiles, useAdminAuditLogs } from "@/hooks/use-admin";

export default function AdminLogsPage() {
  const { data: logs = [] } = useAdminAuditLogs();
  const { data: profiles = [] } = useAdminProfiles();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Logs & Monitoramento" description="Auditoria completa, logs de sistema, erros e performance" />
      <AdminLogsTab logs={logs} profiles={profiles} />
    </div>
  );
}
