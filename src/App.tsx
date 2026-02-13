import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import ProjectsList from "@/pages/ProjectsList";
import Onboarding from "@/pages/Onboarding";
import UrlsPage from "@/pages/UrlsPage";
import SeoPage from "@/pages/SeoPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/overview" element={<Overview />} />
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/urls" element={<UrlsPage />} />
            <Route path="/seo" element={<SeoPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/indexing" element={<IndexingPage />} />
            <Route path="/ai-agent" element={<AiAgentPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/conversions" element={<ConversionsPage />} />
            <Route path="/ads" element={<AdsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/project-settings" element={<ProjectSettingsPage />} />
            <Route path="/account/users" element={<UsersPage />} />
            <Route path="/account/billing" element={<BillingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
