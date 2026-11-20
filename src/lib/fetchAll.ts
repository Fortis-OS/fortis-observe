/**
 * Supabase (PostgREST) returns at most 1,000 rows per request, so a plain
 * `.select()` silently drops everything past that. This pages through a
 * query with `.range()` until a short page comes back.
 *
 * `page(from, to)` must build the query with a stable `.order()`, otherwise
 * rows can repeat or go missing between pages.
 */
const PAGE = 1000;
const MAX_ROWS = 100_000; // safety stop

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
        const { data, error } = await page(from, from + PAGE - 1);
        if (error) throw new Error(`fetchAll: ${error.message}`);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
    }
    return rows;
}
