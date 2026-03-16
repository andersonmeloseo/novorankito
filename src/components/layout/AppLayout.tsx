import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { QuickActionFab } from "./QuickActionFab";
import { OnboardingTour } from "@/components/onboarding/tour/OnboardingTour";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export function AppLayout() {
  const { pathname } = useLocation();
  const [projectId, setProjectId] = useState<string | undefined>(
    () => localStorage.getItem("rankito_current_project") || undefined
  );

  useEffect(() => {
    const sync = () => setProjectId(localStorage.getItem("rankito_current_project") || undefined);
    window.addEventListener("storage", sync);
    window.addEventListener("rankito_project_changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("rankito_project_changed", sync);
    };
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex flex-col sm:flex-row w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex-1 flex flex-col"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <QuickActionFab />
        <OnboardingTour projectId={projectId} />
      </div>
    </SidebarProvider>
  );
}
