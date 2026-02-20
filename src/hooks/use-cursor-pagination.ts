import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UseCursorPaginationOptions {
  table: string;
  cursorColumn?: string;
  ascending?: boolean;
  pageSize?: number;
  filters?: Record<string, string>;
  select?: string;
  enabled?: boolean;
}

interface UseCursorPaginationReturn<T> {
  data: T[];
  isLoading: boolean;
  isFetchingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  reset: () => void;
  totalLoaded: number;
}

/**
 * Generic cursor-based pagination hook for Supabase tables.
 * Uses a cursor column (default: created_at) to fetch pages efficiently.
 */
export function useCursorPagination<T extends Record<string, any>>(
  options: UseCursorPaginationOptions
): UseCursorPaginationReturn<T> {
  const {
    table,
    cursorColumn = "created_at",
    ascending = false,
    pageSize = 50,
    filters = {},
    select = "*",
    enabled = true,
  } = options;

  const [pages, setPages] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const initialFetchDone = useRef(false);

  const fetchPage = useCallback(
    async (cursor: string | null, isInitial: boolean) => {
      if (isInitial) setIsLoading(true);
      else setIsFetchingMore(true);

      try {
        let query = (supabase.from(table as any) as any)
          .select(select)
          .order(cursorColumn, { ascending })
          .limit(pageSize + 1);

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }

        // Apply cursor
        if (cursor) {
          query = ascending
            ? query.gt(cursorColumn, cursor)
            : query.lt(cursorColumn, cursor);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw new Error(queryError.message);

        const rows = (data || []) as T[];
        const moreAvailable = rows.length > pageSize;
        const pageData = moreAvailable ? rows.slice(0, pageSize) : rows;

        if (pageData.length > 0) {
          const lastRow = pageData[pageData.length - 1];
          cursorRef.current = lastRow[cursorColumn] as string;
        }

        setHasMore(moreAvailable);
        setPages((prev) => (isInitial ? pageData : [...prev, ...pageData]));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [table, cursorColumn, ascending, pageSize, select, JSON.stringify(filters)]
  );

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;
    initialFetchDone.current = true;
    cursorRef.current = null;
    setPages([]);
    setHasMore(true);
    fetchPage(null, true);
  }, [enabled, fetchPage]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || isFetchingMore || isLoading) return;
    await fetchPage(cursorRef.current, false);
  }, [hasMore, isFetchingMore, isLoading, fetchPage]);

  const reset = useCallback(() => {
    cursorRef.current = null;
    setPages([]);
    setHasMore(true);
    setError(null);
    fetchPage(null, true);
  }, [fetchPage]);

  return {
    data: pages,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    fetchMore,
    reset,
    totalLoaded: pages.length,
  };
}
