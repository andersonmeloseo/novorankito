import { PageHeader } from "@/components/layout/PageHeader";
import { AdminProjectsTab } from "@/components/admin/AdminProjectsTab";
import { useAdminProfiles, useAdminProjects } from "@/hooks/use-admin";

export default function AdminProjectsPage() {
  const { data: projects = [], isLoading } = useAdminProjects();
  const { data: profiles = [] } = useAdminProfiles();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Projetos / Workspaces" description="Lista e gestão de todos os projetos da plataforma" />
      <AdminProjectsTab projects={projects} profiles={profiles} isLoading={isLoading} />
    </div>
  );
}
