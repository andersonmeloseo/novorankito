import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
}

export default function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <>
      <TopBar title={title} subtitle={subtitle || "acme.com"} />
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-md">
          <Construction className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
          <p className="text-sm text-muted-foreground">
            This module is part of the Rankito prototype. Full mock data and interactions coming soon.
          </p>
        </Card>
      </div>
    </>
  );
}
