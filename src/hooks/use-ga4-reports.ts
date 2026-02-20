import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GA4Filters {
  source?: string;
  medium?: string;
  device?: string;
  country?: string;
  campaign?: string;
  page?: string;
  channel?: string;
  language?: string;
  browser?: string;
  os?: string;
}

export function useGA4Report(
  projectId: string | undefined,
  reportType: string,
  startDate?: string,
  endDate?: string,
  filters?: GA4Filters
) {
  const activeFilters = filters
    ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v.trim()))
    : undefined;
  const hasFilters = activeFilters && Object.keys(activeFilters).length > 0;

  return useQuery({
    queryKey: ["ga4-report", projectId, reportType, startDate, endDate, activeFilters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-ga4-data", {
        body: {
          project_id: projectId,
          report_type: reportType,
          start_date: startDate || "28daysAgo",
          end_date: endDate || "yesterday",
          ...(hasFilters ? { filters: activeFilters } : {}),
        },
      });
      if (error) throw error;
      if (data?.error === "no_connection" || data?.error === "no_property_id") return null;
      if (data?.error) throw new Error(data.error);
      return data?.data || {};
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
