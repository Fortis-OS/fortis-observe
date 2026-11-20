import { supabaseAdmin } from "@/lib/supabase";
import { ArrowLeft, Clock, Globe2, Laptop, Network, ShieldAlert, Activity, FileText, Plane } from "lucide-react";
import { PageHeader, Caption } from "@/components/ui";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function VisitorTimeline({ params }: { params: { id: string } }) {
    // Next.js 15+ requires awaiting params
    const { id } = await params;

    const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

    if (!session) return notFound();

    const { data: events } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('session_id', id)
        .order('timestamp', { ascending: false });

    const ist = (d: string, opts: Intl.DateTimeFormatOptions) =>
        new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...opts });

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full max-w-7xl mx-auto w-full">
            <div>
                <Link href="/visitors" className="pressable inline-flex items-center gap-2 mb-4 chip hover:bg-faint hover:text-fg">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to visitors
                </Link>
                <PageHeader
                    title="Target Dossier"
                    subtitle={<span className="font-mono text-xs break-all">UUID {session.visitor_uuid}</span>}
                    right={
                        <div className="text-left md:text-right font-mono text-xs text-muted space-y-1">
                            <div><span className="caption !tracking-[1.5px] mr-2">First seen</span>{ist(session.first_seen, { dateStyle: 'medium', timeStyle: 'medium' })}</div>
                            <div><span className="caption !tracking-[1.5px] mr-2">Last seen</span>{ist(session.last_seen, { dateStyle: 'medium', timeStyle: 'medium' })}</div>
                        </div>
                    }
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                {/* Session details */}
                <aside className="glass p-[18px] flex flex-col gap-5 self-start">
                    <div className="flex flex-col gap-1.5">
                        <Caption className="flex items-center gap-2"><Network className="w-3.5 h-3.5" /> Network</Caption>
                        <div className="text-sm font-mono text-fg break-all">{session.ip_address}</div>
                        <div className="text-xs text-muted truncate" title={session.isp}>{session.isp}</div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Caption className="flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Location</Caption>
                        <div className="text-[15px] text-fg">{session.city}</div>
                        <div className="text-xs text-muted">{session.country}</div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Caption className="flex items-center gap-2"><Laptop className="w-3.5 h-3.5" /> Fingerprint</Caption>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="tag">{session.device}</span>
                            <span className="tag">{session.os}</span>
                            <span className="tag">{session.browser}</span>
                        </div>
                    </div>

                    {session.impossible_travel && (
                        <span className="tag accent self-start"><Plane className="w-3 h-3" /> impossible travel</span>
                    )}

                    <div className="pt-4 border-t border-faint flex items-baseline gap-2">
                        <span className="font-mono text-[34px] leading-none text-fg">{session.total_visits}</span>
                        <span className="text-sm text-muted">connections</span>
                    </div>
                </aside>

                {/* Event timeline */}
                <section className="xl:col-span-3 glass p-[18px] flex flex-col gap-5 overflow-hidden">
                    <Caption className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Activity log
                        <span className="font-mono text-fg">{events?.length ?? 0}</span>
                    </Caption>

                    <ol className="flex-1 overflow-auto pr-1 flex flex-col gap-4">
                        {events && events.length > 0 ? events.map((ev: any, i: number) => (
                            <li key={ev.id} className="relative flex gap-4">
                                {i !== events.length - 1 && (
                                    <div className="absolute left-4 top-9 bottom-[-16px] w-px bg-gradient-to-b from-accent/60 to-line" />
                                )}
                                <div
                                    className={`relative shrink-0 w-8 h-8 rounded-full grid place-items-center border ${
                                        ev.is_bot ? "bg-accent-soft border-accent text-accent" : "bg-glass-soft border-line text-fg"
                                    }`}
                                >
                                    {ev.is_bot ? <ShieldAlert className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0 rounded-[12px] border border-faint bg-white/[0.03] p-4">
                                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                                        <div className="font-mono text-sm text-fg break-all">
                                            <span className="text-muted mr-2">GET</span>{ev.path}
                                        </div>
                                        <div className="shrink-0 text-xs font-mono text-muted flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" />
                                            {ist(ev.timestamp, { timeStyle: 'medium' })}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-fg mt-3">
                                        {ev.referer && ev.referer !== 'null' && (
                                            <div className="truncate w-full"><span className="caption !tracking-[1.5px] !text-[10px] mr-2">Ref</span>{ev.referer}</div>
                                        )}
                                        {ev.latency_ms > 0 && (
                                            <div><span className="caption !tracking-[1.5px] !text-[10px] mr-2">Latency</span>{ev.latency_ms}ms</div>
                                        )}
                                        {ev.backend_latency_ms > 0 && (
                                            <div><span className="caption !tracking-[1.5px] !text-[10px] mr-2">Backend</span>{ev.backend_latency_ms}ms</div>
                                        )}
                                        {ev.scroll_depth_pct > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="caption !tracking-[1.5px] !text-[10px]">Scroll</span>
                                                <span className="level w-12 inline-block"><span style={{ width: `${ev.scroll_depth_pct}%` }} /></span>
                                                {ev.scroll_depth_pct}%
                                            </div>
                                        )}
                                        {ev.duration_ms > 0 && (
                                            <div><span className="caption !tracking-[1.5px] !text-[10px] mr-2">Duration</span>{Math.floor(ev.duration_ms / 60000)}m {Math.floor((ev.duration_ms % 60000) / 1000)}s</div>
                                        )}
                                        {ev.is_bot && (
                                            <span className="tag accent">suspected bot</span>
                                        )}
                                    </div>
                                </div>
                            </li>
                        )) : (
                            <li className="text-center text-muted py-12 text-sm">
                                No specific events recorded for this session. (Legacy session or data cleared.)
                            </li>
                        )}
                    </ol>
                </section>
            </div>
        </div>
    );
}
