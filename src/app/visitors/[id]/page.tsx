import { supabaseAdmin } from "@/lib/supabase";
import { ArrowLeft, Clock, Globe2, Laptop, Network, ShieldAlert, Activity, Plane, Footprints } from "lucide-react";
import { PageHeader, Caption } from "@/components/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVisits, type VisitRow } from "@/lib/stats";
import { formatDuration } from "@/lib/range";
import { place } from "@/lib/place";

export const dynamic = 'force-dynamic';

type Connection = {
    id: string; visitor_uuid: string; ip_address: string; isp: string; country: string; city: string;
    browser: string; os: string; device: string; first_seen: string; last_seen: string;
    total_visits: number; impossible_travel: boolean;
};
type EventRow = {
    id: string; session_id: string; path: string; referer: string | null; is_bot: boolean; timestamp: string;
    latency_ms: number | null; backend_latency_ms: number | null; scroll_depth_pct: number | null; duration_ms: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ist = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...opts });
const host = (url: string | null) => {
    if (!url || url === 'null') return "Direct";
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

/**
 * The person behind an id. Old links point at a session (one person on one
 * IP); newer ones at the person's visitor UUID. Both resolve to the person.
 */
async function loadPerson(id: string) {
    let visitor: string | null = null;
    if (UUID.test(id)) {
        const { data } = await supabaseAdmin.from('sessions').select('visitor_uuid').eq('id', id).maybeSingle();
        visitor = data?.visitor_uuid ?? null;
    }
    visitor ??= id;

    const { data: connections } = await supabaseAdmin
        .from('sessions').select('*').eq('visitor_uuid', visitor).order('last_seen', { ascending: false });
    if (!connections || connections.length === 0) return null;

    const [{ data: events }, visits] = await Promise.all([
        supabaseAdmin.from('events').select('*')
            .in('session_id', connections.map((c) => c.id))
            .order('timestamp', { ascending: false })
            .limit(1000),
        getVisits(new Date(0), new Date(Date.now() + 60_000), { visitor, limit: 500 }),
    ]);

    return { visitor, connections: connections as Connection[], events: (events ?? []) as EventRow[], visits };
}

export default async function PersonDossier({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const person = await loadPerson(decodeURIComponent(id));
    if (!person) return notFound();

    const { visitor, connections, events, visits } = person;
    const latest = connections[0];
    const firstSeen = connections.reduce((a, c) => (c.first_seen < a ? c.first_seen : a), latest.first_seen);
    const travelled = connections.some((c) => c.impossible_travel);
    const allBot = events.length > 0 && events.every((e) => e.is_bot);

    // Events belong to the visit whose time span contains them
    const eventsOf = (v: VisitRow) =>
        events.filter((e) => e.timestamp >= v.started_at && e.timestamp <= v.ended_at);

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full max-w-7xl mx-auto w-full">
            <div>
                <Link href="/visitors" className="pressable inline-flex items-center gap-2 mb-4 chip hover:bg-faint hover:text-fg">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to visitors
                </Link>
                <PageHeader
                    title="Target Dossier"
                    subtitle={<span className="font-mono text-xs break-all">Person {visitor}</span>}
                    right={
                        <div className="text-left md:text-right font-mono text-xs text-muted space-y-1">
                            <div><span className="caption !tracking-[1.5px] mr-2">First seen</span>{ist(firstSeen, { dateStyle: 'medium', timeStyle: 'medium' })}</div>
                            <div><span className="caption !tracking-[1.5px] mr-2">Last seen</span>{ist(latest.last_seen, { dateStyle: 'medium', timeStyle: 'medium' })}</div>
                        </div>
                    }
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                {/* The person */}
                <aside className="flex flex-col gap-5 self-start">
                    <div className="glass p-[18px] flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5">
                            <Caption className="flex items-center gap-2"><Network className="w-3.5 h-3.5" /> Latest network</Caption>
                            <div className="text-sm font-mono text-fg break-all">{latest.ip_address}</div>
                            <div className="text-xs text-muted truncate" title={latest.isp}>{latest.isp}</div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Caption className="flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Location</Caption>
                            <div className="text-[15px] text-fg">{place(latest.city)}</div>
                            <div className="text-xs text-muted">{latest.country}</div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Caption className="flex items-center gap-2"><Laptop className="w-3.5 h-3.5" /> Fingerprint</Caption>
                            <div className="flex flex-wrap gap-1.5">
                                <span className="tag">{latest.device}</span>
                                <span className="tag">{latest.os}</span>
                                <span className="tag">{latest.browser}</span>
                            </div>
                        </div>

                        {(travelled || allBot) && (
                            <div className="flex flex-wrap gap-1.5">
                                {travelled && <span className="tag accent"><Plane className="w-3 h-3" /> impossible travel</span>}
                                {allBot && <span className="tag accent"><ShieldAlert className="w-3 h-3" /> bot</span>}
                            </div>
                        )}

                        <div className="pt-4 border-t border-faint grid grid-cols-2 gap-3">
                            <div>
                                <div className="font-mono text-[28px] leading-none text-fg">{visits.length}</div>
                                <div className="text-xs text-muted mt-1">visits</div>
                            </div>
                            <div>
                                <div className="font-mono text-[28px] leading-none text-fg">{events.length}</div>
                                <div className="text-xs text-muted mt-1">page views</div>
                            </div>
                        </div>
                    </div>

                    {connections.length > 1 && (
                        <div className="glass p-[18px] flex flex-col gap-3">
                            <Caption>Networks <span className="font-mono text-fg">{connections.length}</span></Caption>
                            <ul className="flex flex-col gap-2.5">
                                {connections.map((c) => (
                                    <li key={c.id} className="flex flex-col gap-0.5 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-mono text-xs text-fg truncate">{c.ip_address}</span>
                                            {c.impossible_travel && <Plane className="w-3 h-3 text-accent shrink-0" aria-label="Impossible travel" />}
                                        </div>
                                        <div className="text-[11px] text-muted truncate">{place(c.city)}, {c.country} · {ist(c.last_seen, { dateStyle: 'medium' })}</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </aside>

                {/* Visits, newest first, each with its pages */}
                <section className="xl:col-span-3 glass p-[18px] flex flex-col gap-5 overflow-hidden">
                    <Caption className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Visits
                        <span className="font-mono text-fg">{visits.length}</span>
                    </Caption>

                    <ol className="flex-1 overflow-auto pr-1 flex flex-col gap-4">
                        {visits.map((v) => {
                            const pages = eventsOf(v);
                            return (
                                <li key={v.visit_id} className="rounded-[14px] border border-faint bg-white/[0.03] overflow-hidden">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 border-b border-faint">
                                        <span className="flex items-center gap-2 text-fg text-[14px]">
                                            <Footprints className="w-4 h-4 text-accent" /> Visit {v.visit_no}
                                        </span>
                                        <span className="font-mono text-xs text-muted">{ist(v.started_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                        <span className="font-mono text-xs text-fg">{v.page_views} {v.page_views === 1 ? "page" : "pages"}</span>
                                        <span className="font-mono text-xs text-fg">{formatDuration(v.duration_ms)}</span>
                                        <span className="text-xs text-muted">from <span className="font-mono text-fg">{host(v.referer)}</span></span>
                                        {v.page_views === 1 && <span className="tag">bounce</span>}
                                        {v.is_bot && <span className="tag accent">bot</span>}
                                    </div>
                                    <ul className="flex flex-col">
                                        {[...pages].reverse().map((ev) => (
                                            <li key={ev.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border-b border-faint last:border-b-0 font-mono text-xs">
                                                <span className="text-muted flex items-center gap-1.5 w-[104px] shrink-0 whitespace-nowrap">
                                                    <Clock className="w-3 h-3" />{ist(ev.timestamp, { timeStyle: 'medium' })}
                                                </span>
                                                <span className="text-fg break-all flex-1 min-w-[160px]">{ev.path}</span>
                                                {(ev.scroll_depth_pct ?? 0) > 0 && (
                                                    <span className="flex items-center gap-2 text-fg">
                                                        <span className="level w-12 inline-block"><span style={{ width: `${ev.scroll_depth_pct}%` }} /></span>
                                                        {ev.scroll_depth_pct}%
                                                    </span>
                                                )}
                                                {(ev.duration_ms ?? 0) > 0 && <span className="text-fg">{formatDuration(ev.duration_ms ?? 0)}</span>}
                                                {(ev.backend_latency_ms ?? 0) > 0 && <span className="text-muted">{ev.backend_latency_ms}ms</span>}
                                                {ev.is_bot && <span className="tag accent">bot</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            );
                        })}
                        {visits.length === 0 && (
                            <li className="text-center text-muted py-12 text-sm">
                                No page views recorded for this person. (Legacy record or data cleared.)
                            </li>
                        )}
                    </ol>
                </section>
            </div>
        </div>
    );
}
