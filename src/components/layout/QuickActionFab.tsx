import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FolderPlus, Search, BarChart3, Bot, FileSearch, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { label: "Novo Projeto", icon: FolderPlus, path: "/onboarding" },
  { label: "SEO", icon: Search, path: "/seo" },
  { label: "Analytics", icon: BarChart3, path: "/ga4" },
  { label: "Indexação", icon: FileSearch, path: "/indexing" },
  { label: "Rankito IA", icon: Bot, path: "/rankito-ai" },
];

export function QuickActionFab() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="mb-2 flex flex-col gap-1.5 bg-popover border border-border rounded-xl shadow-xl p-2 min-w-[180px]"
          >
            {ACTIONS.map((a) => (
              <button
                key={a.path}
                onClick={() => { navigate(a.path); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium",
                  "text-popover-foreground hover:bg-accent transition-colors text-left w-full"
                )}
              >
                <a.icon className="h-4 w-4 text-primary shrink-0" />
                {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all",
          "bg-primary text-primary-foreground hover:shadow-primary/30 hover:scale-105",
          open && "rotate-45"
        )}
        style={{ transition: "transform 0.2s, box-shadow 0.2s" }}
        aria-label="Ações rápidas"
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  );
}
