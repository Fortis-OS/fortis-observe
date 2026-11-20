// Server only: reads the database with the service-role client.
import { supabaseAdmin } from "@/lib/supabase";
import type { SiteStatus } from "@/lib/siteStatus";

const STALE_AFTER_MS = 26 * 3600 * 1000; // the cron runs daily; allow some slack

/** The portfolio's status from the newest row the uptime cron (/api/cron/ping) wrote. */
export async function getSiteStatus(): Promise<SiteStatus> {
    const { data, error } = await supabaseAdmin
        .from("uptime_logs")
        .select("status_code, latency_ms, timestamp")
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return { state: "unknown", label: "No checks yet" };

    const base = { statusCode: data.status_code, latencyMs: data.latency_ms, checkedAt: data.timestamp };
    if (Date.now() - new Date(data.timestamp).getTime() > STALE_AFTER_MS) {
        return { ...base, state: "stale", label: "Check overdue" };
    }
    const ok = data.status_code >= 200 && data.status_code < 400;
    return ok
        ? { ...base, state: "up", label: `Up · ${data.latency_ms}ms` }
        : { ...base, state: "down", label: `Down · ${data.status_code}` };
}
