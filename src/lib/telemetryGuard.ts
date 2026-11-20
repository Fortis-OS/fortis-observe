/**
 * Input checks and a throttle for the public telemetry endpoints.
 *
 * The throttle lives in memory, so it is per server instance: it stops one
 * client hammering an instance, not a distributed flood. A shared limiter
 * (Redis / database) would be the next step if that ever matters.
 */

const MAX_BODY_BYTES = 8 * 1024;
const LIMIT = 60;            // requests
const WINDOW_MS = 60 * 1000; // per minute, per IP
const hits = new Map<string, { count: number; resetAt: number }>();

/** True if this IP is over the limit for the current window. */
export function throttled(ip: string): boolean {
    const now = Date.now();
    if (hits.size > 10_000) {
        for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
    }
    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
        hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }
    entry.count += 1;
    return entry.count > LIMIT;
}

export function bodyTooLarge(req: Request) {
    return Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES;
}

const VISITOR_ID = /^[A-Za-z0-9-]{8,64}$/;

const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : undefined);
const int = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : undefined;

export type PageView = { visitorId: string; path: string; referer: string; userAgent?: string; latencyMs?: number; webdriver?: boolean };
export type PageUpdate = { visitorId: string; path: string; scrollDepth?: number; durationMs?: number };

function base(body: Record<string, unknown>) {
    const visitorId = str(body.visitorId, 64);
    const path = str(body.path, 512);
    if (!visitorId || !VISITOR_ID.test(visitorId) || !path || !path.startsWith("/")) return null;
    return { visitorId, path };
}

/** A checked page view, or null if the payload is malformed. */
export function parsePageView(body: unknown): PageView | null {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    const ids = base(b);
    if (!ids) return null;
    return {
        ...ids,
        referer: str(b.referer, 1024) ?? "",
        userAgent: str(b.userAgent, 512),
        latencyMs: int(b.latencyMs, 0, 10 * 60 * 1000),
        webdriver: b.webdriver === true,
    };
}

/** A checked scroll / duration update, or null if the payload is malformed. */
export function parsePageUpdate(body: unknown): PageUpdate | null {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    const ids = base(b);
    if (!ids) return null;
    return {
        ...ids,
        scrollDepth: int(b.scrollDepth, 0, 100),
        durationMs: int(b.durationMs, 0, 24 * 60 * 60 * 1000),
    };
}
