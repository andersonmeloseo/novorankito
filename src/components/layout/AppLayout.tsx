import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { QuickActionFab } from "./QuickActionFab";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { WhiteLabelProvider } from "@/contexts/WhiteLabelContext";

export function AppLayout() {
  const { pathname } = useLocation();
  const projectId = typeof window !== "undefined" ? localStorage.getItem("rankito_current_project") || undefined : undefined;

  return (
    <WhiteLabelProvider projectId={projectId}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0">
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
          <GuidedTour />
        </div>
      </SidebarProvider>
    </WhiteLabelProvider>
  );
}
