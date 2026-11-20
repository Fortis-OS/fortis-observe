import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Latest events for the live feed. Behind the login proxy, read with the
 * service role, so the browser never needs (or gets) direct table access.
 *
 *   GET /api/live            → newest 30 events
 *   GET /api/live?since=ISO  → events newer than that timestamp (max 50)
 */
export async function GET(req: NextRequest) {
    const since = req.nextUrl.searchParams.get("since");
    const sinceDate = since ? new Date(since) : null;

    let query = supabaseAdmin
        .from("events")
        .select("id, path, is_bot, timestamp")
        .order("timestamp", { ascending: false });

    if (sinceDate && !Number.isNaN(sinceDate.getTime())) {
        query = query.gt("timestamp", sinceDate.toISOString()).limit(50);
    } else {
        query = query.limit(30);
    }

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    return NextResponse.json({ events: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
