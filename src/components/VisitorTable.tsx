"use client";

import { useState } from "react";
import { Search, ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function VisitorTable({ initialSessions }: { initialSessions: any[] }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const filteredAndSorted = initialSessions
        .filter(s =>
            s.ip_address?.includes(search) ||
            s.visitor_uuid?.includes(search) ||
            s.country?.toLowerCase().includes(search.toLowerCase()) ||
            s.city?.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const timeA = new Date(a.last_seen).getTime();
            const timeB = new Date(b.last_seen).getTime();
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

    return (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="p-[18px] border-b border-line flex flex-wrap items-center gap-3">
                <label className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search IP, location or ID…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="field !py-2 !pl-9 text-sm font-mono"
                    />
                </label>
                <span className="caption !tracking-[1.5px] ml-auto">
                    <span className="font-mono text-fg">{filteredAndSorted.length}</span> of {initialSessions.length}
                </span>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="ftable">
                    <thead>
                        <tr>
                            <th>Target ID</th>
                            <th>Origin (IP)</th>
                            <th>Location</th>
                            <th>Device</th>
                            <th>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 uppercase hover:text-fg transition-colors"
                                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                >
                                    Last seen
                                    {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-accent" /> : <ArrowUp className="w-3 h-3 text-accent" />}
                                </button>
                            </th>
                            <th aria-label="Open" />
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {filteredAndSorted.map((session) => (
                            <tr
                                key={session.id}
                                className="cursor-pointer group"
                                onClick={() => router.push(`/visitors/${session.id}`)}
                            >
                                <td className="text-fg group-hover:text-accent transition-colors">
                                    {session.visitor_uuid.substring(0, 8)}…
                                </td>
                                <td className="text-fg whitespace-nowrap">{session.ip_address}</td>
                                <td>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-fg whitespace-nowrap">{session.country}, {session.city}</span>
                                        <span className="text-[10px] text-muted truncate max-w-[220px]">{session.isp}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-1.5 flex-wrap max-w-[170px]">
                                        <span className="tag">{session.os}</span>
                                        <span className="tag">{session.browser}</span>
                                    </div>
                                </td>
                                <td className="text-muted whitespace-nowrap">
                                    {new Date(session.last_seen).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                                </td>
                                <td className="text-right">
                                    <ChevronRight className="w-4 h-4 inline text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity" />
                                </td>
                            </tr>
                        ))}
                        {filteredAndSorted.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-12 text-center font-sans text-sm text-muted">No matching sessions found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
