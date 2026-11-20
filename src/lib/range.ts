/** Time ranges for the ?range= search parameter, in IST. */

export const RANGE_KEYS = ["today", "7d", "30d", "all"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export type Range = {
    key: RangeKey;
    label: string;
    from: Date;
    to: Date;
    /** The same span just before this one, for "vs previous" deltas. Null for all-time. */
    prev: { from: Date; to: Date } | null;
    /** Short name of the previous span, e.g. "yesterday". */
    prevLabel: string;
};

const DAY = 86_400_000;
const IST_OFFSET = 5.5 * 3600 * 1000; // India has no daylight saving
const EPOCH = new Date("2020-01-01T00:00:00Z");

/** Midnight IST of the day containing `ms`. */
function istMidnight(ms: number) {
    return Math.floor((ms + IST_OFFSET) / DAY) * DAY - IST_OFFSET;
}

export function parseRange(value: string | string[] | undefined, fallback: RangeKey = "7d"): Range {
    const raw = Array.isArray(value) ? value[0] : value;
    const key: RangeKey = (RANGE_KEYS as readonly string[]).includes(raw ?? "") ? (raw as RangeKey) : fallback;
    const now = Date.now();
    const to = new Date(now);

    switch (key) {
        case "today": {
            const start = istMidnight(now);
            return {
                key, label: "Today", from: new Date(start), to,
                prev: { from: new Date(start - DAY), to: new Date(now - DAY) },
                prevLabel: "yesterday",
            };
        }
        case "7d":
        case "30d": {
            const days = key === "7d" ? 7 : 30;
            const from = now - days * DAY;
            return {
                key, label: key === "7d" ? "7 days" : "30 days", from: new Date(from), to,
                prev: { from: new Date(from - days * DAY), to: new Date(from) },
                prevLabel: `previous ${days}d`,
            };
        }
        case "all":
            return { key, label: "All time", from: EPOCH, to, prev: null, prevLabel: "" };
    }
}

/** "▲ 12" / "▼ 3" / "= 0" for a change between two numbers. */
export function delta(current: number, previous: number | undefined, format: (n: number) => string = (n) => n.toLocaleString()) {
    if (previous == null) return undefined;
    const d = current - previous;
    if (d === 0) return "= 0";
    return `${d > 0 ? "▲" : "▼"} ${format(Math.abs(d))}`;
}

/** 4m 12s, 1h 03m, 45s */
export function formatDuration(ms: number) {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}
