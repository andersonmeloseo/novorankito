import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all rows from a table with automatic pagination to bypass the 1000-row limit.
 * Includes a safety cap to prevent runaway queries.
 */
export async function fetchAllPaginated<T = Record<string, unknown>>(
  table: string,
  options: {
    filters?: Record<string, string>;
    orderBy?: { column: string; ascending?: boolean };
    select?: string;
    maxRows?: number;
  } = {}
): Promise<T[]> {
  const { filters = {}, orderBy, select = "*", maxRows = 50000 } = options;
  const allData: T[] = [];
  let from = 0;
  const pageSize = 1000;

  while (allData.length < maxRows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from as any)(table).select(select).range(from, from + pageSize - 1);

    for (const [key, value] of Object.entries(filters)) {
      q = q.eq(key, value);
    }

    if (orderBy) {
      q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
    }

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allData;
}

/**
 * Get exact count of rows without fetching data.
 */
export async function getExactCount(
  table: string,
  filters: Record<string, string> = {}
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase.from as any)(table).select("id", { count: "exact", head: true });

  for (const [key, value] of Object.entries(filters)) {
    q = q.eq(key, value);
  }

  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}
