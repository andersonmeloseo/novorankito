import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IndexingRequest {
  id: string;
  project_id: string;
  owner_id: string;
  url: string;
  request_type: string;
  status: string;
  response_code: number | null;
  response_message: string | null;
  retries: number;
  fail_reason: string | null;
  submitted_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryUrl {
  id: string;
  url: string;
  meta_title: string | null;
  status: string;
  url_type: string;
  url_group: string | null;
  priority: string;
  discovered_at: string;
  last_crawl: string | null;
  // Coverage
  verdict: string | null;
  coverage_state: string | null;
  indexing_state: string | null;
  last_crawl_time: string | null;
  crawled_as: string | null;
  page_fetch_state: string | null;
  robotstxt_state: string | null;
  inspected_at: string | null;
  // Last indexing request
  last_request_status: string | null;
  last_request_at: string | null;
  last_request_type: string | null;
  // GSC metrics (28d)
  clicks_28d: number;
  impressions_28d: number;
}

export interface InventoryStats {
  totalUrls: number;
  indexed: number;
  notIndexed: number;
  unknown: number;
  sentToday: number;
  dailyLimit: number;
}

export function useInventory(projectId: string | undefined) {
  return useQuery({
    queryKey: ["indexing-inventory", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-indexing", {
        body: { project_id: projectId, action: "inventory" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        inventory: (data?.inventory || []) as InventoryUrl[],
        stats: (data?.stats || { totalUrls: 0, indexed: 0, notIndexed: 0, unknown: 0, sentToday: 0, dailyLimit: 200 }) as InventoryStats,
      };
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useIndexingRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: ["indexing-requests", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-indexing", {
        body: { project_id: projectId, action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.rows || []) as IndexingRequest[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useSubmitUrls(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ urls, requestType }: { urls: string[]; requestType?: string }) => {
      const { data, error } = await supabase.functions.invoke("gsc-indexing", {
        body: { project_id: projectId, action: "submit", urls, request_type: requestType || "URL_UPDATED" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Auto-rebalance: if any URLs ended up quota_exceeded, automatically redistribute
      const results = data?.results || [];
      const quotaUrls = results.filter((r: any) => r.status === "quota_exceeded");
      if (quotaUrls.length > 0) {
        const { data: rebalData } = await supabase.functions.invoke("gsc-indexing", {
          body: { project_id: projectId, action: "rebalance" },
        });
        return { ...data, _rebalance: rebalData };
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["indexing-inventory", projectId] });
      qc.invalidateQueries({ queryKey: ["indexing-requests", projectId] });

      const rb = (data as any)._rebalance;

      // Show per-URL results when available
      if (data.results && Array.isArray(data.results)) {
        const succeeded = data.results.filter((r: any) => r.status === "success");
        const failed = data.results.filter((r: any) => r.status === "failed");
        const quota = data.results.filter((r: any) => r.status === "quota_exceeded");

        if (succeeded.length > 0) {
          toast.success(`${succeeded.length} URL(s) enviada(s) com sucesso`, {
            description: succeeded.length <= 3
              ? succeeded.map((r: any) => r.url).join("\n")
              : `${succeeded.slice(0, 2).map((r: any) => r.url).join(", ")} e mais ${succeeded.length - 2}`,
          });
        }
        if (failed.length > 0) {
          toast.error(`${failed.length} URL(s) falharam no envio`, {
            description: failed.length <= 3
              ? failed.map((r: any) => `${r.url}: ${r.fail_reason || "erro"}`).join("\n")
              : `${failed.length} URLs não foram aceitas pela API`,
          });
        }

        // Show rebalance result if auto-rebalance happened
        if (quota.length > 0 && rb) {
          if (rb.rebalanced > 0) {
            toast.success(`${rb.rebalanced} URL(s) redistribuída(s) automaticamente`, {
              description: rb.still_quota_exceeded > 0
                ? `${rb.still_quota_exceeded} URL(s) ainda com quota — todas as contas esgotadas.`
                : "Redistribuídas entre as contas GSC disponíveis.",
            });
          } else if (rb.still_quota_exceeded > 0) {
            toast.warning(`Quota esgotada em todas as contas`, {
              description: `${rb.still_quota_exceeded} URL(s) aguardando reset da quota (meia-noite UTC).`,
            });
          }
        } else if (quota.length > 0 && !rb) {
          toast.warning(`${quota.length} URL(s) com quota excedida`, {
            description: "A quota diária da API do Google foi atingida.",
          });
        }

        if (succeeded.length === 0 && failed.length === 0 && quota.length === 0) {
          toast.info("Nenhuma URL processada");
        }
      } else {
        if (data.submitted > 0) toast.success(`${data.submitted} URL(s) enviada(s) com sucesso`);
        if (data.failed > 0) toast.error(`${data.failed} URL(s) falharam`);
        if (data.quota_exceeded > 0 && !rb) toast.warning(`${data.quota_exceeded} URL(s) com quota excedida`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRetryRequest(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("gsc-indexing", {
        body: { project_id: projectId, action: "retry", request_id: requestId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indexing-inventory", projectId] });
      qc.invalidateQueries({ queryKey: ["indexing-requests", projectId] });
      toast.success("Reenvio concluído");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useInspectUrls(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (urls: string[]) => {
      const { data, error } = await supabase.functions.invoke("gsc-indexing", {
        body: { project_id: projectId, action: "inspect", urls },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["indexing-inventory", projectId] });
      toast.success(`${data.inspected} URL(s) inspecionada(s)`);
      if (data.errors > 0) toast.warning(`${data.errors} erro(s) na inspeção`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRebalanceQuota(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-indexing", {
        body: { project_id: projectId, action: "rebalance" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["indexing-inventory", projectId] });
      qc.invalidateQueries({ queryKey: ["indexing-requests", projectId] });
      if (data.rebalanced > 0) {
        toast.success(`${data.rebalanced} URL(s) reenviada(s) com sucesso`, {
          description: data.still_quota_exceeded > 0
            ? `${data.still_quota_exceeded} URL(s) ainda com quota excedida — todas as contas esgotadas.`
            : "Todas as URLs foram redistribuídas entre as contas disponíveis.",
        });
      } else if (data.still_quota_exceeded > 0) {
        toast.error(`Quota esgotada em todas as ${data.connections_used} conta(s)`, {
          description: `${data.still_quota_exceeded} URL(s) não puderam ser reenviadas. Aguarde o reset da quota (meia-noite UTC).`,
        });
      } else {
        toast.info(data.message || "Nenhuma URL para reequilibrar");
      }
    },
    onError: (err: Error) => toast.error(`Erro ao reequilibrar: ${err.message}`),
  });
}
