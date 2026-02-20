import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminIntegrationsPage() {
  const { data: gscConnections = [], isLoading: gscLoading } = useQuery({
    queryKey: ["admin-gsc-connections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gsc_connections").select("id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ga4Connections = [], isLoading: ga4Loading } = useQuery({
    queryKey: ["admin-ga4-connections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ga4_connections").select("id");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = gscLoading || ga4Loading;

  const integrations = [
    { name: "Google Search Console", status: gscConnections.length > 0 ? "connected" : "available", connections: gscConnections.length },
    { name: "Google Analytics 4", status: ga4Connections.length > 0 ? "connected" : "available", connections: ga4Connections.length },
    { name: "Google Ads", status: "available", connections: 0 },
    { name: "Meta Ads", status: "available", connections: 0 },
  ];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Integrações" description="Status real das conexões de integrações da plataforma" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
