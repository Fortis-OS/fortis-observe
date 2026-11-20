"use client";

import { useEffect, useState } from "react";

type LiveEvent = { id: string; path: string; is_bot: boolean; timestamp: string };

const POLL_MS = 4000;
const KEEP = 50; // events kept on screen

/**
 * Polls /api/live (which needs a dashboard session) instead of subscribing
 * to the events table from the browser, so the table needs no public access.
 * Pauses while the tab is hidden.
 */
export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let newest: string | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const url = newest ? `/api/live?since=${encodeURIComponent(newest)}` : "/api/live";
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            const { events: fresh } = (await res.json()) as { events: LiveEvent[] };
            if (fresh.length > 0) {
              newest = fresh[0].timestamp;
              setEvents((prev) => {
                const seen = new Set(prev.map((e) => e.id));
                return [...fresh.filter((e) => !seen.has(e.id)), ...prev].slice(0, KEEP);
              });
            }
            setLoaded(true);
          }
        } catch {
          // offline or signed out: try again next tick
        }
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  if (events.length === 0) {
     return (
       <div className="flex items-center justify-center gap-2 text-muted text-sm mt-10">
         <span className="dot live text-accent" />
         {loaded ? "No events yet. Listening…" : "Listening for telemetry…"}
       </div>
     );
  }

  return (
    <ul className="flex-1 overflow-y-auto font-mono text-xs flex flex-col gap-2 pr-2">
      {events.map((ev) => {
        const timeString = new Date(ev.timestamp).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });
        return (
            <li key={ev.id} className="flex items-center gap-2.5 min-w-0">
                <span className="text-muted shrink-0">{timeString}</span>
                {ev.is_bot ? (
                    <span className="shrink-0 w-10 text-center rounded-full border border-accent bg-accent-soft text-accent text-[10px] leading-[16px]">bot</span>
                ) : (
                    <span className="shrink-0 w-10 text-center rounded-full border border-line text-fg text-[10px] leading-[16px]">in</span>
                )}
                <span className="text-fg truncate">{ev.path}</span>
            </li>
        );
      })}
    </ul>
  );
}
