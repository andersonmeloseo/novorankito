import { Card } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface FeatureBannerProps {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
}

export function FeatureBanner({ icon: Icon, title, description }: FeatureBannerProps) {
  return (
    <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-success/5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-success/20 shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold font-display">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );
}
