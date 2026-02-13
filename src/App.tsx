import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import ProjectsList from "@/pages/ProjectsList";
import PlaceholderPage from "@/pages/PlaceholderPage";
import Onboarding from "@/pages/Onboarding";
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
            <Route path="/urls" element={<PlaceholderPage title="URLs" subtitle="Sitemap & Inventory" />} />
            <Route path="/seo" element={<PlaceholderPage title="SEO" subtitle="Google Search Console" />} />
            <Route path="/analytics" element={<PlaceholderPage title="Analytics" subtitle="GA4 Dashboard" />} />
            <Route path="/indexing" element={<PlaceholderPage title="Indexing" subtitle="GSC API Queue" />} />
            <Route path="/ai-agent" element={<PlaceholderPage title="AI Agent" subtitle="Insights & Actions" />} />
            <Route path="/tracking" element={<PlaceholderPage title="Tracking" subtitle="Behavioral Events" />} />
            <Route path="/conversions" element={<PlaceholderPage title="Conversions" subtitle="Goals & Funnels" />} />
            <Route path="/ads" element={<PlaceholderPage title="Ads" subtitle="Google Ads & Meta" />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" subtitle="Export & Scheduling" />} />
            <Route path="/project-settings" element={<PlaceholderPage title="Project Settings" />} />
            <Route path="/account/users" element={<PlaceholderPage title="Users & Permissions" />} />
            <Route path="/account/billing" element={<PlaceholderPage title="Billing & Plans" />} />
            <Route path="/admin" element={<PlaceholderPage title="Admin Backoffice" subtitle="System Administration" />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
