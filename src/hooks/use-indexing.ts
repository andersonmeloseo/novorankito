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
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["indexing-inventory", projectId] });
      qc.invalidateQueries({ queryKey: ["indexing-requests", projectId] });
      toast.success(`${data.submitted} URL(s) enviada(s) com sucesso`);
      if (data.failed > 0) toast.error(`${data.failed} URL(s) falharam`);
      if (data.quota_exceeded > 0) toast.warning(`${data.quota_exceeded} URL(s) com quota excedida`);
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
