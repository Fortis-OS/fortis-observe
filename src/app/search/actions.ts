"use server";

import { supabaseAdmin } from "@/lib/supabase";

const MAX_QUERY = 100;

/**
 * Builds an `ilike` pattern that matches `text` literally: LIKE's own
 * wildcards (% and _) and its escape character are escaped, so a user's
 * "50%" or "a_b" means exactly that.
 */
function likePattern(text: string) {
    return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Quotes a value for a PostgREST `or=(...)` filter. Inside double quotes,
 * commas, dots, colons and brackets are plain text; only `"` and `\` need
 * escaping. Without this a comma or a bracket in the search box breaks
 * (or rewrites) the filter.
 */
function orValue(value: string) {
    return `"${value.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}

export async function performGlobalSearch(rawQuery: string) {
    const query = String(rawQuery ?? "").trim().slice(0, MAX_QUERY);
    if (query.length < 2) {
        return { sessions: [], events: [] };
    }

    const pattern = likePattern(query);
    const quoted = orValue(pattern);

    const [{ data: sessions }, { data: events }] = await Promise.all([
        supabaseAdmin
            .from('sessions')
            .select('*')
            .or(['ip_address', 'visitor_uuid', 'city', 'country'].map((col) => `${col}.ilike.${quoted}`).join(','))
            .limit(20),
        supabaseAdmin
            .from('events')
            .select('*, sessions(ip_address, visitor_uuid)')
            .ilike('path', pattern)
            .order('timestamp', { ascending: false })
            .limit(20),
    ]);

    return {
        sessions: sessions || [],
        events: events || []
    };
}
