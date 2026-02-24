import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { RefreshCw, Loader2, CheckCircle2, Clock, Database, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectSyncButtonProps {
  projectId: string;
  projectName?: string;
  compact?: boolean;
}

export function ProjectSyncButton({ projectId, projectName, compact = false }: ProjectSyncButtonProps) {
  const qc = useQueryClient();

  // Fetch latest sync
  const { data: lastSync } = useQuery({
    queryKey: ["mcp-last-sync", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("mcp_sync_snapshots" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    enabled: !!projectId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mcp-server", {
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "sync_project_context", arguments: { project_id: projectId } },
        },
      });
      if (error) throw error;
      const text = data?.result?.content?.[0]?.text;
      return text ? JSON.parse(text) : data;
    },
    onSuccess: (data) => {
      toast.success(`Sync completo: ${data.total_records} registros em ${data.sections?.length} seções (${data.duration_ms}ms)`);
      qc.invalidateQueries({ queryKey: ["mcp-last-sync", projectId] });
    },
    onError: (e: any) => toast.error(`Erro no sync: ${e.message}`),
  });

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 h-9"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || !projectId}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Sync para Claude
              {lastSync && (
                <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">
                  {(lastSync as any).total_records}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[240px]">
            <p>Sincroniza SEO + Analytics + Indexação em um snapshot unificado para Claude Mode</p>
            {lastSync && (
              <p className="text-muted-foreground mt-1">
                Último: {formatDistanceToNow(new Date((lastSync as any).created_at), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Sync de Contexto</h4>
        </div>
        <Button
          size="sm"
          className="text-xs gap-1.5 h-8"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || !projectId}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {syncMutation.isPending ? "Sincronizando..." : "Sync Agora"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Envia snapshot completo de {projectName || "projeto"} para o Claude Mode — SEO, Analytics, Indexação, Anomalias e Agentes.
      </p>

      {lastSync && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>Último sync</span>
          </div>
          <Badge variant="secondary" className="text-[9px]">
            <Clock className="h-2.5 w-2.5 mr-1" />
            {formatDistanceToNow(new Date((lastSync as any).created_at), { addSuffix: true, locale: ptBR })}
          </Badge>
          <Badge variant="secondary" className="text-[9px]">
            <Layers className="h-2.5 w-2.5 mr-1" />
            {(lastSync as any).total_records} registros
          </Badge>
          <Badge variant="outline" className="text-[9px]">
            {(lastSync as any).sync_duration_ms}ms
          </Badge>
          {((lastSync as any).sections_synced || []).map((s: string) => (
            <Badge key={s} variant="outline" className="text-[8px] px-1.5">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {syncMutation.isSuccess && syncMutation.data && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 text-xs space-y-1">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">✓ Sync concluído com sucesso</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-muted-foreground">{syncMutation.data.total_records} registros</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{syncMutation.data.sections?.length} seções</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{syncMutation.data.duration_ms}ms</span>
          </div>
        </div>
      )}
    </Card>
  );
}
