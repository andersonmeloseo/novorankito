import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEnqueueJob, type SyncJobType } from "@/hooks/use-sync-jobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw, Play, Database, BarChart3, Globe, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", icon: Clock },
  processing: { label: "Processando", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: Loader2 },
  completed: { label: "Concluído", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle },
};

const JOB_TYPE_CONFIG: Record<string, { label: string; icon: typeof Database }> = {
  gsc_sync: { label: "Sync GSC", icon: Search },
  ga4_sync: { label: "Sync GA4", icon: BarChart3 },
  indexing_batch: { label: "Indexação", icon: Database },
  url_discovery: { label: "Descoberta URLs", icon: Globe },
};

interface SyncJobsDashboardProps {
  projectId: string;
}

export function SyncJobsDashboard({ projectId }: SyncJobsDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const enqueueJob = useEnqueueJob();

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ["sync-jobs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_jobs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!projectId,
    refetchInterval: 10000, // Poll every 10s
  });

  const handleEnqueue = async (jobType: SyncJobType) => {
    try {
      await enqueueJob.mutateAsync({ projectId, jobType });
      toast({ title: "Job enfileirado", description: `${JOB_TYPE_CONFIG[jobType]?.label || jobType} iniciado.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const pendingCount = jobs.filter((j) => j.status === "pending" || j.status === "processing").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Jobs em Background
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {pendingCount} ativo{pendingCount > 1 ? "s" : ""}
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {failedCount} falha{failedCount > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {(["gsc_sync", "ga4_sync", "indexing_batch", "url_discovery"] as SyncJobType[]).map((type) => {
              const config = JOB_TYPE_CONFIG[type];
              return (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => handleEnqueue(type)}
                  disabled={enqueueJob.isPending}
                >
                  <config.icon className="h-3 w-3" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Nenhum job executado ainda. Use os botões acima para iniciar uma sincronização.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {jobs.map((job) => {
              const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
              const typeCfg = JOB_TYPE_CONFIG[job.job_type] || { label: job.job_type, icon: Play };
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <typeCfg.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium truncate">{typeCfg.label}</span>
                    <Badge variant="outline" className={`text-[10px] ${statusCfg.color}`}>
                      <StatusIcon className={`h-2.5 w-2.5 mr-1 ${job.status === "processing" ? "animate-spin" : ""}`} />
                      {statusCfg.label}
                    </Badge>
                    {job.attempts > 1 && (
                      <span className="text-[10px] text-muted-foreground">
                        tentativa {job.attempts}/{job.max_attempts || 3}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.error_message && (
                      <span className="text-[10px] text-destructive max-w-[150px] truncate" title={job.error_message}>
                        {job.error_message}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
