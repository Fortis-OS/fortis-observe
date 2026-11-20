// Shared by server and client code: no database access here.

export type SiteStatus = {
    /** up: last check answered 2xx/3xx; down: it didn't; stale: no check for a day; unknown: never checked. */
    state: "up" | "down" | "stale" | "unknown";
    label: string;
    statusCode?: number;
    latencyMs?: number;
    checkedAt?: string;
};

/** Tailwind text colour for a status dot. */
export function statusColor(state: SiteStatus["state"]) {
    return state === "up" ? "text-ok" : state === "down" ? "text-accent" : "text-muted";
}
