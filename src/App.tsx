import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/layout/AdminProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { WhiteLabelProvider } from "@/contexts/WhiteLabelContext";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const Login = lazy(() => import("@/pages/Login"));
const Overview = lazy(() => import("@/pages/Overview"));
const ProjectsList = lazy(() => import("@/pages/ProjectsList"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const UrlsPage = lazy(() => import("@/pages/UrlsPage"));
const SeoPage = lazy(() => import("@/pages/SeoPage"));
const GA4Page = lazy(() => import("@/pages/AnalyticsPage"));
const IndexingPage = lazy(() => import("@/pages/IndexingPage"));
const AiAgentPage = lazy(() => import("@/pages/AiAgentPage"));
const TrackingPage = lazy(() => import("@/pages/analitica/AnaliticaOverviewPage"));
// Analítica sub-pages
const AnaliticaEventosPage = lazy(() => import("@/pages/analitica/AnaliticaEventosPage"));
const AnaliticaSessoesPage = lazy(() => import("@/pages/analitica/AnaliticaSessoesPage"));
const AnaliticaHeatmapsPage = lazy(() => import("@/pages/analitica/AnaliticaHeatmapsPage"));
const AnaliticaEcommercePage = lazy(() => import("@/pages/analitica/AnaliticaEcommercePage"));
const AnaliticaJornadaPage = lazy(() => import("@/pages/analitica/AnaliticaJornadaPage"));
const AnaliticaAdsUtmPage = lazy(() => import("@/pages/analitica/AnaliticaAdsUtmPage"));
const AnaliticaOfflinePage = lazy(() => import("@/pages/analitica/AnaliticaOfflinePage"));
const AnaliticaEventBuilderPage = lazy(() => import("@/pages/analitica/AnaliticaEventBuilderPage"));
const AnaliticaMetasPage = lazy(() => import("@/pages/analitica/AnaliticaMetasPage"));
const AnaliticaPixelPage = lazy(() => import("@/pages/analitica/AnaliticaPixelPage"));
const AdsPage = lazy(() => import("@/pages/AdsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const ProjectSettingsPage = lazy(() => import("@/pages/ProjectSettingsPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const BillingPage = lazy(() => import("@/pages/BillingPage"));
// Admin sub-pages
const AdminOverviewPage = lazy(() => import("@/pages/admin/AdminOverviewPage"));
const AdminClientsPage = lazy(() => import("@/pages/admin/AdminClientsPage"));
const AdminUsersPageAdmin = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminBillingPageAdmin = lazy(() => import("@/pages/admin/AdminBillingPage"));
const AdminPlansPage = lazy(() => import("@/pages/admin/AdminPlansPage"));
const AdminProjectsPageAdmin = lazy(() => import("@/pages/admin/AdminProjectsPage"));
const AdminUsagePage = lazy(() => import("@/pages/admin/AdminUsagePage"));
const AdminIntegrationsPage = lazy(() => import("@/pages/admin/AdminIntegrationsPage"));
const AdminSecurityPageAdmin = lazy(() => import("@/pages/admin/AdminSecurityPage"));
const AdminLogsPageAdmin = lazy(() => import("@/pages/admin/AdminLogsPage"));
const AdminHealthPage = lazy(() => import("@/pages/admin/AdminHealthPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminNotificationsPage = lazy(() => import("@/pages/admin/AdminNotificationsPage"));
const AdminFlagsPage = lazy(() => import("@/pages/admin/AdminFlagsPage"));
const AdminAnnouncementsPage = lazy(() => import("@/pages/admin/AdminAnnouncementsPage"));
const AdminApisPage = lazy(() => import("@/pages/admin/AdminApisPage"));
// Rank & Rent
const RROverviewPage = lazy(() => import("@/pages/rank-rent/RROverviewPage"));
const RRClientsPage = lazy(() => import("@/pages/rank-rent/RRClientsPage"));
const RRContractsPage = lazy(() => import("@/pages/rank-rent/RRContractsPage"));
const RRPagesPage = lazy(() => import("@/pages/rank-rent/RRPagesPage"));
const RRFinancialPage = lazy(() => import("@/pages/rank-rent/RRFinancialPage"));
const RRAvailabilityPage = lazy(() => import("@/pages/rank-rent/RRAvailabilityPage"));
const RRPerformancePage = lazy(() => import("@/pages/rank-rent/RRPerformancePage"));
const RRProjectMonetizationPage = lazy(() => import("@/pages/rank-rent/RRProjectMonetizationPage"));
const RRLeadsPage = lazy(() => import("@/pages/rank-rent/RRLeadsPage"));
const SemanticGraphPage = lazy(() => import("@/pages/SemanticGraphPage"));
const GettingStartedPage = lazy(() => import("@/pages/GettingStartedPage"));
const ProjectDashboardPage = lazy(() => import("@/pages/ProjectDashboardPage"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const AcademyPage = lazy(() => import("@/pages/AcademyPage"));
const AdminAcademyPage = lazy(() => import("@/pages/admin/AdminAcademyPage"));
const CheckoutSuccessPage = lazy(() => import("@/pages/CheckoutSuccessPage"));
const AdminCouponsPage = lazy(() => import("@/pages/admin/AdminCouponsPage"));
const CommandCenterPage = lazy(() => import("@/pages/CommandCenterPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

const App = () => {
  const projectId = typeof window !== "undefined" ? localStorage.getItem("rankito_current_project") || undefined : undefined;

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WhiteLabelProvider projectId={projectId}>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/" element={<LandingPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/checkout-success" element={<CheckoutSuccessPage />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route element={<AppLayout />}>
                    <Route path="/account/billing" element={<BillingPage />} />
                    <Route path="/account/profile" element={<AccountPage />} />
                  </Route>
                </Route>
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/projects" element={<ProjectsList />} />
                  <Route path="/getting-started" element={<GettingStartedPage />} />
                  <Route path="/urls" element={<UrlsPage />} />
                  <Route path="/seo" element={<SeoPage />} />
                  <Route path="/ga4" element={<GA4Page />} />
                  <Route path="/indexing" element={<IndexingPage />} />
                  <Route path="/rankito-ai" element={<AiAgentPage />} />
                  <Route path="/analitica-rankito" element={<TrackingPage />} />
                  <Route path="/analitica-rankito/eventos" element={<AnaliticaEventosPage />} />
                  <Route path="/analitica-rankito/sessoes" element={<AnaliticaSessoesPage />} />
                  <Route path="/analitica-rankito/heatmaps" element={<AnaliticaHeatmapsPage />} />
                  <Route path="/analitica-rankito/ecommerce" element={<AnaliticaEcommercePage />} />
                  <Route path="/analitica-rankito/jornada" element={<AnaliticaJornadaPage />} />
                  <Route path="/analitica-rankito/ads-utm" element={<AnaliticaAdsUtmPage />} />
                  <Route path="/analitica-rankito/offline" element={<AnaliticaOfflinePage />} />
                  <Route path="/analitica-rankito/event-builder" element={<AnaliticaEventBuilderPage />} />
                  <Route path="/analitica-rankito/metas" element={<AnaliticaMetasPage />} />
                  <Route path="/analitica-rankito/pixel" element={<AnaliticaPixelPage />} />
                  <Route path="/ads" element={<AdsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/project-settings" element={<ProjectSettingsPage />} />
                  <Route path="/account/users" element={<UsersPage />} />
                  <Route path="/academy" element={<AcademyPage />} />
                  {/* Rank & Rent */}
                  <Route path="/rank-rent" element={<RROverviewPage />} />
                  <Route path="/rank-rent/clients" element={<RRClientsPage />} />
                  <Route path="/rank-rent/contracts" element={<RRContractsPage />} />
                  <Route path="/rank-rent/pages" element={<RRPagesPage />} />
                  <Route path="/rank-rent/financial" element={<RRFinancialPage />} />
                  <Route path="/rank-rent/availability" element={<RRAvailabilityPage />} />
                  <Route path="/rank-rent/performance" element={<RRPerformancePage />} />
                  <Route path="/rank-rent/project/:projectId" element={<RRProjectMonetizationPage />} />
                  <Route path="/rank-rent/leads" element={<RRLeadsPage />} />
                  {/* Semantic Graph */}
                  <Route path="/semantic-graph" element={<SemanticGraphPage />} />
                  <Route path="/command-center" element={<CommandCenterPage />} />
                  <Route path="/project/:id/dashboard" element={<ProjectDashboardPage />} />
                </Route>
                {/* Admin — protected by role check */}
                <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route path="/admin" element={<AdminOverviewPage />} />
                  <Route path="/admin/clients" element={<AdminClientsPage />} />
                  <Route path="/admin/users" element={<AdminUsersPageAdmin />} />
                  <Route path="/admin/billing" element={<AdminBillingPageAdmin />} />
                  <Route path="/admin/plans" element={<AdminPlansPage />} />
                  <Route path="/admin/projects" element={<AdminProjectsPageAdmin />} />
                  <Route path="/admin/usage" element={<AdminUsagePage />} />
                  <Route path="/admin/integrations" element={<AdminIntegrationsPage />} />
                  <Route path="/admin/apis" element={<AdminApisPage />} />
                  <Route path="/admin/security" element={<AdminSecurityPageAdmin />} />
                  <Route path="/admin/logs" element={<AdminLogsPageAdmin />} />
                  <Route path="/admin/health" element={<AdminHealthPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
                  <Route path="/admin/flags" element={<AdminFlagsPage />} />
                  <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                  <Route path="/admin/academy" element={<AdminAcademyPage />} />
                  <Route path="/admin/coupons" element={<AdminCouponsPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
      </WhiteLabelProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
