import { NextResponse, type NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getOverview, getTop } from "@/lib/stats";
import { getLast24Hours } from "@/lib/hourly";
import { getSiteStatus } from "@/lib/status";
import { parseRange } from "@/lib/range";
import { place } from "@/lib/place";

/**
 * A small read-only summary for the Frost desktop card and Frost Mobile.
 * Outside the login proxy; it takes `Authorization: Bearer $WIDGET_TOKEN`
 * instead, and refuses to answer when no token is configured.
 * It returns counts, the 24-hour strip and the latest page paths: no IPs,
 * no visitor IDs.
 */
function authorised(req: NextRequest) {
    const expected = process.env.WIDGET_TOKEN;
    if (!expected) return "unset" as const;
    const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    // compare digests so the comparison takes the same time whatever the input
    const a = createHash("sha256").update(given).digest();
    const b = createHash("sha256").update(expected).digest();
    return timingSafeEqual(a, b) ? ("ok" as const) : ("bad" as const);
}

export async function GET(req: NextRequest) {
    const auth = authorised(req);
    if (auth === "unset") return NextResponse.json({ error: "WIDGET_TOKEN is not set" }, { status: 503 });
    if (auth === "bad") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = parseRange("today");
    const [now, before, hours, site, topPages, recent] = await Promise.all([
        getOverview(today.from, today.to),
        today.prev ? getOverview(today.prev.from, today.prev.to) : Promise.resolve(null),
        getLast24Hours(),
        getSiteStatus(),
        getTop("path", today.from, today.to, 3),
        supabaseAdmin
            .from("events")
            .select("path, is_bot, timestamp, sessions(country, city)")
            .order("timestamp", { ascending: false })
            .limit(6),
    ]);

    type Recent = { path: string; is_bot: boolean; timestamp: string; sessions: { country: string | null; city: string | null } | null };

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        site: { state: site.state, label: site.label },
        today: {
            visitors: now.visitors, visits: now.visits, pageViews: now.page_views,
            humanEvents: now.human_events, botEvents: now.bot_events,
            bounces: now.bounces, avgVisitMs: now.avg_visit_ms,
        },
        // the same part of yesterday, for "vs yesterday"
        yesterday: before ? { visitors: before.visitors, visits: before.visits, pageViews: before.page_views } : null,
        hours,
        topPages,
        recent: ((recent.data ?? []) as unknown as Recent[]).map((e) => ({
            time: e.timestamp,
            path: e.path,
            bot: e.is_bot,
            country: e.sessions?.country ?? null,
            city: place(e.sessions?.city) || null,
        })),
    }, { headers: { "Cache-Control": "no-store" } });
}
