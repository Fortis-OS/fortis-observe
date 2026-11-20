import { supabaseAdmin } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { Eye } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const dynamic = 'force-dynamic';

export default async function BlogsPage() {
    // Fetch all blog events
    const blogEvents = await fetchAll<{ path: string; is_bot: boolean; duration_ms: number | null; scroll_depth_pct: number | null }>((from, to) =>
        supabaseAdmin
            .from('events')
            .select('path, is_bot, duration_ms, scroll_depth_pct')
            .like('path', '/blog/%')
            .order('id')
            .range(from, to));

    const counts: Record<string, { total: number, bots: number, totalDuration: number, humanCount: number, totalScroll: number }> = {};
    
    blogEvents.forEach(e => {
        if (!counts[e.path]) counts[e.path] = { total: 0, bots: 0, totalDuration: 0, humanCount: 0, totalScroll: 0 };
        counts[e.path].total += 1;
        
        if (e.is_bot) {
            counts[e.path].bots += 1;
        } else {
            counts[e.path].humanCount += 1;
            counts[e.path].totalDuration += (e.duration_ms || 0);
            counts[e.path].totalScroll += (e.scroll_depth_pct || 0);
        }
    });

    const leaderboard = Object.entries(counts)
        .map(([path, stats]) => {
            const avgDurationMs = stats.humanCount > 0 ? stats.totalDuration / stats.humanCount : 0;
            const avgScroll = stats.humanCount > 0 ? Math.round(stats.totalScroll / stats.humanCount) : 0;
            
            const minutes = Math.floor(avgDurationMs / 60000);
            const seconds = Math.floor((avgDurationMs % 60000) / 1000);
            const formattedDuration = `${minutes}m ${seconds}s`;

            return { path, avgScroll, formattedDuration, ...stats };
        })
        .sort((a, b) => b.total - a.total);

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 min-h-full">
            <PageHeader title="Blog Intelligence" subtitle="Traffic analysis specifically filtered for your published articles." />

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
                                    <td colSpan={6} className="py-12 text-center font-sans text-sm text-muted">No blog traffic recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
