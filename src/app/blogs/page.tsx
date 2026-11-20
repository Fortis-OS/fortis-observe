import { supabaseAdmin } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { Eye } from "lucide-react";
import Link from "next/link";
import { PageHeader, RangeChips } from "@/components/ui";
import { parseRange } from "@/lib/range";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// A reader "finished" an article if they scrolled at least this far.
const FINISHED_AT = 90;

export default async function BlogsPage({ searchParams }: { searchParams: SearchParams }) {
    const range = parseRange((await searchParams).range, "30d");

    // Blog events in the range
    const blogEvents = await fetchAll<{ path: string; is_bot: boolean; duration_ms: number | null; scroll_depth_pct: number | null }>((from, to) =>
        supabaseAdmin
            .from('events')
            .select('path, is_bot, duration_ms, scroll_depth_pct')
            .like('path', '/blog/%')
            .gte('timestamp', range.from.toISOString())
            .lt('timestamp', range.to.toISOString())
            .order('id')
            .range(from, to));

    const counts: Record<string, { total: number, bots: number, totalDuration: number, humanCount: number, totalScroll: number, finished: number }> = {};
    
    blogEvents.forEach(e => {
        if (!counts[e.path]) counts[e.path] = { total: 0, bots: 0, totalDuration: 0, humanCount: 0, totalScroll: 0, finished: 0 };
        counts[e.path].total += 1;
        
        if (e.is_bot) {
            counts[e.path].bots += 1;
        } else {
            counts[e.path].humanCount += 1;
            counts[e.path].totalDuration += (e.duration_ms || 0);
            counts[e.path].totalScroll += (e.scroll_depth_pct || 0);
            if ((e.scroll_depth_pct || 0) >= FINISHED_AT) counts[e.path].finished += 1;
        }
    });

    const leaderboard = Object.entries(counts)
        .map(([path, stats]) => {
            const avgDurationMs = stats.humanCount > 0 ? stats.totalDuration / stats.humanCount : 0;
            const avgScroll = stats.humanCount > 0 ? Math.round(stats.totalScroll / stats.humanCount) : 0;
            
            const minutes = Math.floor(avgDurationMs / 60000);
            const seconds = Math.floor((avgDurationMs % 60000) / 1000);
            const formattedDuration = `${minutes}m ${seconds}s`;

            const finishedPct = stats.humanCount > 0 ? Math.round((stats.finished / stats.humanCount) * 100) : 0;

            return { path, avgScroll, formattedDuration, finishedPct, ...stats };
        })
        .sort((a, b) => b.total - a.total);

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 min-h-full">
            <PageHeader
                title="Blog Intelligence"
                subtitle={`How each article is read. "Finished" means a human reader scrolled past ${FINISHED_AT}%.`}
                right={<RangeChips current={range.key} basePath="/blogs" />}
            />

            <div className="glass overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="ftable">
                        <thead>
                            <tr>
                                <th>Article path</th>
                                <th>Views</th>
                                <th>Human vs bot</th>
                                <th>Read time</th>
                                <th>Scroll depth</th>
                                <th>Finished</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {leaderboard.map((item, index) => {
                                const humanPercent = Math.round(((item.total - item.bots) / item.total) * 100);
                                return (
                                    <tr key={item.path}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <span className="text-muted w-5 shrink-0">{String(index + 1).padStart(2, "0")}</span>
                                                <span className="text-fg">{item.path}</span>
                                            </div>
                                        </td>
                                        <td className="text-fg text-[15px]">
                                            {item.total.toLocaleString()}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="level w-28 shrink-0">
                                                    <span className="!bg-accent !opacity-100" style={{ width: `${humanPercent}%` }} />
                                                </div>
                                                <span className="text-muted text-[10px] whitespace-nowrap">{humanPercent}% human</span>
                                            </div>
                                        </td>
                                        <td className="text-fg">
                                            {item.formattedDuration}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="level w-16 shrink-0">
                                                    <span style={{ width: `${item.avgScroll}%` }} />
                                                </div>
                                                <span className="text-fg">{item.avgScroll}%</span>
                                            </div>
                                        </td>
                                        <td className={item.finishedPct >= 50 ? "text-accent" : "text-fg"}>
                                            {item.finishedPct}%
                                        </td>
                                        <td className="text-right">
                                            <Link href={`https://ganeshangadi.online${item.path}`} target="_blank" className="chip pressable hover:bg-faint hover:text-fg font-sans">
                                                <Eye className="w-3.5 h-3.5" />
                                                View live
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                            {leaderboard.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center font-sans text-sm text-muted">No blog traffic in this range.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
