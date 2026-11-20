import Link from "next/link";
import { ArrowRight, ShieldAlert, User } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { PageHeader, RangeChips } from "@/components/ui";
import { parseRange, formatDuration } from "@/lib/range";
import { getVisits } from "@/lib/stats";
import { place } from "@/lib/place";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const host = (url: string | null) => {
    if (!url) return "Direct";
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

export default async function VisitsPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams;
    const range = parseRange(sp.range, "7d");
    const showBots = sp.show === "all";

    const visits = await getVisits(range.from, range.to, { humansOnly: !showBots, limit: 300 });

    // Location for each visit, from the connection it ended on
    const sessionIds = [...new Set(visits.map((v) => v.session_id))];
    const { data: sessions } = sessionIds.length
        ? await supabaseAdmin.from("sessions").select("id, country, city").in("id", sessionIds)
        : { data: [] as { id: string; country: string; city: string }[] };
    const where = new Map((sessions ?? []).map((s) => [s.id, s]));

    const filterLink = (show: "humans" | "all") =>
        `/visits?range=${range.key}${show === "all" ? "&show=all" : ""}`;

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full">
            <PageHeader
                title="Visits"
                subtitle="A visit is one person's run of page views with no gap longer than 30 minutes."
                right={
                    <>
                        <RangeChips current={range.key} basePath="/visits" extra={{ show: showBots ? "all" : undefined }} />
                        <span className="w-px h-5 bg-line mx-1" aria-hidden />
                        <Link href={filterLink("humans")} className={`chip pressable ${!showBots ? "on" : "hover:bg-faint hover:text-fg"}`}>Humans</Link>
                        <Link href={filterLink("all")} className={`chip pressable ${showBots ? "on" : "hover:bg-faint hover:text-fg"}`}>+ Bots</Link>
                    </>
                }
            />

            <div className="glass flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="px-[18px] py-3 border-b border-line caption !tracking-[1.5px]">
                    <span className="font-mono text-fg">{visits.length}</span> visits{visits.length === 300 ? " (newest 300)" : ""} · {range.label}
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="ftable">
                        <thead>
                            <tr>
                                <th>Started</th>
                                <th>Person</th>
                                <th>Journey</th>
                                <th>Pages</th>
                                <th>Time</th>
                                <th>From</th>
                                <th>Where</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {visits.map((v) => {
                                const loc = where.get(v.session_id);
                                return (
                                    <tr key={v.visit_id}>
                                        <td className="text-muted whitespace-nowrap">
                                            {new Date(v.started_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td>
                                            <Link href={`/visitors/${v.visitor_uuid}`} className="inline-flex items-center gap-2 text-fg hover:text-accent transition-colors">
                                                {v.is_bot ? <ShieldAlert className="w-3.5 h-3.5 text-accent" /> : <User className="w-3.5 h-3.5 text-muted" />}
                                                {v.visitor_uuid.slice(0, 8)}…
                                            </Link>
                                            {v.visit_no > 1 && <span className="ml-2 tag">visit {v.visit_no}</span>}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1.5 max-w-[340px] text-fg">
                                                <span className="truncate" title={v.entry_path}>{v.entry_path}</span>
                                                {v.page_views > 1 && (
                                                    <>
                                                        <ArrowRight className="w-3 h-3 shrink-0 text-muted" />
                                                        <span className="truncate text-muted" title={v.exit_path}>{v.exit_path}</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className={v.page_views === 1 ? "text-muted" : "text-fg"}>
                                            {v.page_views}{v.page_views === 1 && <span className="ml-1.5 text-[10px] font-sans">bounce</span>}
                                        </td>
                                        <td className="text-fg whitespace-nowrap">{formatDuration(v.duration_ms)}</td>
                                        <td className="text-muted truncate max-w-[160px]" title={v.referer ?? ""}>{host(v.referer)}</td>
                                        <td className="text-muted whitespace-nowrap">{loc ? `${place(loc.city)}, ${loc.country}` : "—"}</td>
                                    </tr>
                                );
                            })}
                            {visits.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center font-sans text-sm text-muted">No visits in this range.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
