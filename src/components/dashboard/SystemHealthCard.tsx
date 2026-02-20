import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, Key, Webhook, Loader2 } from "lucide-react";

interface SystemHealthProps {
  projectId?: string;
}

export function SystemHealthCard({ projectId }: SystemHealthProps) {
  const { user } = useAuth();

  const { data: health, isLoading } = useQuery({
    queryKey: ["system-health", projectId],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Parallel queries
      const [jobsRes, errorsRes, apiKeysRes, webhooksRes] = await Promise.all([
        supabase
          .from("sync_jobs")
          .select("status", { count: "exact", head: false })
          .gte("created_at", last24h)
          .then(({ data }) => {
            const jobs = data || [];
            return {
              total: jobs.length,
              completed: jobs.filter((j) => j.status === "completed").length,
              failed: jobs.filter((j) => j.status === "failed").length,
              pending: jobs.filter((j) => j.status === "pending" || j.status === "processing").length,
            };
          }),
        supabase
          .from("app_errors")
          .select("id", { count: "exact", head: true })
          .gte("created_at", last24h)
          .then(({ count }) => count || 0),
        projectId
          ? supabase
              .from("api_keys")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId)
              .eq("is_active", true)
              .then(({ count }) => count || 0)
          : Promise.resolve(0),
        projectId
          ? supabase
              .from("webhooks")
              .select("id, failure_count", { count: "exact", head: false })
              .eq("project_id", projectId)
              .eq("is_active", true)
              .then(({ data }) => ({
                total: (data || []).length,
                unhealthy: (data || []).filter((w) => (w.failure_count || 0) > 3).length,
              }))
          : Promise.resolve({ total: 0, unhealthy: 0 }),
      ]);

      return { jobs: jobsRes, errors: errorsRes, apiKeys: apiKeysRes, webhooks: webhooksRes };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  const overallStatus =
    health.errors > 10 || health.jobs.failed > 5 || health.webhooks.unhealthy > 0
      ? "degraded"
      : health.errors > 0 || health.jobs.failed > 0
        ? "warning"
        : "healthy";

  const statusConfig = {
    healthy: { label: "Saudável", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
    warning: { label: "Atenção", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", icon: AlertTriangle },
    degraded: { label: "Degradado", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: AlertTriangle },
  };

  const cfg = statusConfig[overallStatus];
  const StatusIcon = cfg.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Saúde do Sistema (24h)
          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
            <StatusIcon className="h-2.5 w-2.5 mr-1" />
            {cfg.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Jobs</span>
            </div>
            <div className="text-lg font-bold">{health.jobs.total}</div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[9px]">✓ {health.jobs.completed}</Badge>
              {health.jobs.failed > 0 && (
                <Badge variant="destructive" className="text-[9px]">✗ {health.jobs.failed}</Badge>
              )}
              {health.jobs.pending > 0 && (
                <Badge variant="outline" className="text-[9px]">⏳ {health.jobs.pending}</Badge>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Erros</span>
            </div>
            <div className={`text-lg font-bold ${health.errors > 0 ? "text-destructive" : ""}`}>
              {health.errors}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 space-y-1">
            <div className="flex items-center gap-1.5">
              <Key className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">API Keys</span>
            </div>
            <div className="text-lg font-bold">{health.apiKeys}</div>
            <span className="text-[9px] text-muted-foreground">ativas</span>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 space-y-1">
            <div className="flex items-center gap-1.5">
              <Webhook className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Webhooks</span>
            </div>
            <div className="text-lg font-bold">{health.webhooks.total}</div>
            {health.webhooks.unhealthy > 0 && (
              <Badge variant="destructive" className="text-[9px]">{health.webhooks.unhealthy} com falhas</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
