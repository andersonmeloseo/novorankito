import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, CheckCircle, XCircle } from "lucide-react";

export default function AdminIntegrationsPage() {
  const integrations = [
    { name: "Google Search Console", status: "connected", connections: 14 },
    { name: "Google Analytics 4", status: "connected", connections: 12 },
    { name: "Google Ads", status: "available", connections: 0 },
    { name: "Meta Ads", status: "available", connections: 0 },
    { name: "Stripe", status: "connected", connections: 1 },
    { name: "Webhooks", status: "connected", connections: 3 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Integrações" description="Gestão global de integrações, status das conexões e logs" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((int) => (
          <Card key={int.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plug className="h-4 w-4" />
                  {int.name}
                </CardTitle>
                {int.status === "connected" ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={int.status === "connected" ? "default" : "secondary"}>
                {int.status === "connected" ? "Conectado" : "Disponível"}
                </Badge>
                <span className="text-xs text-muted-foreground">{int.connections} conexões</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
