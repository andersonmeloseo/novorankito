import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApiConfig {
  id: string;
  name: string;
  service_name: string;
  description: string | null;
  secret_key_name: string;
  category: string;
  status: string;
  is_configured: boolean;
  base_url: string | null;
  docs_url: string | null;
  created_at: string;
  updated_at: string;
  configured_by: string | null;
  secret_value?: string | null;
}

export function useApiConfigurations() {
  return useQuery({
    queryKey: ["api-configurations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_configurations")
        .select("*")
        .order("category", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ApiConfig[];
    },
  });
}

export function useCreateApiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      name: string;
      service_name: string;
      description?: string;
      secret_key_name: string;
      category: string;
      status?: string;
      is_configured?: boolean;
      base_url?: string;
      docs_url?: string;
      secret_value?: string;
    }) => {
      const { error } = await supabase.from("api_configurations").insert(config);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-configurations"] }),
  });
}

export function useUpdateApiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApiConfig> & { id: string }) => {
      const { error } = await supabase.from("api_configurations").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-configurations"] }),
  });
}

export function useDeleteApiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_configurations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-configurations"] }),
  });
}
