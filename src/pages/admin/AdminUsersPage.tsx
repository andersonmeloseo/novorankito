import { PageHeader } from "@/components/layout/PageHeader";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { useAdminProfiles, useAdminProjects, useAdminRoles, useAdminBilling } from "@/hooks/use-admin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminUsersPage() {
  const { data: profiles = [], isLoading } = useAdminProfiles();
  const { data: projects = [] } = useAdminProjects();
  const { data: roles = [] } = useAdminRoles();
  const { data: billing = [] } = useAdminBilling();
  const { data: featureFlags = [] } = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_flags").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Usuários" description="Gestão completa de usuários, papéis, planos e permissões" />
      <AdminUsersTab
        profiles={profiles}
        roles={roles}
        projects={projects}
        billing={billing}
        isLoading={isLoading}
        featureFlags={featureFlags}
      />
    </div>
  );
}
