import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import ProjectsList from "@/pages/ProjectsList";
import Onboarding from "@/pages/Onboarding";
import UrlsPage from "@/pages/UrlsPage";
import SeoPage from "@/pages/SeoPage";
import GA4Page from "@/pages/AnalyticsPage";
import IndexingPage from "@/pages/IndexingPage";
import AiAgentPage from "@/pages/AiAgentPage";
import TrackingPage from "@/pages/TrackingPage";
import ConversionsPage from "@/pages/ConversionsPage";
import AdsPage from "@/pages/AdsPage";
import ReportsPage from "@/pages/ReportsPage";
import ProjectSettingsPage from "@/pages/ProjectSettingsPage";
import UsersPage from "@/pages/UsersPage";
import BillingPage from "@/pages/BillingPage";
// Admin sub-pages
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import AdminClientsPage from "@/pages/admin/AdminClientsPage";
import AdminUsersPageAdmin from "@/pages/admin/AdminUsersPage";
import AdminBillingPageAdmin from "@/pages/admin/AdminBillingPage";
import AdminProjectsPageAdmin from "@/pages/admin/AdminProjectsPage";
import AdminUsagePage from "@/pages/admin/AdminUsagePage";
import AdminIntegrationsPage from "@/pages/admin/AdminIntegrationsPage";
import AdminSecurityPageAdmin from "@/pages/admin/AdminSecurityPage";
import AdminLogsPageAdmin from "@/pages/admin/AdminLogsPage";
import AdminHealthPage from "@/pages/admin/AdminHealthPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminNotificationsPage from "@/pages/admin/AdminNotificationsPage";
import AdminFlagsPage from "@/pages/admin/AdminFlagsPage";
import AdminAnnouncementsPage from "@/pages/admin/AdminAnnouncementsPage";
import NotFound from "./pages/NotFound";
// Rank & Rent
import RROverviewPage from "@/pages/rank-rent/RROverviewPage";
import RRClientsPage from "@/pages/rank-rent/RRClientsPage";
import RRContractsPage from "@/pages/rank-rent/RRContractsPage";
import RRPagesPage from "@/pages/rank-rent/RRPagesPage";
import RRFinancialPage from "@/pages/rank-rent/RRFinancialPage";
import RRAvailabilityPage from "@/pages/rank-rent/RRAvailabilityPage";
import RRPerformancePage from "@/pages/rank-rent/RRPerformancePage";
import RRProjectMonetizationPage from "@/pages/rank-rent/RRProjectMonetizationPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/overview" element={<Overview />} />
              <Route path="/projects" element={<ProjectsList />} />
              <Route path="/urls" element={<UrlsPage />} />
              <Route path="/seo" element={<SeoPage />} />
              <Route path="/ga4" element={<GA4Page />} />
              <Route path="/indexing" element={<IndexingPage />} />
              <Route path="/ai-agent" element={<AiAgentPage />} />
              <Route path="/analitica-rankito" element={<TrackingPage />} />
              <Route path="/conversions" element={<ConversionsPage />} />
              <Route path="/ads" element={<AdsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/project-settings" element={<ProjectSettingsPage />} />
              <Route path="/account/users" element={<UsersPage />} />
              <Route path="/account/billing" element={<BillingPage />} />
            </Route>
            {/* Admin separado — sem sidebar */}
            <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/clients" element={<AdminClientsPage />} />
              <Route path="/admin/users" element={<AdminUsersPageAdmin />} />
              <Route path="/admin/billing" element={<AdminBillingPageAdmin />} />
              <Route path="/admin/projects" element={<AdminProjectsPageAdmin />} />
              <Route path="/admin/usage" element={<AdminUsagePage />} />
              <Route path="/admin/integrations" element={<AdminIntegrationsPage />} />
              <Route path="/admin/security" element={<AdminSecurityPageAdmin />} />
              <Route path="/admin/logs" element={<AdminLogsPageAdmin />} />
              <Route path="/admin/health" element={<AdminHealthPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/flags" element={<AdminFlagsPage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route path="/onboarding" element={<Onboarding />} />
              {/* Rank & Rent */}
              <Route path="/rank-rent" element={<RROverviewPage />} />
              <Route path="/rank-rent/clients" element={<RRClientsPage />} />
              <Route path="/rank-rent/contracts" element={<RRContractsPage />} />
              <Route path="/rank-rent/pages" element={<RRPagesPage />} />
              <Route path="/rank-rent/financial" element={<RRFinancialPage />} />
              <Route path="/rank-rent/availability" element={<RRAvailabilityPage />} />
              <Route path="/rank-rent/performance" element={<RRPerformancePage />} />
              <Route path="/rank-rent/project/:projectId" element={<RRProjectMonetizationPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
