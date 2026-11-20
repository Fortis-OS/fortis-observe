// Server only: database-side stats from supabase/migrations/20261121_visits_and_stats.sql.
import { supabaseAdmin } from "@/lib/supabase";

export type Overview = {
    events: number;
    human_events: number;
    bot_events: number;
    visits: number;
    visitors: number;
    new_visitors: number;
    bounces: number;
    page_views: number;
    avg_visit_ms: number;
};

export type TopDim = "path" | "referrer" | "country" | "browser" | "os" | "device" | "isp";
export type NameValue = { name: string; value: number };
export type DailyRow = { day: string; human: number; bot: number; visitors: number };

export type VisitorRow = {
    visitor_uuid: string; first_seen: string; last_seen: string;
    visits: number; page_views: number; is_bot: boolean; impossible_travel: boolean;
    country: string | null; city: string | null; device: string | null; os: string | null;
    browser: string | null; isp: string | null; ip_address: string | null;
};

export type VisitRow = {
    visit_id: string; visitor_uuid: string; visit_no: number;
    started_at: string; ended_at: string; page_views: number;
    entry_path: string; exit_path: string; referer: string | null;
    is_bot: boolean; duration_ms: number; session_id: string;
};

/** Thrown when the stats functions are not in the database yet. */
export class MigrationMissingError extends Error {
    constructor() {
        super("The visits & stats migration has not been run yet (supabase/migrations/20261121_visits_and_stats.sql).");
        this.name = "MigrationMissingError";
    }
}

function check(error: { code?: string; message?: string } | null) {
    if (!error) return;
    // PGRST202: function not found, PGRST205 / 42P01: relation not found
    if (error.code === "PGRST202" || error.code === "PGRST205" || error.code === "42P01" || /fortis_/.test(error.message ?? "")) {
        throw new MigrationMissingError();
    }
    throw new Error(error.message);
}

const iso = (d: Date) => d.toISOString();
const num = (v: unknown) => Number(v) || 0;

export async function getOverview(from: Date, to: Date): Promise<Overview> {
    const { data, error } = await supabaseAdmin.rpc("fortis_overview", { p_from: iso(from), p_to: iso(to) });
    check(error);
    const o = (data ?? {}) as Record<string, unknown>;
    return {
        events: num(o.events), human_events: num(o.human_events), bot_events: num(o.bot_events),
        visits: num(o.visits), visitors: num(o.visitors), new_visitors: num(o.new_visitors),
        bounces: num(o.bounces), page_views: num(o.page_views), avg_visit_ms: num(o.avg_visit_ms),
    };
}

export async function getTop(dim: TopDim, from: Date, to: Date, limit = 8): Promise<NameValue[]> {
    const { data, error } = await supabaseAdmin.rpc("fortis_top", { p_dim: dim, p_from: iso(from), p_to: iso(to), p_limit: limit });
    check(error);
    return ((data ?? []) as { name: string; value: number }[]).map((r) => ({ name: r.name, value: num(r.value) }));
}

export async function getDaily(from: Date, to: Date): Promise<DailyRow[]> {
    const { data, error } = await supabaseAdmin.rpc("fortis_daily", { p_from: iso(from), p_to: iso(to), p_tz: "Asia/Kolkata" });
    check(error);
    return ((data ?? []) as DailyRow[]).map((r) => ({ day: r.day, human: num(r.human), bot: num(r.bot), visitors: num(r.visitors) }));
}

export async function getVisitorList(from: Date, to: Date, limit = 200): Promise<VisitorRow[]> {
    const { data, error } = await supabaseAdmin.rpc("fortis_visitor_list", { p_from: iso(from), p_to: iso(to), p_limit: limit });
    check(error);
    return (data ?? []) as VisitorRow[];
}

/** Visits that started in the range, newest first. */
export async function getVisits(from: Date, to: Date, opts: { humansOnly?: boolean; visitor?: string; limit?: number } = {}): Promise<VisitRow[]> {
    let q = supabaseAdmin
        .from("fortis_visits")
        .select("*")
        .gte("started_at", iso(from))
        .lt("started_at", iso(to))
        .order("started_at", { ascending: false })
        .limit(opts.limit ?? 200);
    if (opts.humansOnly) q = q.eq("is_bot", false);
    if (opts.visitor) q = q.eq("visitor_uuid", opts.visitor);
    const { data, error } = await q;
    check(error);
    return (data ?? []) as VisitRow[];
}

/** First event time, for an "all time" daily chart. */
export async function getFirstEventAt(): Promise<Date | null> {
    const { data } = await supabaseAdmin.from("events").select("timestamp").order("timestamp", { ascending: true }).limit(1);
    return data?.[0] ? new Date(data[0].timestamp) : null;
}
