import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface TourProgressBarProps {
  stepIndex: number;
  totalSteps: number;
}

export function TourProgressBar({ stepIndex, totalSteps }: TourProgressBarProps) {
  const percent = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-[10001] bg-card/95 backdrop-blur-sm border-b border-border px-4 py-2"
    >
      <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
        <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
          Configuração Inicial
        </span>
        <Progress value={percent} className="h-2 flex-1" />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
          {stepIndex + 1} / {totalSteps}
        </span>
      </div>
    </motion.div>
  );
}
