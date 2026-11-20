"use client";

import { useState } from "react";
import { performGlobalSearch } from "./actions";
import { Search as SearchIcon, Terminal, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<{ sessions: any[], events: any[] }>({ sessions: [], events: [] });
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (query.length < 2) return;
        setIsSearching(true);
        const data = await performGlobalSearch(query);
        setResults(data);
        setIsSearching(false);
    };

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full max-w-5xl mx-auto w-full">
            <PageHeader title="Global Search" subtitle="Query telemetry data by IP address, location, target path or UUID." />

            {/* Spotlight-style bar */}
            <form onSubmit={handleSearch} className="glass p-2 flex items-center gap-2">
                <label className="relative flex-1">
                    <SearchIcon className="w-5 h-5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="IP, city, country, /path or UUID…"
                        className="field !pl-11 !py-3 font-mono text-[15px]"
                    />
                </label>
                <button
                    type="submit"
                    disabled={isSearching || query.length < 2}
                    className="btn primary !py-3 shrink-0"
                >
                    {isSearching ? 'Scanning…' : 'Search'}
                </button>
            </form>

            <div className="flex-1 overflow-y-auto flex flex-col gap-8">
                {/* Session results */}
                {results.sessions.length > 0 && (
                    <section className="flex flex-col gap-3">
                        <h2 className="caption flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5" /> Matching targets
                            <span className="font-mono text-fg">{results.sessions.length}</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {results.sessions.map(s => (
                                <Link href={`/visitors/${s.id}`} key={s.id} className="glass-soft pressable p-4 flex items-center justify-between gap-3 group hover:!border-accent">
                                    <div className="min-w-0">
                                        <div className="text-fg font-mono text-sm truncate">{s.ip_address}</div>
                                        <div className="text-muted text-xs mt-1 truncate">{s.city}, {s.country}</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 shrink-0 text-muted group-hover:text-accent transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Event results */}
                {results.events.length > 0 && (
                    <section className="flex flex-col gap-3">
                        <h2 className="caption flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" /> Matching events
                            <span className="font-mono text-fg">{results.events.length}</span>
                        </h2>
                        <div className="flex flex-col gap-2">
                            {results.events.map(ev => (
                                <Link href={`/visitors/${ev.session_id}`} key={ev.id} className="glass-soft pressable px-4 py-3 flex items-center justify-between gap-4 group hover:!border-accent">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="text-fg font-mono text-xs truncate">{ev.path}</div>
                                        <div className="text-muted font-mono text-[10px] hidden md:block whitespace-nowrap">
                                            {ev.sessions?.ip_address} · {ev.sessions?.visitor_uuid.substring(0,8)}
                                        </div>
                                    </div>
                                    <div className="text-muted font-mono text-[11px] whitespace-nowrap">
                                        {new Date(ev.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short', dateStyle: 'short' })}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {!isSearching && query.length >= 2 && results.sessions.length === 0 && results.events.length === 0 && (
                    <div className="text-center py-12 text-muted text-sm">
                        No telemetry records matched your query.
                    </div>
                )}
            </div>
        </div>
    );
}
