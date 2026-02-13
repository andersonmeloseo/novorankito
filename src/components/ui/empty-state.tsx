import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" className="mt-4 text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
