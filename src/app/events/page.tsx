import { supabaseAdmin } from "@/lib/supabase";
import { ShieldAlert, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
    const { data: events } = await supabaseAdmin
        .from('events')
        .select(`
            *,
            sessions ( visitor_uuid, ip_address, country )
        `)
        .order('timestamp', { ascending: false })
        .limit(200);

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full">
            <PageHeader title="Events" subtitle="Every page view as it was recorded, newest 200." />

            <div className="glass flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="ftable">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Target path</th>
                                <th>Source IP</th>
                                <th>Type</th>
                                <th className="text-right">Person</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {events?.map((ev) => (
                                <tr key={ev.id}>
                                    <td className="text-muted whitespace-nowrap">
                                        {new Date(ev.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                                    </td>
                                    <td>
                                        <div className="text-fg truncate max-w-[300px]" title={ev.path}>{ev.path}</div>
                                        {ev.referer && ev.referer !== 'null' && (
                                            <div className="text-[10px] text-muted truncate max-w-[300px] mt-0.5">
                                                <span className="opacity-70">ref</span> {ev.referer}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="text-fg whitespace-nowrap">{ev.sessions?.ip_address}</div>
                                        <div className="text-[10px] text-muted">{ev.sessions?.country}</div>
                                    </td>
                                    <td>
                                        {ev.is_bot ? (
                                            <span className="tag accent"><ShieldAlert className="w-3 h-3" /> bot</span>
                                        ) : (
                                            <span className="tag"><User className="w-3 h-3" /> human</span>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <Link
                                            href={`/visitors/${ev.sessions?.visitor_uuid ?? ev.session_id}`}
                                            className="inline-flex items-center gap-1 font-sans text-[13px] text-muted hover:text-accent transition-colors"
                                        >
                                            Dossier <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {(!events || events.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center font-sans text-sm text-muted">No events recorded.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
