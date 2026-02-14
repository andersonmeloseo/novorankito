import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useGA4Report(projectId: string | undefined, reportType: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["ga4-report", projectId, reportType, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-ga4-data", {
        body: {
          project_id: projectId,
          report_type: reportType,
          start_date: startDate || "28daysAgo",
          end_date: endDate || "yesterday",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data || {};
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
