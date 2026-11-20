import { HeartPulse, Timer, Gauge, ListChecks, TriangleAlert } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { PageHeader, RangeChips, Caption, Metric } from "@/components/ui";
import { parseRange, formatDuration, type Range } from "@/lib/range";
import { getSiteStatus } from "@/lib/status";
import { statusColor } from "@/lib/siteStatus";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type Check = { timestamp: string; status_code: number; latency_ms: number };
type Incident = { start: string; end: string | null; checks: number; codes: number[] };
type Day = { key: string; label: string; checks: number; failures: number; avgMs: number };

const ok = (c: Check) => c.status_code >= 200 && c.status_code < 400;

const dayKey = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const dayLabel = (key: string) =>
    new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const ist = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

function percentile(values: number[], p: number) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function loadUptime(range: Range) {
    const checks = await fetchAll<Check>((from, to) =>
        supabaseAdmin
            .from("uptime_logs")
            .select("timestamp, status_code, latency_ms")
            .gte("timestamp", range.from.toISOString())
            .lt("timestamp", range.to.toISOString())
            .order("timestamp", { ascending: true })
            .range(from, to));

    const good = checks.filter(ok);
    const latencies = good.map((c) => c.latency_ms);

    // Incidents: runs of failed checks, ended by the next good one
    const incidents: Incident[] = [];
    let open: Incident | null = null;
    for (const c of checks) {
        if (!ok(c)) {
            if (!open) { open = { start: c.timestamp, end: null, checks: 0, codes: [] }; incidents.push(open); }
            open.checks += 1;
            if (!open.codes.includes(c.status_code)) open.codes.push(c.status_code);
        } else if (open) {
            open.end = c.timestamp;
            open = null;
        }
    }

    // One bar per day
    const byDay = new Map<string, { checks: number; failures: number; total: number; good: number }>();
    for (const c of checks) {
        const k = dayKey(c.timestamp);
        const d = byDay.get(k) ?? { checks: 0, failures: 0, total: 0, good: 0 };
        d.checks += 1;
        if (ok(c)) { d.total += c.latency_ms; d.good += 1; } else d.failures += 1;
        byDay.set(k, d);
    }
    // every day of the range gets a slot (from the first check for "all time"), so gaps show as gaps
    const firstMs = range.key === "all" && checks.length ? new Date(checks[0].timestamp).getTime() : range.from.getTime();
    const keys: string[] = [];
    for (let t = firstMs; t <= range.to.getTime() + 86_400_000; t += 86_400_000) {
        const k = dayKey(new Date(t).toISOString());
        if (k > dayKey(range.to.toISOString())) break;
        if (keys.at(-1) !== k) keys.push(k);
    }
    const days: Day[] = keys.slice(-120).map((key) => {
        const d = byDay.get(key);
        return { key, label: dayLabel(key), checks: d?.checks ?? 0, failures: d?.failures ?? 0, avgMs: d?.good ? Math.round(d.total / d.good) : 0 };
    });

    return {
        checks: checks.length,
        uptime: checks.length ? good.length / checks.length : null,
        avgMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
        p95Ms: percentile(latencies, 95),
        incidents: incidents.reverse(),
        days,
        last: checks.at(-1) ?? null,
    };
}

export default async function UptimePage({ searchParams }: { searchParams: SearchParams }) {
    const range = parseRange((await searchParams).range, "30d");
    const [u, site] = await Promise.all([loadUptime(range), getSiteStatus()]);
    const peak = Math.max(1, ...u.days.map((d) => d.avgMs));

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 min-h-full">
            <PageHeader
                title="Uptime"
                subtitle="Checks of ganeshangadi.online/health by the uptime cron, with response times and outages."
                right={<RangeChips current={range.key} basePath="/uptime" />}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
                <section className="glass p-[18px] lg:col-span-12 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <Caption>Site health · {range.label}</Caption>
                        <span className={`flex items-center gap-1.5 text-xs ${statusColor(site.state)}`}>
                            <span className={`dot ${site.state === "up" ? "live" : ""}`} />
                            <span className="font-mono text-fg">{site.label}</span>
                            {u.last && <span className="text-muted ml-1">· checked {ist(u.last.timestamp)}</span>}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
                        <Metric
                            icon={HeartPulse} label="Uptime"
                            value={u.uptime == null ? "–" : `${(u.uptime * 100).toFixed(u.uptime === 1 ? 0 : 2)}%`}
                            ratio={u.uptime ?? 0} warnAt={2}
                        />
                        <Metric icon={Timer} label="Avg response" value={u.checks ? `${u.avgMs}ms` : "–"} />
                        <Metric icon={Gauge} label="p95 response" value={u.checks ? `${u.p95Ms}ms` : "–"} />
                        <Metric icon={ListChecks} label="Checks" value={u.checks} detail={u.incidents.length ? `${u.incidents.length} outages` : undefined} />
                    </div>
                </section>

                {/* Response time per day; red when any check that day failed */}
                <section className="glass p-[18px] lg:col-span-8 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <Caption>Response time per day</Caption>
                        <span className="flex items-center gap-4 text-[12px]">
                            <span className="flex items-center gap-1.5"><span className="dot text-fill" /><span className="text-muted">All good</span></span>
                            <span className="flex items-center gap-1.5"><span className="dot text-accent" /><span className="text-muted">Had a failure</span></span>
                        </span>
                    </div>
                    {u.checks === 0 ? (
                        <p className="text-sm text-muted py-8 text-center">No checks in this range yet.</p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-end gap-[3px] h-40">
                                {u.days.map((d, i) => (
                                    <div
                                        key={d.key}
                                        className="relative flex-1 h-full flex flex-col justify-end"
                                        title={d.checks ? `${d.label}: ${d.avgMs}ms average, ${d.checks} checks${d.failures ? `, ${d.failures} failed` : ""}` : `${d.label}: no checks`}
                                    >
                                        <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-[1px] bg-faint" />
                                        {d.checks > 0 && <div
                                            className={`relative rounded-[3px] ${d.failures ? "bg-accent" : "bg-fill"}`}
                                            style={{
                                                height: `${Math.max(3, (d.avgMs / peak) * 100)}%`,
                                                opacity: d.failures ? 1 : i === u.days.length - 1 ? 0.95 : 0.55,
                                            }}
                                        />}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-[3px] font-mono text-[9px] text-muted">
                                {u.days.map((d, i) => (
                                    <div key={d.key} className="flex-1 overflow-visible whitespace-nowrap">
                                        {i % Math.max(1, Math.ceil(u.days.length / 6)) === 0 ? d.label : ""}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Outages */}
                <section className="glass p-[18px] lg:col-span-4 flex flex-col gap-3">
                    <Caption className="flex items-center gap-2">
                        <TriangleAlert className="w-3.5 h-3.5" /> Outages <span className="font-mono text-fg">{u.incidents.length}</span>
                    </Caption>
                    {u.incidents.length === 0 ? (
                        <p className="text-sm text-muted">None in this range.</p>
                    ) : (
                        <ul className="flex flex-col gap-2.5">
                            {u.incidents.slice(0, 12).map((inc) => (
                                <li key={inc.start} className="rounded-[12px] border border-faint bg-white/[0.03] px-3 py-2.5 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`tag ${inc.end ? "" : "accent"}`}>{inc.end ? "resolved" : "ongoing"}</span>
                                        <span className="font-mono text-xs text-fg">{inc.codes.join(", ")}</span>
                                    </div>
                                    <div className="font-mono text-[11px] text-muted">
                                        {ist(inc.start)}
                                        {inc.end && <> · {formatDuration(new Date(inc.end).getTime() - new Date(inc.start).getTime())}</>}
                                        {" · "}{inc.checks} {inc.checks === 1 ? "check" : "checks"}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* How often it's checked */}
                <section className="glass-soft p-[18px] lg:col-span-12 flex flex-col gap-2">
                    <Caption>Checking more often</Caption>
                    <p className="text-sm text-muted">
                        Vercel&apos;s free plan runs the check once a day. For a check every 5 minutes, point a free scheduler
                        (cron-job.org, UptimeRobot, GitHub Actions) at it:
                    </p>
                    <pre className="font-mono text-xs text-fg bg-well border border-line rounded-[12px] px-3 py-2.5 overflow-x-auto">
{`GET https://analytics.ganeshangadi.online/api/cron/ping
Authorization: Bearer <CRON_SECRET from Vercel>`}
                    </pre>
                </section>
            </div>
        </div>
    );
}
