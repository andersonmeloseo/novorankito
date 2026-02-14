import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
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
import AdminPage from "@/pages/AdminPage";
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
              <Route path="/admin" element={<AdminPage />} />
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
