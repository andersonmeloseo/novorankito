import { PageHeader } from "@/components/layout/PageHeader";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { useAdminProfiles, useAdminProjects, useAdminRoles, useAdminBilling } from "@/hooks/use-admin";

export default function AdminUsersPage() {
  const { data: profiles = [], isLoading } = useAdminProfiles();
  const { data: projects = [] } = useAdminProjects();
  const { data: roles = [] } = useAdminRoles();
  const { data: billing = [] } = useAdminBilling();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Usuários" description="Gestão global de usuários, roles e permissões" />
      <AdminUsersTab profiles={profiles} roles={roles} projects={projects} billing={billing} isLoading={isLoading} />
    </div>
  );
}
