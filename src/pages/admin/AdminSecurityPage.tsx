import { PageHeader } from "@/components/layout/PageHeader";
import { AdminSecurityTab } from "@/components/admin/AdminSecurityTab";
import { useAdminProfiles, useAdminRoles, useAdminAuditLogs } from "@/hooks/use-admin";

export default function AdminSecurityPage() {
  const { data: profiles = [] } = useAdminProfiles();
  const { data: roles = [] } = useAdminRoles();
  const { data: logs = [] } = useAdminAuditLogs();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Segurança" description="Controle de acesso, auditoria, IPs suspeitos e configurações de segurança" />
      <AdminSecurityTab profiles={profiles} roles={roles} logs={logs} />
    </div>
  );
}
