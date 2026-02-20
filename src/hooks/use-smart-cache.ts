import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useCallback } from "react";

interface SmartCacheOptions<T> {
  /** Unique query key */
  queryKey: readonly unknown[];
  /** The actual fetch function */
  queryFn: () => Promise<T>;
  /** Stale time in ms (default: 5 min) */
  staleTime?: number;
  /** Cache time in ms (default: 30 min) */
  gcTime?: number;
  /** Whether to refetch on window focus (default: false for expensive queries) */
  refetchOnWindowFocus?: boolean;
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Smart cache wrapper around React Query with sensible defaults
 * for expensive Supabase queries. Uses stale-while-revalidate pattern.
 */
export function useSmartCache<T>(options: SmartCacheOptions<T>) {
  const {
    queryKey,
    queryFn,
    staleTime = 5 * 60 * 1000,    // 5 min
    gcTime = 30 * 60 * 1000,       // 30 min
    refetchOnWindowFocus = false,
    enabled = true,
  } = options;

  const qc = useQueryClient();

  const query = useQuery<T>({
    queryKey: queryKey as unknown[],
    queryFn,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    enabled,
  });

  /** Force invalidate this cache entry */
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKey as unknown[] });
  }, [qc, queryKey]);

  /** Optimistically set data without refetching */
  const setData = useCallback(
    (updater: T | ((old: T | undefined) => T)) => {
      qc.setQueryData(queryKey as unknown[], updater);
    },
    [qc, queryKey]
  );

  return {
    ...query,
    invalidate,
    setData,
  };
}

/**
 * Pre-configured cache presets for common query patterns.
 */
export const CACHE_PRESETS = {
  /** For data that changes rarely (e.g., project settings) */
  static: { staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000 },
  /** For data that updates periodically (e.g., KPIs from materialized views) */
  periodic: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  /** For data that changes frequently (e.g., real-time metrics) */
  dynamic: { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 },
  /** For data that should always be fresh */
  realtime: { staleTime: 0, gcTime: 60 * 1000 },
} as const;
