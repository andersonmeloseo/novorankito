import { TopBar } from "@/components/layout/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, Users, FolderOpen, CreditCard, Activity,
  Shield, Server, Megaphone, Flag,
} from "lucide-react";
import {
  useAdminProfiles, useAdminProjects, useAdminRoles,
  useAdminBilling, useAdminAuditLogs,
} from "@/hooks/use-admin";
import { useAdminStats } from "@/hooks/use-super-admin";

// Sub-components
import { AdminDashboardTab } from "@/components/admin/AdminDashboardTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminProjectsTab } from "@/components/admin/AdminProjectsTab";
import { AdminBillingTab } from "@/components/admin/AdminBillingTab";
import { AdminLogsTab } from "@/components/admin/AdminLogsTab";
import { AdminSecurityTab } from "@/components/admin/AdminSecurityTab";
import { AdminSystemHealthTab } from "@/components/admin/AdminSystemHealthTab";
import { AdminAnnouncementsTab } from "@/components/admin/AdminAnnouncementsTab";
import { AdminFeatureFlagsTab } from "@/components/admin/AdminFeatureFlagsTab";

export default function AdminPage() {
  const { data: profiles = [], isLoading: loadingProfiles } = useAdminProfiles();
  const { data: projects = [], isLoading: loadingProjects } = useAdminProjects();
  const { data: roles = [] } = useAdminRoles();
  const { data: billing = [] } = useAdminBilling();
  const { data: logs = [] } = useAdminAuditLogs();
  const { data: stats } = useAdminStats();

  return (
    <>
      <TopBar title="Super Admin" subtitle="Gestão completa do SaaS — usuários, projetos, billing, sistema e configurações" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="text-xs gap-1.5"><LayoutDashboard className="h-3 w-3" /> Dashboard</TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs gap-1.5"><FolderOpen className="h-3 w-3" /> Projetos</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs gap-1.5"><CreditCard className="h-3 w-3" /> Billing</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Logs</TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1.5"><Shield className="h-3 w-3" /> Segurança</TabsTrigger>
            <TabsTrigger value="health" className="text-xs gap-1.5"><Server className="h-3 w-3" /> Sistema</TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs gap-1.5"><Megaphone className="h-3 w-3" /> Anúncios</TabsTrigger>
            <TabsTrigger value="flags" className="text-xs gap-1.5"><Flag className="h-3 w-3" /> Feature Flags</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <AdminDashboardTab stats={stats} profiles={profiles} projects={projects} billing={billing} logs={logs} />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <AdminUsersTab profiles={profiles} roles={roles} projects={projects} billing={billing} isLoading={loadingProfiles} />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <AdminProjectsTab projects={projects} profiles={profiles} isLoading={loadingProjects} />
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            <AdminBillingTab billing={billing} profiles={profiles} />
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <AdminLogsTab logs={logs} profiles={profiles} />
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <AdminSecurityTab profiles={profiles} roles={roles} logs={logs} />
          </TabsContent>

          <TabsContent value="health" className="mt-4">
            <AdminSystemHealthTab stats={stats} />
          </TabsContent>

          <TabsContent value="announcements" className="mt-4">
            <AdminAnnouncementsTab />
          </TabsContent>

          <TabsContent value="flags" className="mt-4">
            <AdminFeatureFlagsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
