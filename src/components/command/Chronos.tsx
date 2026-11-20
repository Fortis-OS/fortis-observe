"use client";

import { useSyncExternalStore } from "react";

const TZ = "Asia/Kolkata";

// One shared 1-second ticker; the server renders no time at all, so there is no hydration mismatch.
function subscribe(onTick: () => void) {
    const id = setInterval(onTick, 1000);
    return () => clearInterval(id);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const serverSnapshot = () => null;

function parts(date: Date) {
    const get = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(date);
    const [h, m, s] = get({ hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).split(":");
    return {
        day: get({ weekday: "long" }),
        date: get({ day: "numeric", month: "long", year: "numeric" }),
        h: Number(h), hm: `${h}:${m}`, s,
    };
}

function greeting(hour: number) {
    if (hour < 5) return "Good night";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
}

/** Frost's Chronos card: day, date, time with red seconds, greeting, and a 24-hour timeline. */
export function Chronos({ name = "Ganesh", className = "" }: { name?: string; className?: string }) {
    const secs = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
    const p = secs == null ? null : parts(new Date(secs * 1000));
    const dayFraction = p == null ? 0 : (p.h * 3600 + Number(p.hm.slice(3)) * 60 + Number(p.s)) / 86400;

    return (
        <div className={`glass p-[18px] flex flex-col justify-between gap-3 ${className}`}>
            <div>
                <div className="text-[34px] md:text-[40px] leading-none uppercase tracking-[4px] text-fg min-h-[1em]">
                    {p?.day ?? " "}
                </div>
                <div className="mt-2 text-[14px] uppercase tracking-[3px] text-accent min-h-[1.2em]">{p?.date ?? " "}</div>
            </div>

            <div className="flex items-end justify-between gap-4">
                <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-[34px] leading-none font-medium text-fg">{p?.hm ?? "--:--"}</span>
                    <span className="text-[16px] text-accent">:{p?.s ?? "--"}</span>
                </div>
                <div className="text-right">
                    <div className="text-[14px] text-fg">{p ? `${greeting(p.h)}, ${name}` : " "}</div>
                    <div className="caption !tracking-[1.5px] !text-[10px] mt-0.5">IST</div>
                </div>
            </div>

            {/* 24-hour timeline: a tick every hour, longer every six, red marker at now */}
            <div className="relative h-4 mt-1" aria-hidden>
                <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
                {Array.from({ length: 25 }, (_, i) => (
                    <div
                        key={i}
                        className={`absolute top-1/2 w-px -translate-y-1/2 ${i % 6 === 0 ? "h-3 bg-muted" : "h-1.5 bg-line"}`}
                        style={{ left: `${(i / 24) * 100}%` }}
                    />
                ))}
                {p && (
                    <div
                        className="absolute top-0 bottom-0 w-[2px] -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(242,29,67,0.7)]"
                        style={{ left: `${dayFraction * 100}%` }}
                    />
                )}
            </div>
        </div>
    );
}
