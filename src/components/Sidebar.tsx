"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { statusColor, type SiteStatus } from "@/lib/siteStatus";
import {
    Activity, LayoutDashboard, Users, Clock, Search, Settings, FileText, BarChart2, MoreHorizontal, X,
    type LucideIcon,
} from "lucide-react";

type NavLink = { href: string; label: string; icon: LucideIcon };

const links: NavLink[] = [
    { href: "/", label: "Command Center", icon: LayoutDashboard },
    { href: "/live", label: "Live Feed", icon: Activity },
    { href: "/visitors", label: "Visitors", icon: Users },
    { href: "/sessions", label: "Sessions", icon: Clock },
    { href: "/blogs", label: "Blog Intel", icon: FileText },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/search", label: "Search", icon: Search },
    { href: "/settings", label: "Settings", icon: Settings },
];

// The phone dock holds four pages; the rest live behind "More".
const dockHrefs = ["/", "/live", "/visitors", "/analytics"];

function isActive(pathname: string, href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function Brand() {
    return (
        <Link href="/" className="flex items-center gap-2.5 px-2">
            <span className="grid place-items-center w-8 h-8 rounded-[10px] bg-accent text-on-accent shadow-[0_0_24px_rgba(242,29,67,0.45)]">
                <Activity className="w-4 h-4" />
            </span>
            <span className="leading-none">
                <span className="block text-[19px] tracking-[1px] text-fg">Fortis Observe</span>
                <span className="caption mt-1 block !text-[10px]">Live telemetry</span>
            </span>
        </Link>
    );
}

function SystemStatus({ status }: { status: SiteStatus }) {
    return (
        <div
            className="flex items-center justify-between gap-2 px-3 text-xs"
            title={status.checkedAt ? `Last check ${new Date(status.checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : "The uptime check has not run yet"}
        >
            <span className="caption !tracking-[1.5px]">Site</span>
            <span className={`flex items-center gap-1.5 min-w-0 ${statusColor(status.state)}`}>
                <span className={`dot ${status.state === "up" ? "live" : ""}`} />
                <span className="text-fg font-mono text-[11px] truncate">{status.label}</span>
            </span>
        </div>
    );
}

export function Sidebar({ status }: { status: SiteStatus }) {
    const pathname = usePathname();
    // The "More" sheet remembers the page it was opened on, so it closes by itself on navigation.
    const [moreOpenOn, setMoreOpenOn] = useState<string | null>(null);
    const moreOpen = moreOpenOn === pathname;
    const setMoreOpen = (open: boolean) => setMoreOpenOn(open ? pathname : null);

    if (pathname === '/lockdown') return null;

    const dock = links.filter((l) => dockHrefs.includes(l.href));
    const more = links.filter((l) => !dockHrefs.includes(l.href));
    const moreActive = more.some((l) => isActive(pathname, l.href));

    return (
        <>
            {/* Desktop: a floating glass rail */}
            <aside className="hidden md:flex shrink-0 w-[232px] h-screen p-3 pr-0">
                <div className="glass flex flex-col w-full py-5 gap-6">
                    <Brand />

                    <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
                        {links.map(({ href, label, icon: Icon }) => {
                            const active = isActive(pathname, href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={active ? "page" : undefined}
                                    className={`pressable flex items-center gap-3 px-3 py-2 rounded-full border text-[14px] ${
                                        active
                                            ? "bg-accent-soft border-accent text-accent"
                                            : "border-transparent text-muted hover:bg-faint hover:text-fg"
                                    }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="pt-4 mx-3 border-t border-faint">
                        <SystemStatus status={status} />
                    </div>
                </div>
            </aside>

            {/* Phone: the "More" sheet above the dock */}
            {moreOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
                    <div
                        className="sheet absolute left-3 right-3 bottom-[92px] p-3"
                        style={{ animation: "frost-enter 260ms var(--ease-frost) both" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-2 pb-2">
                            <span className="caption">More</span>
                            <button type="button" aria-label="Close" onClick={() => setMoreOpen(false)} className="pressable p-1 text-muted hover:text-fg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {more.map(({ href, label, icon: Icon }) => {
                                const active = isActive(pathname, href);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`pressable flex items-center gap-2.5 px-3 py-3 rounded-[12px] border text-[14px] ${
                                            active
                                                ? "bg-accent-soft border-accent text-accent"
                                                : "bg-white/5 border-faint text-fg"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        {label}
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-faint">
                            <SystemStatus status={status} />
                        </div>
                    </div>
                </div>
            )}

            {/* Phone: a glass dock along the bottom, like Frost Mobile */}
            <nav className="md:hidden fixed left-3 right-3 bottom-3 z-50 glass !rounded-[22px] px-2 py-2 grid grid-cols-5 gap-1">
                {dock.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className="pressable flex flex-col items-center gap-1 py-1"
                        >
                            <span
                                className={`grid place-items-center w-11 h-11 rounded-[14px] border ${
                                    active ? "bg-accent-soft border-accent text-accent" : "bg-white/5 border-faint text-fg"
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                            </span>
                            <span className={`text-[10px] leading-none truncate max-w-full ${active ? "text-accent" : "text-muted"}`}>
                                {label.replace("Command Center", "Home").replace("Live Feed", "Live")}
                            </span>
                        </Link>
                    );
                })}
                <button
                    type="button"
                    onClick={() => setMoreOpen(!moreOpen)}
                    aria-expanded={moreOpen}
                    className="pressable flex flex-col items-center gap-1 py-1"
                >
                    <span
                        className={`grid place-items-center w-11 h-11 rounded-[14px] border ${
                            moreOpen || moreActive ? "bg-accent-soft border-accent text-accent" : "bg-white/5 border-faint text-fg"
                        }`}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </span>
                    <span className={`text-[10px] leading-none ${moreOpen || moreActive ? "text-accent" : "text-muted"}`}>More</span>
                </button>
            </nav>
        </>
    );
}
