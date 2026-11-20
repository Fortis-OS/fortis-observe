"use client";

import { useState } from "react";
import { Search, ArrowDown, ArrowUp, ChevronRight, ShieldAlert, Plane } from "lucide-react";
import { useRouter } from "next/navigation";
import type { VisitorRow } from "@/lib/stats";
import { place } from "@/lib/place";

type SortKey = "last_seen" | "visits" | "page_views";
type Sort = { key: SortKey; desc: boolean };

function SortHeader({ k, sort, onSort, children }: { k: SortKey; sort: Sort; onSort: (s: Sort) => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            className={`inline-flex items-center gap-2 uppercase transition-colors ${sort.key === k ? "text-fg" : "hover:text-fg"}`}
            onClick={() => onSort({ key: k, desc: sort.key === k ? !sort.desc : true })}
        >
            {children}
            {sort.key === k && (sort.desc ? <ArrowDown className="w-3 h-3 text-accent" /> : <ArrowUp className="w-3 h-3 text-accent" />)}
        </button>
    );
}

export function VisitorTable({ people }: { people: VisitorRow[] }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<Sort>({ key: "last_seen", desc: true });
    const [showBots, setShowBots] = useState(false);

    const q = search.toLowerCase();
    const rows = people
        .filter((p) => showBots || !p.is_bot)
        .filter((p) =>
            !q ||
            p.ip_address?.includes(search) ||
            p.visitor_uuid.includes(q) ||
            p.country?.toLowerCase().includes(q) ||
            place(p.city).toLowerCase().includes(q) ||
            p.isp?.toLowerCase().includes(q)
        )
        .sort((a, b) => {
            const av = sort.key === "last_seen" ? new Date(a.last_seen).getTime() : Number(a[sort.key]);
            const bv = sort.key === "last_seen" ? new Date(b.last_seen).getTime() : Number(b[sort.key]);
            return sort.desc ? bv - av : av - bv;
        });
    const bots = people.filter((p) => p.is_bot).length;

    return (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="p-[18px] border-b border-line flex flex-wrap items-center gap-3">
                <label className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search IP, place, network or ID…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="field !py-2 !pl-9 text-sm font-mono"
                    />
                </label>
                {bots > 0 && (
                    <button type="button" onClick={() => setShowBots((b) => !b)} className={`chip pressable ${showBots ? "on" : "hover:bg-faint hover:text-fg"}`}>
                        <ShieldAlert className="w-3.5 h-3.5" /> {showBots ? "Hide" : "Show"} {bots} bots
                    </button>
                )}
                <span className="caption !tracking-[1.5px] ml-auto">
                    <span className="font-mono text-fg">{rows.length}</span> people
                </span>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="ftable">
                    <thead>
                        <tr>
                            <th>Person</th>
                            <th>Latest IP</th>
                            <th>Location</th>
                            <th>Device</th>
                            <th><SortHeader k="visits" sort={sort} onSort={setSort}>Visits</SortHeader></th>
                            <th><SortHeader k="page_views" sort={sort} onSort={setSort}>Pages</SortHeader></th>
                            <th><SortHeader k="last_seen" sort={sort} onSort={setSort}>Last seen</SortHeader></th>
                            <th aria-label="Open" />
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {rows.map((p) => (
                            <tr
                                key={p.visitor_uuid}
                                className="cursor-pointer group"
                                onClick={() => router.push(`/visitors/${p.visitor_uuid}`)}
                            >
                                <td className="text-fg group-hover:text-accent transition-colors whitespace-nowrap">
                                    <span className="inline-flex items-center gap-2">
                                        {p.visitor_uuid.substring(0, 8)}…
                                        {p.is_bot && <span className="tag accent">bot</span>}
                                        {p.impossible_travel && <Plane className="w-3.5 h-3.5 text-accent" aria-label="Impossible travel" />}
                                    </span>
                                </td>
                                <td className="text-fg whitespace-nowrap">{p.ip_address}</td>
                                <td>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-fg whitespace-nowrap">{p.country}, {place(p.city)}</span>
                                        <span className="text-[10px] text-muted truncate max-w-[220px]">{p.isp}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-1.5 flex-wrap max-w-[170px]">
                                        <span className="tag">{p.os}</span>
                                        <span className="tag">{p.browser}</span>
                                    </div>
                                </td>
                                <td className="text-fg">{p.visits}</td>
                                <td className="text-fg">{p.page_views}</td>
                                <td className="text-muted whitespace-nowrap">
                                    {new Date(p.last_seen).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                                </td>
                                <td className="text-right">
                                    <ChevronRight className="w-4 h-4 inline text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity" />
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={8} className="py-12 text-center font-sans text-sm text-muted">No one matches.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
